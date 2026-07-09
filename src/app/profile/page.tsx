'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import EditSheet from '@/components/EditSheet'
import { type MaintenanceTask, taskStatus, fmtDate } from '@/lib/maintenance'

type UserProfile = {
  full_name: string | null
  whatsapp_number: string | null
}

type Vehicle = {
  id: string
  year: number
  vin: string | null
  brand: string
  name: string
  model_code: string | null
  body: string | null
  engine: string | null
  color_code: string | null
  color_name: string | null
  nickname: string | null
  frame_number: string | null
  manual_url: string | null
  is_primary: boolean
  created_at: string
  transmission: string | null
  wheels_tyres: string | null
  mileage_km: number | null
  mileage_updated_at: string | null
}

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

type EditTarget =
  | 'transmission' | 'wheels_tyres' | 'mileage'
  | 'full_name' | 'whatsapp_number'
  | 'year' | 'brand' | 'name' | 'model_code' | 'body' | 'engine'
  | 'color_code' | 'color_name' | 'vin' | 'frame_number' | 'nickname'
  | null

// DB storage conventions (see CLAUDE.md): lowercase for names/codes, uppercase for VIN/engine.
const VEHICLE_FIELD_NORMALIZE: Partial<Record<Exclude<EditTarget, null>, (v: string) => string | number>> = {
  year: v => parseInt(v.replace(/[^\d]/g, ''), 10) || 0,
  brand: v => v.toLowerCase(),
  name: v => v.toLowerCase(),
  model_code: v => v.toLowerCase(),
  body: v => v.toLowerCase(),
  color_name: v => v.toLowerCase(),
  nickname: v => v.toLowerCase(),
  engine: v => v.toUpperCase(),
  vin: v => v.toUpperCase(),
  frame_number: v => v.toUpperCase(),
}

const titleCase = (s: string | null) => s ? s.replace(/\b\w/g, c => c.toUpperCase()) : s

const XIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>
  </svg>
)

const EarlAvatar = ({ size = 'md' }: { size?: 'sm' | 'md' }) => (
  <div
    className={`${size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'} rounded-full flex items-center justify-center text-charcoal font-display font-bold shrink-0`}
    style={{ background: 'linear-gradient(135deg, #C9A158, #8b6f3d)' }}
  >
    E
  </div>
)

const PILL: Record<string, string> = {
  overdue: 'bg-flag/15 text-[#E05A6B]',
  due: 'bg-warm/10 text-warm',
  done: 'bg-live/10 text-live',
}

