import Link from "next/link";

export default function Checkout() {
  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen relative pb-safe">
      <header className="pt-safe bg-white border-b border-slate-100 px-4 py-3 sticky top-0 z-10 flex items-center justify-between">
        <Link href="/results" className="p-2 -ml-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors active:scale-95">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </Link>
        <h1 className="text-base font-semibold text-slate-800">Checkout</h1>
        <div className="w-8"></div>
      </header>

      <main className="flex-1 px-4 py-6 overflow-y-auto">
        
        {/* Reservation Summary */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Reservation Details</h2>
          
          <div className="flex gap-4 items-start mb-6 pb-6 border-b border-slate-100">
            <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Tie Rod End (Front)</h3>
              <p className="text-sm text-slate-500">Nissan Tiida 2012</p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 text-green-700 text-xs font-medium border border-green-100">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                In Stock Now
              </div>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-slate-500">Supplier</span>
              <span className="font-semibold text-slate-800 text-right">Mathura's Auto Supplies<br/><span className="text-xs text-slate-500 font-normal">San Juan, Trinidad</span></span>
            </div>
            <div className="flex justify-between items-center text-lg font-bold pt-2">
              <span className="text-slate-800">Total Price</span>
              <span className="text-brand-600">$185 TTD</span>
            </div>
          </div>
        </div>

        {/* Contact Method */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Your Contact Info</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 ml-1">Full Name</label>
              <input type="text" defaultValue="Dave" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-700" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 ml-1">WhatsApp Number</label>
              <input type="tel" defaultValue="+1 868 555 1234" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-700" />
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500 text-center px-4 mb-6">
          By clicking reserve, we will message the supplier on WhatsApp to hold the item for you to pick up and pay in-store today.
        </p>

        <Link href="/orders" className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-4 rounded-xl shadow-[0_4px_14px_0_rgb(37,99,235,0.39)] transition-all active:scale-[0.98] flex items-center justify-center gap-2">
          Confirm Reservation
        </Link>
      </main>
    </div>
  );
}
