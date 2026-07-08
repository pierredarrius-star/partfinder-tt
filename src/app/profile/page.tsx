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

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
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

const ChatBubbleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
)

const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
)

const XIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

const EarlAvatar = ({ size = 'md' }: { size?: 'sm' | 'md' }) => (
  <div className={`${size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'} bg-brand-600 rounded-full flex items-center justify-center text-white font-bold shrink-0`}>
    E
  </div>
)

export default function Profile() {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Earl chat state
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [showPulse, setShowPulse] = useState(true)
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

  // Auto-dismiss pulse ring after 4 seconds
  useEffect(() => {
    const t = setTimeout(() => setShowPulse(false), 4000)
    return () => clearTimeout(t)
  }, [])

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

  const primaryVehicle = vehicles[0]
  const carLabel = primaryVehicle
    ? [primaryVehicle.year, titleCase(primaryVehicle.brand), titleCase(primaryVehicle.name)].filter(Boolean).join(' ')
    : null
  const starterGroups = [
    {
      label: '🔧 Find a part',
      chips: [
        carLabel ? `What brake pads does my ${carLabel} need?` : 'What brake pads do I need?',
        'Front headlight part number',
        'Oil filter part number',
      ],
    },
    {
      label: '🛢️ Maintenance & specs',
      chips: [
        'What engine oil grade should I use?',
        'What transmission oil does my car take?',
        'How often should I change my oil?',
      ],
    },
  ]

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

            <div className="mt-4">
              <Link
                href={`/?vehicle=${v.id}`}
                className="flex items-center justify-center bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold py-2.5 rounded-xl transition-colors active:scale-[0.98]"
              >
                Search parts
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

        {/* Add vehicle — only when the garage is empty (one-car limit) */}
        {vehicles.length === 0 && (
          <Link
            href="/onboarding"
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50 transition-colors font-semibold text-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add vehicle
          </Link>
        )}

      </main>

      {/* Earl chat backdrop */}
      {chatOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setChatOpen(false)}
        />
      )}

      {/* Earl chat panel */}
      {chatOpen && (
        <div className="fixed inset-x-0 bottom-0 z-50 max-w-md mx-auto flex flex-col bg-white rounded-t-3xl shadow-2xl" style={{ height: '70vh' }}>
          {/* Panel header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-3">
              <EarlAvatar />
              <div>
                <p className="font-bold text-slate-800 text-sm leading-tight">Earl</p>
                <p className="text-xs text-slate-500">Auto parts specialist</p>
              </div>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 transition-colors"
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
                  <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
                    <p className="text-sm text-slate-700">Hey, I&apos;m Earl. What can I help you with today?</p>
                  </div>
                </div>
                <div className="ml-11 space-y-3">
                  {starterGroups.map((group) => (
                    <div key={group.label}>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{group.label}</p>
                      <div className="flex flex-wrap gap-2">
                        {group.chips.map((chip) => (
                          <button
                            key={chip}
                            onClick={() => sendMessage(chip)}
                            className="text-xs bg-white border border-slate-200 rounded-full px-3 py-1.5 text-slate-600 hover:border-brand-400 hover:text-brand-600 transition-colors text-left"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'gap-3'}`}>
                  {msg.role === 'assistant' && <EarlAvatar size="sm" />}
                  <div className={`rounded-2xl px-4 py-3 max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-brand-600 text-white rounded-tr-sm'
                      : 'bg-slate-100 text-slate-700 rounded-tl-sm'
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
                <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1 items-center h-5">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="px-4 py-3 border-t border-slate-100 flex gap-2 shrink-0">
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
              className="flex-1 bg-slate-50 rounded-full px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 border-none"
            />
            <button
              onClick={() => sendMessage(chatInput)}
              disabled={!chatInput.trim() || chatLoading}
              className="w-10 h-10 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 rounded-full flex items-center justify-center text-white transition-colors shrink-0 active:scale-95"
              aria-label="Send"
            >
              <SendIcon />
            </button>
          </div>
        </div>
      )}

      {/* Earl floating chat button */}
      <button
        onClick={() => { setChatOpen(true); setShowPulse(false) }}
        className="fixed bottom-20 right-4 z-40 w-14 h-14 bg-brand-600 hover:bg-brand-500 text-white rounded-full shadow-lg shadow-brand-200 flex items-center justify-center transition-all active:scale-95"
        aria-label="Chat with Earl"
      >
        {showPulse && (
          <span className="absolute inset-0 rounded-full bg-brand-500 animate-ping opacity-50" />
        )}
        <ChatBubbleIcon />
      </button>

    </div>
  )
}
