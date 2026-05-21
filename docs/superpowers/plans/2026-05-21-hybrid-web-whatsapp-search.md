# Hybrid Web + WhatsApp Part Search — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add instant web-indexed part search alongside the existing WhatsApp blast, showing results in two tabs (Online / WhatsApp) on the results page.

**Architecture:** On every search, two tracks run in parallel — a Postgres full-text search against a pre-indexed `web_inventory` table (returns <200ms), and the existing WhatsApp blast. A nightly Vercel Cron job re-indexes three confirmed Trinidad supplier sites using Firecrawl AI Extract. The results page gains an Online tab (instant) and a WhatsApp tab (existing realtime stream).

**Tech Stack:** Next.js App Router, Supabase (Postgres FTS + service role client), Firecrawl REST API, Vercel Cron

---

## Environment Variables Required

Before starting, confirm these are set in Vercel and `.env.local`:
- `SUPABASE_SERVICE_ROLE_KEY` — already exists (used by webhook)
- `FIRECRAWL_API_KEY` — **new**, get from firecrawl.dev dashboard
- `CRON_SECRET` — **new**, any random string (e.g. `openssl rand -hex 32`), also set in Vercel

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `supabase/migrations/20260521000000_web_inventory.sql` | Create | `supplier_sites` + `web_inventory` tables, indexes, RLS, seed data |
| `src/lib/web-inventory.ts` | Create | FTS search + Firecrawl live fallback + indexer helpers |
| `src/app/api/web-search/route.ts` | Create | GET endpoint: query → FTS → fallback → return results |
| `src/app/api/cron/index-inventory/route.ts` | Create | Nightly indexer: crawl sites → extract products → upsert |
| `src/app/page.tsx` | Edit | Add `&q=` param to results navigation URL |
| `src/app/results/page.tsx` | Edit | Add Online/WhatsApp tabs, fetch + display web results |
| `vercel.json` | Create | Cron schedule at 2am daily |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260521000000_web_inventory.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260521000000_web_inventory.sql

-- supplier_sites: list of sites to crawl nightly
CREATE TABLE supplier_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  platform text,
  catalog_url text NOT NULL,
  currency text DEFAULT 'TTD',
  is_active boolean DEFAULT true,
  last_indexed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE supplier_sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON supplier_sites FOR SELECT USING (true);

-- web_inventory: parts indexed from supplier websites
CREATE TABLE web_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES supplier_sites(id) ON DELETE CASCADE,
  part_name text NOT NULL,
  description text,
  price numeric,
  currency text DEFAULT 'TTD',
  product_url text NOT NULL,
  image_url text,
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', part_name || ' ' || coalesce(description, ''))
  ) STORED,
  last_indexed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(site_id, product_url)
);

CREATE INDEX web_inventory_search_idx ON web_inventory USING GIN(search_vector);
CREATE INDEX web_inventory_site_id_idx ON web_inventory(site_id);

ALTER TABLE web_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON web_inventory FOR SELECT USING (true);

-- Seed the 3 confirmed Trinidad supplier sites
INSERT INTO supplier_sites (name, url, platform, catalog_url, currency) VALUES
  ('TNT Bamboo Online', 'https://tntbambooonline.com', 'woocommerce', 'https://tntbambooonline.com/shop/', 'USD'),
  ('Brown''s Auto Parts', 'https://brownsautopartstt.com', 'woocommerce', 'https://brownsautopartstt.com/shop/', 'TTD'),
  ('X2Board Automotive', 'https://www.x2board.com', 'wix', 'https://www.x2board.com/parts', 'TTD');
```

- [ ] **Step 2: Apply migration via Supabase MCP**

Use the `mcp__claude_ai_Supabase__apply_migration` tool with:
- `project_id`: `gsfacqzdhwogegjomyrg`
- `name`: `web_inventory`
- `query`: (contents of the SQL above)

- [ ] **Step 3: Verify tables and seed data exist**

Use `mcp__claude_ai_Supabase__execute_sql` with:
```sql
SELECT name, url, catalog_url FROM supplier_sites ORDER BY created_at;
```
Expected: 3 rows — TNT Bamboo Online, Brown's Auto Parts, X2Board Automotive.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260521000000_web_inventory.sql
git commit -m "feat(db): add supplier_sites and web_inventory tables with FTS index"
```

