import { scrapeCategoryParts } from '@/lib/partsouq-firecrawl'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// One category page = one Firecrawl JSON-extraction call (~5-15s).
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const { vehicle_id, category_name, category_url } = await req.json()
  if (!vehicle_id || !category_name || !category_url) {
    return NextResponse.json(
      { error: 'vehicle_id, category_name and category_url are required' },
      { status: 400 },
    )
  }

  try {
    const parts = await scrapeCategoryParts(category_url)

    // Replace this category's parts for the vehicle (idempotent re-scrape).
    await serviceClient
      .from('vehicle_oem_parts')
      .delete()
      .eq('vehicle_id', vehicle_id)
      .eq('category_name', category_name)

    if (parts.length === 0) {
      return NextResponse.json({ vehicle_id, category_name, partCount: 0 })
    }

    const { error } = await serviceClient.from('vehicle_oem_parts').insert(
      parts.map((p) => ({
        vehicle_id,
        category_name,
        part_number: p.part_number,
        part_name: p.part_name,
        remarks: p.remarks,
      })),
    )
    if (error) {
      console.error('[scrape-category] insert', error)
      return NextResponse.json({ error: 'db insert failed' }, { status: 500 })
    }

    return NextResponse.json({ vehicle_id, category_name, partCount: parts.length })
  } catch (err) {
    console.error('[scrape-category]', err)
    return NextResponse.json({ error: 'category scrape failed' }, { status: 500 })
  }
}
