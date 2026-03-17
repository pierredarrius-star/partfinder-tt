"use client";

import Link from "next/link";
import { useState } from "react";

export default function Orders() {
  const [showTranscript, setShowTranscript] = useState(false);

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen relative">
      <header className="pt-safe bg-white border-b border-slate-100 px-4 py-3 sticky top-0 z-10 flex items-center justify-between">
        <div className="w-8"></div>
        <h1 className="text-base font-semibold text-slate-800">Order History</h1>
        <div className="w-8"></div>
      </header>

      <main className="flex-1 px-4 py-6 overflow-y-auto pb-24 z-0">
        
        {/* Active Order */}
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 ml-1">Active Reservations</h2>
        <div className="bg-white rounded-2xl shadow-sm border-2 border-brand-100 mb-8 overflow-hidden hover:shadow-md transition-shadow">
          <div className="bg-brand-50 px-4 py-2 border-b border-brand-100 flex justify-between items-center text-xs font-bold text-brand-700">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
              Awaiting Pickup
            </span>
            <span>Today, 11:30 AM</span>
          </div>
          <div className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Tie Rod End (Front)</h3>
                <p className="text-sm text-slate-500">Nissan Tiida 2012</p>
              </div>
              <span className="text-lg font-bold text-brand-600">$185</span>
            </div>
            
            <div className="flex items-center gap-3 mt-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">Mathura's Auto Supplies</p>
                <p className="text-xs text-slate-500">Eastern Main Road, San Juan</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl text-sm transition-colors flex justify-center items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                Get Directions
              </button>
              <button 
                onClick={() => setShowTranscript(!showTranscript)}
                className="flex-1 bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold py-2.5 rounded-xl text-sm transition-colors flex justify-center items-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                AI Call Log
              </button>
            </div>

            {/* AI Transcript Log Dropdown */}
            {showTranscript && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-3">AI Phone Call Transcript</p>
                <div className="space-y-3 pb-2 text-sm bg-slate-50 p-3 rounded-xl border border-slate-100 max-h-48 overflow-y-auto">
                   <div className="flex gap-2">
                     <span className="font-bold text-brand-600 min-w-10">AI:</span>
                     <span className="text-slate-600">Hi! Good day, just calling to find out if you have a front tie rod end for a 2012 Nissan Tiida?</span>
                   </div>
                   <div className="flex gap-2">
                     <span className="font-bold text-slate-700 min-w-10">Store:</span>
                     <span className="text-slate-600">Yeah we have that in stock right now. Genuine or aftermarket?</span>
                   </div>
                   <div className="flex gap-2">
                     <span className="font-bold text-brand-600 min-w-10">AI:</span>
                     <span className="text-slate-600">Just the aftermarket one please, what is the price on that?</span>
                   </div>
                   <div className="flex gap-2">
                     <span className="font-bold text-slate-700 min-w-10">Store:</span>
                     <span className="text-slate-600">That'll be $185 TT boss.</span>
                   </div>
                   <div className="flex gap-2">
                     <span className="font-bold text-brand-600 min-w-10">AI:</span>
                     <span className="text-slate-600">Excellent, I have a customer Dave who wants to reserve it to pick up today.</span>
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Past Orders */}
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 ml-1">Past Pickups</h2>
        <div className="space-y-3 opacity-70">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-800 text-sm">Shock Absorbers (Front) x2</p>
              <p className="text-xs text-slate-500 mt-0.5">Toyota Hilux • $1,200</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-500">Feb 14, 2026</span>
            </div>
          </div>
        </div>
      </main>

      {/* Modern App Bottom Navigation Bar */}
      <nav className="fixed bottom-0 w-[min(100%,28rem)] left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md border-t border-slate-100 pb-safe z-50">
        <div className="flex justify-around items-center p-4">
          <Link href="/" className="flex flex-col items-center gap-1 text-slate-400 hover:text-brand-600 transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link href="/catalog" className="flex flex-col items-center gap-1 text-slate-400 hover:text-brand-600 transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            <span className="text-[10px] font-medium">Catalog</span>
          </Link>
          <Link href="/orders" className="flex flex-col items-center gap-1 text-brand-600 transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            <span className="text-[10px] font-medium">Orders</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-1 text-slate-400 hover:text-brand-600 transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            <span className="text-[10px] font-medium">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
