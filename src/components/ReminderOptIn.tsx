'use client'

import { useState, useEffect } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { enablePushReminders, needsInstallFirst, pushSupported } from '@/lib/push'

const DISMISS_KEY = 'pf-reminder-optin-dismissed'

// Contextual reminder opt-in — shown on the Maintenance page only, dismissible
// forever with one tap (never-annoying rule). The browser permission prompt
// only fires after the user taps yes.
export default function ReminderOptIn({ remindersEnabled }: { remindersEnabled: boolean }) {
  const supabase = createBrowserSupabaseClient()
  const [state, setState] = useState<'hidden' | 'offer' | 'install' | 'busy' | 'done' | 'blocked'>('hidden')

  useEffect(() => {
    if (remindersEnabled) return
    if (localStorage.getItem(DISMISS_KEY)) return
    if (!pushSupported() && !needsInstallFirst()) return // truly unsupported browser
    if (typeof Notification !== 'undefined' && Notification.permission === 'denied') return
    setState('offer')
  }, [remindersEnabled])

  async function handleEnable() {
    if (needsInstallFirst()) {
      setState('install')
      return
    }
    setState('busy')
    const result = await enablePushReminders(supabase)
    if (result === 'enabled') setState('done')
    else if (result === 'denied') setState('blocked')
    else setState('offer')
  }

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setState('hidden')
  }

  if (state === 'hidden') return null

  if (state === 'done') {
    return (
      <div className="mt-4 rounded-xl px-4 py-3 bg-surface border border-live/40">
        <p className="text-[12px] text-live font-semibold">Reminders on ✓</p>
        <p className="text-[11px] mt-0.5 text-muted">We&apos;ll notify you when a service is coming up. Turn it off anytime from the Garage menu.</p>
      </div>
    )
  }

  if (state === 'blocked') {
    return (
      <div className="mt-4 rounded-xl px-4 py-3 bg-surface border border-line">
        <p className="text-[12px] text-muted leading-snug">
          Notifications are blocked for this site in your browser settings. The DUE / OVERDUE pills here will still keep track for you.
        </p>
      </div>
    )
  }

  if (state === 'install') {
    return (
      <div className="mt-4 rounded-xl px-4 py-3.5 bg-surface border border-brass/30">
        <p className="text-[13px] font-semibold text-cream">One step first — install PartFinder</p>
        <p className="text-[11px] mt-1.5 leading-relaxed text-muted">
          iPhones only allow notifications for installed apps:
        </p>
        <ol className="text-[11px] mt-1.5 leading-relaxed text-muted list-decimal pl-4 space-y-0.5">
          <li>Tap the <span className="text-cream">Share</span> button in Safari (the square with the arrow)</li>
          <li>Scroll down and tap <span className="text-cream">Add to Home Screen</span></li>
          <li>Open PartFinder from the new home-screen icon and come back here</li>
        </ol>
        <button onClick={handleDismiss} className="mt-2.5 text-[11px] font-semibold text-subtle">
          Maybe later
        </button>
      </div>
    )
  }

  // offer / busy
  return (
    <div className="mt-4 rounded-xl px-4 py-3.5 bg-surface border border-brass/30">
      <p className="text-[13px] font-semibold text-cream">Want a heads-up when service is due?</p>
      <p className="text-[11px] mt-1 leading-snug text-muted">
        One notification when your oil or transmission change is coming up — nothing else.
      </p>
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleEnable}
          disabled={state === 'busy'}
          className="px-4 py-2 rounded-lg font-semibold text-[12px] bg-brass hover:bg-brass-light text-charcoal transition-colors active:scale-[0.98] disabled:opacity-60"
        >
          {state === 'busy' ? 'Setting up…' : 'Yes, remind me'}
        </button>
        <button onClick={handleDismiss} className="px-4 py-2 rounded-lg font-semibold text-[12px] bg-elevated text-muted">
          No thanks
        </button>
      </div>
    </div>
  )
}
