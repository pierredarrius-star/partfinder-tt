'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase'

type Inquiry = {
  id: string
  part_query: string
  status: string
  created_at: string
}

type QuoteAgg = { count: number; best: number | null }

function fmtWhen(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString('en-TT', { hour: 'numeric', minute: '2-digit' })
  }
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function Inbox() {
  const supabase = createBrowserSupabaseClient()

  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [quotes, setQuotes] = useState<Record<string, QuoteAgg>>({})
  const [initial, setInitial] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        window.location.href = '/login'
        return
      }

      const source = session.user.user_metadata?.full_name || session.user.email || ''
      if (source) setInitial(source.charAt(0).toUpperCase())

      const { data: rows } = await supabase
        .from('inquiries')
        .select('id, part_query, status, created_at')
        .order('created_at', { ascending: false })
        .limit(50)

      const list = rows ?? []
      setInquiries(list)

      if (list.length > 0) {
        // RLS lets us read responses on our own inquiries
        const { data: resp } = await supabase
          .from('supplier_responses')
          .select('inquiry_id, price, status')
          .in('inquiry_id', list.map(i => i.id))
          .eq('status', 'replied')

        const agg: Record<string, QuoteAgg> = {}
        for (const r of resp ?? []) {
          const a = agg[r.inquiry_id] ?? { count: 0, best: null }
          a.count += 1
          if (r.price != null && (a.best == null || r.price < a.best)) a.best = r.price
          agg[r.inquiry_id] = a
        }
        setQuotes(agg)
      }

      setLoading(false)
    }
    load()
  }, [])

  const liveRows = inquiries.filter(i => i.status !== 'completed')
  const earlierRows = inquiries.filter(i => i.status === 'completed')

  const Row = ({ inquiry, live }: { inquiry: Inquiry; live: boolean }) => {
    const agg = quotes[inquiry.id]
    const partTitle = inquiry.part_query.split(' - ')[0]
    return (
      <Link
        href={`/results?id=${inquiry.id}&q=${encodeURIComponent(partTitle)}`}
        className={`w-full flex items-center gap-3 px-3.5 py-3.5 rounded-xl mb-2 bg-surface border ${live ? 'border-brass/30' : 'border-line'}`}
      >
        <div className="relative shrink-0">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-elevated">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A158" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </div>
          {live && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-live animate-pulse border-2 border-surface" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[14px] font-semibold truncate text-cream">{partTitle}</span>
            <span className="font-mono text-[10px] shrink-0 text-subtle">{fmtWhen(inquiry.created_at)}</span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            {agg && agg.count > 0 ? (
              <>
                <span className="font-mono text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded bg-live/10 text-live">
                  {agg.count} QUOTE{agg.count !== 1 ? 'S' : ''}
                </span>
                {agg.best != null && (
                  <span className="font-mono text-[10px] text-brass">best TT${agg.best}</span>
                )}
              </>
            ) : (
              <span className="font-mono text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded bg-elevated text-muted">
                {live ? 'WAITING ON SHOPS' : 'NO QUOTES'}
              </span>
            )}
          </div>
        </div>
      </Link>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-charcoal">

      {/* header */}
      <header className="pt-safe px-6 pt-6 pb-2 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold tracking-tight text-cream">Inbox</h1>
        <Link
          href="/profile"
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #C9A158, #8b6f3d)', boxShadow: '0 0 0 2px rgba(201,161,88,0.2)' }}
        >
          <span className="font-display text-sm font-bold text-charcoal">{initial || '•'}</span>
        </Link>
      </header>

      <main className="flex-1 px-6 pt-2 pb-28">

        {loading && <div className="py-20" />}

        {!loading && inquiries.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <svg className="text-subtle mb-4" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <h2 className="text-base font-bold text-cream mb-1">Nothing here yet</h2>
            <p className="text-sm text-muted max-w-[240px]">
              Ask for a part on the <Link href="/" className="text-brass">Search</Link> tab — your requests and shop quotes land here.
            </p>
          </div>
        )}

        {liveRows.length > 0 && (
          <section className="pt-2">
            <div className="font-mono text-[10px] tracking-widest uppercase mb-2 text-subtle">LIVE</div>
            {liveRows.map(i => <Row key={i.id} inquiry={i} live />)}
          </section>
        )}

        {earlierRows.length > 0 && (
          <section className="pt-3">
            <div className="font-mono text-[10px] tracking-widest uppercase mb-2 text-subtle">EARLIER</div>
            {earlierRows.map(i => <Row key={i.id} inquiry={i} live={false} />)}
          </section>
        )}
      </main>
    </div>
  )
}
