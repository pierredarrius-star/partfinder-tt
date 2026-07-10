import { NextResponse } from 'next/server'
import { getServiceClient, createServerSupabaseClient } from '@/lib/supabase-server'
import { configureWebPush, sendPushToUser } from '@/lib/push-server'

// Sends a test notification to the signed-in user's own devices.
// Verifies the push pipeline end-to-end; the reminder cron uses the same sender.
export async function POST() {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  if (!configureWebPush()) {
    return NextResponse.json({ error: 'Push not configured (VAPID keys missing)' }, { status: 500 })
  }

  const { sent, devices } = await sendPushToUser(getServiceClient(), user.id, {
    title: 'PartFinder test 🔧',
    body: 'Notifications are working — reminders will look like this.',
    url: '/maintenance',
  })

  if (devices === 0) {
    return NextResponse.json({ error: 'No devices have allowed notifications yet' }, { status: 404 })
  }
  return NextResponse.json({ sent, devices })
}
