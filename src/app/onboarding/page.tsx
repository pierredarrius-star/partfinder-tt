'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase'

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()
  const [showInfo, setShowInfo] = useState(false)

  const [fullName, setFullName] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [vin, setVin] = useState('')
  const [year, setYear] = useState('')
  const [brand, setBrand] = useState('')
  const [name, setName] = useState('')
  const [modelCode, setModelCode] = useState('')
  const [body, setBody] = useState('')
  const [engine, setEngine] = useState('')
  const [colorCode, setColorCode] = useState('')
  const [colorName, setColorName] = useState('')
  const [nickname, setNickname] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setError(null)
    if (!fullName.trim() || !whatsappNumber.trim()) {
      setError('Full name and WhatsApp number are required.')
      return
    }
    if (!year.trim() || !brand.trim() || !name.trim() || !body.trim() || !engine.trim()) {
      setError('Year, brand, name, body, and engine are required.')
      return
    }

    setLoading(true)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    console.log('Session:', session)
    console.log('Session error:', sessionError)

    if (!session) {
      setLoading(false)
      setError('You must be logged in to save. Please log in and try again.')
      return
    }

    const { error: profileError } = await supabase.from('user_profiles').upsert({
      user_id: session.user.id,
      full_name: fullName.trim(),
      whatsapp_number: whatsappNumber.trim(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    if (profileError) {
      setLoading(false)
      setError(profileError.message)
      return
    }

    const res = await fetch('/api/vehicles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        year,
        vin: vin.trim().toUpperCase() || null,
        brand: brand.trim().toLowerCase(),
        name: name.trim().toLowerCase(),
        model_code: modelCode.trim().toLowerCase() || null,
        body: body.trim().toLowerCase(),
        engine: engine.trim().toUpperCase(),
        color_code: colorCode.trim() || null,
        color_name: colorName.trim().toLowerCase() || null,
        nickname: nickname.trim().toLowerCase() || null,
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
          <div className="relative w-full max-w-md bg-white rounded-t-3xl pt-5 pb-10 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />

            <div className="flex flex-col items-center gap-4 px-4 py-2">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-slate-800">Where to find your VIN / plate</h3>
                <p className="text-sm text-slate-500 mt-1">The 4 most common locations</p>
              </div>

              <div className="relative w-full max-w-md">
                <img
                  src="/car-diagram.jpg"
                  alt="Car showing VIN locations"
                  className="w-full h-auto block"
                />

                {/* Marker 1: Front of frame */}
                <div className="absolute" style={{ left: '22%', top: '70%' }}>
                  <div className="relative">
                    <div className="w-4 h-4 rounded-full bg-red-600 border-2 border-white shadow-md" />
                    <div className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-red-600 opacity-30 animate-ping" />
                  </div>
                </div>

                {/* Marker 2: Engine bay */}
                <div className="absolute" style={{ left: '32%', top: '52%' }}>
                  <div className="relative">
                    <div className="w-4 h-4 rounded-full bg-red-600 border-2 border-white shadow-md" />
                    <div className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-red-600 opacity-30 animate-ping" />
                  </div>
                </div>

                {/* Marker 3: Driver's dash */}
                <div className="absolute" style={{ left: '52%', top: '38%' }}>
                  <div className="relative">
                    <div className="w-4 h-4 rounded-full bg-red-600 border-2 border-white shadow-md" />
                    <div className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-red-600 opacity-30 animate-ping" />
                  </div>
                </div>

                {/* Marker 4: Driver's door jamb */}
                <div className="absolute" style={{ left: '64%', top: '58%' }}>
                  <div className="relative">
                    <div className="w-4 h-4 rounded-full bg-red-600 border-2 border-white shadow-md" />
                    <div className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-red-600 opacity-30 animate-ping" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 w-full text-sm">
                {[
                  { n: 1, label: 'Front of frame', sub: 'Near radiator support (older cars)' },
                  { n: 2, label: 'Engine bay (under hood)', sub: 'Stamped on the engine block' },
                  { n: 3, label: "Driver's side dash", sub: 'Visible through the windshield' },
                  { n: 4, label: "Driver's door jamb", sub: 'Open driver door, look at the frame' },
                ].map(({ n, label, sub }) => (
                  <div key={n} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-600 text-white text-xs font-semibold flex items-center justify-center">{n}</span>
                    <div>
                      <div className="font-medium text-slate-800">{label}</div>
                      <div className="text-xs text-slate-500">{sub}</div>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-slate-400 text-center mt-2">Can&apos;t find it? Check your vehicle title or insurance card.</p>
            </div>

            <div className="px-4 mt-4">
              <button
                onClick={() => setShowInfo(false)}
                className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3.5 rounded-2xl transition-colors active:scale-[0.98]"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="pt-safe bg-white border-b border-slate-100 px-6 py-6">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">What vehicle do you drive?</h1>
        <p className="text-sm text-slate-500 mt-1 leading-snug">Add your vehicle for faster, more accurate part searches</p>

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

          {/* Profile fields */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
            <input
              type="text"
              placeholder="e.g. John Smith"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 border-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">WhatsApp Number</label>
            <input
              type="tel"
              placeholder="868-XXX-XXXX"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 border-none"
            />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Vehicle Details</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">VIN (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. JT2AE09W9J0123456"
                  value={vin}
                  onChange={(e) => setVin(e.target.value)}
                  className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 border-none"
                />
              </div>

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
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. Toyota"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 border-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Name</label>
                <input
                  type="text"
                  placeholder="e.g. Corolla Axio"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 border-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Model</label>
                <input
                  type="text"
                  placeholder="e.g. DBA-NZE144-AEXNK(nze144)"
                  value={modelCode}
                  onChange={(e) => setModelCode(e.target.value)}
                  className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 border-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Body</label>
                <input
                  type="text"
                  placeholder="e.g. Sedan"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
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
                    placeholder="e.g. Super White"
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
