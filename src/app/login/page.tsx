'use client'

import { useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase'

// Brass & Charcoal welcome screen — the app's front door (no guest access).
export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createBrowserSupabaseClient()

  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
    setSent(true)
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0F0E0D]">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">

          {/* brand moment */}
          <div className="text-center mb-10">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: 'linear-gradient(135deg, #C9A158, #8b6f3d)', boxShadow: '0 0 60px rgba(201,161,88,0.25)' }}
            >
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#0F0E0D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </div>
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#C9A158] mb-3">PartFinder T&amp;T</p>
            <h1 className="text-[30px] font-bold leading-[1.15] text-[#F5F1EA] tracking-tight">
              Every parts shop in T&amp;T.<br />One ask.
            </h1>
            <p className="text-[13px] mt-4 leading-relaxed text-[#9C948A] max-w-[260px] mx-auto">
              Tell us the part you need — we WhatsApp the shops, and the quotes come back to you.
            </p>
          </div>

          {/* auth actions */}
          <div className="space-y-3">
            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 rounded-xl py-3.5 text-[15px] font-semibold bg-[#C9A158] hover:bg-[#D9B26A] text-[#0F0E0D] transition-colors active:scale-[0.98]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#0F0E0D" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#0F0E0D" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" opacity="0.85" />
                <path fill="#0F0E0D" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" opacity="0.7" />
                <path fill="#0F0E0D" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" opacity="0.55" />
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#3A352D]" />
              <span className="font-mono text-[10px] tracking-widest uppercase text-[#6B6259]">or</span>
              <div className="flex-1 h-px bg-[#3A352D]" />
            </div>

            {sent ? (
              <div className="text-center py-4 rounded-xl bg-[#1C1A17] border border-[#3A352D]">
                <p className="text-sm font-semibold text-[#F5F1EA]">Check your email</p>
                <p className="text-xs text-[#9C948A] mt-1">We sent a sign-in link to {email}</p>
              </div>
            ) : (
              <form onSubmit={handleMagicLink} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full rounded-xl px-4 py-3.5 text-sm bg-[#1C1A17] border border-[#3A352D] text-[#F5F1EA] placeholder:text-[#6B6259] focus:outline-none focus:ring-2 focus:ring-[#C9A158] focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl py-3.5 text-[15px] font-semibold bg-[#1C1A17] border border-[#3A352D] text-[#F5F1EA] hover:border-[#C9A158] transition-colors active:scale-[0.98] disabled:opacity-60"
                >
                  {loading ? 'Sending…' : 'Email me a sign-in link'}
                </button>
              </form>
            )}

            <p className="text-center text-[10px] pt-2 leading-relaxed text-[#6B6259]">
              By continuing you agree to the Terms &amp; Privacy Policy.
            </p>
          </div>

          {/* Trinidad mark */}
          <div
            className="h-[3px] mt-8 rounded-full opacity-40"
            style={{ background: 'linear-gradient(135deg, #CE1126 0 33%, #000 33% 50%, #fff 50% 67%, #CE1126 67%)' }}
          />
          <p className="text-center font-mono text-[10px] tracking-[0.2em] uppercase text-[#6B6259] mt-3">
            Made in T&amp;T · Charlotte St to Chaguanas
          </p>
        </div>
      </div>
    </div>
  )
}
