'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase'


export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()
  const [showInfo, setShowInfo] = useState(false)

  const [year, setYear] = useState('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [trim, setTrim] = useState('')
  const [engine, setEngine] = useState('')
  const [colorCode, setColorCode] = useState('')
  const [colorName, setColorName] = useState('')
  const [nickname, setNickname] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setError(null)
    if (!year.trim() || !make.trim() || !model.trim()) {
      setError('Year, make, and model are required.')
      return
    }

    setLoading(true)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    console.log('Session:', session)
    console.log('Session error:', sessionError)

    if (!session) {
      setLoading(false)
      setError('You must be logged in to save a vehicle. Please log in and try again.')
      return
    }

    const res = await fetch('/api/vehicles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token ?? ''}`,
      },
      body: JSON.stringify({
        year,
        make: make.trim(),
        model: model.trim(),
        trim: trim.trim(),
        engine: engine.trim(),
        color_code: colorCode.trim(),
        color_name: colorName.trim(),
        nickname: nickname.trim(),
      }),
    })

    setLoading(false)

    if (!res.ok) {
      const { error: msg } = await res.json()
      setError(msg ?? 'Failed to save vehicle.')
      return
    }

    router.push('/')
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">

      {/* Info modal */}
      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowInfo(false)}
          />
          <div className="relative w-full max-w-md bg-white rounded-t-3xl px-6 pt-5 pb-10 shadow-2xl">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
            <h3 className="text-base font-bold text-slate-800 mb-1">Where to find your compliance plate</h3>
            <p className="text-sm text-slate-500 mb-3">The plate shows your frame number, engine code, colour and trim</p>

            <svg viewBox="0 0 400 200" className="w-full mb-4" xmlns="http://www.w3.org/2000/svg">
              {/* Car body */}
              <path
                d="M 365 152 L 368 148 L 368 126 L 360 110 L 344 98 L 312 98 L 282 74 L 252 60 L 175 60 L 140 65 L 104 88 L 68 105 L 45 118 L 35 138 L 35 152 L 78 152 A 26 20 0 0 0 130 152 L 270 152 A 26 20 0 0 0 322 152 Z"
                fill="#e2e8f0" stroke="#475569" strokeWidth="2" strokeLinejoin="round"
              />
              {/* Wheels */}
              <circle cx="104" cy="160" r="22" fill="#334155" stroke="#1e293b" strokeWidth="2" />
              <circle cx="104" cy="160" r="8" fill="#94a3b8" />
              <circle cx="296" cy="160" r="22" fill="#334155" stroke="#1e293b" strokeWidth="2" />
              <circle cx="296" cy="160" r="8" fill="#94a3b8" />
              {/* Windows */}
              <path d="M 108 88 L 140 65 L 166 65 L 162 84 Z" fill="#bfdbfe" stroke="#475569" strokeWidth="1.5" />
              <path d="M 162 84 L 166 65 L 252 60 L 263 84 Z" fill="#bfdbfe" stroke="#475569" strokeWidth="1.5" />
              <path d="M 263 84 L 282 74 L 312 98 L 270 98 Z" fill="#bfdbfe" stroke="#475569" strokeWidth="1.5" />
              {/* B-pillar */}
              <line x1="200" y1="84" x2="200" y2="136" stroke="#94a3b8" strokeWidth="1.5" />

              {/* 1 — Driver door jamb */}
              <line x1="200" y1="118" x2="178" y2="118" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 2" />
              <circle cx="167" cy="118" r="11" fill="#ef4444" stroke="white" strokeWidth="1.5" />
              <text x="167" y="122" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">1</text>

              {/* 2 — Firewall */}
              <line x1="314" y1="104" x2="334" y2="86" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 2" />
              <circle cx="343" cy="78" r="11" fill="#ef4444" stroke="white" strokeWidth="1.5" />
              <text x="343" y="82" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">2</text>

              {/* 3 — Interior dash */}
              <line x1="268" y1="78" x2="250" y2="57" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 2" />
              <circle cx="242" cy="48" r="11" fill="#ef4444" stroke="white" strokeWidth="1.5" />
              <text x="242" y="52" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">3</text>

              {/* 4 — Front of frame */}
              <line x1="364" y1="143" x2="381" y2="156" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 2" />
              <circle cx="387" cy="164" r="11" fill="#ef4444" stroke="white" strokeWidth="1.5" />
              <text x="387" y="168" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">4</text>
            </svg>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-6">
              {[
                { n: 1, label: "Driver's door jamb", sub: 'Most common' },
                { n: 2, label: 'Under the bonnet', sub: 'Engine bay firewall' },
                { n: 3, label: 'Interior dash', sub: 'Behind the windshield' },
                { n: 4, label: 'Front of frame', sub: 'Front bumper area' },
              ].map(({ n, label, sub }) => (
                <div key={n} className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold leading-none">{n}</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800 leading-tight">{label}</p>
                    <p className="text-xs text-slate-500 leading-tight">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowInfo(false)}
              className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3.5 rounded-2xl transition-colors active:scale-[0.98]"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="pt-safe bg-white border-b border-slate-100 px-6 py-6">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">What vehicle do you drive?</h1>
        <p className="text-sm text-slate-500 mt-1 leading-snug">Add your vehicle for faster, more accurate part searches</p>

        {/* Quick action buttons */}
        <div className="flex gap-3 mt-4">
          <div className="flex items-center gap-1.5">
            <button className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors active:scale-[0.97]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              Scan Plate
            </button>
            <button
              onClick={() => setShowInfo(true)}
              className="w-6 h-6 rounded-full border border-slate-200 text-slate-400 flex items-center justify-center hover:bg-slate-50 hover:text-slate-600 transition-colors"
              aria-label="Where to find compliance plate"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
              </svg>
            </button>
          </div>

          <button className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors active:scale-[0.97]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <path d="M12 18v-6"/><path d="M9 15l3-3 3 3"/>
            </svg>
            Upload Manual
          </button>
        </div>
      </header>

      {/* Form */}
      <main className="flex-1 px-4 py-6 overflow-y-auto pb-10">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Year</label>
              <input
                type="number"
                placeholder="e.g. 2012"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 border-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Make</label>
              <input
                type="text"
                placeholder="e.g. Toyota"
                value={make}
                onChange={(e) => setMake(e.target.value)}
                className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 border-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Model</label>
            <input
              type="text"
              placeholder="e.g. Corolla Axio"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 border-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Trim / Variant</label>
            <input
              type="text"
              placeholder="e.g. NZE144"
              value={trim}
              onChange={(e) => setTrim(e.target.value)}
              className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 border-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Engine</label>
            <input
              type="text"
              placeholder="e.g. 1NZ-FE"
              value={engine}
              onChange={(e) => setEngine(e.target.value)}
              className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 border-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Color Code</label>
              <input
                type="text"
                placeholder="e.g. 040, ZHJ, 1F7"
                value={colorCode}
                onChange={(e) => setColorCode(e.target.value)}
                className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 border-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Color</label>
              <input
                type="text"
                placeholder="e.g. White, Silver, Black"
                value={colorName}
                onChange={(e) => setColorName(e.target.value)}
                className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 border-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nickname (Optional)</label>
            <input
              type="text"
              placeholder={`e.g. "My Corolla", "Wife's Car", "Work Truck"`}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 border-none"
            />
          </div>

        </div>

        {error && (
          <p className="mt-3 text-sm text-red-500 font-medium text-center">{error}</p>
        )}

        <div className="mt-5 space-y-3">
          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-4 rounded-2xl transition-colors active:scale-[0.98] shadow-md shadow-brand-100 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving…' : 'Save Vehicle'}
          </button>
          <div className="flex justify-center">
            <button
              onClick={() => router.push('/')}
              className="text-sm text-slate-400 hover:text-slate-600 font-medium transition-colors"
            >
              Skip for now
            </button>
          </div>
        </div>
      </main>

    </div>
  )
}
