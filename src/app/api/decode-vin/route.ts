import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const nhtsaCache = new Map<string, NhtsaDecodeResult>()

type VehicleResult = {
  vin: string | null
  year: number | null
  brand: string | null
  name: string | null
  model_code: string | null
  body: string | null
  engine: string | null
  year_start?: number | null
  year_end?: number | null
  drivetrain?: string | null
}

type NhtsaDecodeResult = {
  source: 'nhtsa'
  vehicle: VehicleResult
  raw: unknown
}

const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/
const CHASSIS_RE = /^[A-Z0-9]{2,8}-[0-9]{5,8}$/

function mapNhtsa(r: Record<string, string>, vin: string): NhtsaDecodeResult {
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

    if (body.input === undefined || body.input === null || typeof body.input !== 'string') {
      return NextResponse.json({ error: 'input is required and must be a string' }, { status: 400 })
    }

    const input = body.input.replace(/\s+/g, '').toUpperCase()

    if (!input) {
      return NextResponse.json({ error: 'input is required and must be a string' }, { status: 400 })
    }

    // ── 17-char VIN → NHTSA ──────────────────────────────────────────────
    if (VIN_RE.test(input)) {
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

    // ── JDM chassis (PREFIX-SERIAL) → chassis_codes table ────────────────
    if (CHASSIS_RE.test(input)) {
      const prefix = input.split('-')[0]
      const { data, error } = await serviceClient
        .from('chassis_codes')
        .select('*')
        .eq('prefix', prefix)
        .maybeSingle()

      if (error || !data) {
        return NextResponse.json({
          source: 'none',
          vehicle: null,
          error: 'Chassis prefix not in database',
        })
      }

      return NextResponse.json({
        source: 'chassis_db',
        vehicle: {
          brand: data.brand,
          name: data.name,
          engine: data.engine ?? null,
          body: data.body ?? null,
          year_start: data.year_start ?? null,
          year_end: data.year_end ?? null,
          drivetrain: data.drivetrain ?? null,
          model_code: data.prefix,
          vin: null,
          year: null,
        },
      })
    }

    // ── Unrecognized format ───────────────────────────────────────────────
    return NextResponse.json({
      source: 'none',
      vehicle: null,
      error: 'Format not recognized. Provide a 17-character VIN or a JDM chassis number with dash (e.g., NZE141-1234567).',
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: 'decode failed' }, { status: 500 })
  }
}
