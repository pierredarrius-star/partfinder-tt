import { createClient } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WebResult {
  id: string;
  part_name: string;
  description: string | null;
  price: number | null;
  currency: string;
  product_url: string;
  image_url: string | null;
  site_name: string;
  site_url: string;
}

export interface SupplierSite {
  id: string;
  name: string;
  url: string;
  catalog_url: string;
  currency: string;
  last_indexed_at: string | null;
}

export interface ProductExtract {
  part_name: string;
  description?: string;
  price?: number;
  product_url: string;
  image_url?: string;
}

// ─── Supabase service-role client ─────────────────────────────────────────────
// Creates a new client per call — service role clients should not be singletons
// in Next.js serverless functions.

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('[web-inventory] Missing Supabase service-role env vars');
  return createClient(url, key);
}

// ─── Safe URL helper ──────────────────────────────────────────────────────────

function safeUrl(raw: string | undefined, fallback = 'https://unknown.com'): URL {
  try {
    return new URL(raw ?? fallback);
  } catch {
    return new URL(fallback);
  }
}

// ─── searchWebInventory ───────────────────────────────────────────────────────

/**
 * Full-text search on web_inventory using the generated search_vector column.
 * Joins with supplier_sites to include site_name and site_url in results.
 */
export async function searchWebInventory(query: string): Promise<WebResult[]> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('web_inventory')
    .select(`
      id, part_name, description, price, currency, product_url, image_url,
      supplier_sites!inner(name, url)
    `)
    .textSearch('search_vector', query, { type: 'websearch', config: 'english' })
    .limit(20);

  if (error) {
    console.error('[web-inventory] FTS error:', error.message);
    return [];
  }

  type InventoryRow = {
    id: string;
    part_name: string;
    description: string | null;
    price: number | null;
    currency: string;
    product_url: string;
    image_url: string | null;
    supplier_sites: { name: string; url: string } | { name: string; url: string }[];
  };

  return (data ?? []).map((row: InventoryRow) => {
    const site = Array.isArray(row.supplier_sites)
      ? row.supplier_sites[0]
      : row.supplier_sites;
    return {
      id: row.id,
      part_name: row.part_name,
      description: row.description,
      price: row.price,
      currency: row.currency,
      product_url: row.product_url,
      image_url: row.image_url,
      site_name: site?.name ?? '',
      site_url: site?.url ?? '',
    };
  });
}

// ─── getActiveSites ───────────────────────────────────────────────────────────

/**
 * Returns all active supplier sites from the supplier_sites table.
 * Used by the nightly indexer to know which sites to crawl.
 */
export async function getActiveSites(): Promise<SupplierSite[]> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('supplier_sites')
    .select('id, name, url, catalog_url, currency, last_indexed_at')
    .eq('is_active', true);

  if (error) {
    console.error('[web-inventory] getActiveSites error:', error.message);
    return [];
  }

  return data ?? [];
}

// ─── liveScrapeFallback ───────────────────────────────────────────────────────

const SUPPLIER_DOMAINS = [
  'tntbambooonline.com',
  'brownsautopartstt.com',
  'x2board.com',
];

/**
 * Calls Firecrawl /v1/search restricted to Trinidad supplier domains.
 * Used as a fallback when the local web_inventory has no results for a query.
 * Results are ephemeral — not stored in the DB; id is set to the product URL.
 */
export async function liveScrapeFallback(query: string): Promise<WebResult[]> {
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        query: `${query} auto parts Trinidad`,
        limit: 10,
        includeDomains: SUPPLIER_DOMAINS,
      }),
    });

    if (!res.ok) {
      console.error('[web-inventory] Firecrawl search error:', res.status);
      return [];
    }

    const json = await res.json();
    const results = json.data ?? json.results ?? [];

    return results.map((r: any) => {
      const rawUrl = r.url ?? r.metadata?.sourceURL ?? '';
      const parsed = safeUrl(rawUrl);
      return {
        id: rawUrl || parsed.href,
        part_name: r.title ?? r.metadata?.title ?? 'Unknown part',
        description: r.description ?? r.metadata?.description ?? null,
        price: null,
        currency: 'TTD',
        product_url: rawUrl || parsed.href,
        image_url: null,
        site_name: parsed.hostname.replace('www.', ''),
        site_url: parsed.origin,
      };
    });
  } catch (err) {
    console.error('[web-inventory] liveScrapeFallback error:', err);
    return [];
  }
}

// ─── upsertProducts ───────────────────────────────────────────────────────────

/**
 * Upserts scraped products into web_inventory.
 * Called by the nightly indexer cron after crawling a supplier site.
 * Conflicts are resolved on (site_id, product_url) — existing rows are updated.
 * Returns the count of upserted rows.
 */
export async function upsertProducts(
  siteId: string,
  currency: string,
  products: ProductExtract[]
): Promise<number> {
  if (products.length === 0) return 0;

  const supabase = getServiceClient();
  const rows = products.map((p) => ({
    site_id: siteId,
    part_name: p.part_name,
    description: p.description ?? null,
    price: p.price ?? null,
    currency,
    product_url: p.product_url,
    image_url: p.image_url ?? null,
    last_indexed_at: new Date().toISOString(),
  }));

  const { error, count } = await supabase
    .from('web_inventory')
    .upsert(rows, { onConflict: 'site_id,product_url', count: 'exact' });

  if (error) {
    console.error('[web-inventory] upsert error:', error.message);
    return 0;
  }

  return count ?? products.length;
}
