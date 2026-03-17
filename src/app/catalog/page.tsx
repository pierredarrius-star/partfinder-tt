import Link from "next/link";
import { Suspense } from "react";

export default function Catalog() {
  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen relative">
      <header className="pt-safe bg-brand-600 text-white px-6 py-6 z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors active:scale-95">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </Link>
          <h1 className="text-xl font-semibold">Part Catalog</h1>
        </div>
        
        {/* Search Bar for Catalog */}
        <div className="mt-4 relative relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-brand-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2.5 bg-brand-700/50 border border-brand-500 rounded-xl text-white placeholder-brand-200 focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-brand-700 transition-colors"
            placeholder="Search catalog categories..."
          />
        </div>
      </header>

      <main className="flex-1 px-4 py-6 overflow-y-auto pb-24 z-0">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 ml-1">Browse by Category</h2>
        
        <div className="grid grid-cols-2 gap-3 mb-8">
          {/* Engine Category */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2 active:bg-slate-50 transition-colors cursor-pointer aspect-square">
            <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <span className="font-semibold text-slate-700">Engine</span>
          </div>
          
          {/* Suspension */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2 active:bg-slate-50 transition-colors cursor-pointer aspect-square">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            </div>
            <span className="font-semibold text-slate-700">Suspension</span>
          </div>

          {/* Brakes */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2 active:bg-slate-50 transition-colors cursor-pointer aspect-square">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
            </div>
            <span className="font-semibold text-slate-700">Brakes</span>
          </div>

          {/* Electrical */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2 active:bg-slate-50 transition-colors cursor-pointer aspect-square">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            </div>
            <span className="font-semibold text-slate-700">Electrical</span>
          </div>
        </div>
        
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 ml-1">Popular Right Now</h2>
        <div className="space-y-3">
          {[
            { name: "Front Brake Pads", model: "Nissan Tiida / Note", price: "~$250 TTD" },
            { name: "Spark Plugs (Set of 4)", model: "Toyota Corolla (1NZ)", price: "~$180 TTD" },
            { name: "Air Filter", model: "Honda City 2016", price: "~$120 TTD" }
          ].map((item, i) => (
             <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between active:bg-slate-50 transition-colors">
              <div>
                <p className="font-semibold text-slate-800">{item.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.model}</p>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-brand-600">{item.price}</span>
              </div>
            </div>
          ))}
        </div>
      </main>
      
      {/* Modern App Bottom Navigation Bar */}
      <nav className="fixed bottom-0 w-[min(100%,28rem)] left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md border-t border-slate-100 pb-safe z-50">
        <div className="flex justify-around items-center p-4">
          <Link href="/" className="flex flex-col items-center gap-1 text-slate-400 hover:text-brand-600 transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link href="/catalog" className="flex flex-col items-center gap-1 text-brand-600">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            <span className="text-[10px] font-medium">Catalog</span>
          </Link>
          <Link href="/orders" className="flex flex-col items-center gap-1 text-slate-400 hover:text-brand-600 transition-colors">
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
