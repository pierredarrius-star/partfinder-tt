"use client";

import Link from "next/link";
import { useState } from "react";

type CarArea = "Hood" | "Front Wheel" | "Rear Wheel" | "Undercarriage" | "Cabin" | "Trunk" | null;

const BASIC_PARTS_MAP: Record<string, string[]> = {
  "Hood": [
    "Alternator", "Battery", "Radiator", "Spark Plugs", "Water Pump", 
    "Drive Belt / Serpentine Belt", "Air Filter", "Oil Filter", 
    "Valve Cover Gasket", "Ignition Coil", "Starter Motor", "Thermostat",
    "Mass Air Flow Sensor", "Fuel Injectors", "Timing Belt / Chain",
    "Power Steering Pump", "Engine Mount", "Radiator Fan", "Coolant Reservoir", 
    "Oil Pan", "Cylinder Head Gasket", "Camshaft Position Sensor", "EGR Valve"
  ],
  "Front Wheel": [
    "Brake Pads (Front)", "Brake Rotor (Front)", "Brake Caliper (Front)", "Tie Rod End", 
    "Lower Control Arm", "Upper Control Arm", "Shock Absorber / Strut", 
    "CV Axle / Joint", "Wheel Bearing (Front)", "Sway Bar Link (Front)", 
    "Ball Joint", "Steering Rack Boot", "Rack and Pinion", "Brake Hose (Front)",
    "Strut Mount", "Control Arm Bushing", "Power Steering Fluid Tie"
  ],
  "Rear Wheel": [
    "Brake Shoes (Drum)", "Brake Pads (Rear)", "Brake Rotor (Rear)", "Wheel Cylinder", 
    "Shock Absorber (Rear)", "Coil Spring", "Wheel Bearing (Rear)",
    "Trailing Arm", "Sway Bar Link (Rear)", "Lateral Link", "Parking Brake Cable",
    "Brake Drum", "Leaf Spring", "Differential Seal"
  ],
  "Undercarriage": [
    "Exhaust Pipe", "Muffler", "Catalytic Converter", "Fuel Filter", 
    "Transmission Mount", "Oxygen (O2) Sensor", "Driveshaft / Prop Shaft",
    "Differential Fluid", "Center Bearing", "Fuel Lines", "Exhaust Manifold",
    "Exhaust Hanger/Rubber", "Transfer Case (4x4)", "Transmission Filter", 
    "Oil Drain Plug", "Flex Pipe"
  ],
  "Cabin": [
    "Cabin Air Filter", "Window Motor / Regulator", "Window Switch", 
    "A/C Compressor", "Blower Motor", "Evaporator Core", "Heater Core",
    "Ignition Switch", "Seat Belt Buckle", "Clock Spring (Steering)",
    "Dashboard Bulbs", "Door Lock Actuator", "Steering Wheel Cover",
    "Rearview Mirror", "Sun Visor", "Turn Signal Switch", "Wiper Switch",
    "A/C Condenser Relay", "Radio/Stereo Unit"
  ],
  "Trunk": [
    "Trunk Lift Support (Shock)", "Tail Light Assembly", "Tail Light Bulb", 
    "Spare Tire Jack", "Trunk Lock Actuator", "Fuel Pump (Tank Area)",
    "Reverse Light Bulb", "License Plate Light", "Trunk Seal / Weatherstrip",
    "Fuel Tank Cap", "Rear Bumper Reflector"
  ]
};

