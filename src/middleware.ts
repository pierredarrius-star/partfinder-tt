import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareSupabaseClient } from '@/lib/supabase-server'

// Full sign-up model: every page requires a session except the front door.
const PUBLIC = ['/login', '/auth']

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })
  const supabase = createMiddlewareSupabaseClient(request, response)

  // Local session check (cookie read; only refreshes over the network when the
  // token has expired). No per-navigation auth-server round trip — every data
  // query is protected by RLS regardless of what this gate lets through.
  const { data: { session } } = await supabase.auth.getSession()
  const path = request.nextUrl.pathname
  const isPublic = PUBLIC.some(p => path.startsWith(p))

  if (!session && !isPublic) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', path)
    return NextResponse.redirect(loginUrl)
  }

  // Already signed in — skip the login page.
  if (session && path.startsWith('/login')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  // manifest.json + sw.js must stay public: browsers fetch them without auth
  // cookies, and a login redirect breaks PWA install + push registration.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api|manifest\\.json|sw\\.js|.*\\.(?:png|jpg|jpeg|svg|ico|webp|webmanifest)).*)'],
}
