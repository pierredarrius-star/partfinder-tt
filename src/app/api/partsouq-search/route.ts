import { scrapeCatalog, scrapeCategoryParts, type OemCategory } from '@/lib/partsouq-firecrawl'
import { createClient } from '@supabase/supabase-js'
import { after, NextRequest, NextResponse } from 'next/server'

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// The most-asked parts — pre-scraped on save (Step 4) so Earl answers them instantly.
// Ordered by how often they're asked: the background scrape may not finish all 12
// within the function budget, so the top of the list caches first.
const COMMON_PART_KEYWORDS = [
  'oil filter', 'brake pad', 'brake disc', 'spark plug', 'air filter',
  'battery', 'wiper', 'fuel filter', 'belt', 'alternator', 'radiator', 'headlight',
]

// Catalog scrape (~13s) returns fast; the common-parts pre-scrape runs in the
// background (after the response) and caches what it can before the budget ends.
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const { vin, frame, vehicle_id } = await req.json()

  // Search by VIN when present, otherwise by frame/chassis number (JDM imports).
  const query = (vin || frame || '').trim()
  if (!query) {
    return NextResponse.json({ error: 'vin or frame required' }, { status: 400 })
  }

  try {
    const categories = await scrapeCatalog(query)

    if (categories.length === 0) {
      return NextResponse.json({ error: 'no vehicle/catalog found', query }, { status: 404 })
    }

    // Persist the catalog if a vehicle_id was given, then kick off the common-parts
    // pre-scrape as background work (runs after the response) so the request returns
    // fast and never times out — it caches as much as it can within the function budget.
    if (vehicle_id) {
      await serviceClient.from('vehicle_oem_catalog').delete().eq('vehicle_id', vehicle_id)
      const { error } = await serviceClient.from('vehicle_oem_catalog').insert(
        categories.map((c) => ({
          vehicle_id,
          category_name: c.name,
          category_url: c.url,
        })),
      )
      if (error) {
        console.error('[partsouq-search] catalog insert', error)
        return NextResponse.json({ error: 'db insert failed' }, { status: 500 })
      }

      after(async () => {
        try {
          const n = await prescrapeCommon(vehicle_id, categories)
          console.log(`[partsouq-search] prescraped ${n} parts for ${vehicle_id}`)
        } catch (err) {
          console.error('[partsouq-search] prescrape background', err)
        }
      })
    }

    return NextResponse.json({
      query,
      categoryCount: categories.length,
      prescrapeQueued: Boolean(vehicle_id),
      categories,
    })
  } catch (err) {
    console.error('[partsouq-search]', err)
    return NextResponse.json({ error: 'catalog scrape failed' }, { status: 500 })
  }
}

// Step 4 — pre-scrape the common parts so they're cached before the user asks.
// Picks the core category per keyword (shortest matching name = the main group,
// not an accessory), skips any already scraped, fetches in chunks of 4 to stay
// inside maxDuration. Best-effort: a failed/slow category is skipped and still
// loads on demand later.
// ponytail: 3rd copy of "scrape a category + store its parts" (also in the
// scrape-category route + chat-earl lazy scrape). Extract into one src/lib helper
// on a cleanup pass.
async function prescrapeCommon(vehicleId: string, categories: OemCategory[]): Promise<number> {
  const picked: OemCategory[] = []
  const seen = new Set<string>()
  for (const kw of COMMON_PART_KEYWORDS) {
    const match = categories
      .filter((c) => c.name.toLowerCase().includes(kw))
      .sort((a, b) => a.name.length - b.name.length)[0]
    if (match && !seen.has(match.name)) {
      seen.add(match.name)
      picked.push(match)
    }
  }
  if (picked.length === 0) return 0

  // Skip categories already scraped (idempotent re-trigger).
  const { data: existing } = await serviceClient
    .from('vehicle_oem_parts')
    .select('category_name')
    .eq('vehicle_id', vehicleId)
    .in('category_name', picked.map((c) => c.name))
  const already = new Set((existing ?? []).map((e) => e.category_name))
  const todo = picked.filter((c) => !already.has(c.name))

  let stored = 0
  for (let i = 0; i < todo.length; i += 4) {
    const counts = await Promise.all(todo.slice(i, i + 4).map((c) => scrapeAndStore(vehicleId, c)))
    stored += counts.reduce((a, b) => a + b, 0)
  }
  return stored
}

async function scrapeAndStore(vehicleId: string, c: OemCategory): Promise<number> {
  try {
    const parts = await scrapeCategoryParts(c.url)
    await serviceClient
      .from('vehicle_oem_parts')
      .delete()
      .eq('vehicle_id', vehicleId)
      .eq('category_name', c.name)
    if (parts.length === 0) return 0
    const { error } = await serviceClient.from('vehicle_oem_parts').insert(
      parts.map((p) => ({
        vehicle_id: vehicleId,
        category_name: c.name,
        part_number: p.part_number,
        part_name: p.part_name,
        remarks: p.remarks,
      })),
    )
    if (error) {
      console.error('[partsouq-search] prescrape insert', c.name, error)
      return 0
    }
    return parts.length
  } catch (err) {
    console.error('[partsouq-search] prescrape', c.name, err)
    return 0
  }
}