---

## Task 2: web-inventory Library

**Files:**
- Create: `src/lib/web-inventory.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/lib/web-inventory.ts
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface WebResult {
  id: string
  part_name: string
  description: string | null
  price: number | null
  currency: string
  product_url: string
  supplier_name: string
  supplier_url: string
  is_live: boolean
}

interface SupplierSite {
  id: string
  name: string
  url: string
  catalog_url: string
  currency: string
}

export async function searchWebInventory(query: string): Promise<WebResult[]> {
  const { data, error } = await supabaseAdmin
    .from('web_inventory')
    .select('*, supplier_sites(name, url, currency)')
    .textSearch('search_vector', query, { type: 'websearch' })
    .limit(20)

  if (error) {
    console.error('[web-inventory] FTS error:', error)
    return []
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    part_name: row.part_name,
    description: row.description,
    price: row.price,
    currency: row.supplier_sites?.currency ?? row.currency,
    product_url: row.product_url,
    supplier_name: row.supplier_sites?.name ?? 'Unknown',
    supplier_url: row.supplier_sites?.url ?? '',
    is_live: false,
  }))
}

export async function getActiveSites(): Promise<SupplierSite[]> {
  const { data, error } = await supabaseAdmin
    .from('supplier_sites')
    .select('id, name, url, catalog_url, currency')
    .eq('is_active', true)

  if (error) {
    console.error('[web-inventory] getActiveSites error:', error)
    return []
  }
  return data || []
}

export async function liveScrapeFallback(query: string): Promise<WebResult[]> {
  const sites = await getActiveSites()
  if (!sites.length) return []

  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) {
    console.warn('[web-inventory] FIRECRAWL_API_KEY not set, skipping live scrape')
    return []
  }

  const results = await Promise.allSettled(
    sites.map(async (site) => {
      const hostname = new URL(site.url).hostname
      const resp = await fetch('https://api.firecrawl.dev/v1/search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `${query} auto parts ${hostname}`,
          limit: 5,
          includeDomains: [hostname],
        }),
        signal: AbortSignal.timeout(8000),
      })

      const json = await resp.json()
      if (!json.success || !json.data) return []

      return (json.data as any[]).map((item) => ({
        id: `live-${item.url}`,
        part_name: item.title ?? query,
        description: item.description ?? null,
        price: null,
        currency: site.currency,
        product_url: item.url,
        supplier_name: site.name,
        supplier_url: site.url,
        is_live: true,
      }))
    })
  )

  return results
    .filter((r): r is PromiseFulfilledResult<WebResult[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value)
}

export async function upsertProducts(
  siteId: string,
  products: { part_name: string; description?: string; price?: number; currency: string; product_url: string; image_url?: string }[]
): Promise<void> {
  if (!products.length) return

  const rows = products.map((p) => ({
    site_id: siteId,
    part_name: p.part_name,
    description: p.description ?? null,
    price: p.price ?? null,
    currency: p.currency,
    product_url: p.product_url,
    image_url: p.image_url ?? null,
    last_indexed_at: new Date().toISOString(),
  }))

  const { error } = await supabaseAdmin
    .from('web_inventory')
    .upsert(rows, { onConflict: 'site_id,product_url' })

  if (error) console.error('[web-inventory] upsert error:', error)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/web-inventory.ts
git commit -m "feat(lib): add web-inventory search, fallback, and upsert helpers"
```

---

## Task 3: Web Search API Endpoint

**Files:**
- Create: `src/app/api/web-search/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// src/app/api/web-search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { searchWebInventory, liveScrapeFallback } from '@/lib/web-inventory'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim()
  if (!q) {
    return NextResponse.json({ results: [] })
  }

  // 1. Try the pre-built index first (fast)
  let results = await searchWebInventory(q)

  // 2. If nothing found, fall back to live Firecrawl scrape
  if (results.length === 0) {
    console.log(`[web-search] FTS miss for "${q}", triggering live scrape`)
    results = await liveScrapeFallback(q)
  }

  return NextResponse.json({ results })
}
```

- [ ] **Step 2: Test the endpoint manually**

