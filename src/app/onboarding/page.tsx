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
          <div className="relative w-full max-w-md bg-white rounded-t-3xl px-4 pt-5 pb-10 shadow-2xl" style={{ minWidth: 340 }}>
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />

            <svg width="100%" viewBox="0 0 380 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="VIN locations on a sedan" className="mb-4">
              <style>{`
                .car-line { fill: none; stroke: #2A2A2A; stroke-width: 1.2; stroke-linecap: round; stroke-linejoin: round; }
                .car-fine { fill: none; stroke: #2A2A2A; stroke-width: 0.7; stroke-linecap: round; }
                .marker-dot { fill: #D32F2F; stroke: #fff; stroke-width: 1.5; }
                .leader { stroke: #D32F2F; stroke-width: 1; fill: none; }
                .callout-box { fill: #fff; stroke: #D32F2F; stroke-width: 1; }
                .callout-text { fill: #2A2A2A; font-size: 10px; font-family: system-ui, sans-serif; font-weight: 500; }
                @media (prefers-color-scheme: dark) {
                  .car-line { stroke: #E8E8E8; }
                  .car-fine { stroke: #C0C0C0; }
                  .callout-box { fill: #1F1F1F; }
                  .callout-text { fill: #E8E8E8; }
                }
              `}</style>
              <path className="car-line" d="M 70 195 L 80 195 M 105 195 L 240 195 M 265 195 L 305 195 Q 318 195 322 188 L 328 168 Q 330 162 326 159 L 285 150 L 252 116 Q 244 108 232 107 L 162 107 Q 152 108 144 116 L 112 150 L 70 158 Q 64 160 64 166 L 64 188 Q 64 195 70 195 Z"/>
              <path className="car-line" d="M 122 150 L 152 116 Q 158 110 168 110 L 228 110 Q 238 112 244 120 L 270 150 Z"/>
              <line className="car-fine" x1="195" y1="110" x2="195" y2="150"/>
              <line className="car-fine" x1="155" y1="150" x2="155" y2="195"/>
              <line className="car-fine" x1="195" y1="150" x2="195" y2="195"/>
              <rect x="170" y="168" width="14" height="3" rx="1" className="car-line"/>
              <rect x="210" y="168" width="14" height="3" rx="1" className="car-line"/>
              <line className="car-fine" x1="112" y1="150" x2="144" y2="120"/>
              <line className="car-fine" x1="244" y1="120" x2="285" y2="150"/>
              <ellipse className="car-line" cx="78" cy="170" rx="8" ry="5"/>
              <line className="car-fine" x1="65" y1="180" x2="75" y2="180"/>
              <line className="car-fine" x1="65" y1="184" x2="75" y2="184"/>
              <rect x="313" y="168" width="10" height="6" rx="1" className="car-line"/>
              <path className="car-line" d="M 80 195 Q 92 178 105 195"/>
              <path className="car-line" d="M 240 195 Q 252 178 265 195"/>
              <circle className="car-line" cx="92" cy="200" r="13"/>
              <circle className="car-fine" cx="92" cy="200" r="6"/>
              <circle className="car-line" cx="252" cy="200" r="13"/>
              <circle className="car-fine" cx="252" cy="200" r="6"/>
              <line className="car-fine" x1="106" y1="172" x2="240" y2="172"/>
              <circle className="marker-dot" cx="120" cy="148" r="5"/>
              <path className="leader" d="M 120 148 L 120 60 L 95 60"/>
              <rect className="callout-box" x="20" y="48" width="115" height="26" rx="2"/>
              <text className="callout-text" x="27" y="60">1. Under the hood</text>
              <text className="callout-text" x="27" y="71" fill="#777">(engine bay)</text>
              <circle className="marker-dot" cx="170" cy="172" r="5"/>
              <path className="leader" d="M 170 172 L 170 248 L 110 248"/>
              <rect className="callout-box" x="20" y="236" width="135" height="26" rx="2"/>
              <text className="callout-text" x="27" y="248">2. Driver&apos;s door jamb</text>
              <text className="callout-text" x="27" y="259" fill="#777">(open door, look at frame)</text>
              <circle className="marker-dot" cx="265" cy="148" r="5"/>
              <path className="leader" d="M 265 148 L 265 60 L 290 60"/>
              <rect className="callout-box" x="245" y="48" width="120" height="26" rx="2"/>
              <text className="callout-text" x="252" y="60">3. Under boot lid</text>
              <text className="callout-text" x="252" y="71" fill="#777">(open trunk, look up)</text>
              <circle className="marker-dot" cx="295" cy="178" r="5"/>
              <path className="leader" d="M 295 178 L 295 248 L 240 248"/>
              <rect className="callout-box" x="225" y="236" width="135" height="26" rx="2"/>
              <text className="callout-text" x="232" y="248">4. Inside trunk panel</text>
              <text className="callout-text" x="232" y="259" fill="#777">(side wall, behind carpet)</text>
              <text x="190" y="22" fontSize="14" fontFamily="system-ui, sans-serif" fontWeight="500" textAnchor="middle" fill="currentColor">Where to find your VIN / plate</text>
              <text x="190" y="38" fontSize="11" fontFamily="system-ui, sans-serif" textAnchor="middle" fill="#777">The 4 most common locations</text>
              <text x="190" y="298" fontSize="10" fontFamily="system-ui, sans-serif" textAnchor="middle" fill="#777">Can&apos;t find it? Check your vehicle title or insurance card.</text>
            </svg>

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
