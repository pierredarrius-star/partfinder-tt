"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";

export default function Profile() {
  const [manualUploaded, setManualUploaded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.href = '/login';
        return;
      }
      setUserEmail(session.user?.email ?? null);
      setSessionChecked(true);
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsUploading(true);
      setTimeout(() => {
        setIsUploading(false);
        setManualUploaded(true);
      }, 2000);
    }
  };

  if (!sessionChecked) return null;

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen relative">
      <header className="pt-safe bg-white border-b border-slate-100 px-4 py-4 sticky top-0 z-10 flex items-center justify-between">
        <div className="w-8"></div>
        <h1 className="text-lg font-bold text-slate-800 tracking-tight">Your Vehicle Profile</h1>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-10 w-52 bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Account</p>
                <p className="text-sm font-medium text-slate-700 truncate">{userEmail ?? '—'}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 py-8 overflow-y-auto pb-24 z-0 text-center flex flex-col items-center">
        <div className="w-full text-left">
          <h2 className="text-xl font-bold text-slate-800 mb-2">My Garage</h2>
          <p className="text-sm text-slate-500 mb-6">Manage your vehicles for accurate searches.</p>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">2012 Nissan Tiida</h3>
                  <p className="text-xs text-slate-500 font-medium">1.5L HR15DE Engine</p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <h4 className="text-sm font-bold text-slate-700 mb-2">Service Guide</h4>
              {manualUploaded ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex justify-between items-center text-left">
                  <div className="flex items-center gap-2">
                    <svg className="text-green-600 shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    <div>
                      <p className="text-[13px] font-bold text-green-800">Tiida_Service_Manual.pdf</p>
                      <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider">AI Context Ready</p>
                    </div>
                  </div>
                  <button onClick={() => setManualUploaded(false)} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-2 py-1 uppercase tracking-wider">Remove</button>
                </div>
              ) : (
                <label className={`w-full flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${isUploading ? 'border-brand-300 bg-brand-50' : 'border-slate-200 hover:border-brand-500 hover:bg-slate-50'}`}>
                  {isUploading ? (
                    <>
                      <div className="animate-spin h-6 w-6 border-3 border-brand-500 border-t-transparent rounded-full mb-2"></div>
                      <span className="text-xs font-bold text-brand-600 uppercase tracking-widest">Processing...</span>
                    </>
                  ) : (
                    <>
                      <svg className="text-slate-400 mb-2" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                      <span className="text-sm font-bold text-slate-500">Upload PDF Manual</span>
                    </>
                  )}
                  <input type="file" className="hidden" accept=".pdf" onChange={handleUpload} disabled={isUploading} />
                </label>
              )}
            </div>
          </div>

          <button className="w-full bg-white hover:bg-slate-50 text-slate-700 font-bold py-3.5 rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Add Another Vehicle
          </button>
        </div>
      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/80 backdrop-blur-xl border-t border-slate-100 flex items-center justify-around py-4 px-6 z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        {[
          { label: 'Home', path: '/', active: false },
          { label: 'Orders', path: '/orders', active: false },
          { label: 'Profile', path: '/profile', active: true }
        ].map((tab, i) => (
          <Link href={tab.path} key={i} className={`flex flex-col items-center gap-1 ${tab.active ? 'text-brand-600' : 'text-slate-400'}`}>
            <span className="text-[11px] font-extrabold uppercase tracking-wider">{tab.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
