"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, Suspense } from "react";
import type { WebResult } from "@/lib/web-inventory";

type Quote = {
  id: string;
  price: number | null;
  response_text: string | null;
  status: string;
  responded_at: string | null;
  suppliers: { name: string | null; store_location: string | null; phone_number: string | null } | null;
};

function fmtTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-TT", { hour: "numeric", minute: "2-digit" });
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const inquiryId = searchParams.get("id");
  const query = searchParams.get("q") ?? "";

  // Tab state
  const [activeTab, setActiveTab] = useState<"online" | "whatsapp">("online");

  // Web results state
  const [webResults, setWebResults] = useState<WebResult[]>([]);
  const [webLoading, setWebLoading] = useState(true);

  // Blast state
  const [status, setStatus] = useState<"searching" | "contacting" | "found">("searching");
  const [inquiryData, setInquiryData] = useState<any>(null);
  const [responses, setResponses] = useState<Quote[]>([]);
  const [totalContacted, setTotalContacted] = useState(0);
  const pollIdRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch web results on mount
  useEffect(() => {
    if (!query) {
      setWebLoading(false);
      return;
    }
    fetch(`/api/web-search?q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((json) => setWebResults(json.results ?? []))
      .catch(() => setWebResults([]))
      .finally(() => setWebLoading(false));
  }, [query]);

  // Blast status polling via the owner-checked service route.
  useEffect(() => {
    if (!inquiryId) return;

    let cancelled = false;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/inquiry-status?id=${inquiryId}`);
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;

        if (json.inquiry) {
          setInquiryData(json.inquiry);
          if (json.inquiry.status === "contacting_suppliers") setStatus("contacting");
          if (json.inquiry.status === "completed") setStatus("found");
        }
        if (typeof json.totalContacted === "number") setTotalContacted(json.totalContacted);
        if (json.responses) {
          setResponses(json.responses);
          if (json.responses.length > 0) setStatus("found");
        }
      } catch (err) {
        console.error("[POLL] inquiry-status failed:", err);
      }
    };

    fetchStatus();
    pollIdRef.current = setInterval(fetchStatus, 4000);

    return () => {
      cancelled = true;
      if (pollIdRef.current) clearInterval(pollIdRef.current);
    };
  }, [inquiryId]);

  const partTitle = inquiryData?.part_query?.split(" - ")[0] || query || "Searching…";
  const vehicleSub = inquiryData?.part_query?.split(" - ")[1] ?? null;
  const live = status !== "found" || (inquiryData && inquiryData.status !== "completed");

  // cheapest first, quotes without a price at the end
  const sorted = [...responses].sort((a, b) => {
    if (a.price == null && b.price == null) return 0;
    if (a.price == null) return 1;
    if (b.price == null) return -1;
    return a.price - b.price;
  });
  const best = sorted[0];
  const rest = sorted.slice(1);
  const stillChecking = Math.max(totalContacted - responses.length, 0);

  const firstReply = responses.length
    ? [...responses].sort((a, b) => ((a.responded_at ?? "") < (b.responded_at ?? "") ? -1 : 1))[0]
    : null;

  const headline =
    responses.length === 0
      ? totalContacted > 0
        ? "Request sent.\nShops checking their shelves…"
        : "Blasting your request…"
      : stillChecking > 0
        ? `${responses.length} quote${responses.length !== 1 ? "s" : ""} in.\nShops still replying…`
        : `${responses.length} quote${responses.length !== 1 ? "s" : ""} in.`;

  return (
    <div className="flex flex-col min-h-screen bg-charcoal relative">
      {/* pinned request context */}
      <header className="pt-safe px-6 pt-3 pb-3 flex items-center gap-3 border-b border-line sticky top-0 bg-charcoal z-10">
        <Link
          href="/"
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-surface border border-line"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9C948A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold truncate text-cream">{partTitle}</div>
          {vehicleSub && (
            <div className="font-mono text-[10px] mt-0.5 text-muted uppercase truncate">{vehicleSub}</div>
          )}
        </div>
        {live && (
          <span className="font-mono text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded shrink-0 flex items-center gap-1.5 bg-live/10 text-live">
            <span className="w-1.5 h-1.5 rounded-full bg-live animate-pulse" />
            LIVE
          </span>
        )}
      </header>

      {/* tabs */}
      <div className="border-b border-line px-4 flex gap-0 bg-charcoal">
        <button
          onClick={() => setActiveTab("online")}
          className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "online" ? "border-brass text-brass" : "border-transparent text-subtle"
          }`}
        >
          Online
          {!webLoading && webResults.length > 0 && (
            <span className="ml-1.5 bg-elevated text-muted text-[10px] font-bold px-1.5 py-0.5 rounded-full font-mono">
              {webResults.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("whatsapp")}
          className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "whatsapp" ? "border-brass text-brass" : "border-transparent text-subtle"
          }`}
        >
          Shop quotes
          {responses.length > 0 && (
            <span className="ml-1.5 bg-live/10 text-live text-[10px] font-bold px-1.5 py-0.5 rounded-full font-mono">
              {responses.length}
            </span>
          )}
        </button>
      </div>

      <main className="flex-1 px-6 py-5 pb-16">

        {/* ── Online tab ── */}
        {activeTab === "online" && (
          <div>
            {webLoading && (
              <div className="py-20 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 border-2 border-line border-t-brass rounded-full animate-spin mb-3" />
                <p className="text-sm font-medium text-muted">Searching online catalogs…</p>
              </div>
            )}

            {!webLoading && webResults.length === 0 && (
              <div className="py-20 flex flex-col items-center justify-center text-center">
                <p className="text-2xl mb-2">🔍</p>
                <p className="text-sm font-medium text-muted">No online listings found.</p>
                <p className="text-xs text-subtle mt-1">Check Shop quotes for supplier replies.</p>
              </div>
            )}

            {!webLoading && webResults.length > 0 && (
              <div className="space-y-2">
                <p className="font-mono text-[10px] tracking-widest uppercase text-subtle mb-2">
                  {webResults.length} LISTING{webResults.length !== 1 ? "S" : ""} FOUND ONLINE
                </p>
                {webResults.map((result) => (
                  <a
                    key={result.id}
                    href={result.product_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-xl bg-surface border border-line p-4 hover:border-brass/50 transition-colors active:scale-[0.99]"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-cream text-sm leading-tight truncate">
                          {result.part_name}
                        </p>
                        {result.description && (
                          <p className="text-xs text-muted mt-0.5 line-clamp-2">{result.description}</p>
                        )}
                        <p className="text-xs text-brass font-medium mt-1.5 flex items-center gap-1">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                          {result.site_name}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        {result.price != null ? (
                          <p className="font-mono text-base font-semibold text-cream">
                            {result.currency} {result.price.toFixed(2)}
                          </p>
                        ) : (
                          <p className="text-xs text-subtle italic">See site</p>
                        )}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Shop quotes tab ── */}
        {activeTab === "whatsapp" && (
          <div>
            {/* headline state — say where things are in plain words */}
            <h2 className="font-display text-[24px] font-bold leading-tight text-cream whitespace-pre-line">
              {headline}
            </h2>

            {/* blast timeline — timestamped ticks prove the blast is real */}
            <div className="mt-4 rounded-xl px-4 py-3.5 bg-surface border border-line">
              <div className="flex gap-3">
                <div className="flex flex-col items-center pt-0.5">
                  <span className="w-4 h-4 rounded-full flex items-center justify-center bg-live/15 shrink-0">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#5DBB7C" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                  </span>
                  {(firstReply || stillChecking > 0) && <span className="w-px flex-1 my-1 bg-line" />}
                  {firstReply && (
                    <span className="w-4 h-4 rounded-full flex items-center justify-center bg-live/15 shrink-0">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#5DBB7C" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                    </span>
                  )}
                  {firstReply && stillChecking > 0 && <span className="w-px flex-1 my-1 bg-line" />}
                  {stillChecking > 0 && (
                    <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0">
                      <span className="w-2 h-2 rounded-full bg-live animate-pulse" />
                    </span>
                  )}
                </div>
                <div className="flex-1 space-y-2.5 text-[12px] text-cream">
                  <div className="flex items-baseline justify-between gap-2">
                    <span>
                      Request sent to <strong>{totalContacted || "the"}</strong> shop{totalContacted !== 1 ? "s" : ""} on WhatsApp
                    </span>
                    <span className="font-mono text-[10px] shrink-0 text-subtle">
                      {fmtTime(inquiryData?.created_at ?? null)}
                    </span>
                  </div>
                  {firstReply && (
                    <div className="flex items-baseline justify-between gap-2">
                      <span>
                        First quote back — <strong>{firstReply.suppliers?.name ?? "a shop"}</strong>
                      </span>
                      <span className="font-mono text-[10px] shrink-0 text-subtle">{fmtTime(firstReply.responded_at)}</span>
                    </div>
                  )}
                  {stillChecking > 0 && (
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-muted">
                        {stillChecking} shop{stillChecking !== 1 ? "s" : ""} still checking their shelf…
                      </span>
                      <span className="font-mono text-[10px] shrink-0 text-subtle">NOW</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* quotes — count in header, cheapest first */}
            {responses.length > 0 && (
              <section className="pt-6">
                <div className="flex items-baseline justify-between mb-2.5">
                  <span className="font-mono text-[10px] tracking-widest uppercase text-subtle">
                    QUOTES ({responses.length})
                  </span>
                  <span className="font-mono text-[10px] tracking-widest uppercase text-subtle">CHEAPEST FIRST</span>
                </div>

                {/* best quote — the brass hero card */}
                {best && (
                  <article
                    className="rounded-2xl p-4 mb-2 border"
                    style={{
                      background: "linear-gradient(160deg, rgba(201,161,88,0.08), rgba(201,161,88,0.015) 55%), #1C1A17",
                      borderColor: "rgba(201,161,88,0.35)",
                      boxShadow: "0 0 0 1px rgba(201,161,88,0.1), 0 12px 32px rgba(0,0,0,0.3)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {best.price != null && (
                            <span className="font-mono text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded bg-brass text-charcoal">
                              BEST PRICE
                            </span>
                          )}
                          <span className="font-mono text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded bg-live/10 text-live">
                            IN STOCK
                          </span>
                        </div>
                        <h3 className="text-[15px] font-semibold mt-2 truncate text-cream">
                          {best.suppliers?.name ?? "Supplier"}
                        </h3>
                        <div className="text-[11px] mt-0.5 text-muted">
                          {[best.suppliers?.store_location ?? "Trinidad", best.responded_at ? `replied ${fmtTime(best.responded_at)}` : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {best.price != null ? (
                          <div className="font-mono text-[24px] font-semibold leading-none text-brass">
                            TT${best.price}
                          </div>
                        ) : (
                          <div className="text-[12px] text-muted">Price on pickup</div>
                        )}
                      </div>
                    </div>
                    {best.response_text && (
                      <div className="mt-3 px-3 py-2 rounded-lg text-[12px] leading-snug bg-charcoal border border-line text-muted">
                        &ldquo;{best.response_text}&rdquo;
                      </div>
                    )}
                    {best.suppliers?.phone_number && (
                      <a
                        href={`tel:${best.suppliers.phone_number}`}
                        className="mt-3 w-full py-2.5 rounded-lg font-semibold text-[13px] flex items-center justify-center bg-brass hover:bg-brass-light text-charcoal transition-colors active:scale-[0.98]"
                      >
                        Call {best.suppliers.name ?? "shop"} — {best.suppliers.phone_number}
                      </a>
                    )}
                  </article>
                )}

                {/* the rest — compact rows */}
                {rest.map((q) => (
                  <article key={q.id} className="rounded-xl px-4 py-3.5 mb-2 bg-surface border border-line">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[14px] font-semibold truncate text-cream">{q.suppliers?.name ?? "Supplier"}</h3>
                          <span className="font-mono text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded shrink-0 bg-live/10 text-live">
                            IN STOCK
                          </span>
                        </div>
                        <div className="text-[11px] mt-0.5 text-muted truncate">
                          {[q.suppliers?.store_location, q.response_text ? `"${q.response_text}"` : null].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                      <div className="font-mono text-[17px] font-semibold shrink-0 text-cream">
                        {q.price != null ? `TT$${q.price}` : "—"}
                      </div>
                    </div>
                  </article>
                ))}

                {stillChecking > 0 && (
                  <p className="w-full text-center py-2.5 font-mono text-[10px] tracking-widest uppercase text-subtle">
                    {stillChecking} SHOP{stillChecking !== 1 ? "S" : ""} HAVEN&apos;T REPLIED YET — HANG TIGHT
                  </p>
                )}
              </section>
            )}

            {/* waiting state below the timeline */}
            {responses.length === 0 && (
              <div className="py-14 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 border-2 border-line border-t-brass rounded-full animate-spin mb-4" />
                <p className="text-sm font-medium text-muted">Waiting for the first quote…</p>
                <p className="text-xs text-subtle mt-1 max-w-[240px]">
                  Shops usually reply within a few minutes during opening hours.
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function SearchResults() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-charcoal p-10 text-center text-muted">Loading…</div>}>
      <ResultsContent />
    </Suspense>
  );
}
