import { scrapeCatalog } from '@/lib/partsouq-firecrawl'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// The catalog scrape makes a few Firecrawl calls (search -> vehicle -> groups).
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

    // Persist the catalog (categories) if a vehicle_id was provided.
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
    }

    return NextResponse.json({ query, categoryCount: categories.length, categories })
  } catch (err) {
    console.error('[partsouq-search]', err)
    return NextResponse.json({ error: 'catalog scrape failed' }, { status: 500 })
  }
}
