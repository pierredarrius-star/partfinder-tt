import { NextRequest, NextResponse } from 'next/server';
import { getActiveSites, upsertProducts } from '@/lib/web-inventory';
import type { ProductExtract } from '@/lib/web-inventory';

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sites = await getActiveSites();
  const results: { site: string; count: number; error?: string }[] = [];

  for (const site of sites) {
    try {
      const products = await extractProducts(site.catalog_url);
      const count = await upsertProducts(site.id, site.currency, products);
      await updateLastIndexed(site.id);
      results.push({ site: site.name, count });
    } catch (err) {
      results.push({ site: site.name, count: 0, error: String(err) });
    }
  }

  return NextResponse.json({ indexed: results });
}

async function extractProducts(catalogUrl: string): Promise<ProductExtract[]> {
  const res = await fetch('https://api.firecrawl.dev/v1/extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
    },
    body: JSON.stringify({
      urls: [catalogUrl],
      prompt: 'Extract all auto parts listings from this page. For each listing return: part_name (the product title), description (brief description if available), price (numeric price only, no currency symbol), product_url (the full URL of the product page), image_url (product image URL if available).',
      schema: {
        type: 'object',
        properties: {
          products: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                part_name: { type: 'string' },
                description: { type: 'string' },
                price: { type: 'number' },
                product_url: { type: 'string' },
                image_url: { type: 'string' },
              },
              required: ['part_name', 'product_url'],
            },
          },
        },
        required: ['products'],
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Firecrawl extract failed: ${res.status}`);
  }

  const json = await res.json();
  const raw: any[] = json.data?.products ?? json.products ?? [];

  return raw
    .filter((p) => p.part_name && p.product_url)
    .map((p) => ({
      part_name: String(p.part_name),
      description: p.description ? String(p.description) : undefined,
      price: typeof p.price === 'number' ? p.price : undefined,
      product_url: String(p.product_url),
      image_url: p.image_url ? String(p.image_url) : undefined,
    }));
}

async function updateLastIndexed(siteId: string): Promise<void> {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  await supabase
    .from('supplier_sites')
    .update({ last_indexed_at: new Date().toISOString() })
    .eq('id', siteId);
}
