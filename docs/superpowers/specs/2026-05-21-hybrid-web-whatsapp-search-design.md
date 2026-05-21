# Hybrid Web + WhatsApp Part Search — Design Spec

**Date:** 2026-05-21
**Status:** Approved
**Author:** Darrius + Claude Code

---

## Overview

PartFinder TT currently blasts all suppliers via WhatsApp and waits for human replies. This works but has latency — users wait 30+ seconds for first results. The hybrid search adds a second, instant track: a pre-indexed database of Trinidad supplier websites searched via Postgres full-text search. Both tracks run in parallel; the results page shows them in separate tabs.

---

## Decisions Made

| Decision | Choice | Reason |
|---|---|---|
| Web search timing | Pre-index nightly + live scrape fallback | Speed for users; fresh fallback when index misses |
| Results layout | Tabs (Online / WhatsApp) | Cleanest separation; user knows what they're looking at |
| Tap a web result | Opens supplier's website directly | Simple; no need to keep user in app for web listings |
| Scraping tool | Firecrawl AI Extract | Already available; handles JS-rendered sites; structured output |
| Index storage | Supabase `web_inventory` with tsvector FTS | Already on Supabase; Postgres FTS is free and fast |

---

## Supplier Sites (Seed Data)

Research confirmed 3 Trinidad auto parts sites with real scrapeable online catalogs:

| Site | Type | Platform | Currency |
|---|---|---|---|
| tntbambooonline.com | Used parts (body, engine, lighting, interior) | WooCommerce | USD / EC$ |
| brownsautopartstt.com | New parts (filters, oils, consumables) | WooCommerce | TTD |
| x2board.com | New parts (small inventory, OEM filters) | Wix | TTD |

All others found (ausco-tt.com, alltradeenterprises.com) are contact/quote-only — no online catalog. New sites are added by inserting a row into `supplier_sites`.

---

## Architecture

Two tracks fire in parallel on every search:

**Track 1 — Web Index**
1. Normalize query with Gemini (same as today)
2. FTS query on `web_inventory` — returns in <200ms
3. If 0 results → live Firecrawl scrape of 3 sites as fallback (~5s)
4. Return `webResults[]` in `/api/search` response
5. Results page shows them in "Online" tab immediately

**Track 2 — WhatsApp Blast (unchanged)**
1. Create inquiry in Supabase
2. WAHA blasts all active suppliers
3. Suppliers reply → webhook → Gemini parses → `supplier_responses` updated
4. Results page streams replies in "WhatsApp" tab via realtime subscription

**Nightly Indexer (background)**
- Vercel Cron at 2am daily → `/api/cron/index-inventory`
- For each active `supplier_sites` row: Firecrawl crawls catalog URL, AI extracts part name + price + product URL per listing
- Upserts into `web_inventory`
- Updates `last_indexed_at` on each site row
- Secured with `CRON_SECRET` env var check

---

## Database Schema

### New table: `supplier_sites`

```sql
CREATE TABLE supplier_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  platform text, -- 'woocommerce', 'wix', 'shopify'
  catalog_url text NOT NULL, -- URL of the shop/catalog page to crawl
  currency text DEFAULT 'TTD',
  is_active boolean DEFAULT true,
  last_indexed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- RLS: public SELECT (same pattern as suppliers table)
ALTER TABLE supplier_sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON supplier_sites FOR SELECT USING (true);
```

### New table: `web_inventory`

```sql
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

-- Indexes
CREATE INDEX web_inventory_search_idx ON web_inventory USING GIN(search_vector);
CREATE INDEX web_inventory_site_id_idx ON web_inventory(site_id);

-- RLS: public SELECT
ALTER TABLE web_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON web_inventory FOR SELECT USING (true);
```

### Seed data

```sql
INSERT INTO supplier_sites (name, url, platform, catalog_url, currency) VALUES
  ('TNT Bamboo Online', 'https://tntbambooonline.com', 'woocommerce', 'https://tntbambooonline.com/shop/', 'USD'),
  ('Brown''s Auto Parts', 'https://brownsautopartstt.com', 'woocommerce', 'https://brownsautopartstt.com/shop/', 'TTD'),
  ('X2Board Automotive', 'https://www.x2board.com', 'wix', 'https://www.x2board.com/parts', 'TTD');
```

---

## Files Changed

| File | Action | Description |
|---|---|---|
| `src/lib/web-inventory.ts` | Create | `searchWebInventory(query)` — FTS query; `liveScrapeFallback(query)` — Firecrawl live search |
| `src/app/api/cron/index-inventory/route.ts` | Create | Nightly indexer: reads `supplier_sites`, Firecrawl crawl + extract, upserts `web_inventory` |
| `src/app/api/search/route.ts` | Edit | Add parallel web index search; return `webResults` alongside `inquiryId` |
| `src/app/results/page.tsx` | Edit | Add Online/WhatsApp tabs; Online tab shows `webResults` immediately |
| `vercel.json` | Edit | Add cron entry: `{ "path": "/api/cron/index-inventory", "schedule": "0 2 * * *" }` |
| Supabase migration | Create | `supplier_sites` + `web_inventory` tables + indexes + RLS + seed data |

---

## Key Behaviours

- **Online tab loads instantly** — web results come back in the initial `/api/search` response; no waiting
- **WhatsApp tab unchanged** — existing realtime subscription behaviour untouched
- **Live fallback is silent** — user just sees a short spinner on the Online tab; no error if index is empty
- **Tap web result → opens supplier site** — standard browser link, leaves the app
- **Adding new supplier sites** — insert a row into `supplier_sites`; next nightly run picks it up automatically
- **Index stays fresh** — nightly cron re-crawls all sites; stale products are overwritten via `UNIQUE(site_id, product_url)` upsert

---

## Out of Scope

- Admin UI for managing `supplier_sites` (direct DB edit for now)
- Price currency normalisation across TTD / USD (display as-is with currency label)
- Vehicle-aware part fitment filtering (future — the garage intelligence vision)
- WhatsApp confirmation flow for web listings (future)
