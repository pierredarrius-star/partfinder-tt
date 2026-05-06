'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase'

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
}

const titleCase = (s: string | null) => s ? s.replace(/\b\w/g, c => c.toUpperCase()) : s

const PencilIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
)

export default function Profile() {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        window.location.href = '/login'
        return
      }

      setUserEmail(session.user.email ?? null)

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
      setVehicles(vehiclesRes.data ?? [])
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

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const handleDelete = async (v: Vehicle) => {
    if (!confirm(`Delete this ${v.year} ${v.brand} ${v.name}? This cannot be undone.`)) return

    const { error } = await supabase.from('user_vehicles').delete().eq('id', v.id)
    if (error) {
      alert(error.message)
      return
    }

    const remaining = vehicles.filter(x => x.id !== v.id)

    if (v.is_primary && remaining.length > 0) {
      const oldest = remaining.reduce((a, b) => a.created_at < b.created_at ? a : b)
      await supabase.from('user_vehicles').update({ is_primary: true }).eq('id', oldest.id)
      setVehicles(remaining.map(x => ({ ...x, is_primary: x.id === oldest.id })))
    } else {
      setVehicles(remaining)
    }
  }

  if (loading) return null

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen relative">

      <header className="pt-safe bg-white border-b border-slate-100 px-4 py-4 sticky top-0 z-10 flex items-center justify-between">
        <div className="w-8" />
        <h1 className="text-lg font-bold text-slate-800 tracking-tight">My Garage</h1>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-10 w-52 bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Account</p>
                <p className="text-sm font-medium text-slate-700 truncate">{userEmail ?? '—'}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 py-6 overflow-y-auto pb-24">

        {/* Account card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-5">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Account</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Full Name</p>
                <p className="text-sm font-semibold text-slate-800">{profile?.full_name ?? '—'}</p>
              </div>
              <Link
                href="/onboarding?edit=profile"
                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <PencilIcon />
              </Link>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">WhatsApp</p>
                <p className="text-sm font-semibold text-slate-800">{profile?.whatsapp_number ?? '—'}</p>
              </div>
              <Link
                href="/onboarding?edit=profile"
                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <PencilIcon />
              </Link>
            </div>
          </div>
        </div>

        {/* Vehicles */}
        <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Vehicles</h2>

        {vehicles.length === 0 && (
          <p className="text-sm text-slate-400 italic mb-4 px-1">No vehicles yet.</p>
        )}

        {vehicles.map((v) => (
          <div key={v.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-3">
            <div className="flex items-start justify-between mb-1">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-slate-800">{v.year} {titleCase(v.brand)} {titleCase(v.name)}</h3>
                  {v.is_primary && (
                    <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Primary</span>
                  )}
                </div>
                {(v.model_code || v.engine) && (
                  <p className="text-xs text-slate-500 mt-0.5">{[v.model_code, v.engine].filter(Boolean).join(' · ')}</p>
                )}
              </div>
              <button
                onClick={() => handleDelete(v)}
                className="w-7 h-7 flex items-center justify-center rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0 ml-2"
                aria-label="Delete vehicle"
              >
                <TrashIcon />
              </button>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Color</p>
                <p className="text-xs font-semibold text-slate-700">
                  {titleCase(v.color_name) ?? '—'}
                  {v.color_code && <span className="text-slate-400 font-normal"> · {v.color_code}</span>}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Nickname</p>
                <p className="text-xs font-semibold text-slate-700">{titleCase(v.nickname) ?? '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">VIN</p>
                {v.vin
                  ? <p className="text-xs font-semibold text-slate-700">{v.vin}</p>
                  : <p className="text-xs text-slate-400 italic">Not set</p>
                }
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Manual</p>
                {v.manual_url
                  ? <a href={v.manual_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-brand-600 hover:underline">Uploaded</a>
                  : <p className="text-xs text-slate-400 italic">Not uploaded</p>
                }
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link
                href={`/?vehicle=${v.id}`}
                className="flex items-center justify-center bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold py-2.5 rounded-xl transition-colors active:scale-[0.98]"
              >
                Search parts
              </Link>
              <Link
                href={`/onboarding?edit=${v.id}`}
                className="flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition-colors active:scale-[0.98]"
              >
                Edit vehicle
              </Link>
            </div>

            {(v.vin || v.model_code) && (
              <div className="mt-3 -mx-5 border-t border-slate-100">
                <p className="px-5 pt-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Parts catalogs</p>
                <div className="grid grid-cols-2 divide-x divide-slate-100">
                  <button
                    onClick={async () => {
                      if (v.vin) { try { await navigator.clipboard.writeText(v.vin) } catch {} }
                      window.open('https://partsouq.com/en/search/vin', '_blank', 'noopener,noreferrer')
                    }}
                    className="py-3 text-center text-xs font-semibold text-blue-600 hover:bg-slate-50 transition-colors"
                  >
                    PartSouq
                  </button>
                  <button
                    onClick={async () => {
                      if (v.vin) {
                        try { await navigator.clipboard.writeText(v.vin) } catch {}
                        window.open(`https://www.amayama.com/en/search/?q=${encodeURIComponent(v.vin)}`, '_blank', 'noopener,noreferrer')
                      } else {
                        window.open('https://www.amayama.com/en', '_blank', 'noopener,noreferrer')
                      }
                    }}
                    className="py-3 text-center text-xs font-semibold text-blue-600 hover:bg-slate-50 transition-colors"
                  >
                    Amayama
                  </button>
                </div>
                {v.vin && (
                  <p className="px-4 pb-3 text-xs text-slate-400 italic">VIN copied to clipboard — paste it into the catalog&apos;s search bar.</p>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Add vehicle */}
        <Link
          href="/onboarding"
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50 transition-colors font-semibold text-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add another vehicle
        </Link>

      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/80 backdrop-blur-xl border-t border-slate-100 flex items-center justify-around py-4 px-6 z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        {[
          { label: 'Home', path: '/', active: false },
          { label: 'Orders', path: '/orders', active: false },
          { label: 'Profile', path: '/profile', active: true },
        ].map((tab, i) => (
          <Link href={tab.path} key={i} className={`flex flex-col items-center gap-1 ${tab.active ? 'text-brand-600' : 'text-slate-400'}`}>
            <span className="text-[11px] font-extrabold uppercase tracking-wider">{tab.label}</span>
          </Link>
        ))}
      </nav>

    </div>
  )
}