export default function Garage() {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [tasks, setTasks] = useState<MaintenanceTask[]>([])
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // single-field edit sheet (car details + profile fields)
  const [editTarget, setEditTarget] = useState<EditTarget>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)

  // Earl chat state
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        window.location.href = '/login'
        return
      }

      setUserEmail(session.user.email ?? null)
      setUserId(session.user.id)
      setAccessToken(session.access_token)

      const [profileRes, vehiclesRes] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('full_name, whatsapp_number')
          .eq('user_id', session.user.id)
          .single(),
        supabase
          .from('user_vehicles')
          .select('*')
          .eq('user_id', session.user.id)
          .order('is_primary', { ascending: false })
          .order('created_at', { ascending: true }),
      ])

      if (!profileRes.data) {
        router.push('/onboarding')
        return
      }

      setProfile(profileRes.data)
      const list = vehiclesRes.data ?? []
      setVehicles(list)

      if (list[0]) {
        const { data: taskRows } = await supabase
          .from('maintenance_tasks')
          .select('*')
          .eq('vehicle_id', list[0].id)
        setTasks(taskRows ?? [])
      }

      setLoading(false)
    }

    load()
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, chatLoading])

  // Focus input when chat opens
  useEffect(() => {
    if (chatOpen) setTimeout(() => inputRef.current?.focus(), 300)
  }, [chatOpen])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const handleRemove = async (v: Vehicle) => {
    if (!confirm(`Remove this ${v.year} ${titleCase(v.brand)} ${titleCase(v.name)}? This cannot be undone.`)) return

    const { error } = await supabase.from('user_vehicles').delete().eq('id', v.id)
    if (error) {
      alert(error.message)
      return
    }
    setVehicles(vehicles.filter(x => x.id !== v.id))
    setTasks([])
  }

  const handleCopyFrame = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const openCatalog = async (v: Vehicle, site: 'partsouq' | 'amayama') => {
    const idText = v.vin || v.frame_number
    if (idText) { try { await navigator.clipboard.writeText(idText) } catch {} }
    const url = site === 'partsouq'
      ? 'https://partsouq.com/en/search/vin'
      : `https://www.amayama.com/en${v.vin ? `/search/?q=${encodeURIComponent(v.vin)}` : ''}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleEditSave = async (value: string) => {
    if (!editTarget) return

    // profile fields save to user_profiles; the rest to the vehicle
    if (editTarget === 'full_name' || editTarget === 'whatsapp_number') {
      if (!userId) return
      setEditSaving(true)
      const patch = { [editTarget]: value }
      const { error } = await supabase.from('user_profiles').upsert(
        { user_id: userId, ...patch, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
      setEditSaving(false)
      if (error) {
        alert(error.message)
        return
      }
      setProfile(p => ({ full_name: p?.full_name ?? null, whatsapp_number: p?.whatsapp_number ?? null, ...patch }))
      setEditTarget(null)
      return
    }

    const v = vehicles[0]
    if (!v) return
    setEditSaving(true)

    const normalize = VEHICLE_FIELD_NORMALIZE[editTarget]
    const patch =
      editTarget === 'mileage'
        ? { mileage_km: parseInt(value.replace(/[^\d]/g, ''), 10) || 0, mileage_updated_at: new Date().toISOString() }
        : { [editTarget]: normalize ? normalize(value) : value }

    const { error } = await supabase.from('user_vehicles').update(patch).eq('id', v.id)
    setEditSaving(false)

    if (error) {
      alert(error.message)
      return
    }
    setVehicles([{ ...v, ...patch } as Vehicle, ...vehicles.slice(1)])
    setEditTarget(null)
  }

  async function sendMessage(content: string) {
    const text = content.trim()
    if (!text || chatLoading) return

    const newMsg: ChatMessage = { role: 'user', content: text }
    const snapshot = [...chatMessages, newMsg]
    setChatMessages(prev => [...prev, newMsg])
    setChatInput('')
    setChatLoading(true)

    try {
      const res = await fetch('/api/chat-earl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ messages: snapshot, vehicles }),
      })

      const data = await res.json()

      if (res.ok) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      } else {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.error ?? 'Something went wrong. Try again.' }])
      }
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }])
    } finally {
      setChatLoading(false)
    }
  }

  const v = vehicles[0]
  const carLabel = v
    ? [v.year, titleCase(v.brand), titleCase(v.name)].filter(Boolean).join(' ')
    : null
  const frameText = v ? (v.frame_number || v.vin) : null

  // up to 3 nearest-attention tasks: overdue first, then due (by date), then latest done
  const pending = tasks
    .filter(t => !t.done_at)
    .sort((a, b) => (a.due_date ?? '9999') < (b.due_date ?? '9999') ? -1 : 1)
  const doneRecent = tasks
    .filter(t => t.done_at)
    .sort((a, b) => (a.done_at! > b.done_at! ? -1 : 1))
  const stripTasks = [...pending, ...doneRecent].slice(0, 3)

  const starterChips = [
    carLabel ? `What brake pads does my ${carLabel} need?` : 'What brake pads do I need?',
    'What engine oil grade should I use?',
    'How often should I change my oil?',
  ]

  const editConfig: Record<Exclude<EditTarget, null>, { title: string; placeholder: string; type: 'text' | 'number' | 'tel'; initial: string }> = {
    transmission: { title: 'Transmission', placeholder: 'e.g. CVT, 5-speed manual', type: 'text', initial: v?.transmission ?? '' },
    wheels_tyres: { title: 'Wheels & tyres', placeholder: 'e.g. 15" · 185/65R15 Dunlop', type: 'text', initial: v?.wheels_tyres ?? '' },
    mileage: { title: 'Current mileage (km)', placeholder: 'e.g. 87420', type: 'number', initial: v?.mileage_km ? String(v.mileage_km) : '' },
    full_name: { title: 'Your name', placeholder: 'e.g. John Smith', type: 'text', initial: profile?.full_name ?? '' },
    whatsapp_number: { title: 'WhatsApp number', placeholder: '868-XXX-XXXX', type: 'tel', initial: profile?.whatsapp_number ?? '' },
    year: { title: 'Year', placeholder: 'e.g. 2014', type: 'number', initial: v?.year ? String(v.year) : '' },
    brand: { title: 'Brand', placeholder: 'e.g. Toyota', type: 'text', initial: titleCase(v?.brand ?? null) ?? '' },
    name: { title: 'Model name', placeholder: 'e.g. Corolla Fielder', type: 'text', initial: titleCase(v?.name ?? null) ?? '' },
    model_code: { title: 'Model / chassis code', placeholder: 'e.g. NZE161', type: 'text', initial: v?.model_code?.toUpperCase() ?? '' },
    body: { title: 'Body', placeholder: 'e.g. Wagon', type: 'text', initial: titleCase(v?.body ?? null) ?? '' },
    engine: { title: 'Engine', placeholder: 'e.g. 1NZ-FE', type: 'text', initial: v?.engine ?? '' },
    color_code: { title: 'Color code', placeholder: 'e.g. 1F7', type: 'text', initial: v?.color_code ?? '' },
    color_name: { title: 'Color name', placeholder: 'e.g. Classic Silver', type: 'text', initial: titleCase(v?.color_name ?? null) ?? '' },
    vin: { title: 'VIN', placeholder: 'e.g. JT2AE09W9J0123456', type: 'text', initial: v?.vin ?? '' },
    frame_number: { title: 'Frame number', placeholder: 'e.g. NZE161-7134982', type: 'text', initial: v?.frame_number ?? '' },
    nickname: { title: 'Nickname', placeholder: 'e.g. My Corolla', type: 'text', initial: titleCase(v?.nickname ?? null) ?? '' },
  }

  // rows for the edit-details sheet: label, current display value, target
  const detailRows: { target: Exclude<EditTarget, null>; label: string; value: string }[] = v ? [
    { target: 'year', label: 'Year', value: v.year ? String(v.year) : '—' },
    { target: 'brand', label: 'Brand', value: titleCase(v.brand) ?? '—' },
    { target: 'name', label: 'Model name', value: titleCase(v.name) ?? '—' },
    { target: 'model_code', label: 'Model / chassis code', value: v.model_code?.toUpperCase() ?? '—' },
    { target: 'body', label: 'Body', value: titleCase(v.body) ?? '—' },
    { target: 'engine', label: 'Engine', value: v.engine ?? '—' },
    { target: 'color_code', label: 'Color code', value: v.color_code ?? '—' },
    { target: 'color_name', label: 'Color name', value: titleCase(v.color_name) ?? '—' },
    { target: 'vin', label: 'VIN', value: v.vin ?? '—' },
    { target: 'frame_number', label: 'Frame number', value: v.frame_number ?? '—' },
    { target: 'nickname', label: 'Nickname', value: titleCase(v.nickname) ?? '—' },
  ] : []

  if (loading) return <div className="min-h-screen bg-charcoal" />

  return (
    <div className="flex flex-col min-h-screen bg-charcoal relative">

      {/* header — account behind the brass avatar */}
      <header className="pt-safe px-6 pt-6 pb-2 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold tracking-tight text-cream">Garage</h1>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #C9A158, #8b6f3d)', boxShadow: '0 0 0 2px rgba(201,161,88,0.2)' }}
            aria-label="Account"
          >
            <span className="font-display text-sm font-bold text-charcoal">
              {(profile?.full_name || userEmail || '•').charAt(0).toUpperCase()}
            </span>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-12 w-60 bg-surface rounded-2xl shadow-2xl border border-line overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-line">
                <p className="text-sm font-semibold text-cream truncate">{profile?.full_name ?? '—'}</p>
                <p className="font-mono text-[11px] text-muted mt-0.5">{profile?.whatsapp_number ?? '—'}</p>
                <p className="text-[11px] text-subtle truncate mt-0.5">{userEmail ?? ''}</p>
              </div>
              <button
                onClick={() => { setMenuOpen(false); setEditTarget('full_name') }}
                className="w-full text-left px-4 py-3 text-sm font-medium text-cream hover:bg-elevated transition-colors"
              >
                Edit name
              </button>
              <button
                onClick={() => { setMenuOpen(false); setEditTarget('whatsapp_number') }}
                className="w-full text-left px-4 py-3 text-sm font-medium text-cream hover:bg-elevated transition-colors"
              >
                Edit WhatsApp number
              </button>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-3 text-sm font-semibold text-[#E05A6B] hover:bg-elevated transition-colors"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 px-6 pt-3 pb-28">

        {/* empty garage */}
        {!v && (
          <Link
            href="/onboarding"
            className="mt-4 flex flex-col items-center gap-3 py-10 rounded-2xl border border-dashed border-subtle text-center"
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#C9A158" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>
            </svg>
            <div>
              <p className="text-[15px] font-semibold text-cream">Add your ride</p>
              <p className="text-[11px] mt-1 text-muted max-w-[220px]">Scan the compliance plate — everything fills in for you.</p>
            </div>
          </Link>
        )}

        {/* THE ride — hero card */}
        {v && (
          <section
            className="rounded-2xl p-5 border"
            style={{
              background: 'linear-gradient(160deg, rgba(201,161,88,0.08), rgba(201,161,88,0.015) 55%), #1C1A17',
              borderColor: 'rgba(201,161,88,0.35)',
              boxShadow: '0 0 0 1px rgba(201,161,88,0.1), 0 12px 32px rgba(0,0,0,0.3)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[10px] tracking-widest uppercase px-1.5 py-0.5 rounded bg-brass text-charcoal">MY RIDE</span>
              <span className="font-mono text-[10px] tracking-widest uppercase text-subtle">
                {[v.year, v.model_code?.toUpperCase()].filter(Boolean).join(' · ')}
              </span>
            </div>

            <h2 className="font-display text-[26px] font-bold leading-tight text-cream">
              {[titleCase(v.brand), titleCase(v.name)].filter(Boolean).join(' ') || 'Your ride'}
            </h2>
            {v.nickname && (
              <p className="text-xs text-muted mt-0.5">&ldquo;{titleCase(v.nickname)}&rdquo;</p>
            )}

            {/* frame / VIN row */}
            {frameText && (
              <div className="flex items-center justify-between mt-4 px-3 py-2.5 rounded-lg bg-charcoal border border-line">
                <div className="min-w-0">
                  <div className="font-mono text-[9px] tracking-widest uppercase mb-0.5 text-subtle">{v.frame_number ? 'FRAME' : 'VIN'}</div>
                  <div className="font-mono text-[13px] text-cream truncate">{frameText}</div>
                </div>
                <button
                  onClick={() => handleCopyFrame(frameText)}
                  className="flex items-center gap-1 font-mono text-[10px] tracking-widest uppercase text-brass shrink-0 ml-2"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                  </svg>
                  {copied ? 'COPIED' : 'COPY'}
                </button>
              </div>
            )}

            {/* details grid */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button
                onClick={() => setEditTarget('engine')}
                className="px-3 py-2 rounded-lg text-left bg-charcoal border border-line"
              >
                <div className="font-mono text-[9px] tracking-widest uppercase mb-0.5 text-subtle">ENGINE</div>
                <div className="font-mono text-[12px] font-medium text-cream">{v.engine || '—'}</div>
              </button>
              <button
                onClick={() => setEditTarget('transmission')}
                className={`px-3 py-2 rounded-lg text-left ${v.transmission ? 'bg-charcoal border border-line' : 'border border-dashed border-subtle'}`}
              >
                <div className="font-mono text-[9px] tracking-widest uppercase mb-0.5 text-subtle">TRANSMISSION</div>
                <div className={`font-mono text-[12px] font-medium ${v.transmission ? 'text-cream' : 'text-brass'}`}>
                  {v.transmission || '+ Add'}
                </div>
              </button>
              <button
                onClick={() => setDetailsOpen(true)}
                className="px-3 py-2 rounded-lg text-left bg-charcoal border border-line"
              >
                <div className="font-mono text-[9px] tracking-widest uppercase mb-0.5 text-subtle">COLOR</div>
                <div className="font-mono text-[12px] font-medium text-cream">
                  {[v.color_code, titleCase(v.color_name)].filter(Boolean).join(' · ') || '—'}
                </div>
              </button>
              <button
                onClick={() => setEditTarget('wheels_tyres')}
                className={`px-3 py-2 rounded-lg text-left ${v.wheels_tyres ? 'bg-charcoal border border-line' : 'border border-dashed border-subtle'}`}
              >
                <div className="font-mono text-[9px] tracking-widest uppercase mb-0.5 text-subtle">WHEELS &amp; TYRES</div>
                <div className={`font-mono text-[12px] font-medium ${v.wheels_tyres ? 'text-cream' : 'text-brass'}`}>
                  {v.wheels_tyres || '+ Add size & brand'}
                </div>
              </button>
              {/* mileage — manually updated, stamp keeps stale numbers honest */}
              <div className="col-span-2 flex items-center justify-between px-3 py-2 rounded-lg bg-charcoal border border-line">
                <div>
                  <div className="font-mono text-[9px] tracking-widest uppercase mb-0.5 text-subtle">MILEAGE</div>
                  <div className="font-mono text-[12px] font-medium text-cream">
                    {v.mileage_km != null ? `${v.mileage_km.toLocaleString()} km` : '—'}
                    {v.mileage_updated_at && (
                      <span className="text-[10px] font-normal text-subtle"> · updated {fmtDate(v.mileage_updated_at.slice(0, 10))}</span>
                    )}
                  </div>
                </div>
                <button onClick={() => setEditTarget('mileage')} className="font-mono text-[10px] tracking-widest uppercase text-brass">
                  UPDATE
                </button>
              </div>
            </div>

            {/* maintenance strip */}
            <div className="mt-3 rounded-lg overflow-hidden bg-charcoal border border-line">
              <div className="px-3 pt-2.5 pb-1 font-mono text-[9px] tracking-widest uppercase text-subtle">MAINTENANCE</div>
              {stripTasks.length === 0 && (
                <p className="px-3 py-2 text-[12px] text-subtle">No maintenance logged yet — add your last oil change.</p>
              )}
              {stripTasks.map(t => {
                const s = taskStatus(t)
                return (
                  <div key={t.id} className="flex items-center justify-between px-3 py-2 border-t border-line">
                    <span className="text-[12px] text-cream truncate">{t.task}</span>
                    <span className={`font-mono text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded shrink-0 ml-2 ${PILL[s]}`}>
                      {s === 'done' ? `DONE · ${fmtDate(t.done_at)}` : s === 'overdue' ? `OVERDUE · ${fmtDate(t.due_date)}` : `DUE${t.due_date ? ` · ${fmtDate(t.due_date)}` : ''}`}
                    </span>
                  </div>
                )
              })}
              <Link href="/maintenance" className="block w-full px-3 py-2 border-t border-line font-mono text-[10px] tracking-widest uppercase text-muted">
                FULL HISTORY →
              </Link>
            </div>

            {/* actions */}
            <Link
              href="/"
              className="w-full mt-4 py-3.5 rounded-xl font-semibold text-[15px] flex items-center justify-center gap-2 bg-brass hover:bg-brass-light text-charcoal transition-colors active:scale-[0.98]"
            >
              <span>Find parts for this ride</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
              </svg>
            </Link>
            <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: 'rgba(201,161,88,0.15)' }}>
              <button onClick={() => openCatalog(v, 'partsouq')} className="font-mono text-[10px] tracking-widest uppercase font-semibold text-muted">
                PARTSOUQ →
              </button>
              <button onClick={() => openCatalog(v, 'amayama')} className="font-mono text-[10px] tracking-widest uppercase font-semibold text-muted">
                AMAYAMA →
              </button>
              <button onClick={() => setDetailsOpen(true)} className="font-mono text-[10px] tracking-widest uppercase font-semibold text-brass">
                EDIT →
              </button>
            </div>
          </section>
        )}

        {/* remove — quiet, at the bottom */}
        {v && (
          <button
            onClick={() => handleRemove(v)}
            className="mt-4 mx-auto block text-[11px] font-medium text-subtle hover:text-[#E05A6B] transition-colors"
          >
            Remove this vehicle
          </button>
        )}
      </main>

      {/* edit-details sheet: pick a field, fix just that one */}
      {detailsOpen && !editTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDetailsOpen(false)} />
          <div className="relative w-full max-w-md bg-surface border-t border-line rounded-t-3xl pt-5 pb-8 shadow-2xl max-h-[80vh] flex flex-col">
            <div className="w-10 h-1 bg-line rounded-full mx-auto mb-5 shrink-0" />
            <h3 className="text-base font-bold text-cream mb-3 px-5 shrink-0">Edit car details</h3>
            <div className="overflow-y-auto px-5">
              <div className="rounded-xl overflow-hidden bg-charcoal border border-line">
                {detailRows.map((row, i) => (
                  <button
                    key={row.target}
                    onClick={() => setEditTarget(row.target)}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left ${i > 0 ? 'border-t border-line' : ''}`}
                  >
                    <span className="font-mono text-[10px] tracking-widest uppercase text-subtle shrink-0">{row.label}</span>
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="text-[13px] text-cream truncate">{row.value}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B6259" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[10px] text-subtle text-center">Tap a field to fix just that one — nothing else changes.</p>
            </div>
          </div>
        </div>
      )}

      {/* single-field edit sheet */}
      {editTarget && (
        <EditSheet
          open
          title={editConfig[editTarget].title}
          placeholder={editConfig[editTarget].placeholder}
          type={editConfig[editTarget].type}
          initial={editConfig[editTarget].initial}
          saving={editSaving}
          onClose={() => setEditTarget(null)}
          onSave={handleEditSave}
        />
      )}

      {/* Earl floating chat bubble */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg, #C9A158, #8b6f3d)', boxShadow: '0 8px 24px rgba(0,0,0,0.4), 0 0 0 2px rgba(201,161,88,0.2)' }}
          aria-label="Chat with Earl"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0F0E0D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-live border-2 border-charcoal" />
        </button>
      )}

      {/* Earl chat backdrop */}
      {chatOpen && (
        <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setChatOpen(false)} />
      )}

      {/* Earl chat panel */}
      {chatOpen && (
        <div className="fixed inset-x-0 bottom-0 z-50 max-w-md mx-auto flex flex-col bg-surface border-t border-line rounded-t-3xl shadow-2xl" style={{ height: '70vh' }}>
          {/* Panel header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <EarlAvatar />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-live border-2 border-surface" />
              </div>
              <div>
                <p className="font-bold text-cream text-sm leading-tight">Earl</p>
                <p className="text-xs text-muted">Knows your car inside out</p>
              </div>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full text-muted hover:bg-elevated transition-colors"
              aria-label="Close chat"
            >
              <XIcon />
            </button>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {chatMessages.length === 0 ? (
              <>
                <div className="flex gap-3">
                  <EarlAvatar size="sm" />
                  <div className="bg-charcoal border border-line rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
                    <p className="text-sm text-cream">Hey, I&apos;m Earl. What can I help you with today?</p>
                  </div>
                </div>
                <div className="ml-11 flex flex-wrap gap-2">
                  {starterChips.map((chip) => (
                    <button
                      key={chip}
                      onClick={() => sendMessage(chip)}
                      className="font-mono text-[11px] bg-elevated rounded-lg px-2.5 py-1.5 text-muted hover:text-brass transition-colors text-left"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'gap-3'}`}>
                  {msg.role === 'assistant' && <EarlAvatar size="sm" />}
                  <div className={`rounded-2xl px-4 py-3 max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-elevated text-cream rounded-br-md'
                      : 'bg-charcoal border border-line text-cream rounded-bl-md'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))
            )}

            {/* Loading dots */}
            {chatLoading && (
              <div className="flex gap-3">
                <EarlAvatar size="sm" />
                <div className="bg-charcoal border border-line rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1 items-center h-5">
                    <span className="w-2 h-2 bg-subtle rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-subtle rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-subtle rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="px-4 py-3 border-t border-line flex gap-2 shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage(chatInput)
                }
              }}
              placeholder="Ask Earl anything…"
              className="flex-1 bg-charcoal border border-line rounded-xl px-4 py-2.5 text-sm text-cream placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brass"
            />
            <button
              onClick={() => sendMessage(chatInput)}
              disabled={!chatInput.trim() || chatLoading}
              className="w-10 h-10 bg-brass hover:bg-brass-light disabled:opacity-40 rounded-xl flex items-center justify-center text-charcoal transition-colors shrink-0 active:scale-95"
              aria-label="Send"
            >
              <SendIcon />
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
