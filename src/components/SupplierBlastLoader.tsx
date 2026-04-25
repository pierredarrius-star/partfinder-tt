"use client";

import { useState, useEffect } from "react";

// ── Design tokens (from PartFinder Loading Screen.html)
const GREEN      = "#25D366";
const GREEN_DARK = "#1ea855";
const BLUE       = "#2563eb";
const BLUE_DARK  = "#1e3a8a";
const INK        = "#0f172a";
const MUTE       = "#64748b";

// Trinidad silhouette — traced from user-provided image, 240×240 viewBox
const TT_PATH =
  "M 217,36.4 L 225,38 L 214.6,55.6 L 206.6,65.2 L 201.2,66.8 L 198.3,76.5 " +
  "L 203.1,98.9 L 197.2,106.9 L 199.6,124.5 L 203.1,134.2 L 213.8,143.8 " +
  "L 208.2,150.2 L 206,158.2 L 206.6,182.3 L 171.3,196.7 L 88.5,198.3 " +
  "L 23.8,203.1 L 18.2,203.1 L 16.6,198.3 L 33.2,191.9 L 42.5,183.9 " +
  "L 68.4,174.2 L 74,169.4 L 76.7,161.4 L 106.6,159.8 L 111.2,153.4 " +
  "L 105.8,122.9 L 111.2,103.7 L 109.3,89.3 L 105.3,81.3 L 96.8,74.8 " +
  "L 85,70 L 70.8,68.4 L 68.7,65.2 L 80.7,57.2 L 125.6,50.8 L 129.9,46 " +
  "L 171.8,44.4 L 216.7,36.4 Z";

// 5 TT cities — (x, y) as % of the 280px map container
const CITIES = [
  { name: "Port of Spain", x: 37.5, y: 33.2 },
  { name: "Arima",         x: 60.7, y: 28.6 },
  { name: "Chaguanas",     x: 45.7, y: 44.6 },
  { name: "San Fernando",  x: 45.0, y: 55.4 },
  { name: "Point Fortin",  x: 23.2, y: 74.3 },
];

const STATUS_MESSAGES = [
  "AI cleaned your query",
  "Blasting suppliers...",
  "Waiting for first reply...",
  "Checking stock in POS",
  "Messaging parts dealers in T&T",
];

