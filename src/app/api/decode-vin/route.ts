import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Using service role for now since chassis_lookup doesn't exist yet and has no RLS.
// Revisit: switch to anon client + RLS policies once the table is created.
const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Module-level cache keyed by VIN — lives for the serverless instance lifetime
const nhtsaCache = new Map<string, DecodeResult>()

type VehicleResult = {
  vin: string | null
  year: number | null
  brand: string | null
  name: string | null
  model_code: string | null
  body: string | null
  engine: string | null
}

type DecodeResult = {
  source: 'nhtsa' | 'chassis_lookup' | null
  vehicle: VehicleResult | null
  raw: unknown
}

function mapNhtsa(r: Record<string, string>, vin: string): DecodeResult {
  const year = parseInt(r.ModelYear, 10)
  const brand = r.Make?.toLowerCase().trim() || null
  const name = r.Model?.toLowerCase().trim() || null
  const body = r.BodyClass?.toLowerCase().trim() || null

  const engineParts: string[] = []
  const disp = parseFloat(r.DisplacementL)
  if (r.DisplacementL && !isNaN(disp)) engineParts.push(`${disp.toFixed(1)}L`)
  if (r.EngineCylinders?.trim()) engineParts.push(`${r.EngineCylinders.trim()}-cyl`)

  return {
    source: 'nhtsa',
    vehicle: {
      vin,
      year: isNaN(year) ? null : year,
      brand,
      name,
      model_code: null,
      body,
      engine: engineParts.length > 0 ? engineParts.join(' ') : null,
    },
    raw: r,
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const input = String(body.input ?? '').toUpperCase().trim()

    if (!input) {
      return NextResponse.json({ source: null, vehicle: null, raw: { error: 'Empty input' } })
    }

    // ── 17-char VIN → NHTSA ──────────────────────────────────────────────
    if (input.length === 17) {
      if (nhtsaCache.has(input)) {
        return NextResponse.json(nhtsaCache.get(input))
      }

      try {
        const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${input}?format=json`
        const res = await fetch(url)
        if (!res.ok) throw new Error(`NHTSA HTTP ${res.status}`)
        const data = await res.json()
        const result: Record<string, string> = data?.Results?.[0] ?? {}

        const out = mapNhtsa(result, input)
        // Only consider it a successful decode if NHTSA returned a brand.
        // Empty Make means VIN was syntactically valid but unrecognized.
        if (!out.vehicle?.brand) {
          return NextResponse.json({ source: null, vehicle: null, raw: data })
        }
        nhtsaCache.set(input, out)
        return NextResponse.json(out)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'NHTSA fetch failed'
        return NextResponse.json({ source: null, vehicle: null, raw: { error: msg } })
      }
    }

    // ── Non-17-char → chassis_lookup table ───────────────────────────────
    const prefix = input.slice(0, 5)
    try {
      const { data, error } = await serviceClient
        .from('chassis_lookup')
        .select('*')
        .eq('chassis_prefix', prefix)
        .maybeSingle()

      if (error || !data) {
        return NextResponse.json({
          source: null,
          vehicle: null,
          raw: { error: error?.message ?? 'No chassis match' },
        })
      }

      return NextResponse.json({
        source: 'chassis_lookup' as const,
        vehicle: {
          vin: null,
          year: data.year ?? null,
          brand: typeof data.brand === 'string' ? data.brand.toLowerCase() : null,
          name: typeof data.name === 'string' ? data.name.toLowerCase() : null,
          model_code: data.model_code ?? null,
          body: typeof data.body === 'string' ? data.body.toLowerCase() : null,
          engine: data.engine ?? null,
        },
        raw: data,
      })
    } catch {
      // Table doesn't exist yet — fail gracefully
      return NextResponse.json({
        source: null,
        vehicle: null,
        raw: { error: 'chassis_lookup table not found or query failed' },
      })
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ source: null, vehicle: null, raw: { error: msg } })
  }
}
