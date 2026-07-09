// Service-interval tracker: predicts when recurring services are due from the
// owner's own records. Plain arithmetic — km driven / days elapsed = daily rate;
// due = whichever comes first of the km target and the calendar target.

import type { MaintenanceTask } from './maintenance'

export type ServiceDef = {
  key: 'engine_oil' | 'transmission_oil'
  label: string
  intervalKm: number
  intervalMonths: number
  matches: (task: string) => boolean
}

const TRANS_WORDS = /transmission|gearbox|cvt|atf/i

// ponytail: two hardcoded services; make this a table when a third+ shows up.
// Mechanic defaults for T&T heat — per-car spec table can override later.
export const TRACKED_SERVICES: ServiceDef[] = [
  {
    key: 'engine_oil',
    label: 'Engine oil change',
    intervalKm: 5000,
    intervalMonths: 6,
    matches: t => /oil/i.test(t) && !TRANS_WORDS.test(t),
  },
  {
    key: 'transmission_oil',
    label: 'Transmission oil change',
    intervalKm: 40000,
    intervalMonths: 48,
    matches: t => TRANS_WORDS.test(t) && /oil|fluid|change|service/i.test(t),
  },
]

export type Prediction = {
  service: ServiceDef
  lastDoneDate: string | null   // ISO date of last completed service
  lastOdometer: number | null   // odometer at that service
  dueDate: string | null        // predicted due date (earlier of km/calendar)
  dueKm: number | null          // odometer target for the km rule
  kmPerDay: number | null       // measured driving rate, null = not enough data
  basis: 'km+date' | 'date-only' | 'none'
  status: 'overdue' | 'soon' | 'ok' | 'unknown'
}

type VehicleMileage = {
  mileage_km: number | null
  mileage_updated_at: string | null
}

const DAY_MS = 86_400_000
const SOON_DAYS = 30

function addMonths(iso: string, months: number): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

function addDays(iso: string, days: number): string {
  return new Date(new Date(`${iso}T00:00:00`).getTime() + days * DAY_MS)
    .toISOString().slice(0, 10)
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((new Date(`${toIso}T00:00:00`).getTime() - new Date(`${fromIso}T00:00:00`).getTime()) / DAY_MS)
}

export function predictService(
  service: ServiceDef,
  tasks: MaintenanceTask[],
  vehicle: VehicleMileage
): Prediction {
  const done = tasks
    .filter(t => t.done_at && service.matches(t.task))
    .sort((a, b) => (a.done_at! > b.done_at! ? -1 : 1))
  const last = done[0]

  if (!last) {
    return {
      service, lastDoneDate: null, lastOdometer: null,
      dueDate: null, dueKm: null, kmPerDay: null, basis: 'none', status: 'unknown',
    }
  }

  const lastOdo = (last as MaintenanceTask & { odometer_km?: number | null }).odometer_km ?? null
  const dueKm = lastOdo != null ? lastOdo + service.intervalKm : null
  const calendarDue = addMonths(last.done_at!, service.intervalMonths)
  const today = new Date().toISOString().slice(0, 10)

  // km-based estimate needs: odometer at service + a later mileage reading
  let kmDueDate: string | null = null
  let kmPerDay: number | null = null
  const mileageDate = vehicle.mileage_updated_at?.slice(0, 10) ?? null
  if (
    lastOdo != null &&
    vehicle.mileage_km != null &&
    mileageDate != null &&
    vehicle.mileage_km > lastOdo &&
    daysBetween(last.done_at!, mileageDate) >= 7
  ) {
    kmPerDay = (vehicle.mileage_km - lastOdo) / daysBetween(last.done_at!, mileageDate)
    const remainingKm = (lastOdo + service.intervalKm) - vehicle.mileage_km
    kmDueDate = remainingKm <= 0 ? today : addDays(mileageDate, Math.round(remainingKm / kmPerDay))
  }

  const dueDate = kmDueDate && kmDueDate < calendarDue ? kmDueDate : calendarDue
  const basis: Prediction['basis'] = kmDueDate ? 'km+date' : 'date-only'

  const alreadyPastKm = dueKm != null && vehicle.mileage_km != null && vehicle.mileage_km >= dueKm
  const status: Prediction['status'] =
    alreadyPastKm || dueDate <= today ? 'overdue'
    : daysBetween(today, dueDate) <= SOON_DAYS ? 'soon'
    : 'ok'

  return {
    service,
    lastDoneDate: last.done_at!,
    lastOdometer: lastOdo,
    dueDate, dueKm, kmPerDay, basis, status,
  }
}

// Mileage older than this is considered stale — nudge (gently) for an update.
export function mileageIsStale(mileage_updated_at: string | null): boolean {
  if (!mileage_updated_at) return true
  return daysBetween(mileage_updated_at.slice(0, 10), new Date().toISOString().slice(0, 10)) > 30
}