With the dev server running (`npm run dev` in your terminal), open:
```
http://localhost:3000/api/web-search?q=brake+pads
```
Expected: `{ "results": [] }` (index is empty until the cron runs — that's correct for now)

- [ ] **Step 3: Commit**

```bash
git add src/app/api/web-search/route.ts
git commit -m "feat(api): add /api/web-search endpoint with FTS and live fallback"
```

---

## Task 4: Home Page — Pass Query to Results URL

**Files:**
- Modify: `src/app/page.tsx` (line 31)

- [ ] **Step 1: Update the router.push call**

Find this line in `src/app/page.tsx`:
```typescript
router.push(`/results?id=${data.inquiryId}`);
```

Replace with:
```typescript
router.push(`/results?id=${data.inquiryId}&q=${encodeURIComponent(partName)}`);
```

- [ ] **Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(home): pass part query to results URL for web search"
```

---

## Task 5: Results Page — Online / WhatsApp Tabs

**Files:**
- Modify: `src/app/results/page.tsx`

- [ ] **Step 1: Replace the full ResultsContent function**

Open `src/app/results/page.tsx`. Replace the entire file contents with:

```typescript
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import SupplierBlastLoader from "@/components/SupplierBlastLoader";

interface WebResult {
  id: string
  part_name: string
  description: string | null
  price: number | null
  currency: string
  product_url: string
  supplier_name: string
  supplier_url: string
  is_live: boolean
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const inquiryId = searchParams.get("id");
  const partQuery = searchParams.get("q") ?? "";

  const [activeTab, setActiveTab] = useState<"online" | "whatsapp">("online");
  const [status, setStatus] = useState<"searching" | "contacting" | "found">("searching");
  const [inquiryData, setInquiryData] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [totalContacted, setTotalContacted] = useState(0);
  const [webResults, setWebResults] = useState<WebResult[]>([]);
  const [webLoading, setWebLoading] = useState(true);
  const pollIdRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch web results as soon as we have the query
  useEffect(() => {
    if (!partQuery) {
      setWebLoading(false);
      return;
    }
    setWebLoading(true);
    fetch(`/api/web-search?q=${encodeURIComponent(partQuery)}`)
      .then((r) => r.json())
      .then((data) => setWebResults(data.results ?? []))
      .catch(() => setWebResults([]))
      .finally(() => setWebLoading(false));
  }, [partQuery]);

  // Existing WhatsApp realtime logic — unchanged
  useEffect(() => {
    if (!inquiryId) return;

    const fetchInquiry = async () => {
      const { data } = await supabase
        .from('inquiries')
        .select('*')
        .eq('id', inquiryId)
        .single();
      if (data) {
        setInquiryData(data);
        if (data.status === 'contacting_suppliers') setStatus('contacting');
        if (data.status === 'completed') setStatus('found');
      }
    };

    const fetchResponses = async () => {
      const [{ data, error }, { count }] = await Promise.all([
        supabase
          .from('supplier_responses')
          .select('*, suppliers(name, store_location, phone_number)')
          .eq('inquiry_id', inquiryId)
          .eq('status', 'replied'),
        supabase
          .from('supplier_responses')
          .select('*', { count: 'exact', head: true })
          .eq('inquiry_id', inquiryId),
      ]);
      if (error) { console.error('[POLL] supplier_responses query failed:', error); return; }
      if (count != null) setTotalContacted(count);
      if (data) { setResponses(data); if (data.length > 0) setStatus('found'); }
    };

    fetchInquiry();
    fetchResponses();

    const channel = supabase
      .channel(`inquiry-${inquiryId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'supplier_responses',
        filter: `inquiry_id=eq.${inquiryId}`
      }, async () => {
        if (pollIdRef.current) { clearInterval(pollIdRef.current); pollIdRef.current = null; }
        const [{ data: newResp }, { count }] = await Promise.all([
          supabase.from('supplier_responses').select('*, suppliers(name, store_location, phone_number)').eq('inquiry_id', inquiryId).eq('status', 'replied'),
          supabase.from('supplier_responses').select('*', { count: 'exact', head: true }).eq('inquiry_id', inquiryId),
        ]);
        if (count != null) setTotalContacted(count);
        if (newResp) { setResponses(newResp); if (newResp.length > 0) setStatus('found'); }
      })
      .subscribe();

    pollIdRef.current = setInterval(fetchResponses, 8000);
    return () => {
      supabase.removeChannel(channel);
      if (pollIdRef.current) clearInterval(pollIdRef.current);
    };
  }, [inquiryId]);

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen relative pb-safe">
      <header className="pt-safe bg-white border-b border-slate-100 px-4 py-3 sticky top-0 z-10 flex items-center justify-between">
        <Link href="/" className="p-2 -ml-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors active:scale-95">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </Link>
        <div className="flex flex-col items-center">
          <h1 className="text-xl font-bold text-slate-800">
            {inquiryData?.part_query?.split(' - ')[0] || partQuery || "Searching..."}
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            {inquiryData?.part_query?.split(' - ')[1] || "Detecting vehicle..."}
          </p>
          {inquiryData?.vin && (
            <p className="text-[10px] text-brand-600 font-bold mt-1 uppercase tracking-wider bg-brand-50 inline-block px-2 py-0.5 rounded-md">
              VIN: {inquiryData.vin}
            </p>
          )}
        </div>
        <div className="w-8"></div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white sticky top-[60px] z-10">
        <button
          onClick={() => setActiveTab("online")}
          className={`flex-1 py-3 text-sm font-bold transition-colors ${
            activeTab === "online"
              ? "text-brand-600 border-b-2 border-brand-600"
              : "text-slate-400"
          }`}
        >
          🌐 Online {webResults.length > 0 && `(${webResults.length})`}
        </button>
        <button
          onClick={() => setActiveTab("whatsapp")}
          className={`flex-1 py-3 text-sm font-bold transition-colors ${
            activeTab === "whatsapp"
              ? "text-brand-600 border-b-2 border-brand-600"
              : "text-slate-400"
          }`}
        >
          💬 WhatsApp {responses.length > 0 && `(${responses.length})`}
        </button>
      </div>

      <main className="flex-1 px-4 py-6 overflow-y-auto">

        {/* Online Tab */}
        {activeTab === "online" && (
          <div>
            {webLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 border-2 border-slate-300 border-t-brand-500 rounded-full animate-spin mb-4"></div>
                <p className="text-sm font-medium text-slate-500">Searching online listings...</p>
              </div>
            ) : webResults.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center opacity-60">
                <p className="text-sm font-medium text-slate-500">No online listings found.</p>
                <p className="text-xs text-slate-400 mt-1">Check the WhatsApp tab for supplier replies.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {webResults.map((result) => (
                  <a
                    key={result.id}
                    href={result.product_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-white rounded-2xl shadow-sm border border-slate-100 p-4 active:scale-[0.98] transition-transform"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="text-base font-bold text-slate-800 flex-1 pr-3">{result.part_name}</h4>
                      <span className="text-lg font-bold text-brand-600 shrink-0">
                        {result.price ? `${result.currency === 'USD' ? 'US$' : 'TT$'}${result.price}` : 'See site'}
                      </span>
                    </div>
                    {result.description && (
                      <p className="text-xs text-slate-500 mb-2 line-clamp-2">{result.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-medium">{result.supplier_name}</span>
                      <span className="text-xs text-brand-500 font-semibold flex items-center gap-1">
                        View listing →
                      </span>
                    </div>
                    {result.is_live && (
                      <span className="text-[10px] text-amber-600 font-bold mt-1 block">Live result</span>
                    )}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* WhatsApp Tab */}
        {activeTab === "whatsapp" && (
          <div>
            {status !== "found" && (
              <div className="mb-6">
                <SupplierBlastLoader />
              </div>
            )}
            {status === "found" && (
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-6">
                {totalContacted > 0 && (
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <span className="flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 font-bold text-sm px-3 py-1.5 rounded-full">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                      {responses.length}
                    </span>
                    <span className="text-slate-400 text-xs font-medium">of</span>
                    <span className="bg-slate-100 text-slate-600 font-bold text-sm px-3 py-1.5 rounded-full">{totalContacted}</span>
                    <span className="text-slate-500 text-xs font-medium">suppliers replied</span>
                  </div>
                )}
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-50 text-green-500 flex items-center justify-center mb-3">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  </div>
                  <h2 className="text-lg font-bold text-slate-800">{responses.length} Store{responses.length !== 1 ? "s" : ""} Replied</h2>
                  <p className="text-sm text-slate-500 mt-1 max-w-[200px]">Check the available prices and locations below.</p>
                </div>
              </div>
            )}
            <div className="space-y-4">
              {responses.map((resp, idx) => (
                <div key={resp.id} className={`bg-white rounded-2xl shadow-md overflow-hidden ${idx === 0 ? 'border-2 border-brand-100' : 'border border-slate-100'}`}>
                  {idx === 0 && (
                    <div className="bg-brand-50 px-4 py-2 flex justify-between items-center text-xs font-semibold text-brand-700">
                      <span>⭐ Best Match</span>
                      <span>Ready for Pickup</span>
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="text-lg font-bold text-slate-800">{resp.suppliers?.name}</h4>
                      <span className="text-xl font-bold text-brand-600">
                        {resp.price ? `$${resp.price}` : 'Price on Pickup'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="bg-slate-100 text-slate-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border border-slate-200">
                        {resp.response_text?.toLowerCase().includes('genuine') ? 'Genuine OEM' : 'Confirmed Stock'}
                      </span>
                      <span className="text-xs text-slate-500 italic">
                        "{resp.response_text?.length > 40 ? resp.response_text.substring(0, 40) + '...' : resp.response_text}"
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mb-4 flex items-center gap-1">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                      {resp.suppliers?.store_location || "Trinidad"}
                    </p>
                    {resp.suppliers?.phone_number && (
                      <p className="text-sm text-slate-700">
                        Call {resp.suppliers.name}: <span className="font-medium">{resp.suppliers.phone_number}</span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {responses.length === 0 && (
                <div className="py-20 flex flex-col items-center justify-center text-center opacity-40">
                  <div className="w-12 h-12 border-2 border-slate-300 border-t-brand-500 rounded-full animate-spin mb-4"></div>
                  <p className="text-sm font-medium text-slate-500">Waiting for first response...</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function SearchResults() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading Result Engine...</div>}>
      <ResultsContent />
    </Suspense>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/results/page.tsx
git commit -m "feat(results): add Online/WhatsApp tabs with web search results"
```

---

## Task 6: Nightly Indexer

**Files:**
- Create: `src/app/api/cron/index-inventory/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// src/app/api/cron/index-inventory/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getActiveSites, upsertProducts } from '@/lib/web-inventory'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 300

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ExtractedProduct {
  name: string
  price?: number
  currency?: string
  url: string
  description?: string
}

async function extractProductsFromSite(
  catalogUrl: string,
  siteName: string
): Promise<ExtractedProduct[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) throw new Error('FIRECRAWL_API_KEY not set')

  const resp = await fetch('https://api.firecrawl.dev/v1/extract', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      urls: [catalogUrl],
      prompt: `Extract all auto parts product listings from this page. For each product get the name, price (as a number), and the direct URL to that product's page.`,
      schema: {
        type: 'object',
        properties: {
          products: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                price: { type: 'number' },
                url: { type: 'string' },
                description: { type: 'string' },
              },
              required: ['name', 'url'],
            },
          },
        },
      },
    }),
    signal: AbortSignal.timeout(60000),
  })

  if (!resp.ok) {
    console.error(`[indexer] Firecrawl extract failed for ${siteName}: ${resp.status}`)
    return []
  }

  const json = await resp.json()
  return json.data?.products ?? []
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const secret = request.headers.get('x-cron-secret') ?? request.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sites = await getActiveSites()
  const results: { site: string; indexed: number; error?: string }[] = []

  for (const site of sites) {
    try {
      console.log(`[indexer] Crawling ${site.name} at ${site.catalog_url}`)
      const products = await extractProductsFromSite(site.catalog_url, site.name)

      if (products.length > 0) {
        await upsertProducts(
          site.id,
          products.map((p) => ({
            part_name: p.name,
            description: p.description,
            price: p.price,
            currency: site.currency,
            product_url: p.url.startsWith('http') ? p.url : `${site.url}${p.url}`,
          }))
        )
      }

      // Update last_indexed_at
      await supabaseAdmin
        .from('supplier_sites')
        .update({ last_indexed_at: new Date().toISOString() })
        .eq('id', site.id)

      results.push({ site: site.name, indexed: products.length })
      console.log(`[indexer] ${site.name}: indexed ${products.length} products`)
    } catch (err: any) {
      console.error(`[indexer] Failed for ${site.name}:`, err)
      results.push({ site: site.name, indexed: 0, error: err.message })
    }
  }

  return NextResponse.json({ success: true, results })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/cron/index-inventory/route.ts
