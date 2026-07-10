import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-server'
import { TRACKED_SERVICES, predictService } from '@/lib/service-tracker'
import type { MaintenanceTask } from '@/lib/maintenance'
import { configureWebPush, sendPushToUser } from '@/lib/push-server'

// Nightly reminder run (scheduled 12:00 UTC = 8:00 AM Trinidad).
// Never-annoying rules, in order:
//   - only users with reminders_enabled = true (their explicit opt-in)
//   - one reminder per service CYCLE — the DB unique key on
//     (vehicle_id, service_key, last_service_date) makes repeats impossible
//   - at most ONE notification per user per run (items are batched)
//   - push only (user decision 2026-07-10: no WhatsApp fallback); the in-app
//     DUE / OVERDUE pills remain the always-on baseline
//   - delivered nothing → the claim is released so tomorrow retries
export const maxDuration = 60

const REMIND_DAYS = 7 // heads-up window before the predicted due date
const DAY_MS = 86_400_000

type DueItem = {
  user_id: string
  vehicle_id: string
  service_key: string
  last_service_date: string
  line: string // human sentence for the notification body
}

const titleCase = (s: string) => s.replace(/\b\w/g, c => c.toUpperCase())

function fmtDue(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!configureWebPush()) {
    return NextResponse.json({ error: 'Push not configured (VAPID keys missing)' }, { status: 500 })
  }

  const supabase = getServiceClient()

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('reminders_enabled', true)
  if (!profiles?.length) return NextResponse.json({ users: 0, sent: 0 })

  const { data: vehicles } = await supabase
    .from('user_vehicles')
    .select('id, user_id, nickname, year, brand, name, mileage_km, mileage_updated_at')
    .in('user_id', profiles.map(p => p.user_id))
  if (!vehicles?.length) return NextResponse.json({ users: profiles.length, sent: 0 })

  const { data: tasks } = await supabase
    .from('maintenance_tasks')
    .select('vehicle_id, task, due_date, done_at, odometer_km')
    .in('vehicle_id', vehicles.map(v => v.id))

  // Which (vehicle, service) cycles are inside the reminder window?
  const today = new Date().toISOString().slice(0, 10)
  const due: DueItem[] = []
  for (const v of vehicles) {
    const vTasks = (tasks ?? []).filter(t => t.vehicle_id === v.id) as MaintenanceTask[]
    const carName = titleCase(v.nickname || [v.year, v.brand, v.name].filter(Boolean).join(' '))
    for (const service of TRACKED_SERVICES) {
      const p = predictService(service, vTasks, v)
      if (!p.dueDate || !p.lastDoneDate) continue
      const daysLeft = Math.round(
        (new Date(`${p.dueDate}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / DAY_MS
      )
      if (p.status === 'overdue' || (p.status === 'soon' && daysLeft <= REMIND_DAYS)) {
        due.push({
          user_id: v.user_id,
          vehicle_id: v.id,
          service_key: service.key,
          last_service_date: p.lastDoneDate,
          line: p.status === 'overdue'
            ? `${service.label} is overdue on your ${carName}`
            : `${service.label} due around ${fmtDue(p.dueDate)} on your ${carName}`,
        })
      }
    }
  }
  if (!due.length) return NextResponse.json({ users: profiles.length, sent: 0 })

  // Claim the cycles. ignoreDuplicates = ON CONFLICT DO NOTHING, so anything
  // already reminded comes back absent — no double-message is possible.
  const { data: claimed, error: claimError } = await supabase
    .from('service_reminders')
    .upsert(
      due.map(({ line: _line, ...row }) => row),
      { onConflict: 'vehicle_id,service_key,last_service_date', ignoreDuplicates: true }
    )
    .select('id, user_id, vehicle_id, service_key')
  if (claimError) {
    return NextResponse.json({ error: claimError.message }, { status: 500 })
  }
  if (!claimed?.length) {
    return NextResponse.json({ users: profiles.length, due: due.length, sent: 0, note: 'all cycles already reminded' })
  }

  let pushUsers = 0
  let released = 0

  for (const uid of [...new Set(claimed.map(c => c.user_id))]) {
    const userClaims = claimed.filter(c => c.user_id === uid)
    const lines = userClaims.map(c =>
      due.find(d => d.vehicle_id === c.vehicle_id && d.service_key === c.service_key)!.line
    )
    const anyOverdue = lines.some(l => l.includes('overdue'))

    const { sent } = await sendPushToUser(supabase, uid, {
      title: anyOverdue ? 'Service overdue 🔧' : 'Service coming up 🔧',
      body: lines.join('. '),
      url: '/maintenance',
    })

    const ids = userClaims.map(c => c.id)
    if (sent > 0) {
      await supabase.from('service_reminders').update({ channel: 'push' }).in('id', ids)
      pushUsers++
    } else {
      // No device took the push — release the claims so tomorrow retries.
      await supabase.from('service_reminders').delete().in('id', ids)
      released += ids.length
    }
  }

  return NextResponse.json({
    users: profiles.length,
    due: due.length,
    claimed: claimed.length,
    pushUsers,
    released,
  })
}
