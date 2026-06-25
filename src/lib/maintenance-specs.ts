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
  /** For non-JDM cars with no chassis code: lowercase model-name fragments to match on. */
  matchNames?: string[]
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
      { name: 'Rear differential (4WD)', spec: 'Hypoid Gear Oil, API GL-5 85W-90', capacity: '0.5 L' },
      { name: 'Transfer case (4WD)', spec: 'Gear Oil, API GL-5 75W-90', capacity: '0.9 L' },
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

  // Honda Vezel — the critical variant trap: petrol = CVT (HCF-2), hybrid =
  // 7-speed dual-clutch (ATF DW-1, ~1.3 L). Wrong fluid OR wrong amount kills it.
  RU1: {
    chassis: 'RU1',
    label: 'Honda Vezel (RU1, 2013–2021, 1.5 petrol 2WD)',
    engine: 'L15B 1.5L petrol',
    fluids: [
      { name: 'Engine oil', spec: '0W-20 (Honda Genuine)', capacity: '≈3.4 L with filter', confidence: 'unverified' },
      { name: 'Transmission (CVT)', spec: 'Honda CVT Fluid HCF-2', warning: 'Use HCF-2 ONLY — this 2nd-gen CVT requires HCF-2; the wrong fluid can damage it.', capacity: '≈3.9 L' },
    ],
    notes: ['Petrol Vezel = CVT (HCF-2). This is NOT the hybrid, which is a dual-clutch on ATF DW-1 — do not mix them up. The 4WD petrol (RU2) adds a rear differential (fluid not yet verified).'],
    source: 'Honda Japan service data + Ravenol / Honda Parts fitment (engine-oil capacity approximate)',
  },

  RU3: {
    chassis: 'RU3',
    label: 'Honda Vezel Hybrid (RU3, 2013–2021, 1.5 i-DCD 2WD)',
    engine: 'LEB 1.5L hybrid (Sport Hybrid i-DCD)',
    fluids: [
      { name: 'Engine oil', spec: '0W-20 (0W-16 also acceptable on later / Ultra NEXT spec)', capacity: '3.1 L drain / 3.3 L with filter' },
      { name: 'Transmission (7-speed DUAL-CLUTCH, i-DCD)', spec: 'Honda ATF DW-1', warning: 'This is a DUAL-CLUTCH, not a CVT — it takes ATF DW-1 and holds only ~1.3 L. Do NOT use CVT fluid, and do NOT fill it like a normal automatic (overfill risk).', capacity: '≈1.3 L' },
    ],
    notes: ['Hybrid Vezel = 7-speed dual-clutch (i-DCD), NOT a CVT. Its clutch actuator uses brake fluid (DOT 3/4), serviced separately from the gear oil. The 4WD hybrid (RU4) adds a rear differential (fluid not yet verified).'],
    source: 'Honda Japan official FAQ qa018 (engine oil) + MOTUL / Ravenol fitment (ATF DW-1, ~1.3 L)',
  },

  // Toyota Urban Cruiser Hyryder — India-built (not JDM), matched by name. Two
  // powertrains with THREE different gearbox fluids: ASK which variant first.
  HYRYDER: {
    chassis: 'Hyryder (India-built — matched by model name, no JDM chassis code)',
    matchNames: ['hyryder'],
    label: 'Toyota Urban Cruiser Hyryder (2022+)',
    engine: 'K15C 1.5L mild-hybrid petrol OR M15A 1.5L strong-hybrid (TNGA)',
    fluids: [
      { name: 'Engine oil — mild hybrid (K15C petrol)', spec: '0W-16 (0W-20 acceptable), API SP / ILSAC GF-6', capacity: '3.3 L' },
      { name: 'Engine oil — strong hybrid (M15)', spec: '0W-16, API SP / ILSAC GF-6B', capacity: '3.4 L' },
      { name: 'Transmission — mild hybrid 5-speed MANUAL', spec: 'Manual transmission gear oil SAE 75W', capacity: '2.6 L' },
      { name: 'Transmission — mild hybrid 6-speed AUTO', spec: 'Toyota ATF AW-1', warning: 'ATF AW-1 — this is the torque-converter auto. NOT the same as the hybrid’s ATF WS; do not interchange.', capacity: '5.8 L' },
      { name: 'Transmission — strong hybrid e-CVT', spec: 'Toyota ATF WS (sealed unit)', warning: 'ATF WS — for the hybrid e-CVT only. NOT the 6-speed auto’s ATF AW-1; do not interchange.', capacity: '2.6 L' },
      { name: 'Coolant — mild hybrid', spec: 'Toyota Super Long Life Coolant (SLLC)', capacity: '4.2 L' },
      { name: 'Coolant — strong hybrid', spec: 'Toyota Super Long Life Coolant (SLLC)', capacity: 'engine 4.8 L + inverter 1.9 L' },
    ],
    notes: [
      'TWO powertrains — ASK the customer whether theirs is the mild-hybrid petrol (K15C) or the strong/full hybrid (M15 TNGA) BEFORE quoting a gearbox fluid. The mild hybrid is the normal petrol (manual or 6-speed auto); the strong hybrid is the self-charging full hybrid with the e-CVT.',
      'India-built (not JDM) — matched by model name, it has no Japanese chassis code.',
    ],
    source: 'Toyota-Club.Net OEM fluids table + Toyota India / Maruti-Suzuki service data',
  },

  // Hyundai Tucson — Korean (not JDM), matched by name. Two generations with
  // different oils AND gearboxes (incl. a dual-clutch on the Gen-3 1.6 Turbo).
  // ASK year + engine before quoting.
  TUCSON: {
    chassis: 'Tucson (Korean — matched by model name, no JDM chassis code)',
    matchNames: ['tucson'],
    label: 'Hyundai Tucson (TL 2015–2020 and NX4 2021+)',
    engine: 'Gen 3 (TL): 2.0L or 1.6L Turbo • Gen 4 (NX4): 2.5L or 1.6T hybrid',
    fluids: [
      { name: 'Engine oil — Gen 3 (2015–2020), 2.0 / 1.6 Turbo', spec: '5W-30 (the 2.0 also lists 5W-20), API SN PLUS or above, full synthetic', capacity: '≈4.5 L', confidence: 'unverified' },
      { name: 'Engine oil — Gen 4 (2021+), 2.5 petrol', spec: '0W-20, API SN PLUS or above, full synthetic', capacity: '≈5.6 L' },
      { name: 'Engine oil — Gen 4 (2021+), 1.6T hybrid', spec: '0W-20 full synthetic (required)', capacity: '≈4.8 L' },
      { name: 'Transmission — 6-speed AUTO (Gen 3 2.0; Gen 4 hybrid)', spec: 'Hyundai ATF SP-IV' },
      { name: 'Transmission — 8-speed AUTO (Gen 4 2.5)', spec: 'Hyundai ATF SP-IV (SP-IV-RR / SP-4M)' },
      { name: 'Transmission — 7-speed DUAL-CLUTCH (Gen 3 1.6 Turbo)', spec: 'Hyundai DCT fluid SAE 70E (GL-4)', warning: 'Dual-clutch — uses DCT gear oil (70E), NOT ATF SP-IV. Do not put automatic-transmission fluid in the DCT.', capacity: '≈2 L' },
    ],
    notes: [
      'TWO generations with different specs — ASK the customer the year and engine BEFORE quoting. Key splits: engine oil is 5W-30 on the older (2015–2020) but 0W-20 on the newer (2021+); and the Gen-3 1.6 Turbo has a dual-clutch (DCT oil 70E), while everything else is a normal automatic (ATF SP-IV).',
      'Korean (not JDM) — matched by model name, no Japanese chassis code.',
    ],
    source: 'HyundaiNews 2022 spec sheet + Hyundai dealer service data + Ravenol fitment',
  },
}

