// Manufacturer-verified service intervals for the tracker — the machine-readable
// twin of the human-readable schedules in maintenance-specs.ts (same research,
// same sources: Toyota FAQ #197/#199, Nissan per-model FAQs, Honda Vezel qa018,
// Hyundai US owner-manual site, Toyota India schedule — verified 2026-07-10).
//
// SEVERE-conditions figures throughout: Trinidad driving (heat, short trips,
// traffic, dust) is what the makers define as severe.
//
// Client-safe on purpose (numbers only) — the Maintenance page imports this;
// maintenance-specs.ts stays server-only.

export type IntervalOverride = { km: number; months?: number }

export type ServiceIntervals = {
  engine_oil?: IntervalOverride
  /** null = sealed unit the maker schedules NO change for — stop tracking it. */
  transmission_oil?: IntervalOverride | null
}

// Toyota petrol on CVT Fluid TC/FE: oil 7,500 km/6 mo; CVT severe = 100,000 km
// (Toyota publishes no month figure for it — km-only rule).
const TOYOTA_PETROL: ServiceIntervals = {
  engine_oil: { km: 7_500, months: 6 },
  transmission_oil: { km: 100_000 },
}
// Toyota hybrids: same oil; e-CVT (ATF WS) is sealed with no schedule.
const TOYOTA_HYBRID: ServiceIntervals = {
  engine_oil: { km: 7_500, months: 6 },
  transmission_oil: null,
}
// C-HR 1.2 turbo: the outlier — severe 2,500 km / 3 months.
const TOYOTA_TURBO: ServiceIntervals = {
  engine_oil: { km: 2_500, months: 3 },
  transmission_oil: { km: 100_000 },
}
// Nissan + Honda: oil 7,500 km/6 mo severe. Gearbox intentionally ABSENT —
// Nissan publishes no NS-3 interval and Honda's HCF-2 40k is dealer guidance,
// so the tracker keeps its local default (40,000 km) for those.
const JP_OIL_75: ServiceIntervals = {
  engine_oil: { km: 7_500, months: 6 },
}

// Keyed by chassis code (frame-number prefix / model code), same as the specs.
const BY_CHASSIS: Record<string, ServiceIntervals> = {
  // Toyota petrol (CVT TC/FE)
  NZE144: TOYOTA_PETROL,
  NZE161G: TOYOTA_PETROL,
  MXPB10: TOYOTA_PETROL,
  MXPB15: TOYOTA_PETROL,
  // Toyota turbo
  NGX10: TOYOTA_TURBO,
  NGX50: TOYOTA_TURBO,
  // Toyota hybrid (sealed e-CVT)
  NHP10: TOYOTA_HYBRID,
  ZYX10: TOYOTA_HYBRID,
  ZYX11: TOYOTA_HYBRID,
  MXPJ10: TOYOTA_HYBRID,
  MXPJ15: TOYOTA_HYBRID,
  // Nissan
  E12: JP_OIL_75,
  TB17: JP_OIL_75,
  T32: JP_OIL_75,
  NT32: JP_OIL_75,
  HT32: JP_OIL_75,
  HNT32: JP_OIL_75,
  // Honda Vezel
  RU1: JP_OIL_75,
  RU3: JP_OIL_75,
}

// Non-JDM cars with no chassis code — matched on model-name fragments.
const BY_NAME: Array<[string, ServiceIntervals]> = [
  ['hyryder', { engine_oil: { km: 10_000, months: 6 } }], // Toyota India: service every 10,000 km / 6 mo
  ['tucson', { engine_oil: { km: 8_000, months: 6 } }],   // Hyundai official (US manual), severe, km-converted
  ['kicks', JP_OIL_75],
]

/** Same matching order as the Earl specs: frame prefix → model code → name. */
export function serviceIntervalsFor(
  frameNumber?: string | null,
  modelCode?: string | null,
  modelName?: string | null,
): ServiceIntervals | null {
  for (const code of [frameNumber, modelCode]) {
    if (!code) continue
    const key = code.trim().toUpperCase().split('-')[0]
    if (key && BY_CHASSIS[key]) return BY_CHASSIS[key]
  }
  if (modelName) {
    const name = modelName.toLowerCase()
    for (const [fragment, intervals] of BY_NAME) {
      if (name.includes(fragment)) return intervals
    }
  }
  return null
}
