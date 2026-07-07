import type { SupabaseClient } from '@supabase/supabase-js'

// Donor cars seeded from the PartSouq API live in this user's garage
// (seed-common-cars.mts). A data pointer, not a secret.
export const SEED_GARAGE_USER_ID = 'a27ff897-e72e-4a42-ad85-2b1653e1cb6c' // seed-vehicles@partfinder.tt

export type SeedTwin = { id: string; model_code: string | null }

type VehicleLike = {
  id?: string | null
  model_code?: string | null
  frame_number?: string | null
  brand?: string | null
  name?: string | null
}

/**
 * Match a customer's car to its donor twin in the seed garage.
 * Match order: model code → frame-number prefix → brand+name (the last covers
 * non-JDM cars like the Hyryder that have no chassis code). Used by chat-earl
 * (answer from twin data) and partsouq-search (skip the scrape when covered).
 */
export async function findSeedTwin(
  serviceClient: SupabaseClient,
  vehicle: VehicleLike,
): Promise<SeedTwin | null> {
  const { data: seedCars } = await serviceClient
    .from('user_vehicles')
    .select('id, model_code, brand, name')
    .eq('user_id', SEED_GARAGE_USER_ID)
  if (!seedCars?.length) return null

  const byCode = (code: string) => (code ? seedCars.find((s) => s.model_code === code) : undefined)
  const twin =
    byCode((vehicle.model_code ?? '').trim().toLowerCase()) ??
    byCode((vehicle.frame_number ?? '').split('-')[0].trim().toLowerCase()) ??
    seedCars.find(
      (s) =>
        s.brand === (vehicle.brand ?? '').trim().toLowerCase() &&
        s.name === (vehicle.name ?? '').trim().toLowerCase(),
    )
  if (!twin || twin.id === vehicle.id) return null
  return { id: twin.id, model_code: twin.model_code ?? null }
}
