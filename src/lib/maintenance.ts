// Shared helpers for the maintenance model: a task is just a name + a date.
// done_at set = history entry; otherwise due_date drives overdue / due.

export type MaintenanceTask = {
  id: string
  vehicle_id: string
  task: string
  due_date: string | null
  done_at: string | null
  created_at: string
}

export type TaskStatus = 'done' | 'overdue' | 'due'

export function taskStatus(t: MaintenanceTask): TaskStatus {
  if (t.done_at) return 'done'
  if (t.due_date && t.due_date < new Date().toISOString().slice(0, 10)) return 'overdue'
  return 'due'
}

export function fmtDate(d: string | null, withYear = false): string {
  if (!d) return ''
  const date = new Date(`${d}T00:00:00`)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  })
}
