// Server-side web-push sender — shared by the reminder cron and push-test.
// Server-only (uses the VAPID private key). Never import from a client component.

import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'

export type PushPayload = { title: string; body: string; url: string }

// Returns false when VAPID keys are missing (push disabled in this environment).
export function configureWebPush(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) return false
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@partfinder.tt', publicKey, privateKey)
  return true
}

// Sends to every device the user has registered. Expired subscriptions
// (404/410 = revoked or replaced) are deleted as we go. Returns counts so
// callers can decide on fallbacks.
export async function sendPushToUser(
  supabase: SupabaseClient,
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; devices: number }> {
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (!subs?.length) return { sent: 0, devices: 0 }

  const json = JSON.stringify(payload)
  let sent = 0
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        json
      )
      sent++
    } catch (err: unknown) {
      const status = (err as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', s.id)
      } else {
        console.error('[push-server] send failed:', err)
      }
    }
  }))

  return { sent, devices: subs.length }
}
