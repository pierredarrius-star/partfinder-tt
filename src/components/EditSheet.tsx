'use client'

import { useState, useEffect } from 'react'

// Minimal bottom-sheet editor for a single field (transmission, wheels, mileage…).
type Props = {
  open: boolean
  title: string
  placeholder?: string
  initial?: string
  type?: 'text' | 'number' | 'tel'
  saving?: boolean
  onClose: () => void
  onSave: (value: string) => void
}

export default function EditSheet({ open, title, placeholder, initial = '', type = 'text', saving, onClose, onSave }: Props) {
  const [value, setValue] = useState(initial)

  useEffect(() => {
    if (open) setValue(initial)
  }, [open, initial])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { if (!saving) onClose() }} />
      <div className="relative w-full max-w-md bg-surface border-t border-line rounded-t-3xl pt-5 pb-8 px-5 shadow-2xl">
        <div className="w-10 h-1 bg-line rounded-full mx-auto mb-5" />
        <h3 className="text-base font-bold text-cream mb-4">{title}</h3>
        <input
          type={type}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && value.trim()) onSave(value.trim()) }}
          placeholder={placeholder}
          autoFocus
          className="w-full rounded-xl px-4 py-3.5 text-base bg-charcoal border border-line text-cream placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brass focus:border-transparent"
        />
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => onSave(value.trim())}
            disabled={!value.trim() || saving}
            className="flex-1 py-3 rounded-xl font-semibold text-sm bg-brass hover:bg-brass-light text-charcoal transition-colors active:scale-[0.98] disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="px-5 py-3 rounded-xl font-semibold text-sm bg-elevated text-muted transition-colors active:scale-[0.98]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