// Edna bot — pulsing blue square with antenna and face
function EdnaBot({ size = 76 }: { size?: number }) {
  const radius = size * 0.22;
  return (
    <div style={{ width: size, height: size, position: "relative", animation: "ednaPulse 2.4s ease-in-out infinite" }}>
      {/* soft halo */}
      <div style={{
        position: "absolute", inset: -14, borderRadius: size * 0.35,
        background: `radial-gradient(circle, ${BLUE}22 0%, ${BLUE}00 70%)`,
      }} />
      {/* body */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: radius,
        background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_DARK} 100%)`,
        boxShadow: `0 10px 24px ${BLUE}55, inset 0 -4px 8px rgba(0,0,0,0.15)`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {/* antenna dot */}
        <div style={{
          position: "absolute", top: -6, left: "50%", transform: "translateX(-50%)",
          width: 8, height: 8, borderRadius: "50%", background: GREEN,
          boxShadow: `0 0 10px ${GREEN}`,
        }} />
        {/* face */}
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 40 40">
          <circle cx="14" cy="17" r="3" fill="#fff" />
          <circle cx="26" cy="17" r="3" fill="#fff" />
          <circle cx="14.5" cy="17.5" r="1.3" fill={INK} />
          <circle cx="26.5" cy="17.5" r="1.3" fill={INK} />
          <path d="M13 25 Q20 30 27 25" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

// WhatsApp-style chat bubble with fake text lines and double tick
function ChatBubble({ w = 36, h = 22 }: { w?: number; h?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: 8,
      background: GREEN, position: "relative",
      boxShadow: "0 4px 10px rgba(37,211,102,0.35)",
      display: "flex", alignItems: "center", padding: "0 5px 0 6px", gap: 3,
    }}>
      {/* tail */}
      <svg width="8" height="10" viewBox="0 0 8 10" style={{ position: "absolute", left: -5, bottom: 0 }}>
        <path d="M8 0 L8 10 L0 10 Q6 8 8 0 Z" fill={GREEN} />
      </svg>
      {/* fake text lines */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.85)", width: "80%" }} />
        <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.6)",  width: "55%" }} />
      </div>
      {/* double tick */}
      <svg width="10" height="6" viewBox="0 0 12 8" style={{ opacity: 0.9 }}>
        <path d="M1 4 L4 7 L8 2"  stroke="#fff" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 4 L8 7 L11 2" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export default function SupplierBlastLoader() {
  const [statusIdx, setStatusIdx] = useState(0);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [litMask,   setLitMask]   = useState(0);

  // Rotate status line every 2.2 s
  useEffect(() => {
    const id = setInterval(() => setStatusIdx(v => (v + 1) % STATUS_MESSAGES.length), 2200);
    return () => clearInterval(id);
  }, []);

  // Sequentially light up cities, reset and loop
  useEffect(() => {
    let i = 0;
    const tick = () => {
      setActiveIdx(i);
      setLitMask(m => m | (1 << i));
      i = (i + 1) % CITIES.length;
      if (i === 0) setTimeout(() => setLitMask(0), 360);
    };
    tick();
    const id = setInterval(tick, 900);
    return () => clearInterval(id);
  }, []);

  // Edna sits at stage (140, 50). Map starts at y=100 inside the 280×400 stage.
  const EDNA_X = 140;
  const EDNA_Y = 50;
  const MAP_OFFSET_Y = 100;

  const litCount = CITIES.filter((_, i) => litMask & (1 << i)).length;

  return (
    <div style={{ position: "relative", overflow: "hidden", background: "#fff", borderRadius: 16, minHeight: 480 }}>

      {/* Green sweep progress bar */}
      <div style={{ height: 3, background: "#e2e8f0", position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", top: 0, bottom: 0, width: "40%",
          background: `linear-gradient(90deg, transparent, ${GREEN} 50%, transparent)`,
          animation: "progressSweep 1.8s linear infinite",
        }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 28, paddingBottom: 24 }}>

        {/* Title */}
        <div style={{ fontSize: 17, fontWeight: 600, color: BLUE, marginBottom: 6, letterSpacing: -0.2 }}>
          Contacting stores in T&amp;T…
        </div>

        {/* Rotating status */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, height: 20 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: GREEN, animation: "blink 1s ease-in-out infinite" }} />
          <div
            key={statusIdx}
            style={{ fontSize: 12, color: MUTE, fontWeight: 500, animation: "fadeSlide 0.45s ease-out" }}
          >
            {STATUS_MESSAGES[statusIdx]}
          </div>
        </div>

        {/* Stage: Edna on top, map below */}
        <div style={{ position: "relative", width: 280, height: 400 }}>

          {/* Edna — centered at top */}
          <div style={{ position: "absolute", left: "50%", top: 10, transform: "translateX(-50%)", zIndex: 10 }}>
            <EdnaBot size={76} />
          </div>

          {/* Flying chat bubble — one per active city, remounted to replay animation */}
          {CITIES.map((city, i) => {
            if (i !== activeIdx) return null;
            const endX = (city.x / 100) * 280;
            const endY = MAP_OFFSET_Y + (city.y / 100) * 280;
            const dx = endX - EDNA_X;
            const dy = endY - EDNA_Y - 30;
            return (
              <div
                key={`bubble-${i}-${activeIdx}`}
                style={{
                  position: "absolute",
                  left: EDNA_X,
                  top: EDNA_Y + 30,
                  transform: "translate(-50%, -50%)",
                  animation: "flyBubble 0.7s cubic-bezier(0.4,0,0.3,1) forwards",
                  // CSS custom props used by the keyframe
                  ["--ex" as any]: `${dx}px`,
                  ["--ey" as any]: `${dy}px`,
                  zIndex: 5,
                }}
              >
                <ChatBubble />
              </div>
            );
          })}

          {/* Map container */}
          <div style={{ position: "absolute", left: 0, top: MAP_OFFSET_Y, width: 280, height: 280 }}>

            {/* Trinidad silhouette */}
            <svg width="280" height="280" viewBox="-20 -20 280 280" style={{ position: "absolute", inset: 0 }}>
              <path
                d={TT_PATH}
                fill="#f1f5f9"
                stroke={`${BLUE}60`}
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>

            {/* City dots */}
            {CITIES.map((city, i) => {
              const isActive = i === activeIdx;
              const isLit    = !!(litMask & (1 << i));
              return (
                <div
                  key={city.name}
                  style={{
                    position: "absolute",
                    left: `${city.x}%`,
                    top:  `${city.y}%`,
                    transform: "translate(-50%, -50%)",
                    zIndex: 3,
                  }}
                >
                  {/* Ripple on activation */}
                  {isActive && (
                    <div style={{
                      position: "absolute", left: "50%", top: "50%",
                      transform: "translate(-50%, -50%)",
                      width: 12, height: 12, borderRadius: "50%",
                      border: `2px solid ${GREEN}`,
                      animation: "cityRipple 1.2s ease-out",
                    }} />
                  )}
                  {/* Dot */}
                  <div style={{
                    width:  isLit ? 11 : 7,
                    height: isLit ? 11 : 7,
                    borderRadius: "50%",
                    background: isLit ? GREEN : "#cbd5e1",
                    boxShadow: isLit ? `0 0 0 3px ${GREEN}33, 0 0 10px ${GREEN}aa` : "none",
                    transition: "all 0.3s ease",
                  }} />
                  {/* Label */}
                  <div style={{
                    position: "absolute",
                    left: "50%", top: "100%",
                    transform: "translate(-50%, 4px)",
                    fontSize: 8.5, fontWeight: 600,
                    color: isLit ? GREEN_DARK : "#94a3b8",
                    whiteSpace: "nowrap",
                    letterSpacing: 0.2,
                    transition: "color 0.3s",
                  }}>
                    {city.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Contacted counter */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 16px", borderRadius: 999, background: "#f1f5f9",
          fontSize: 12, fontWeight: 600, color: INK, marginTop: 8,
        }}>
          <span style={{ color: GREEN_DARK }}>●</span>
          <span>Contacted</span>
          <span style={{ color: GREEN_DARK, minWidth: 16, textAlign: "right" }}>{litCount}</span>
          <span style={{ color: "#cbd5e1" }}>/</span>
          <span>{CITIES.length}</span>
        </div>
      </div>

      <style>{`
        @keyframes ednaPulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.06); }
        }
        @keyframes progressSweep {
          0%   { left: -40%; }
          100% { left: 100%; }
        }
        @keyframes blink {
          0%, 100% { opacity: 0.3; }
          50%      { opacity: 1; }
        }
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes flyBubble {
          0%   { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
          20%  { transform: translate(-50%, -50%) scale(1);   opacity: 1; }
          85%  { transform: translate(calc(-50% + var(--ex)), calc(-50% + var(--ey))) scale(1);   opacity: 1; }
          100% { transform: translate(calc(-50% + var(--ex)), calc(-50% + var(--ey))) scale(0.4); opacity: 0; }
        }
        @keyframes cityRipple {
          0%   { width: 12px; height: 12px; opacity: 0.9; }
          100% { width: 40px; height: 40px; opacity: 0;   }
        }
      `}</style>
    </div>
  );
}
