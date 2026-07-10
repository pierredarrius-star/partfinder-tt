import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { getServiceClient, createServerSupabaseClient } from '@/lib/supabase-server'

// Sends a test notification to the signed-in user's own devices.
// Verifies the Phase B pipeline end-to-end; Phase C's cron reuses the same send.
export async function POST() {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: 'Push not configured (VAPID keys missing)' }, { status: 500 })
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@partfinder.tt', publicKey, privateKey)

  const supabase = getServiceClient()
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', user.id)

  if (!subs?.length) {
    return NextResponse.json({ error: 'No devices have allowed notifications yet' }, { status: 404 })
  }

  const payload = JSON.stringify({
    title: 'PartFinder test 🔧',
    body: 'Notifications are working — reminders will look like this.',
    url: '/maintenance',
  })

  let sent = 0
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      )
      sent++
    } catch (err: unknown) {
      // 404/410 = subscription expired or revoked — clean it up
      const status = (err as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', s.id)
      } else {
        console.error('[push-test] send failed:', err)
      }
    }
  }))

  return NextResponse.json({ sent, devices: subs.length })
}
