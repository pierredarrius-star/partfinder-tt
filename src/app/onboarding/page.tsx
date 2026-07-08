'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase'

const CheckIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

type DecodeVehicle = {
  vin?: string | null
  year?: number | null
  brand?: string | null
  name?: string | null
  model_code?: string | null
  body?: string | null
  engine?: string | null
  year_start?: number | null
  year_end?: number | null
  drivetrain?: string | null
}

type DecodeResponse = {
  source: 'nhtsa' | 'chassis_db' | 'partsouq' | 'none' | null
  vehicle: DecodeVehicle | null
  error?: string
  message?: string
}

function cap(s: string | null | undefined): string {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// One question per screen: 1 = name, 2 = phone, 3 = the ride.
export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [showManualForm, setShowManualForm] = useState(false)

  const [showInfo, setShowInfo] = useState(false)
  const [showScanModal, setShowScanModal] = useState(false)
  const [scanLoading, setScanLoading] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [scannedFields, setScannedFields] = useState<Set<string>>(new Set())

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)

  const [fullName, setFullName] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [vin, setVin] = useState('')
  const [frameNumber, setFrameNumber] = useState('')
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

  // VIN / chassis decoder state
  const [decodeStatus, setDecodeStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [decodeResult, setDecodeResult] = useState<DecodeResponse | null>(null)
  const [decodeError, setDecodeError] = useState<string | null>(null)
  const [lastDecodedInput, setLastDecodedInput] = useState('')
  const [decodeApplied, setDecodeApplied] = useState(false)
  // mousedown fires before blur — used to suppress blur auto-decode when user clicks Decode button
  const decodeMouseDownRef = useRef(false)

  function clearScanned(field: string) {
    setScannedFields(prev => new Set([...prev].filter(f => f !== field)))
  }

  function inputClass(field: string) {
    return `w-full rounded-xl px-4 py-3 text-sm text-[#F5F1EA] placeholder:text-[#6B6259] focus:outline-none focus:ring-2 border transition-colors ${
      scannedFields.has(field)
        ? 'bg-[#5DBB7C]/10 border-[#5DBB7C] ring-1 ring-[#5DBB7C] focus:ring-[#5DBB7C]'
        : 'bg-[#1C1A17] border-[#3A352D] focus:ring-[#C9A158] focus:border-transparent'
    }`
  }

  const labelClass = 'block font-mono text-[10px] font-semibold text-[#6B6259] uppercase tracking-[0.15em] mb-1.5'

  async function handleDecode() {
    const trimmed = vin.trim()
    if (trimmed.length < 9) return

    setDecodeStatus('loading')
    setDecodeError(null)
    setDecodeResult(null)
    setDecodeApplied(false)
    setLastDecodedInput(trimmed)

    try {
      const res = await fetch('/api/decode-vin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: trimmed }),
      })

      if (!res.ok) {
        setDecodeStatus('error')
        setDecodeError("Couldn't reach decoder. Check your connection and try again.")
        return
      }

      const data: DecodeResponse = await res.json()

      if (data.source === 'nhtsa' || data.source === 'chassis_db' || data.source === 'partsouq') {
        setDecodeResult(data)
        setDecodeStatus('success')
      } else {
        setDecodeStatus('error')
        if (data.error === 'jdm_or_unsupported_vin') {
          setDecodeError("This looks like a valid VIN, but our decoder doesn't cover this vehicle yet — common for JDM-only imports. Try your chassis number with a dash (e.g. NZE141-1234567), use Scan Plate above, or fill the fields manually.")
        } else if (data.error === 'chassis_prefix_missing') {
          setDecodeError("We don't recognize this chassis prefix yet. We're adding more codes as users hit them — please fill the fields manually, or use Scan Plate above.")
        } else if (data.error === 'format_invalid') {
          setDecodeError(data.message ?? 'Format not recognized. Provide a 17-character VIN or a JDM chassis number with dash (e.g., NZE141-1234567).')
        } else {
          setDecodeError("Couldn't decode this input. Please fill the fields manually.")
        }
      }
    } catch {
      setDecodeStatus('error')
      setDecodeError("Couldn't reach decoder. Check your connection and try again.")
    }
  }

  function handleVinBlur() {
    if (decodeMouseDownRef.current) {
      decodeMouseDownRef.current = false
      return
    }
    const trimmed = vin.trim()
    if (trimmed.length >= 9 && trimmed !== lastDecodedInput) {
      handleDecode()
    }
  }

  function handleApply() {
    if (!decodeResult?.vehicle) return
    const v = decodeResult.vehicle

    // "Apply" overwrites the mechanical facts — a decode/lookup is more authoritative
    // than a plate-photo guess, so it should correct mismatches (e.g. body SUV→Wagon),
    // not silently skip already-filled fields. Year is the one exception: it's kept
    // fill-only, because a JDM build year often differs from the T&T registration year
    // the owner entered, and we shouldn't clobber their value.
    if (decodeResult.source === 'nhtsa') {
      if (v.year && !year) setYear(String(v.year))
      if (v.brand) setBrand(v.brand)
      if (v.name) setName(v.name)
      if (v.body) setBody(v.body)
      if (v.engine) setEngine(v.engine)
    } else if (decodeResult.source === 'chassis_db') {
      if (v.brand) setBrand(v.brand)
      if (v.name) setName(v.name)
      if (v.engine) setEngine(v.engine)
      if (v.body) setBody(v.body)
      if (v.model_code) setModelCode(v.model_code)
      // year intentionally skipped — chassis decode gives a range, user picks exact year
    } else if (decodeResult.source === 'partsouq') {
      if (v.year && !year) setYear(String(v.year))
      if (v.brand) setBrand(v.brand)
      if (v.name) setName(v.name)
      if (v.model_code) setModelCode(v.model_code)
      if (v.engine) setEngine(v.engine)
      if (v.body) setBody(v.body)
    }

    setDecodeStatus('idle')
    setDecodeResult(null)
    setDecodeApplied(true)
  }

  async function handleScanFile(file: File) {
    if (file.size > 4 * 1024 * 1024) {
      setScanError('Image is too large. Please use an image under 4MB.')
      return
    }

    setScanLoading(true)
    setScanError(null)

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
      })

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setScanError('You must be logged in to use this feature.')
        setScanLoading(false)
        return
      }

      const res = await fetch('/api/scan-plate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ image: base64, mimeType: file.type }),
      })

      const data = await res.json()

      if (!res.ok) {
        setScanError(data.error ?? 'Failed to scan plate.')
        setScanLoading(false)
        return
      }

      const filled = new Set<string>()
      if (data.vin)        { setVin(data.vin);              filled.add('vin') }
      if (data.year)       { setYear(String(data.year));    filled.add('year') }
      if (data.brand)      { setBrand(data.brand);          filled.add('brand') }
      if (data.name)       { setName(data.name);            filled.add('name') }
      if (data.model_code) { setModelCode(data.model_code); filled.add('model_code') }
      if (data.body)       { setBody(data.body);            filled.add('body') }
      if (data.engine)     { setEngine(data.engine);        filled.add('engine') }
      if (data.color_code) { setColorCode(data.color_code); filled.add('color_code') }
      if (data.color_name) { setColorName(data.color_name); filled.add('color_name') }

      setScannedFields(filled)
      setShowScanModal(false)
      setShowManualForm(true) // reveal the form so the user can review what was filled
    } catch {
      setScanError('Something went wrong. Please try again.')
    } finally {
      setScanLoading(false)
    }
  }

  async function saveProfile(): Promise<boolean> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setError('You must be logged in to save. Please log in and try again.')
      return false
    }

    const { error: profileError } = await supabase.from('user_profiles').upsert({
      user_id: session.user.id,
      full_name: fullName.trim(),
      whatsapp_number: whatsappNumber.trim(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    if (profileError) {
      setError(profileError.message)
      return false
    }
    return true
  }

  // Step 3 "Skip for now" — keep the profile, come back for the car later.
  async function handleSkip() {
    setError(null)
    setLoading(true)
    const ok = await saveProfile()
    setLoading(false)
    if (ok) router.push('/')
  }

  async function handleSave() {
    setError(null)
    if (!fullName.trim() || !whatsappNumber.trim()) {
      setError('Name and phone number are required.')
      return
    }
    if (!vin.trim() && !brand.trim() && !name.trim()) {
      setError('Please add either a VIN or vehicle brand and name to save.')
      return
    }

    setLoading(true)

    const ok = await saveProfile()
    if (!ok) {
      setLoading(false)
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setLoading(false)
      setError('You must be logged in to save. Please log in and try again.')
      return
    }

    const payload = {
      year,
      vin: vin.trim().toUpperCase() || null,
      frame_number: frameNumber.trim().toUpperCase() || null,
      brand: brand.trim().toLowerCase(),
      name: name.trim().toLowerCase(),
      model_code: modelCode.trim().toLowerCase() || null,
      body: body.trim().toLowerCase(),
      engine: engine.trim().toUpperCase(),
      color_code: colorCode.trim() || null,
      color_name: colorName.trim().toLowerCase() || null,
      nickname: nickname.trim().toLowerCase() || null,
    }
    console.log('[onboarding] saving vehicle payload:', payload)

    const res = await fetch('/api/vehicles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    })

    setLoading(false)

    if (!res.ok) {
      const { error: msg } = await res.json()
      setError(msg ?? 'Failed to save vehicle.')
      return
    }

    const { vehicle: savedVehicle } = await res.json()

    // Fire-and-forget: scrape PartSouq OEM catalog for this vehicle in the background.
    // Navigation proceeds immediately — the catalog populates while the user is redirected.
    // Search by VIN when present, otherwise by frame/chassis number (JDM imports).
    if (savedVehicle?.vin || savedVehicle?.frame_number) {
      fetch('/api/partsouq-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vin: savedVehicle.vin,
          frame: savedVehicle.frame_number,
          vehicle_id: savedVehicle.id,
          year: savedVehicle.year,
        }),
      }).catch(() => {})
    }

    router.push('/')
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0F0E0D]">

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleScanFile(e.target.files[0])}
      />
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleScanFile(e.target.files[0])}
      />

      {/* Scan modal */}
      {showScanModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => { if (!scanLoading) setShowScanModal(false) }}
          />
          <div className="relative w-full max-w-md bg-[#1C1A17] border-t border-[#3A352D] rounded-t-3xl pt-5 pb-10 shadow-2xl">
            <div className="w-10 h-1 bg-[#3A352D] rounded-full mx-auto mb-5" />

            <div className="px-5">
              <h3 className="text-lg font-bold text-[#F5F1EA]">Scan compliance plate</h3>
              <p className="text-sm text-[#9C948A] mt-1 mb-6">Take a photo of your vehicle&apos;s compliance plate — everything fills in for you</p>

              {scanError && (
                <div className="mb-5 p-3 bg-[#CE1126]/10 border border-[#CE1126]/30 rounded-xl">
                  <p className="text-sm text-[#E05A6B] font-medium">{scanError}</p>
                </div>
              )}

              {scanLoading ? (
                <div className="flex flex-col items-center py-8 gap-3">
                  <div className="w-10 h-10 border-4 border-[#3A352D] border-t-[#C9A158] rounded-full animate-spin" />
                  <p className="text-sm text-[#9C948A] font-medium">Reading plate…</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex flex-col items-center gap-3 py-6 bg-[#0F0E0D] rounded-2xl border border-[#3A352D] hover:border-[#C9A158] transition-colors active:scale-[0.97]"
                  >
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#C9A158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                    <span className="text-sm font-semibold text-[#F5F1EA]">Take photo</span>
                  </button>
                  <button
                    onClick={() => uploadInputRef.current?.click()}
                    className="flex flex-col items-center gap-3 py-6 bg-[#0F0E0D] rounded-2xl border border-[#3A352D] hover:border-[#C9A158] transition-colors active:scale-[0.97]"
                  >
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#C9A158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <span className="text-sm font-semibold text-[#F5F1EA]">Choose photo</span>
                  </button>
                </div>
              )}

              {!scanLoading && (
                <button
                  onClick={() => setShowScanModal(false)}
                  className="w-full mt-4 py-3 text-sm font-semibold text-[#6B6259] hover:text-[#9C948A] transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info modal — kept light: the diagram image has a white background */}
      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
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
                className="w-full bg-[#C9A158] hover:bg-[#D9B26A] text-[#0F0E0D] font-bold py-3.5 rounded-2xl transition-colors active:scale-[0.98]"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress header */}
      <header className="px-6 pt-6 pb-2">
        <div className="flex items-center gap-4">
          {step > 1 ? (
            <button
              onClick={() => setStep(prev => (prev === 3 ? 2 : 1))}
              className="text-[#9C948A] hover:text-[#F5F1EA] transition-colors"
              aria-label="Back"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
          ) : (
            <span className="w-[18px]" />
          )}
          <div className="flex-1 h-[3px] rounded-full bg-[#2A2722] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#C9A158] transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
          <span className="font-mono text-[10px] text-[#6B6259]">{step}/3</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col px-6 pt-8 pb-10 max-w-md w-full mx-auto">

        {/* ── Step 1 · Name ── */}
        {step === 1 && (
          <>
            <h1 className="text-[26px] font-bold leading-tight text-[#F5F1EA] tracking-tight">What should we call you?</h1>
            <p className="text-[13px] mt-2.5 leading-relaxed text-[#9C948A]">
              This is the name shops will see when you reserve a part.
            </p>

            <input
              type="text"
              placeholder="e.g. John Smith"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoFocus
              className="mt-7 w-full rounded-xl px-4 py-3.5 text-base bg-[#1C1A17] border border-[#3A352D] text-[#F5F1EA] placeholder:text-[#6B6259] focus:outline-none focus:ring-2 focus:ring-[#C9A158] focus:border-transparent"
            />

            <div className="flex-1" />
            <button
              onClick={() => setStep(2)}
              disabled={!fullName.trim()}
              className="w-full py-3.5 rounded-xl font-semibold text-[15px] bg-[#C9A158] hover:bg-[#D9B26A] text-[#0F0E0D] transition-colors active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </>
        )}

        {/* ── Step 2 · Phone number ── */}
        {step === 2 && (
          <>
            <h1 className="text-[26px] font-bold leading-tight text-[#F5F1EA] tracking-tight">What&apos;s your phone number?</h1>
            <p className="text-[13px] mt-2.5 leading-relaxed text-[#9C948A]">
              Shops <span className="text-[#F5F1EA] font-semibold">never</span> see your number — replies come back through PartFinder.
            </p>

            <input
              type="tel"
              placeholder="868-XXX-XXXX"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              autoFocus
              className="mt-7 w-full rounded-xl px-4 py-3.5 text-base font-mono bg-[#1C1A17] border border-[#3A352D] text-[#F5F1EA] placeholder:text-[#6B6259] focus:outline-none focus:ring-2 focus:ring-[#C9A158] focus:border-transparent"
            />

            <div className="flex-1" />
            <button
              onClick={() => setStep(3)}
              disabled={!whatsappNumber.trim()}
              className="w-full py-3.5 rounded-xl font-semibold text-[15px] bg-[#C9A158] hover:bg-[#D9B26A] text-[#0F0E0D] transition-colors active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </>
        )}

        {/* ── Step 3 · The ride ── */}
        {step === 3 && (
          <>
            <h1 className="text-[26px] font-bold leading-tight text-[#F5F1EA] tracking-tight">Last thing — your ride.</h1>
            <p className="text-[13px] mt-2.5 leading-relaxed text-[#9C948A]">
              Every part you search will be checked against this car. One car per account for now.
            </p>

            {/* plate scan — the hero move */}
            <button
              onClick={() => { setScanError(null); setShowScanModal(true) }}
              className="mt-7 rounded-2xl px-5 py-7 text-center border border-dashed border-[#C9A158] transition-colors hover:bg-[#C9A158]/5 active:scale-[0.99]"
              style={{ background: 'linear-gradient(160deg, rgba(201,161,88,0.10), rgba(201,161,88,0.02) 60%)' }}
            >
              <svg className="mx-auto mb-3" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#C9A158" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>
              </svg>
              <span className="block text-[15px] font-semibold text-[#F5F1EA]">Scan the compliance plate</span>
              <span className="block text-[11px] mt-1.5 leading-snug text-[#9C948A]">
                The metal plate in the engine bay or door jamb.<br />Everything fills in by itself — 10 seconds.
              </span>
            </button>

            <div className="flex items-center justify-center gap-4 mt-3">
              <button
                onClick={() => setShowInfo(true)}
                className="text-[11px] font-semibold text-[#6B6259] hover:text-[#9C948A] transition-colors"
              >
                Where&apos;s the plate?
              </button>
              {!showManualForm && (
                <button
                  onClick={() => setShowManualForm(true)}
                  className="text-[11px] font-semibold text-[#C9A158] hover:text-[#D9B26A] transition-colors"
                >
                  Type it in instead
                </button>
              )}
            </div>

            {/* manual / review form — appears after a scan or on request */}
            {showManualForm && (
              <div className="mt-6 space-y-4">

                {/* VIN / Chassis field with decoder */}
                <div>
                  <label className={labelClass}>VIN / Chassis Number (Recommended)</label>
                  <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        placeholder="e.g. JT2AE09W9J0123456 or NZE141-1234567"
                        value={vin}
                        onChange={(e) => {
                          setVin(e.target.value)
                          clearScanned('vin')
                          setDecodeStatus('idle')
                          setDecodeResult(null)
                          setDecodeError(null)
                          setDecodeApplied(false)
                        }}
                        onBlur={handleVinBlur}
                        className={`${inputClass('vin')} tracking-tight`}
                      />
                    </div>
                    <button
                      onMouseDown={() => { decodeMouseDownRef.current = true }}
                      onClick={handleDecode}
                      disabled={vin.trim().length < 9 || decodeStatus === 'loading'}
                      className="w-full sm:w-auto flex-shrink-0 px-3 py-3 bg-[#C9A158] hover:bg-[#D9B26A] text-[#0F0E0D] text-sm font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] flex items-center justify-center gap-1.5"
                    >
                      {decodeStatus === 'loading' ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-[#0F0E0D]/30 border-t-[#0F0E0D] rounded-full animate-spin" />
                          <span>Decoding…</span>
                        </>
                      ) : 'Decode'}
                    </button>
                  </div>

                  <p className="mt-2 text-xs text-[#9C948A] bg-[#1C1A17] border border-[#3A352D] rounded-lg px-3 py-2 leading-relaxed">
                    💡 Add your VIN or frame number and Earl can pull your car&apos;s exact parts list — real OEM part numbers, ready the moment you ask.
                  </p>

                  {scannedFields.has('vin') && (
                    <span className="mt-1 text-xs text-[#5DBB7C] font-semibold flex items-center gap-1"><CheckIcon /> Auto-filled</span>
                  )}

                  {/* Decoder error */}
                  {decodeStatus === 'error' && decodeError && (
                    <p className="mt-2 text-xs text-[#E05A6B] font-medium">{decodeError}</p>
                  )}

                  {/* Applied confirmation */}
                  {decodeApplied && (
                    <p className="mt-2 text-xs text-[#5DBB7C] font-semibold flex items-center gap-1">
                      <CheckIcon /> Vehicle details filled — review and complete the rest
                    </p>
                  )}

                  {/* Decode preview card */}
                  {decodeStatus === 'success' && decodeResult?.vehicle && (
                    <div className="mt-3 bg-[#1C1A17] border border-[#C9A158]/40 rounded-2xl p-4">
                      <p className="text-sm font-bold text-[#F5F1EA] mb-3">
                        {decodeResult.source === 'chassis_db' ? 'We found this vehicle (JDM chassis)' : 'We found this vehicle'}
                      </p>

                      <div className="space-y-1.5 text-sm">
                        {(decodeResult.source === 'nhtsa' || decodeResult.source === 'partsouq') && decodeResult.vehicle.year && (
                          <div className="flex gap-2">
                            <span className="text-[#6B6259] w-20 flex-shrink-0">Year</span>
                            <span className="text-[#F5F1EA] font-medium">{decodeResult.vehicle.year}</span>
                          </div>
                        )}
                        {decodeResult.vehicle.brand && (
                          <div className="flex gap-2">
                            <span className="text-[#6B6259] w-20 flex-shrink-0">Brand</span>
                            <span className="text-[#F5F1EA] font-medium">{cap(decodeResult.vehicle.brand)}</span>
                          </div>
                        )}
                        {decodeResult.vehicle.name && (
                          <div className="flex gap-2">
                            <span className="text-[#6B6259] w-20 flex-shrink-0">Name</span>
                            <span className="text-[#F5F1EA] font-medium">{cap(decodeResult.vehicle.name)}</span>
                          </div>
                        )}
                        {decodeResult.vehicle.body && (
                          <div className="flex gap-2">
                            <span className="text-[#6B6259] w-20 flex-shrink-0">Body</span>
                            <span className="text-[#F5F1EA] font-medium">{cap(decodeResult.vehicle.body)}</span>
                          </div>
                        )}
                        {decodeResult.vehicle.engine && (
                          <div className="flex gap-2">
                            <span className="text-[#6B6259] w-20 flex-shrink-0">Engine</span>
                            <span className="text-[#F5F1EA] font-medium">{decodeResult.vehicle.engine}</span>
                          </div>
                        )}
                        {decodeResult.source === 'chassis_db' && (
                          <>
                            {decodeResult.vehicle.drivetrain && (
                              <div className="flex gap-2">
                                <span className="text-[#6B6259] w-20 flex-shrink-0">Drive</span>
                                <span className="text-[#F5F1EA] font-medium">{decodeResult.vehicle.drivetrain}</span>
                              </div>
                            )}
                            {decodeResult.vehicle.model_code && (
                              <div className="flex gap-2">
                                <span className="text-[#6B6259] w-20 flex-shrink-0">Chassis</span>
                                <span className="text-[#F5F1EA] font-medium">{decodeResult.vehicle.model_code}</span>
                              </div>
                            )}
                            {decodeResult.vehicle.year_start && (
                              <p className="text-xs text-[#6B6259] mt-2">
                                Year range: {decodeResult.vehicle.year_start}–{decodeResult.vehicle.year_end} — please confirm exact year
                              </p>
                            )}
                          </>
                        )}
                      </div>

                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={handleApply}
                          className="flex-1 bg-[#C9A158] hover:bg-[#D9B26A] text-[#0F0E0D] text-sm font-bold py-2.5 rounded-xl transition-colors active:scale-[0.97]"
                        >
                          Apply to form
                        </button>
                        <button
                          onClick={() => { setDecodeStatus('idle'); setDecodeResult(null) }}
                          className="flex-1 border border-[#3A352D] text-[#9C948A] text-sm font-semibold py-2.5 rounded-xl hover:bg-[#1C1A17] transition-colors active:scale-[0.97]"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Year</label>
                    <input
                      type="number"
                      placeholder="e.g. 2012"
                      value={year}
                      onChange={(e) => { setYear(e.target.value); clearScanned('year') }}
                      className={inputClass('year')}
                    />
                    {scannedFields.has('year') && (
                      <span className="mt-1 text-xs text-[#5DBB7C] font-semibold flex items-center gap-1"><CheckIcon /> Auto-filled</span>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Brand</label>
                    <input
                      type="text"
                      placeholder="e.g. Toyota"
                      value={brand}
                      onChange={(e) => { setBrand(e.target.value); clearScanned('brand') }}
                      className={inputClass('brand')}
                    />
                    {scannedFields.has('brand') && (
                      <span className="mt-1 text-xs text-[#5DBB7C] font-semibold flex items-center gap-1"><CheckIcon /> Auto-filled</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Corolla Axio"
                    value={name}
                    onChange={(e) => { setName(e.target.value); clearScanned('name') }}
                    className={inputClass('name')}
                  />
                  {scannedFields.has('name') && (
                    <span className="mt-1 text-xs text-[#5DBB7C] font-semibold flex items-center gap-1"><CheckIcon /> Auto-filled</span>
                  )}
                </div>

                <div>
                  <label className={labelClass}>Model</label>
                  <input
                    type="text"
                    placeholder="e.g. DBA-NZE144-AEXNK(nze144)"
                    value={modelCode}
                    onChange={(e) => { setModelCode(e.target.value); clearScanned('model_code') }}
                    className={inputClass('model_code')}
                  />
                  {scannedFields.has('model_code') && (
                    <span className="mt-1 text-xs text-[#5DBB7C] font-semibold flex items-center gap-1"><CheckIcon /> Auto-filled</span>
                  )}
                </div>

                <div>
                  <label className={labelClass}>Frame number</label>
                  <input
                    type="text"
                    placeholder="e.g. NZE144-6008051 (for JDM imports without a VIN)"
                    value={frameNumber}
                    onChange={(e) => setFrameNumber(e.target.value)}
                    className={inputClass('frame_number')}
                  />
                </div>

                <div>
                  <label className={labelClass}>Body</label>
                  <input
                    type="text"
                    placeholder="e.g. Sedan"
                    value={body}
                    onChange={(e) => { setBody(e.target.value); clearScanned('body') }}
                    className={inputClass('body')}
                  />
                  {scannedFields.has('body') && (
                    <span className="mt-1 text-xs text-[#5DBB7C] font-semibold flex items-center gap-1"><CheckIcon /> Auto-filled</span>
                  )}
                </div>

                <div>
                  <label className={labelClass}>Engine</label>
                  <input
                    type="text"
                    placeholder="e.g. 1NZ-FE"
                    value={engine}
                    onChange={(e) => { setEngine(e.target.value); clearScanned('engine') }}
                    className={inputClass('engine')}
                  />
                  {scannedFields.has('engine') && (
                    <span className="mt-1 text-xs text-[#5DBB7C] font-semibold flex items-center gap-1"><CheckIcon /> Auto-filled</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Color Code</label>
                    <input
                      type="text"
                      placeholder="e.g. 040, ZHJ, 1F7"
                      value={colorCode}
                      onChange={(e) => { setColorCode(e.target.value); clearScanned('color_code') }}
                      className={inputClass('color_code')}
                    />
                    {scannedFields.has('color_code') && (
                      <span className="mt-1 text-xs text-[#5DBB7C] font-semibold flex items-center gap-1"><CheckIcon /> Auto-filled</span>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Color</label>
                    <input
                      type="text"
                      placeholder="e.g. Super White"
                      value={colorName}
                      onChange={(e) => { setColorName(e.target.value); clearScanned('color_name') }}
                      className={inputClass('color_name')}
                    />
                    {scannedFields.has('color_name') && (
                      <span className="mt-1 text-xs text-[#5DBB7C] font-semibold flex items-center gap-1"><CheckIcon /> Auto-filled</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Nickname (Optional)</label>
                  <input
                    type="text"
                    placeholder={`e.g. "My Corolla", "Wife's Car", "Work Truck"`}
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-sm bg-[#1C1A17] border border-[#3A352D] text-[#F5F1EA] placeholder:text-[#6B6259] focus:outline-none focus:ring-2 focus:ring-[#C9A158] focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {error && (
              <p className="mt-4 text-sm text-[#E05A6B] font-medium text-center">{error}</p>
            )}

            <div className="mt-8 space-y-3">
              {showManualForm && (
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl font-semibold text-[15px] bg-[#C9A158] hover:bg-[#D9B26A] text-[#0F0E0D] transition-colors active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving…' : 'Finish'}
                </button>
              )}
              <div className="flex justify-center">
                <button
                  onClick={handleSkip}
                  disabled={loading}
                  className="text-sm text-[#6B6259] hover:text-[#9C948A] font-medium transition-colors disabled:opacity-60"
                >
                  Skip for now — add the car later
                </button>
              </div>
            </div>
          </>
        )}

        {/* Steps 1–2 also show the error (e.g. profile save failure surfaced on skip) */}
        {step !== 3 && error && (
          <p className="mt-4 text-sm text-[#E05A6B] font-medium text-center">{error}</p>
        )}
      </main>

    </div>
  )
}
