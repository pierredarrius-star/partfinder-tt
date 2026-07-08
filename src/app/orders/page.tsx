"use client";

import Link from "next/link";

export default function Orders() {
  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen relative">
      <header className="pt-safe bg-white border-b border-slate-100 px-4 py-3 sticky top-0 z-10 flex items-center justify-between">
        <div className="w-8"></div>
        <h1 className="text-base font-semibold text-slate-800">Inbox</h1>
        <div className="w-8"></div>
      </header>

      <main className="flex-1 px-4 py-6 overflow-y-auto pb-24 z-0 flex flex-col items-center justify-center text-center">
        <svg className="text-slate-300 mb-4" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
        <h2 className="text-lg font-bold text-slate-700 mb-1">Nothing here yet</h2>
        <p className="text-sm text-slate-400 max-w-[220px]">Your part requests and supplier quotes will appear here.</p>
      </main>

    </div>
  );
}
