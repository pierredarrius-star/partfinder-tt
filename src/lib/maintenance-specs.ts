/**
 * Verified vehicle maintenance/fluid specs for Earl, keyed on chassis code
 * (the prefix of the frame number — e.g. "NZE144-6008051" -> "NZE144").
 *
 * Why a hand-curated code file (like color-codes.ts) and not a scrape or an API:
 * fluid specs are a "wrong value destroys a gearbox" liability, JDM imports aren't
 * covered by US data APIs, and the correct data can't be auto-extracted without a
 * human check. So this list is small, verified-by-hand, grows one car at a time,
 * and every change is recorded in git history. Each record carries its source.
 *
 * Server-only (read by the chat-earl route). Never import from a client component.
 *
 * Coverage: the most common Trinidad & Tobago cars (see memory tt-common-vehicles).
 * Capacities marked confidence:'unverified' are pending manual confirmation — Earl
 * is told to flag those rather than present them as exact.
 */

export type FluidSpec = {
  name: string
  spec: string
  capacity?: string
  warning?: string
  confidence?: 'verified' | 'unverified' // omitted = verified
}

export type MaintenanceSpec = {
  chassis: string
  label: string
  engine: string
  fluids: FluidSpec[]
  intervals?: string[]
  notes?: string[]
  source: string
}

// Keys MUST be uppercase chassis codes (matched against the frame-number prefix).
export const MAINTENANCE_SPECS: Record<string, MaintenanceSpec> = {
  NZE144: {
    chassis: 'NZE144',
    label: 'Toyota Corolla Axio (E140, 2011–2012, 4WD)',
    engine: '1NZ-FE 1.5L',
    fluids: [
      { name: 'Engine oil', spec: '0W-20 (API SM / ILSAC; 5W-30 or 10W-30 also acceptable)', capacity: '3.4 L drain / 3.7 L with filter' },
      { name: 'Transmission (CVT, Super CVT-i)', spec: 'Toyota Genuine CVT Fluid TC', capacity: '7.98 L total fill; drain-and-fill ≈3.5–4 L (sealed unit)' },
      { name: 'Coolant', spec: 'Toyota Super Long Life Coolant', capacity: '5.8 L' },
      { name: 'Rear differential (4WD only)', spec: 'Hypoid Gear Oil, API GL-5 85W-90', capacity: '0.5 L' },
      { name: 'Transfer case (4WD only)', spec: 'Gear Oil, API GL-5 75W-90', capacity: '0.9 L' },
      { name: 'Brake fluid', spec: 'Toyota Brake Fluid 2500H (DOT3)' },
    ],
    notes: ['NZE144 is the 4WD 1.5L — it has a rear diff and transfer case the 2WD NZE141 does not.'],
    source: "Toyota owner's manual corollaaxio_201104.pdf p.282–289 (manufacturer-verified)",
  },

  TB17: {
    chassis: 'TB17',
    label: 'Nissan Bluebird Sylphy (B17, 2012–2021)',
    engine: 'MRA8DE 1.8L',
    fluids: [
      { name: 'Engine oil', spec: '0W-20 (API SN; Nissan Genuine SN). Oil filter AY100-NS004', capacity: '3.7 L drain / 3.9 L with filter (early build Dec 2012–Feb 2013: 4.0 L)' },
      { name: 'Transmission (Xtronic CVT, RE0F11A)', spec: 'Nissan CVT Fluid NS-3', warning: 'Use NS-3 ONLY — other fluid may damage the CVT (per Nissan).', capacity: 'not published by Nissan — sealed unit, dealer procedure' },
      { name: 'Coolant', spec: 'Nissan Super Long Life Coolant', capacity: '6.6 L (incl. reservoir)' },
      { name: 'Brake fluid', spec: 'Nissan Brake Fluid No.2500 (DOT3)' },
    ],
    intervals: ['Engine oil: 15,000 km / 12 months (severe: 7,500 km / 6 months)'],
    source: 'Nissan official maintenance FAQ #24868 / #24869 (manufacturer-verified)',
  },

  NHP10: {
    chassis: 'NHP10',
    label: 'Toyota Aqua (NHP10, 2011–2021, hybrid)',
    engine: '1NZ-FXE 1.5L hybrid',
    fluids: [
      { name: 'Engine oil', spec: '0W-16 (facelift) / 0W-20 (early); 5W-30 also acceptable', capacity: '3.4 L drain / 3.7 L with filter' },
      { name: 'Transmission (electric CVT — uses ATF)', spec: 'Toyota ATF WS (AISIN AFW+ equivalent)', capacity: '≈3.5 L drain-and-fill (sealed unit)' },
    ],
    notes: ['This is the NHP10 (1st-gen). The 2nd-gen Aqua (MXPK10) takes 0W-8 — do NOT apply that grade here.'],
    source: 'Toyota official maintenance data + corroborating professional-shop records',
  },

  E12: {
    chassis: 'E12',
    label: 'Nissan Note (E12, 2012–2020, 1.2 petrol 2WD)',
    engine: 'HR12DE 1.2L',
    fluids: [
      { name: 'Engine oil', spec: '0W-20 (API SN / ILSAC). Oil filter AY100-NS004', capacity: '3.3 L drain / 3.5 L with filter' },
      { name: 'Transmission (Xtronic CVT)', spec: 'Nissan CVT Fluid NS-3', warning: 'Use NS-3 ONLY — other fluid may damage the CVT (per Nissan).', capacity: '≈6.9 L total (drain-and-fill takes less)' },
    ],
    notes: ['This record is the 1.2 petrol 2WD (E12). The 1.6L NISMO S takes 5W-30 (4.1 L drain / 4.3 L w/ filter); the e-POWER (HE12) and 4WD (NE12) are different — verify separately.'],
    source: 'Nissan official FAQ + parts catalog (manufacturer-verified)',
  },

  NZE161G: {
    chassis: 'NZE161G',
    label: 'Toyota Corolla Fielder (E160, 2012+, 2WD petrol)',
    engine: '1NZ-FE 1.5L',
    fluids: [
      { name: 'Engine oil', spec: '0W-20 (API SP)', capacity: '≈3.4–3.7 L', confidence: 'unverified' },
      { name: 'Transmission (CVT, Super CVT-i)', spec: 'Toyota Genuine CVT Fluid TC', capacity: '≈3.5–4 L per drain (sealed unit)', confidence: 'unverified' },
    ],
    notes: ['Oil grade confirmed; capacities not yet manual-verified. The hybrid Fielder (NKE165G) uses ATF WS instead of CVT Fluid TC.'],
    source: 'MOTUL fitment selector + AISIN ATF/CVTF chart (grade verified; capacities pending manual)',
  },
}

