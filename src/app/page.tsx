"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [partName, setPartName] = useState("");
  const [vehicleDetails, setVehicleDetails] = useState("");
  const [vin, setVin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // useRef guard is synchronous — immune to React's batched render timing,
  // which can let a second tap through before isLoading reflects in the DOM.
  const isSubmitting = useRef(false);

  const handleSearch = async () => {
    if (!partName || isSubmitting.current) return;
    isSubmitting.current = true;
    setIsLoading(true);
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partName, vehicleDetails, vin }),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/results?id=${data.inquiryId}`);
      } else {
        alert("Failed to start search: " + data.error);
        setIsLoading(false);
        isSubmitting.current = false;
      }
    } catch (e) {
      console.error(e);
      setIsLoading(false);
      isSubmitting.current = false;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen relative">
      <header className="pt-safe bg-brand-600 text-white px-6 py-8 rounded-b-3xl shadow-md z-10 flex flex-col items-center text-center">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-brand-600 p-1.5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
              <path d="M7 6L5 2h14l-2 4" />
              <path d="M4 10h16v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6z" />
              <path d="M12 18v4" />
              <path d="M9 22h6" />
              <circle cx="8" cy="14" r="2" />
              <circle cx="16" cy="14" r="2" />
              <path d="M2.5 14h1.5" />
              <path d="M20 14h1.5" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Partfinder</h1>
        </div>
        <p className="text-brand-100 mt-2 text-[15px] max-w-sm font-medium leading-snug">
          The brilliant way to locate and compare local auto parts.
        </p>
      </header>

      <main className="flex-1 px-4 py-8 overflow-y-auto pb-24 z-0">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-8 -mt-10 mx-2 relative z-20">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Part Search 🇹🇹</h2>
              <p className="text-slate-500 text-sm">Find what you need in seconds</p>
            </div>
            <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              value={partName}
              onChange={(e) => setPartName(e.target.value)}
              placeholder="What part yuh lookin for?"
              className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 focus:ring-2 focus:ring-brand-500 text-slate-700 placeholder:text-slate-400 transition-all font-medium"
            />

            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={vehicleDetails}
                onChange={(e) => setVehicleDetails(e.target.value)}
                placeholder="Year, Make, Model"
                className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 focus:ring-2 focus:ring-brand-500 text-slate-700 placeholder:text-slate-400 text-sm font-medium"
              />
              <input
                type="text"
                value={vin}
                onChange={(e) => setVin(e.target.value)}
                placeholder="VIN (Optional)"
                className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 focus:ring-2 focus:ring-brand-500 text-slate-700 placeholder:text-slate-400 text-sm font-medium uppercase"
              />
            </div>

            <button
              onClick={handleSearch}
              disabled={isLoading || !partName}
              className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${
                isLoading || !partName
                  ? "bg-slate-200 text-slate-400 shadow-none cursor-not-allowed"
                  : "bg-brand-600 text-white hover:bg-brand-700 hover:shadow-brand-200"
              }`}
            >
              {isLoading ? "Searching..." : "Find Part Now"}
            </button>
          </div>
        </div>

      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 flex items-center justify-around py-4 px-6 z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        {[
          { label: 'Home', path: '/', active: true },
          { label: 'Orders', path: '/orders', active: false },
          { label: 'Profile', path: '/profile', active: false }
        ].map((tab, i) => (
          <Link href={tab.path} key={i} className={`flex flex-col items-center gap-1 ${tab.active ? 'text-brand-600' : 'text-slate-400'}`}>
            <span className="text-[11px] font-bold uppercase tracking-wider">{tab.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
