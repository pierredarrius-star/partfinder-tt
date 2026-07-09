'use client'

import { useRef, useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase'

// Camera button: snap the dashboard, Gemini reads the odometer, the number
// lands in the caller's input for the user to confirm — never auto-saved.
export default function OdometerScanButton({
  onReading,
  className = '',
}: {
  onReading: (km: number) => void
  className?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function handleFile(file: File) {
    if (file.size > 4 * 1024 * 1024) {
      alert('Image is too large. Please use an image under 4MB.')
      return
    }
    setBusy(true)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
      })

      const supabase = createBrowserSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('You must be logged in to use this feature.')
        return
      }

      const res = await fetch('/api/scan-odometer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ image: base64, mimeType: file.type }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error ?? 'Failed to read the odometer.')
        return
      }
      onReading(data.odometer_km)
    } catch {
      alert('Something went wrong. Please try again.')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label="Photograph the odometer"
        className={`inline-flex items-center justify-center text-brass disabled:opacity-60 ${className}`}
      >
        {busy ? (
          <span className="w-3.5 h-3.5 border-2 border-brass/30 border-t-brass rounded-full animate-spin" />
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
            <circle cx="12" cy="13" r="3" />
          </svg>
        )}
      </button>
    </>
  )
}