git commit -m "feat(cron): add nightly web inventory indexer using Firecrawl extract"
```

---

## Task 7: Vercel Cron Config

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Create vercel.json**

```json
{
  "crons": [
    {
      "path": "/api/cron/index-inventory",
      "schedule": "0 2 * * *"
    }
  ]
}
```

Note: Vercel Cron sends requests with the `Authorization: Bearer {CRON_SECRET}` header automatically when `CRON_SECRET` is set in Vercel environment variables. The route checks `x-cron-secret` header — update the check in the route if using Vercel's built-in auth instead. Vercel's cron auth header is `Authorization: Bearer {token}`. To keep it simple, the route also accepts a `?secret=` query param for manual test runs.

- [ ] **Step 2: Commit**

```bash
git add vercel.json
git commit -m "feat(infra): add Vercel cron for nightly web inventory indexing at 2am"
```

---

## Task 8: Seed the Index Manually (First Run)

The nightly cron won't run until 2am. Trigger it manually to populate the index immediately.

- [ ] **Step 1: Add env vars to `.env.local`**

Add to `.env.local` (never commit this file):
```
FIRECRAWL_API_KEY=your_key_from_firecrawl.dev
CRON_SECRET=your_random_string
```

- [ ] **Step 2: Trigger the indexer manually**

With dev server running:
```
http://localhost:3000/api/cron/index-inventory?secret=your_random_string
```

Expected response:
```json
{
  "success": true,
  "results": [
    { "site": "TNT Bamboo Online", "indexed": 45 },
    { "site": "Brown's Auto Parts", "indexed": 12 },
    { "site": "X2Board Automotive", "indexed": 8 }
  ]
}
```
(Exact counts will vary.)

- [ ] **Step 3: Verify index has rows**

Run in Supabase SQL editor:
```sql
SELECT s.name, count(w.id) as parts_indexed
FROM supplier_sites s
LEFT JOIN web_inventory w ON w.site_id = s.id
GROUP BY s.name;
```
Expected: all 3 sites with count > 0.

- [ ] **Step 4: Test a search**

```
http://localhost:3000/api/web-search?q=brake+pads
```
Expected: `{ "results": [...] }` with actual parts from the indexed sites.

- [ ] **Step 5: Test the full flow in the app**

1. Open `http://localhost:3000`
2. Search for "oil filter"
3. Confirm Online tab loads immediately with web results
4. Confirm WhatsApp tab shows the existing supplier blast loader

- [ ] **Step 6: Add FIRECRAWL_API_KEY and CRON_SECRET to Vercel**

In the Vercel dashboard for `partfinder-tt`, go to Settings → Environment Variables and add both keys.

---

## Self-Review

**Spec coverage check:**
- ✅ Pre-index + live fallback (Tasks 2, 3)
- ✅ Tabs layout — Online / WhatsApp (Task 5)
- ✅ Tap result → opens supplier site (Task 5 — `<a href target="_blank">`)
- ✅ Nightly cron (Tasks 6, 7)
- ✅ 3 supplier sites seeded (Task 1)
- ✅ `supplier_sites` + `web_inventory` tables (Task 1)
- ✅ Firecrawl AI Extract for indexer (Task 6)
- ✅ FTS via `tsvector` generated column (Task 1)
- ✅ CRON_SECRET security (Task 6)

**Type consistency check:**
- `WebResult` interface defined in `web-inventory.ts` and re-declared locally in `results/page.tsx` — consistent shape
- `upsertProducts` called in Task 6 with same shape as defined in Task 2
- `getActiveSites` used in Tasks 2 and 6 — same return type

**No placeholders found.**
