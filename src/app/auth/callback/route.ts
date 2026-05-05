import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') || '/'

  if (code) {
    const supabase = await createServerSupabaseClient()
    await supabase.auth.exchangeCodeForSession(code)

    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { count } = await supabase
        .from('user_vehicles')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)

      if (!count) {
        return NextResponse.redirect(new URL('/onboarding', origin))
      }
    }
  }

  return NextResponse.redirect(new URL(next, origin))
}
