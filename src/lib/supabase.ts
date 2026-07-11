import { createBrowserClient } from '@supabase/ssr'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// For Client Components ("use client"). createBrowserClient returns a shared
// singleton, so the whole app runs ONE browser auth client — a second client on
// the same storage key contends for the auth lock and causes multi-second
// hangs, worst on iOS. Server code builds its own clients (supabase-server.ts).
export const createBrowserSupabaseClient = () =>
  createBrowserClient(url, anonKey)
