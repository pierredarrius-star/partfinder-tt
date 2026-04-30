import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Existing anonymous client — keeps all current API routes and DB queries working
export const supabase = createClient(url, anonKey)

// For Client Components ("use client")
export const createBrowserSupabaseClient = () =>
  createBrowserClient(url, anonKey)
