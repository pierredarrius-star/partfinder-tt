"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [partName, setPartName] = useState("");
  const [vehicleDetails, setVehicleDetails] = useState("");
  const [vin, setVin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImageName, setSelectedImageName] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [hasVoiceNote, setHasVoiceNote] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedImageName(e.target.files[0].name);
      // In a real app we'd convert this file to base64 or upload to Supabase Storage
      // and pass the URL to Gemini to auto-fill the partName.
    }
  };

  const handleSearch = async () => {
    if (!partName && !selectedImageName && !hasVoiceNote) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partName, vehicleDetails, vin }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Navigate to results page, potentially passing the inquiry ID in the future
        router.push('/results');
      } else {
        alert("Failed to start search: " + data.error);
        setIsLoading(false);
      }
    } catch (e) {
      console.error(e);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen relative">
      <header className="pt-safe bg-brand-600 text-white px-6 py-8 rounded-b-3xl shadow-md z-10 flex flex-col items-center text-center">
        {/* Logo and App Name */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-brand-600 p-1.5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
              {/* V-style Engine Block */}
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
        
        {/* Updated Tagline */}
        <p className="text-brand-100 mt-2 text-[15px] max-w-sm font-medium leading-snug">
          The brilliant way to locate and compare local auto parts.
        </p>
      </header>

      <main className="flex-1 px-5 pt-8 overflow-y-auto pb-24 -mt-4 z-0">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">
            What are you looking for?
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 ml-1 uppercase tracking-wider">
                Part Name
              </label>
              <input
                type="text"
                value={partName}
                onChange={(e) => setPartName(e.target.value)}
                placeholder="e.g. Tie rod end, Brake pads..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all text-slate-700 placeholder-slate-400"
              />
            </div>
            {/* Vehicle Details */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Vehicle Details</label>
              <div className="relative group">
                <input 
                  type="text" 
                  value={vehicleDetails}
                  onChange={(e) => setVehicleDetails(e.target.value)}
                  placeholder="e.g. 2012 Nissan Tiida HR15"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 focus:bg-white focus:border-brand-500 focus:outline-none transition-all placeholder:text-slate-300 text-slate-700 font-medium"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
                </div>
              </div>
            </div>

            {/* VIN Number (New) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">VIN Number (Optional)</label>
              <div className="relative group">
                <input 
                  type="text" 
                  value={vin}
                  onChange={(e) => setVin(e.target.value)}
                  placeholder="e.g. MDA61C1..."
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 focus:bg-white focus:border-brand-500 focus:outline-none transition-all placeholder:text-slate-300 text-slate-700 font-medium uppercase tracking-wider"
                />
                <button className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-500 bg-brand-50 p-2 rounded-lg hover:bg-brand-100 transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><line x1="7" y1="12" x2="17" y2="12"></line></svg>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 ml-1">VIN ensures 100% exact part matching.</p>
            </div>
            
            {/* Visual & Voice Upload Area */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-medium text-slate-500 mb-2 ml-1 uppercase tracking-wider">
                Identify by Photo or Voice
              </label>
              
              {/* Voice Note Status */}
              {hasVoiceNote && (
                 <div className="bg-brand-50 border border-brand-200 rounded-xl p-3 flex justify-between items-center mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
                      <svg className="text-brand-600" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" x2="12" y1="19" y2="22"></line></svg>
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-semibold text-brand-800 truncate">Audio Recording</p>
                      <p className="text-xs text-brand-600">0:04s ready for AI Diagnosis</p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.preventDefault(); setHasVoiceNote(false); }}
                    className="text-slate-400 hover:text-slate-600 p-2"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>
              )}

              {/* Photo Status */}
              {selectedImageName && (
                <div className="bg-brand-50 border border-brand-200 rounded-xl p-3 flex justify-between items-center mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
                      <svg className="text-brand-600" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-semibold text-brand-800 truncate">{selectedImageName}</p>
                      <p className="text-xs text-brand-600">Ready for AI Analysis</p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.preventDefault(); setSelectedImageName(null); }}
                    className="text-slate-400 hover:text-slate-600 p-2"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>
              )}
              
              {!hasVoiceNote && !selectedImageName && (
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <button 
                    onMouseDown={() => setIsRecording(true)}
                    onMouseUp={() => { setIsRecording(false); setHasVoiceNote(true); }}
                    onTouchStart={() => setIsRecording(true)}
                    onTouchEnd={() => { setIsRecording(false); setHasVoiceNote(true); }}
                    className={`col-span-1 border border-slate-200 transition-colors flex flex-col items-center justify-center gap-1 cursor-pointer select-none rounded-xl py-2 ${isRecording ? 'bg-red-50 border-red-200 text-red-600 scale-95' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95'}`}
                  >
                     <svg className={`${isRecording ? 'animate-pulse' : ''}`} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" x2="12" y1="19" y2="22"></line></svg>
                     <span className="text-[10px] font-bold uppercase">{isRecording ? "Recording" : "Hold to Speak"}</span>
                  </button>

                  <label className="col-span-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-xl border border-slate-200 transition-colors flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                    <span className="text-[10px] font-bold uppercase">Take Photo</span>
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
                  </label>
                  
                  <label className="col-span-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-xl border border-slate-200 transition-colors flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    <span className="text-[10px] font-bold uppercase">Library</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                </div>
              )}
            </div>

            <button 
              onClick={handleSearch}
              disabled={isLoading || (!partName && !selectedImageName && !hasVoiceNote)}
              className={`w-full text-white font-semibold py-4 rounded-xl shadow-[0_4px_14px_0_rgb(37,99,235,0.39)] transition-all flex items-center justify-center gap-2 mt-4 ${isLoading || (!partName && !selectedImageName && !hasVoiceNote) ? 'bg-slate-400 cursor-not-allowed shadow-none' : 'bg-brand-600 hover:bg-brand-500 active:scale-[0.98]'}`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Starting Search...
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Find Part Now
                </>
              )}
            </button>
          </div>
        </div>

        {/* Visual Finder Helper */}
        <Link href="/visual-finder" className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-5 mb-6 text-white flex items-center justify-between shadow-lg active:scale-[0.98] transition-all border border-slate-700">
          <div>
            <h3 className="font-bold flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3"/></svg>
              Don't know the name?
            </h3>
            <p className="text-slate-300 text-sm mt-1">Tap the car to find your part visually.</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </div>
        </Link>

        <div className="flex items-center justify-between mb-4 mt-8 px-1">
          <h3 className="text-lg font-semibold text-slate-800">Recent Searches</h3>
          <button className="text-sm text-brand-600 font-medium">View all</button>
        </div>
        
        <div className="space-y-3">
          {/* Mock Recent Search Card */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between active:bg-slate-50 transition-colors">
            <div>
              <p className="font-semibold text-slate-800">Shock Absorbers (Front)</p>
              <p className="text-xs text-slate-500 mt-0.5">Toyota Hilux 2018</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500"></span>
              <span className="text-xs font-medium text-slate-600">Found</span>
            </div>
          </div>
        </div>
      </main>

      {/* Modern App Bottom Navigation Bar */}
      <nav className="fixed bottom-0 w-[min(100%,28rem)] left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md border-t border-slate-100 pb-safe z-50">
        <div className="flex justify-around items-center p-4">
          <Link href="/" className="flex flex-col items-center gap-1 text-brand-600 transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link href="/catalog" className="flex flex-col items-center gap-1 text-slate-400 hover:text-brand-600 transition-colors">
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
