"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";

type Vehicle = {
  id: string;
  year: number | null;
  brand: string | null;
  name: string | null;
  model_code: string | null;
  engine: string | null;
  vin: string | null;
  frame_number: string | null;
};

function cap(s: string | null | undefined): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const COMMON_ASKS = [
  { emoji: "🛞", label: "Brakes", query: "Brake pads" },
  { emoji: "🛢️", label: "Service & filters", query: "Oil filter" },
  { emoji: "🔩", label: "Suspension", query: "Shock absorbers" },
  { emoji: "💡", label: "Body & lights", query: "Headlamp" },
  { emoji: "🔋", label: "Electrical", query: "Battery" },
  { emoji: "🌡️", label: "Cooling", query: "Radiator" },
];

export default function Home() {
  const router = useRouter();
  const [partName, setPartName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // useRef guard is synchronous — immune to React's batched render timing,
  // which can let a second tap through before isLoading reflects in the DOM.
  const isSubmitting = useRef(false);

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [vehicleLoading, setVehicleLoading] = useState(true);
  const [initial, setInitial] = useState("");

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    supabase
      .from("user_vehicles")
      .select("id, year, brand, name, model_code, engine, vin, frame_number")
      .order("is_primary", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setVehicle(data ?? null);
        setVehicleLoading(false);
      });

    supabase.auth.getUser().then(({ data: { user } }) => {
      const source = user?.user_metadata?.full_name || user?.email || "";
      if (source) setInitial(source.charAt(0).toUpperCase());
    });
  }, []);

  const handleSearch = async () => {
    if (!partName || isSubmitting.current) return;
    isSubmitting.current = true;
    setIsLoading(true);
    try {
      const vehicleDetails = vehicle
        ? [vehicle.year, cap(vehicle.brand), cap(vehicle.name)].filter(Boolean).join(" ")
        : "";
      const vin = vehicle?.vin || vehicle?.frame_number || "";

      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partName, vehicleDetails, vin }),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/results?id=${data.inquiryId}&q=${encodeURIComponent(partName)}`);
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
    <div className="flex flex-col min-h-screen bg-charcoal relative">
      {/* header */}
      <header className="pt-safe px-6 pt-6 pb-2 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold tracking-tight text-cream">PartFinder</h1>
        <Link
          href="/profile"
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #C9A158, #8b6f3d)", boxShadow: "0 0 0 2px rgba(201,161,88,0.2)" }}
        >
          <span className="font-display text-sm font-bold text-charcoal">{initial || "•"}</span>
        </Link>
      </header>

      <main className="flex-1 pb-28">
        {/* vehicle context bar — every search is scoped to the saved ride */}
        {!vehicleLoading && vehicle && (
          <>
            <Link
              href="/profile"
              className="mx-6 mt-2 flex items-center gap-3 px-3.5 py-3 rounded-xl bg-surface border border-brass/30"
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-elevated">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A158" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                  <circle cx="7" cy="17" r="2" />
                  <path d="M9 17h6" />
                  <circle cx="17" cy="17" r="2" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold truncate text-cream">
                  {[cap(vehicle.brand), cap(vehicle.name)].filter(Boolean).join(" ") || "Your ride"}
                </div>
                <div className="font-mono text-[10px] mt-0.5 text-muted uppercase">
                  {[vehicle.year, vehicle.model_code, vehicle.engine].filter(Boolean).join(" · ")}
                </div>
              </div>
              <span className="font-mono text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded shrink-0 flex items-center gap-1 bg-live/10 text-live">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                FITS
              </span>
            </Link>
            <p className="px-6 mt-1.5 text-[10px] text-subtle">
              Every search is checked against your car — no wrong-part stress.
            </p>
          </>
        )}

        {/* no ride yet — send them to add one */}
        {!vehicleLoading && !vehicle && (
          <Link
            href="/onboarding"
            className="mx-6 mt-2 flex items-center gap-3 px-3.5 py-3 rounded-xl border border-dashed border-subtle"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A158" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
              <circle cx="12" cy="13" r="3" />
            </svg>
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-cream">Add your ride</div>
              <div className="text-[10px] mt-0.5 text-muted">Scan the compliance plate — searches get checked against your car.</div>
            </div>
          </Link>
        )}

        {/* the ask */}
        <section className="px-6 mt-6">
          <h2 className="font-display text-[26px] font-bold leading-tight text-cream">What part do you need?</h2>
          <div className="mt-3 flex items-center gap-2 rounded-xl px-4 py-1.5 bg-surface border border-line focus-within:ring-2 focus-within:ring-brass">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#6B6259" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="text"
              value={partName}
              onChange={(e) => setPartName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch() }}
              placeholder="Front brake pads, alternator, bumper…"
              className="flex-1 min-w-0 bg-transparent py-2.5 text-[14px] text-cream placeholder:text-subtle focus:outline-none"
            />
            <button
              onClick={handleSearch}
              disabled={isLoading || !partName}
              aria-label="Search"
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-brass hover:bg-brass-light transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-charcoal/30 border-t-charcoal rounded-full animate-spin" />
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0F0E0D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              )}
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-snug text-muted">
            One request → we WhatsApp every parts shop that stocks it. Quotes land in your{" "}
            <Link href="/orders" className="text-brass">Inbox</Link>.
          </p>
        </section>

        {/* category quick-picks */}
        <section className="px-6 mt-6">
          <div className="font-mono text-[10px] tracking-widest uppercase mb-2.5 text-subtle">COMMON ASKS</div>
          <div className="grid grid-cols-3 gap-2">
            {COMMON_ASKS.map(({ emoji, label, query }) => (
              <button
                key={label}
                onClick={() => setPartName(query)}
                className="rounded-xl px-2 py-3.5 text-center bg-surface border border-line hover:border-brass/50 transition-colors active:scale-[0.97]"
              >
                <div className="text-[20px] leading-none mb-1.5">{emoji}</div>
                <div className="text-[11px] font-medium text-cream">{label}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Trinidad mark */}
        <div
          className="mx-6 mt-10 mb-2 h-[3px] rounded-full opacity-40"
          style={{ background: "linear-gradient(135deg, #CE1126 0 33%, #000 33% 50%, #fff 50% 67%, #CE1126 67%)" }}
        />
        <p className="px-6 pb-4 text-center font-mono text-[10px] tracking-widest uppercase text-subtle">
          Made in T&amp;T · Charlotte St to Chaguanas
        </p>
      </main>
    </div>
  );
}
