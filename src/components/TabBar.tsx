'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// The 3-tab shell: Search / Garage / Inbox. Account lives behind the avatar
// on each screen, not in a tab. Flow screens (results, checkout, onboarding…)
// don't show the bar — only the three tab roots do.
const TABS = [
  {
    href: '/',
    label: 'Search',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'Garage',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 10v10h18V10" />
        <path d="m2 10 10-7 10 7" />
        <path d="M8 14h8" />
      </svg>
    ),
  },
  {
    href: '/orders',
    label: 'Inbox',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
]

export default function TabBar() {
  const pathname = usePathname()

  // Only the tab roots get the bar.
  if (!TABS.some(t => t.href === pathname)) return null

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-30 flex items-center justify-around pt-3 pb-6 bg-charcoal/90 backdrop-blur-xl border-t border-line">
      {TABS.map(tab => {
        const active = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center gap-1 px-4 ${active ? 'text-brass' : 'text-subtle'}`}
          >
            {tab.icon}
            <span className={`text-[10px] tracking-wide ${active ? 'font-semibold' : 'font-medium'}`}>
              {tab.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