/**
 * Look up a verified maintenance spec for a vehicle.
 *  1. JDM cars: exact chassis-code match on the frame-number prefix
 *     ("NZE144-6008051" -> "NZE144").
 *  2. Non-JDM cars with no Japanese chassis code (e.g. Hyryder, Tucson): match the
 *     model name against each record's `matchNames`.
 * Returns null if not in the list (Earl then falls back to clearly-labelled general
 * guidance, never a fake spec).
 *
 * ponytail: exact frame-prefix match + simple name-substring fallback. Variant
 * sub-codes (e.g. 4WD NE12 vs 2WD E12) intentionally do NOT share a record — add the
 * variant as its own verified entry when it shows up, rather than risking a wrong fluid.
 */
export function getMaintenanceSpec(
  frameOrCode?: string | null,
  modelName?: string | null,
): MaintenanceSpec | null {
  // 1. JDM: chassis code from the frame-number prefix.
  if (frameOrCode) {
    const code = frameOrCode.trim().toUpperCase().split('-')[0]
    if (code && MAINTENANCE_SPECS[code]) return MAINTENANCE_SPECS[code]
  }
  // 2. Non-JDM: match the model name.
  if (modelName) {
    const name = modelName.toLowerCase()
    for (const spec of Object.values(MAINTENANCE_SPECS)) {
      if (spec.matchNames?.some((m) => name.includes(m))) return spec
    }
  }
  return null
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