/**
 * Look up a verified maintenance spec by frame number or chassis code.
 * "NZE144-6008051" -> "NZE144" -> exact match. Returns null if not in the list
 * (Earl then falls back to clearly-labelled general guidance, never a fake spec).
 *
 * ponytail: exact match on the frame prefix only. Variant sub-codes (e.g. 4WD NE12
 * vs 2WD E12) intentionally do NOT share a record — add the variant as its own
 * verified entry when it shows up, rather than fuzzy-matching and risking a wrong
 * fluid. Add explicit same-spec aliases here only if a real frame format misses.
 */
export function getMaintenanceSpec(frameOrCode?: string | null): MaintenanceSpec | null {
  if (!frameOrCode) return null
  const code = frameOrCode.trim().toUpperCase().split('-')[0]
  return code ? (MAINTENANCE_SPECS[code] ?? null) : null
}

/** Render a spec as a readable block for Earl's prompt context. */
export function formatMaintenanceSpec(s: MaintenanceSpec): string {
  const lines = [`  Maintenance & fluid specs — ${s.label}, engine ${s.engine}:`]
  for (const f of s.fluids) {
    const cap = f.capacity ? ` — ${f.capacity}` : ''
    const unverified = f.confidence === 'unverified' ? ' [capacity NOT yet manual-verified — tell the user to confirm]' : ''
    const warn = f.warning ? `  ⚠ ${f.warning}` : ''
    lines.push(`    - ${f.name}: ${f.spec}${cap}${unverified}${warn}`)
  }
  if (s.intervals?.length) lines.push(`    Service intervals: ${s.intervals.join('; ')}`)
  for (const n of s.notes ?? []) lines.push(`    Note: ${n}`)
  lines.push(`    Source: ${s.source}`)
  return lines.join('\n')
}
