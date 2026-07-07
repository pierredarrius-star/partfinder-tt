import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { decodeVehicle } from '@/lib/partsouq-firecrawl'
import { lookupColorName } from '@/lib/color-codes'

// PartSouq fallback fetches via Firecrawl (a few seconds); give the route room.
export const maxDuration = 30

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

// PartSouq API decode (1 Firecrawl credit) — the fallback when NHTSA and the
// hand-built chassis_codes table both miss (typical for JDM imports). Writes the
// resolved chassis back into chassis_codes so the NEXT lookup of that prefix is
// free. Returns null on failure so the caller records the miss as before.
async function partsouqFallback(
  input: string,
  format: 'vin' | 'chassis',
) {
  const decoded = await decodeVehicle(input)
  if (!decoded || (!decoded.brand && !decoded.name)) return null

  const prefix = (decoded.chassis ?? '').toUpperCase()
  if (prefix) {
    // Best-effort cache-back; a writeback failure must never break the decode.
    const { error } = await serviceClient
      .from('chassis_codes')
      .upsert(
        {
          prefix,
          brand: decoded.brand,
          name: decoded.name,
          engine: decoded.engine,
          body: decoded.body,
          year_start: decoded.year,
          year_end: decoded.year,
        },
        { onConflict: 'prefix' },
      )
    if (error) console.warn('[decode-vin] chassis_codes writeback skipped:', error.message)
  }

  return {
    source: 'partsouq' as const,
    vehicle: {
      vin: format === 'vin' ? input : null,
      year: decoded.year,
      brand: decoded.brand,
      name: decoded.name,
      model_code: prefix || decoded.modelCode,
      body: decoded.body,
      engine: decoded.engine,
      color_code: decoded.colorCode,
      color_name: lookupColorName(decoded.brand, decoded.colorCode),
    },
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
        if (out.vehicle?.brand) {
          nhtsaCache.set(input, out)
          return NextResponse.json(out)
        }
        // NHTSA doesn't cover this VIN (typical JDM import) → try PartSouq.
        const psq = await partsouqFallback(input, 'vin')
        if (psq) return NextResponse.json(psq)
        try { await serviceClient.from('decode_misses').insert({ input, format_detected: 'vin', reason: 'jdm_or_unsupported_vin' }) } catch { /* best-effort */ }
        return NextResponse.json({ source: 'none', vehicle: null, error: 'jdm_or_unsupported_vin', raw: data })
      } catch (err: unknown) {
        // NHTSA unreachable → still try PartSouq before giving up.
        const psq = await partsouqFallback(input, 'vin')
        if (psq) return NextResponse.json(psq)
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
        // Not in the hand-built table → PartSouq (and cache it back for next time).
        const psq = await partsouqFallback(input, 'chassis')
        if (psq) return NextResponse.json(psq)
        try { await serviceClient.from('decode_misses').insert({ input, format_detected: 'chassis', reason: 'chassis_prefix_missing' }) } catch { /* best-effort */ }
        return NextResponse.json({
          source: 'none',
          vehicle: null,
          error: 'chassis_prefix_missing',
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
    try { await serviceClient.from('decode_misses').insert({ input, format_detected: 'unknown', reason: 'format_invalid' }) } catch { /* best-effort */ }
    return NextResponse.json({
      source: 'none',
      vehicle: null,
      error: 'format_invalid',
      message: 'Format not recognized. Provide a 17-character VIN or a JDM chassis number with dash (e.g., NZE141-1234567).',
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: 'decode failed' }, { status: 500 })
  }
}