export default function VisualFinder() {
  const [selectedArea, setSelectedArea] = useState<CarArea>(null);
  const [selectedPart, setSelectedPart] = useState<string | null>(null);

  // A very simplified top-down or side profile representation of a car using CSS shapes
  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen relative pb-safe">
      <header className="pt-safe bg-white border-b border-slate-100 px-4 py-3 sticky top-0 z-10 flex items-center justify-between">
        <Link href="/" className="p-2 -ml-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors active:scale-95">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </Link>
        <h1 className="text-base font-semibold text-slate-800">Visual Part Finder</h1>
        <div className="w-8"></div>
      </header>

      <main className="flex-1 px-4 py-6 overflow-y-auto">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold text-slate-800">Where is the problem?</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-[280px] mx-auto">
            Tap an area on the vehicle diagram below to see common parts in that system.
          </p>
        </div>

        {/* Abstract Responsive Car Diagram container */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-8 relative flex justify-center h-[300px] items-center">
          
          <div className="relative w-[280px] h-[120px]">
            {/* The Car Silhouette */}
            <svg viewBox="0 0 300 120" className="w-full h-full drop-shadow-md text-slate-200" fill="currentColor">
              {/* Abstract Car Side Profile */}
              <path d="M 40,70 L 60,30 C 70,20 90,15 130,15 L 180,15 C 200,15 220,30 240,40 L 280,50 C 290,55 295,65 290,80 L 280,95 C 275,100 260,105 240,105 L 195,105 L 85,105 L 45,105 C 30,105 20,95 25,80 Z" />
              {/* Wheel Arches Cutout */}
              <circle cx="70" cy="100" r="25" fill="#f8fafc" />
              <circle cx="230" cy="100" r="25" fill="#f8fafc" />
            </svg>

            {/* Wheels */}
            <div className="absolute left-[54px] top-[84px] w-8 h-8 rounded-full border-4 border-slate-700 bg-slate-300"></div>
            <div className="absolute left-[214px] top-[84px] w-8 h-8 rounded-full border-4 border-slate-700 bg-slate-300"></div>

            {/* Selectable Hotspots */}
            <button 
              onClick={() => { setSelectedArea("Hood"); setSelectedPart(null); }}
              className={`absolute left-[210px] top-[40px] w-20 h-16 rounded-full border-2 border-dashed flex items-center justify-center transition-all ${selectedArea === "Hood" ? "border-brand-500 bg-brand-500/20 text-brand-700 font-bold text-xs" : "border-slate-400/50 hover:bg-slate-300/30 text-transparent"}`}
            >
              HOOD
            </button>
            
            <button 
              onClick={() => { setSelectedArea("Cabin"); setSelectedPart(null); }}
              className={`absolute left-[110px] top-[10px] w-28 h-20 rounded-full border-2 border-dashed flex items-center justify-center transition-all ${selectedArea === "Cabin" ? "border-brand-500 bg-brand-500/20 text-brand-700 font-bold text-xs" : "border-slate-400/50 hover:bg-slate-300/30 text-transparent"}`}
            >
              CABIN
            </button>

            <button 
              onClick={() => { setSelectedArea("Trunk"); setSelectedPart(null); }}
              className={`absolute left-[30px] top-[40px] w-16 h-16 rounded-full border-2 border-dashed flex items-center justify-center transition-all ${selectedArea === "Trunk" ? "border-brand-500 bg-brand-500/20 text-brand-700 font-bold text-xs" : "border-slate-400/50 hover:bg-slate-300/30 text-transparent"}`}
            >
              TRUNK
            </button>

            <button 
              onClick={() => { setSelectedArea("Front Wheel"); setSelectedPart(null); }}
              className={`absolute left-[208px] top-[74px] w-11 h-11 rounded-full border-2 border-dashed flex items-center justify-center transition-all ${selectedArea === "Front Wheel" ? "border-brand-500 bg-brand-500/40 text-[10px] font-bold text-slate-800" : "border-slate-400/50 hover:bg-slate-300/30 text-transparent"}`}
            >
            </button>

            <button 
              onClick={() => { setSelectedArea("Rear Wheel"); setSelectedPart(null); }}
              className={`absolute left-[48px] top-[74px] w-11 h-11 rounded-full border-2 border-dashed flex items-center justify-center transition-all ${selectedArea === "Rear Wheel" ? "border-brand-500 bg-brand-500/40" : "border-slate-400/50 hover:bg-slate-300/30 text-transparent"}`}
            >
            </button>

            <button 
              onClick={() => { setSelectedArea("Undercarriage"); setSelectedPart(null); }}
              className={`absolute left-[80px] top-[80px] w-28 h-8 rounded-full border-2 border-dashed flex items-center justify-center transition-all ${selectedArea === "Undercarriage" ? "border-brand-500 bg-brand-500/20 text-brand-700 font-bold text-[10px]" : "border-slate-400/50 hover:bg-slate-300/30 text-transparent"}`}
            >
              UNDERCARRIAGE
            </button>
          </div>
        </div>

        {/* Dynamic Context Menu */}
        {selectedArea ? (
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-lg font-bold text-slate-800 mb-4">{selectedArea} System Parts</h3>
            <div className="grid grid-cols-2 gap-3">
              {BASIC_PARTS_MAP[selectedArea].map((part) => (
                <button
                  key={part}
                  onClick={() => setSelectedPart(part)}
                  className={`p-3 text-sm font-medium rounded-xl text-left transition-all ${selectedPart === part ? "bg-brand-600 text-white shadow-md" : "bg-slate-50 text-slate-600 border border-slate-200 hover:border-brand-300 active:bg-slate-100"}`}
                >
                  {part}
                </button>
              ))}
            </div>

            {selectedPart && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-3 text-center">Selected Part: <span className="font-bold text-slate-800">{selectedPart}</span></p>
                <Link 
                  href={{ pathname: "/", query: { part: selectedPart } }} 
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3.5 rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  Return to Search
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 border-dashed rounded-3xl p-8 text-center text-slate-400">
            <svg className="w-8 h-8 mx-auto mb-2 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3"/></svg>
            <p className="text-sm">Select an area on the car above to view common parts.</p>
          </div>
        )}
      </main>
    </div>
  );
}
