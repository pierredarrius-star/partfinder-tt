"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import SupplierBlastLoader from "@/components/SupplierBlastLoader";

function ResultsContent() {
  const searchParams = useSearchParams();
  const inquiryId = searchParams.get("id");
  
  const [status, setStatus] = useState<"searching" | "contacting" | "found">("searching");
  const [inquiryData, setInquiryData] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [totalContacted, setTotalContacted] = useState(0);

  useEffect(() => {
    if (!inquiryId) return;

    // 1. Fetch initial status and part info
    const fetchInquiry = async () => {
      const { data } = await supabase
        .from('inquiries')
        .select('*')
        .eq('id', inquiryId)
        .single();
      
      if (data) {
        setInquiryData(data);
        if (data.status === 'contacting_suppliers') setStatus('contacting');
        if (data.status === 'completed') setStatus('found');
      }
    };

    // 2. Fetch existing responses and total contacted count
    const fetchResponses = async () => {
      const [{ data, error }, { count }] = await Promise.all([
        supabase
          .from('supplier_responses')
          .select('*, suppliers(name, store_location)')
          .eq('inquiry_id', inquiryId)
          .eq('status', 'replied'),
        supabase
          .from('supplier_responses')
          .select('*', { count: 'exact', head: true })
          .eq('inquiry_id', inquiryId),
      ]);

      if (error) {
        console.error('[POLL] supplier_responses query failed:', error);
        return;
      }

      console.log(`[POLL] replied rows: ${data?.length ?? 0} | total contacted: ${count}`);

      if (count != null) setTotalContacted(count);
      if (data) {
        setResponses(data);
        if (data.length > 0) setStatus('found');
      }
    };

    fetchInquiry();
    fetchResponses();

    // 3. Subscribe to real-time changes.
    // Requires REPLICA IDENTITY FULL on supplier_responses so Supabase includes
    // all columns in the WAL for UPDATE events — needed for the inquiry_id filter.
    const channel = supabase
      .channel(`inquiry-${inquiryId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'supplier_responses',
          filter: `inquiry_id=eq.${inquiryId}`
        },
        async (payload) => {
          console.log('Realtime change received!', payload);
          const [{ data: newResp }, { count }] = await Promise.all([
            supabase
              .from('supplier_responses')
              .select('*, suppliers(name, store_location)')
              .eq('inquiry_id', inquiryId)
              .eq('status', 'replied'),
            supabase
              .from('supplier_responses')
              .select('*', { count: 'exact', head: true })
              .eq('inquiry_id', inquiryId),
          ]);

          if (count != null) setTotalContacted(count);
          if (newResp) {
            setResponses(newResp);
            if (newResp.length > 0) setStatus('found');
          }
        }
      )
      .subscribe();

    // 4. Polling fallback — catches replies if the realtime event is missed
    const pollId = setInterval(fetchResponses, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollId);
    };
  }, [inquiryId]);

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen relative pb-safe">
      <header className="pt-safe bg-white border-b border-slate-100 px-4 py-3 sticky top-0 z-10 flex items-center justify-between">
        <Link href="/" className="p-2 -ml-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors active:scale-95">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </Link>
        <div className="flex flex-col items-center">
            <h1 className="text-xl font-bold text-slate-800">
              {inquiryData?.part_query?.split(' - ')[0] || "Searching..." }
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              {inquiryData?.part_query?.split(' - ')[1] || "Detecting vehicle..."}
            </p>
            {inquiryData?.vin && (
              <p className="text-[10px] text-brand-600 font-bold mt-1 uppercase tracking-wider bg-brand-50 inline-block px-2 py-0.5 rounded-md">
                VIN: {inquiryData.vin}
              </p>
            )}
        </div>
        <div className="w-8"></div>
      </header>

      <main className="flex-1 px-4 py-6 overflow-y-auto">
        
        {/* Loading screen — shown while contacting suppliers */}
        {status !== "found" && (
          <div className="mb-6">
            <SupplierBlastLoader />
          </div>
        )}

        {/* Found state — compact summary card */}
        {status === "found" && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-6">
            {/* Live reply counter */}
            {totalContacted > 0 && (
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 font-bold text-sm px-3 py-1.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  {responses.length}
                </span>
                <span className="text-slate-400 text-xs font-medium">of</span>
                <span className="bg-slate-100 text-slate-600 font-bold text-sm px-3 py-1.5 rounded-full">
                  {totalContacted}
                </span>
                <span className="text-slate-500 text-xs font-medium">suppliers replied</span>
              </div>
            )}
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <div className="w-16 h-16 rounded-full bg-green-50 text-green-500 flex items-center justify-center mb-3">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              </div>
              <h2 className="text-lg font-bold text-slate-800">{responses.length} Store{responses.length !== 1 ? "s" : ""} Replied</h2>
              <p className="text-sm text-slate-500 mt-1 max-w-[200px]">Check the available prices and locations below.</p>
            </div>
          </div>
        )}

        {/* Results List */}
        <div className={`transition-all duration-500 ${responses.length > 0 ? "opacity-100 translate-y-0" : "opacity-50 translate-y-4 pointer-events-none filter blur-[1px]"}`}>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 ml-1 flex items-center gap-2">
            Local Suppliers
            {responses.length > 0 && <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold">{responses.length} REPLIED</span>}
          </h3>

          <div className="space-y-4">
            {responses.map((resp, idx) => (
              <div key={resp.id} className={`bg-white rounded-2xl shadow-md overflow-hidden ${idx === 0 ? 'border-2 border-brand-100' : 'border border-slate-100'}`}>
                {idx === 0 && (
                  <div className="bg-brand-50 px-4 py-2 flex justify-between items-center text-xs font-semibold text-brand-700">
                    <span>⭐ Best Match</span>
                    <span>Ready for Pickup</span>
                  </div>
                )}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="text-lg font-bold text-slate-800">{resp.suppliers?.name}</h4>
                    <span className="text-xl font-bold text-brand-600">
                      {resp.price ? `$${resp.price}` : 'Price on Pickup'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-slate-100 text-slate-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border border-slate-200">
                      {resp.response_text?.toLowerCase().includes('genuine') ? 'Genuine OEM' : 'Confirmed Stock'}
                    </span>
                    <span className="text-xs text-slate-500 italic">
                      "{resp.response_text?.length > 40 ? resp.response_text.substring(0, 40) + '...' : resp.response_text}"
                    </span>
                  </div>

                  <p className="text-sm text-slate-500 mb-4 flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    {resp.suppliers?.store_location || "Trinidad"}
                  </p>
                  
                  <div className="flex gap-2">
                    <Link href={`/checkout?id=${resp.id}`} className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-[0.98]">
                      Reserve Now
                    </Link>
                    <button className="p-3 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {responses.length === 0 && (
              <div className="py-20 flex flex-col items-center justify-center text-center opacity-40">
                <div className="w-12 h-12 border-2 border-slate-300 border-t-brand-500 rounded-full animate-spin mb-4"></div>
                <p className="text-sm font-medium text-slate-500">Waiting for first response...</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SearchResults() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading Result Engine...</div>}>
      <ResultsContent />
    </Suspense>
  );
}
