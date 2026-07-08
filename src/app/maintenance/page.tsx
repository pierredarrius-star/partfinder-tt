'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import EditSheet from '@/components/EditSheet'
import { type MaintenanceTask, taskStatus, fmtDate } from '@/lib/maintenance'

type Vehicle = {
  id: string
  brand: string | null
  name: string | null
  model_code: string | null
  mileage_km: number | null
  mileage_updated_at: string | null
}

const titleCase = (s: string | null) => s ? s.replace(/\b\w/g, c => c.toUpperCase()) : ''

const PILL: Record<string, string> = {
  overdue: 'bg-flag/15 text-[#E05A6B]',
  due: 'bg-warm/10 text-warm',
}

export default function MaintenancePage() {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [tasks, setTasks] = useState<MaintenanceTask[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // log-a-task sheet
  const [logOpen, setLogOpen] = useState(false)
  const [taskName, setTaskName] = useState('')
  const [taskDate, setTaskDate] = useState('')
  const [taskDone, setTaskDone] = useState(false)
  const [saving, setSaving] = useState(false)

  // mileage sheet
  const [mileageOpen, setMileageOpen] = useState(false)
  const [mileageSaving, setMileageSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        window.location.href = '/login'
        return
      }
      setUserId(session.user.id)

      const { data: v } = await supabase
        .from('user_vehicles')
        .select('id, brand, name, model_code, mileage_km, mileage_updated_at')
        .eq('user_id', session.user.id)
        .order('is_primary', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!v) {
        router.push('/profile')
        return
      }
      setVehicle(v)

      const { data: rows } = await supabase
        .from('maintenance_tasks')
        .select('*')
        .eq('vehicle_id', v.id)
      setTasks(rows ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleLogTask() {
    if (!taskName.trim() || !vehicle || !userId || saving) return
    setSaving(true)

    const row = {
      user_id: userId,
      vehicle_id: vehicle.id,
      task: taskName.trim(),
      due_date: taskDone ? null : (taskDate || null),
      done_at: taskDone ? (taskDate || new Date().toISOString().slice(0, 10)) : null,
    }

    const { data, error } = await supabase.from('maintenance_tasks').insert([row]).select().single()
    setSaving(false)

    if (error) {
      alert(error.message)
      return
    }
    setTasks(prev => [...prev, data])
    setLogOpen(false)
    setTaskName('')
    setTaskDate('')
    setTaskDone(false)
  }

  async function handleMarkDone(t: MaintenanceTask) {
    const today = new Date().toISOString().slice(0, 10)
    const { error } = await supabase.from('maintenance_tasks').update({ done_at: today }).eq('id', t.id)
    if (error) {
      alert(error.message)
      return
    }
    setTasks(prev => prev.map(x => x.id === t.id ? { ...x, done_at: today } : x))
  }

  async function handleDeleteTask(t: MaintenanceTask) {
    if (!confirm(`Delete "${t.task}"?`)) return
    const { error } = await supabase.from('maintenance_tasks').delete().eq('id', t.id)
    if (error) {
      alert(error.message)
      return
    }
    setTasks(prev => prev.filter(x => x.id !== t.id))
  }

  async function handleMileageSave(value: string) {
    if (!vehicle) return
    setMileageSaving(true)
    const patch = {
      mileage_km: parseInt(value.replace(/[^\d]/g, ''), 10) || 0,
      mileage_updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('user_vehicles').update(patch).eq('id', vehicle.id)
    setMileageSaving(false)
    if (error) {
      alert(error.message)
      return
    }
    setVehicle({ ...vehicle, ...patch })
    setMileageOpen(false)
  }

  const pending = tasks
    .filter(t => !t.done_at)
    .sort((a, b) => ((a.due_date ?? '9999') < (b.due_date ?? '9999') ? -1 : 1))
  const history = tasks
    .filter(t => t.done_at)
    .sort((a, b) => (a.done_at! > b.done_at! ? -1 : 1))

  if (loading) return <div className="min-h-screen bg-charcoal" />

  return (
    <div className="flex flex-col min-h-screen bg-charcoal">

      {/* header: back to Garage + car context + mileage */}
      <header className="pt-safe px-6 pt-3 pb-3 flex items-center gap-3 border-b border-line sticky top-0 bg-charcoal z-10">
        <Link
          href="/profile"
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-surface border border-line"
          aria-label="Back to Garage"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9C948A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold text-cream">Maintenance</div>
          <div className="font-mono text-[10px] mt-0.5 text-muted uppercase truncate">
            {[titleCase(vehicle?.brand ?? null), titleCase(vehicle?.name ?? null), vehicle?.model_code?.toUpperCase()].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono text-[13px] font-semibold text-cream">
            {vehicle?.mileage_km != null ? `${vehicle.mileage_km.toLocaleString()} km` : '— km'}
          </div>
          <button onClick={() => setMileageOpen(true)} className="font-mono text-[9px] tracking-widest uppercase text-brass">
            UPDATE
          </button>
        </div>
      </header>

      <main className="flex-1 px-6 pb-28">

        {/* log a task — the only input this page needs: what + when */}
        <button
          onClick={() => setLogOpen(true)}
          className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-[14px] bg-brass hover:bg-brass-light text-charcoal transition-colors active:scale-[0.98]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14"/><path d="M12 5v14"/>
          </svg>
          Log a task
        </button>
        <p className="mt-1.5 text-center text-[10px] text-subtle">Just the task and the date — that&apos;s all we need.</p>

        {/* NEEDS ATTENTION */}
        <section className="pt-5">
          <div className="font-mono text-[10px] tracking-widest uppercase mb-2 text-subtle">NEEDS ATTENTION</div>

          {pending.length === 0 && (
            <p className="text-[12px] text-subtle py-2">Nothing due — log upcoming work so it can remind you.</p>
          )}

          {pending.map(t => {
            const s = taskStatus(t)
            return (
              <div
                key={t.id}
                className={`rounded-xl px-4 py-3.5 mb-2 flex items-center justify-between gap-3 bg-surface border ${s === 'overdue' ? 'border-flag/35' : 'border-warm/40'}`}
              >
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold text-cream truncate">{t.task}</div>
                  <div className="mt-1">
                    <span className={`font-mono text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded ${PILL[s]}`}>
                      {s === 'overdue' ? `OVERDUE${t.due_date ? ` · was due ${fmtDate(t.due_date)}` : ''}` : `DUE${t.due_date ? ` · ${fmtDate(t.due_date)}` : ''}`}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleMarkDone(t)}
                  className="shrink-0 font-mono text-[10px] tracking-widest uppercase px-2.5 py-1.5 rounded-lg bg-live/10 text-live active:scale-95"
                >
                  ✓ DONE
                </button>
              </div>
            )
          })}

          {/* the bridge back to the app's core: a due task can become an ask */}
          {pending.length > 0 && (
            <Link href="/" className="w-full flex items-center gap-2 rounded-xl px-4 py-3 mb-2 border border-dashed border-subtle">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A158" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
              </svg>
              <span className="text-[12px] text-muted">
                Need parts for these? <span className="text-brass font-semibold">Ask the shops</span> — one request, every supplier.
              </span>
            </Link>
          )}
        </section>

        {/* HISTORY — flat list, date right-aligned, newest first */}
        <section className="pt-5">
          <div className="font-mono text-[10px] tracking-widest uppercase mb-2 text-subtle">HISTORY</div>

          {history.length === 0 && (
            <p className="text-[12px] text-subtle py-2">No maintenance logged yet — add your last oil change.</p>
          )}

          {history.length > 0 && (
            <div className="rounded-xl overflow-hidden bg-surface border border-line">
              {history.map((t, i) => (
                <div key={t.id} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-line' : ''}`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5DBB7C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <path d="M20 6 9 17l-5-5"/>
                    </svg>
                    <span className="text-[13px] text-cream truncate">{t.task}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <span className="font-mono text-[11px] text-subtle uppercase">{fmtDate(t.done_at, true)}</span>
                    <button
                      onClick={() => handleDeleteTask(t)}
                      className="text-subtle hover:text-[#E05A6B] transition-colors"
                      aria-label="Delete entry"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {history.length > 0 && (
            <p className="mt-3 text-center text-[10px] leading-relaxed text-subtle">
              Earl reads this list — ask him &ldquo;When did I last change my oil?&rdquo;
            </p>
          )}
        </section>
      </main>

      {/* log-a-task sheet */}
      {logOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { if (!saving) setLogOpen(false) }} />
          <div className="relative w-full max-w-md bg-surface border-t border-line rounded-t-3xl pt-5 pb-8 px-5 shadow-2xl">
            <div className="w-10 h-1 bg-line rounded-full mx-auto mb-5" />
            <h3 className="text-base font-bold text-cream mb-4">Log a task</h3>

            <label className="block font-mono text-[10px] font-semibold text-subtle uppercase tracking-[0.15em] mb-1.5">Task</label>
            <input
              type="text"
              value={taskName}
              onChange={e => setTaskName(e.target.value)}
              placeholder="e.g. Oil change, front brake pads"
              autoFocus
              className="w-full rounded-xl px-4 py-3 text-sm bg-charcoal border border-line text-cream placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brass focus:border-transparent"
            />

            <label className="block font-mono text-[10px] font-semibold text-subtle uppercase tracking-[0.15em] mb-1.5 mt-4">
              {taskDone ? 'Date done' : 'Due date'}
            </label>
            <input
              type="date"
              value={taskDate}
              onChange={e => setTaskDate(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm bg-charcoal border border-line text-cream focus:outline-none focus:ring-2 focus:ring-brass focus:border-transparent [color-scheme:dark]"
            />

            <button
              onClick={() => setTaskDone(d => !d)}
              className="flex items-center gap-2.5 mt-4"
            >
              <span className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${taskDone ? 'bg-live border-live' : 'border-line bg-charcoal'}`}>
                {taskDone && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0F0E0D" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5"/>
                  </svg>
                )}
              </span>
              <span className="text-[13px] text-muted">Already done — log it as history</span>
            </button>

            <div className="flex gap-2 mt-5">
              <button
                onClick={handleLogTask}
                disabled={!taskName.trim() || saving}
                className="flex-1 py-3 rounded-xl font-semibold text-sm bg-brass hover:bg-brass-light text-charcoal transition-colors active:scale-[0.98] disabled:opacity-40"
              >
                {saving ? 'Saving…' : 'Save task'}
              </button>
              <button
                onClick={() => setLogOpen(false)}
                disabled={saving}
                className="px-5 py-3 rounded-xl font-semibold text-sm bg-elevated text-muted transition-colors active:scale-[0.98]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* mileage sheet */}
      <EditSheet
        open={mileageOpen}
        title="Current mileage (km)"
        placeholder="e.g. 87420"
        type="number"
        initial={vehicle?.mileage_km ? String(vehicle.mileage_km) : ''}
        saving={mileageSaving}
        onClose={() => setMileageOpen(false)}
        onSave={handleMileageSave}
      />
    </div>
  )
}
