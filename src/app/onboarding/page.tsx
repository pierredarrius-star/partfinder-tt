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
  source: 'nhtsa' | 'chassis_db' | 'none' | null
  vehicle: DecodeVehicle | null
  error?: string
  message?: string
}

function cap(s: string | null | undefined): string {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

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
    return `w-full rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 border-none transition-colors ${
      scannedFields.has(field)
        ? 'bg-green-50 ring-2 ring-green-400 focus:ring-green-500'
        : 'bg-slate-50 focus:ring-brand-500'
    }`
  }

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

      if (data.source === 'nhtsa' || data.source === 'chassis_db') {
        setDecodeResult(data)
        setDecodeStatus('success')
      } else {
        setDecodeStatus('error')
        if (data.error === 'jdm_or_unsupported_vin') {
          setDecodeError("This looks like a valid VIN, but our decoder doesn't cover this vehicle yet — common for JDM-only imports. Try your chassis number with a dash (e.g. NZE141-1234567), use Scan Plate at the top of this page, or fill the fields manually.")
        } else if (data.error === 'chassis_prefix_missing') {
          setDecodeError("We don't recognize this chassis prefix yet. We're adding more codes as users hit them — please fill the fields manually, or scroll up to use Scan Plate.")
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

    if (decodeResult.source === 'nhtsa') {
      if (v.year && !year) setYear(String(v.year))
      if (v.brand && !brand) setBrand(v.brand)
      if (v.name && !name) setName(v.name)
      if (v.body && !body) setBody(v.body)
      if (v.engine && !engine) setEngine(v.engine)
    } else if (decodeResult.source === 'chassis_db') {
      if (v.brand && !brand) setBrand(v.brand)
      if (v.name && !name) setName(v.name)
      if (v.engine && !engine) setEngine(v.engine)
      if (v.body && !body) setBody(v.body)
      if (v.model_code && !modelCode) setModelCode(v.model_code)
      // year intentionally skipped — chassis decode gives a range, user picks exact year
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
    } catch {
      setScanError('Something went wrong. Please try again.')
    } finally {
      setScanLoading(false)
    }
  }

  async function handleSave() {
    setError(null)
    if (!fullName.trim() || !whatsappNumber.trim()) {
      setError('Full name and WhatsApp number are required.')
      return
    }
    if (!vin.trim() && !brand.trim() && !name.trim()) {
      setError('Please add either a VIN or vehicle brand and name to save.')
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

    const payload = {
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

    router.push('/')
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">

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
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => { if (!scanLoading) setShowScanModal(false) }}
          />
          <div className="relative w-full max-w-md bg-white rounded-t-3xl pt-5 pb-10 shadow-2xl">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />

            <div className="px-5">
              <h3 className="text-lg font-bold text-slate-800">Scan compliance plate</h3>
              <p className="text-sm text-slate-500 mt-1 mb-6">Take a photo of your vehicle&apos;s compliance plate to auto-fill the form</p>

              {scanError && (
                <div className="mb-5 p-3 bg-red-50 border border-red-100 rounded-xl">
                  <p className="text-sm text-red-600 font-medium">{scanError}</p>
                </div>
              )}

              {scanLoading ? (
                <div className="flex flex-col items-center py-8 gap-3">
                  <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
                  <p className="text-sm text-slate-500 font-medium">Reading plate…</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex flex-col items-center gap-3 py-6 bg-slate-50 rounded-2xl border-2 border-slate-100 hover:border-brand-300 hover:bg-brand-50 transition-colors active:scale-[0.97]"
                  >
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-600">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                    <span className="text-sm font-semibold text-slate-700">Take photo</span>
                  </button>
                  <button
                    onClick={() => uploadInputRef.current?.click()}
                    className="flex flex-col items-center gap-3 py-6 bg-slate-50 rounded-2xl border-2 border-slate-100 hover:border-brand-300 hover:bg-brand-50 transition-colors active:scale-[0.97]"
                  >
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-600">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <span className="text-sm font-semibold text-slate-700">Choose photo</span>
                  </button>
                </div>
              )}

              {!scanLoading && (
                <button
                  onClick={() => setShowScanModal(false)}
                  className="w-full mt-4 py-3 text-sm font-semibold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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
            <button
              onClick={() => { setScanError(null); setShowScanModal(true) }}
              className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors active:scale-[0.97]"
            >
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

              {/* VIN / Chassis field with decoder */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">VIN / Chassis Number (Optional)</label>
                <div className="flex gap-2 items-stretch">
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
                    className="flex-shrink-0 px-3 py-3 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] flex items-center gap-1.5"
                  >
                    {decodeStatus === 'loading' ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Decoding…</span>
                      </>
                    ) : 'Decode'}
                  </button>
                </div>

                {scannedFields.has('vin') && (
                  <span className="mt-1 text-xs text-green-600 font-semibold flex items-center gap-1"><CheckIcon /> Auto-filled</span>
                )}

                {/* Decoder error */}
                {decodeStatus === 'error' && decodeError && (
                  <p className="mt-2 text-xs text-red-500 font-medium">{decodeError}</p>
                )}

                {/* Applied confirmation */}
                {decodeApplied && (
                  <p className="mt-2 text-xs text-green-600 font-semibold flex items-center gap-1">
                    <CheckIcon /> Vehicle details filled — review and complete the rest
                  </p>
                )}

                {/* Decode preview card */}
                {decodeStatus === 'success' && decodeResult?.vehicle && (
                  <div className="mt-3 bg-blue-50 border border-blue-100 rounded-2xl p-4">
                    <p className="text-sm font-bold text-slate-700 mb-3">
                      {decodeResult.source === 'chassis_db' ? 'We found this vehicle (JDM chassis)' : 'We found this vehicle'}
                    </p>

                    <div className="space-y-1.5 text-sm">
                      {decodeResult.source === 'nhtsa' && decodeResult.vehicle.year && (
                        <div className="flex gap-2">
                          <span className="text-slate-500 w-20 flex-shrink-0">Year</span>
                          <span className="text-slate-800 font-medium">{decodeResult.vehicle.year}</span>
                        </div>
                      )}
                      {decodeResult.vehicle.brand && (
                        <div className="flex gap-2">
                          <span className="text-slate-500 w-20 flex-shrink-0">Brand</span>
                          <span className="text-slate-800 font-medium">{cap(decodeResult.vehicle.brand)}</span>
                        </div>
                      )}
                      {decodeResult.vehicle.name && (
                        <div className="flex gap-2">
                          <span className="text-slate-500 w-20 flex-shrink-0">Name</span>
                          <span className="text-slate-800 font-medium">{cap(decodeResult.vehicle.name)}</span>
                        </div>
                      )}
                      {decodeResult.vehicle.body && (
                        <div className="flex gap-2">
                          <span className="text-slate-500 w-20 flex-shrink-0">Body</span>
                          <span className="text-slate-800 font-medium">{cap(decodeResult.vehicle.body)}</span>
                        </div>
                      )}
                      {decodeResult.vehicle.engine && (
                        <div className="flex gap-2">
                          <span className="text-slate-500 w-20 flex-shrink-0">Engine</span>
                          <span className="text-slate-800 font-medium">{decodeResult.vehicle.engine}</span>
                        </div>
                      )}
                      {decodeResult.source === 'chassis_db' && (
                        <>
                          {decodeResult.vehicle.drivetrain && (
                            <div className="flex gap-2">
                              <span className="text-slate-500 w-20 flex-shrink-0">Drive</span>
                              <span className="text-slate-800 font-medium">{decodeResult.vehicle.drivetrain}</span>
                            </div>
                          )}
                          {decodeResult.vehicle.model_code && (
                            <div className="flex gap-2">
                              <span className="text-slate-500 w-20 flex-shrink-0">Chassis</span>
                              <span className="text-slate-800 font-medium">{decodeResult.vehicle.model_code}</span>
                            </div>
                          )}
                          {decodeResult.vehicle.year_start && (
                            <p className="text-xs text-slate-400 mt-2">
                              Year range: {decodeResult.vehicle.year_start}–{decodeResult.vehicle.year_end} — please confirm exact year
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={handleApply}
                        className="flex-1 bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold py-2.5 rounded-xl transition-colors active:scale-[0.97]"
                      >
                        Apply to form
                      </button>
                      <button
                        onClick={() => { setDecodeStatus('idle'); setDecodeResult(null) }}
                        className="flex-1 border border-slate-200 text-slate-600 text-sm font-semibold py-2.5 rounded-xl hover:bg-slate-50 transition-colors active:scale-[0.97]"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Year</label>
                  <input
                    type="number"
                    placeholder="e.g. 2012"
                    value={year}
                    onChange={(e) => { setYear(e.target.value); clearScanned('year') }}
                    className={inputClass('year')}
                  />
                  {scannedFields.has('year') && (
                    <span className="mt-1 text-xs text-green-600 font-semibold flex items-center gap-1"><CheckIcon /> Auto-filled</span>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. Toyota"
                    value={brand}
                    onChange={(e) => { setBrand(e.target.value); clearScanned('brand') }}
                    className={inputClass('brand')}
                  />
                  {scannedFields.has('brand') && (
                    <span className="mt-1 text-xs text-green-600 font-semibold flex items-center gap-1"><CheckIcon /> Auto-filled</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Name</label>
                <input
                  type="text"
                  placeholder="e.g. Corolla Axio"
                  value={name}
                  onChange={(e) => { setName(e.target.value); clearScanned('name') }}
                  className={inputClass('name')}
                />
                {scannedFields.has('name') && (
                  <span className="mt-1 text-xs text-green-600 font-semibold flex items-center gap-1"><CheckIcon /> Auto-filled</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Model</label>
                <input
                  type="text"
                  placeholder="e.g. DBA-NZE144-AEXNK(nze144)"
                  value={modelCode}
                  onChange={(e) => { setModelCode(e.target.value); clearScanned('model_code') }}
                  className={inputClass('model_code')}
                />
                {scannedFields.has('model_code') && (
                  <span className="mt-1 text-xs text-green-600 font-semibold flex items-center gap-1"><CheckIcon /> Auto-filled</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Body</label>
                <input
                  type="text"
                  placeholder="e.g. Sedan"
                  value={body}
                  onChange={(e) => { setBody(e.target.value); clearScanned('body') }}
                  className={inputClass('body')}
                />
                {scannedFields.has('body') && (
                  <span className="mt-1 text-xs text-green-600 font-semibold flex items-center gap-1"><CheckIcon /> Auto-filled</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Engine</label>
                <input
                  type="text"
                  placeholder="e.g. 1NZ-FE"
                  value={engine}
                  onChange={(e) => { setEngine(e.target.value); clearScanned('engine') }}
                  className={inputClass('engine')}
                />
                {scannedFields.has('engine') && (
                  <span className="mt-1 text-xs text-green-600 font-semibold flex items-center gap-1"><CheckIcon /> Auto-filled</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Color Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 040, ZHJ, 1F7"
                    value={colorCode}
                    onChange={(e) => { setColorCode(e.target.value); clearScanned('color_code') }}
                    className={inputClass('color_code')}
                  />
                  {scannedFields.has('color_code') && (
                    <span className="mt-1 text-xs text-green-600 font-semibold flex items-center gap-1"><CheckIcon /> Auto-filled</span>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Color</label>
                  <input
                    type="text"
                    placeholder="e.g. Super White"
                    value={colorName}
                    onChange={(e) => { setColorName(e.target.value); clearScanned('color_name') }}
                    className={inputClass('color_name')}
                  />
                  {scannedFields.has('color_name') && (
                    <span className="mt-1 text-xs text-green-600 font-semibold flex items-center gap-1"><CheckIcon /> Auto-filled</span>
                  )}
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
