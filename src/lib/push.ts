// Client-side web-push helpers: capability detection + the subscribe flow.

import type { SupabaseClient } from '@supabase/supabase-js'

export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export function isIos(): boolean {
  return typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)
}

// iOS only exposes push to web apps launched from the Home Screen.
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as unknown as { standalone?: boolean }).standalone === true
}

// iPhone that hasn't installed the app yet → needs Add to Home Screen first.
export function needsInstallFirst(): boolean {
  return isIos() && !isStandalone()
}

export type EnableResult = 'enabled' | 'denied' | 'unsupported' | 'error'

export async function enablePushReminders(supabase: SupabaseClient): Promise<EnableResult> {
  if (!pushSupported()) return 'unsupported'

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return 'denied'

    const registration = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'error'

    const json = subscription.toJSON()
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: json.keys?.p256dh ?? '',
        auth: json.keys?.auth ?? '',
      },
      { onConflict: 'endpoint' }
    )
    if (error) return 'error'

    // consent flag — the Phase C reminder cron checks this before sending
    await supabase.from('user_profiles').update({ reminders_enabled: true }).eq('user_id', user.id)

    return 'enabled'
  } catch (err) {
    console.error('[push] enable failed:', err)
    return 'error'
  }
}
