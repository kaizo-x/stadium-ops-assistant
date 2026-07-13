"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Zone, mockZones, calculateAverageDensity } from "../lib/stadium-data";
import { getRecommendations } from "../lib/decision-engine";
import { sanitizeInput } from "../lib/security";
import { ErrorBoundary } from "../components/ErrorBoundary";

// Augment global Window interface to avoid 'any' cast
declare global {
  interface Window {
    calculateAverageDensity?: typeof calculateAverageDensity;
    getRecommendations?: typeof getRecommendations;
    mockZones?: typeof mockZones;
    dispatchAction?: (action: Action) => void;
  }
}

interface Incident {
  id: string;
  zoneId: string;
  description: string;
  severity: "low" | "medium" | "high";
  reportedAt: string;
}

type Action =
  | { type: "SIMULATE_TICK" }
  | { type: "REPORT_INCIDENT"; payload: { zoneId: string; description: string; severity: "low" | "medium" | "high" } }
  | { type: "RESOLVE_INCIDENT"; payload: { id: string } }
  | { type: "MANUAL_OCCUPANCY"; payload: { zoneId: string; occupancy: number } }
  | { type: "RESET" };

interface Toast {
  id: string;
  message: string;
  type: "success" | "info" | "warning";
}

// Pre-defined set of deltas to ensure 100% deterministic crowd simulation
const crowdDeltas = [75, -50, 120, -80, 45, -20, 110, -90, 60, -30, 85, -40];

function Home() {
  // Centralized State Controller
  const [zones, setZones] = useState<Zone[]>(mockZones);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  // Local Form States
  const [manualZoneId, setManualZoneId] = useState<string>("zone-a");
  const [manualOccupancy, setManualOccupancy] = useState<number>(400);

  const [incidentZoneId, setIncidentZoneId] = useState<string>("zone-a");
  const [incidentSeverity, setIncidentSeverity] = useState<"low" | "medium" | "high">("medium");
  const [incidentDesc, setIncidentDesc] = useState<string>("");

  // Processing UX, Mounting, and Toast states
  const [isSimulating, setIsSimulating] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);

  // Deterministic counters to replace Math.random()
  const [simulationTick, setSimulationTick] = useState(0);
  const [toastCounter, setToastCounter] = useState(0);
  const [incidentCounter, setIncidentCounter] = useState(0);

  // Toast dispatch utility
  const showToast = useCallback((message: string, type: "success" | "info" | "warning" = "success") => {
    setToastCounter((prev) => {
      const nextId = `toast-${prev + 1}`;
      setToasts((prevToasts) => [...prevToasts, { id: nextId, message, type }]);
      setTimeout(() => {
        setToasts((prevToasts) => prevToasts.filter((t) => t.id !== nextId));
      }, 4000);
      return prev + 1;
    });
  }, []);

  // Hydration-Safe load from localStorage
  useEffect(() => {
    setIsMounted(true);
    const savedZones = localStorage.getItem("stadium_zones");
    const savedIncidents = localStorage.getItem("stadium_incidents");
    if (savedZones) {
      try {
        setZones(JSON.parse(savedZones));
      } catch (e) {
        console.error("Error loading zones from localStorage", e);
      }
    }
    if (savedIncidents) {
      try {
        setIncidents(JSON.parse(savedIncidents));
      } catch (e) {
        console.error("Error loading incidents from localStorage", e);
      }
    }
  }, []);

  // Save changes to localStorage
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("stadium_zones", JSON.stringify(zones));
    }
  }, [zones, isMounted]);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("stadium_incidents", JSON.stringify(incidents));
    }
  }, [incidents, isMounted]);

  // Copy JSON utility
  const copyJSONToClipboard = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(JSON.stringify(zones, null, 2))
        .then(() => {
          showToast("Zones JSON payload copied to clipboard", "success");
        })
        .catch((err) => {
          console.error("Failed to copy JSON:", err);
          showToast("Failed to copy JSON payload", "warning");
        });
    }
  };

  // Interactive Map click handler
  const handleStandSelect = (zoneId: string) => {
    setManualZoneId(zoneId);
    setIncidentZoneId(zoneId);
    
    // Prefill the manual occupancy override input for better UX
    const selectedZone = zones.find(z => z.id === zoneId);
    if (selectedZone) {
      setManualOccupancy(selectedZone.occupancy);
      showToast(`Selected ${selectedZone.name}. Ready for override or alerts.`, "info");
    }
  };

  // Single handleUpdate function processing all state changes
  const handleUpdate = useCallback((action: Action) => {
    let nextZones = [...zones];
    let nextIncidents = [...incidents];
    let descriptionOfChange = "";

    switch (action.type) {
      case "SIMULATE_TICK":
        nextZones = zones.map((zone, index) => {
          // Fluctuates crowd size deterministically based on tick index
          const deltaIndex = (simulationTick + index) % crowdDeltas.length;
          const delta = crowdDeltas[deltaIndex];
          const targetOccupancy = zone.occupancy + delta;
          const clampedOccupancy = Math.max(0, Math.min(zone.capacity, targetOccupancy));
          return { ...zone, occupancy: clampedOccupancy };
        });
        setSimulationTick((prev) => prev + 1);
        descriptionOfChange = "Simulated tick: Crowd movement and occupancy updated across all zones.";
        showToast("Crowd movement and occupancy updated across stands", "info");
        break;

      case "REPORT_INCIDENT":
        const newIncidentId = `incident-${Date.now()}-${incidentCounter}`;
        setIncidentCounter((prev) => prev + 1);
        const newIncident: Incident = {
          id: newIncidentId,
          zoneId: action.payload.zoneId,
          description: action.payload.description || "Unspecified operational alert",
          severity: action.payload.severity,
          reportedAt: new Date().toLocaleTimeString(),
        };
        nextIncidents = [newIncident, ...incidents];
        descriptionOfChange = `Reported Incident: ${newIncident.description} [Severity: ${newIncident.severity.toUpperCase()}] in Zone ${action.payload.zoneId}.`;
        
        const zoneObj = zones.find(z => z.id === action.payload.zoneId);
        showToast(`Incident successfully logged in ${zoneObj?.name || action.payload.zoneId}`, "warning");
        break;

      case "RESOLVE_INCIDENT":
        nextIncidents = incidents.filter((inc) => inc.id !== action.payload.id);
        descriptionOfChange = `Resolved Incident ID: ${action.payload.id}.`;
        
        const resolvedInc = incidents.find((inc) => inc.id === action.payload.id);
        const resolvedZoneObj = zones.find(z => z.id === resolvedInc?.zoneId);
        showToast(`Incident resolved successfully in ${resolvedZoneObj?.name || "Zone"}`, "success");
        break;

      case "MANUAL_OCCUPANCY":
        nextZones = zones.map((zone) => {
          if (zone.id === action.payload.zoneId) {
            return {
              ...zone,
              occupancy: Math.max(0, Math.min(zone.capacity, action.payload.occupancy)),
            };
          }
          return zone;
        });
        descriptionOfChange = `Manual Override: Updated ${action.payload.zoneId} occupancy to ${action.payload.occupancy}.`;
        
        const targetZone = zones.find(z => z.id === action.payload.zoneId);
        showToast(`Manual occupancy update applied to ${targetZone?.name || action.payload.zoneId}`, "success");
        break;

      case "RESET":
        nextZones = mockZones;
        nextIncidents = [];
        descriptionOfChange = "System Reset: Restored default mock zones (40% density) and cleared incidents.";
        showToast("System operational state reset to defaults", "info");
        break;

      default:
        return;
    }

    // Atomically commit state changes
    setZones(nextZones);
    setIncidents(nextIncidents);

    // Calculate metrics using pure function
    const nextAvg = calculateAverageDensity(nextZones).toFixed(1);

    // Interaction Integrity Log
    const logSummary = `[State Controller Action] ${action.type}\nSummary: ${descriptionOfChange}\nNew Stadium Average Density: ${nextAvg}%`;
    console.log(logSummary, { action, previousZones: zones, updatedZones: nextZones, incidents: nextIncidents });
  }, [zones, incidents, showToast, simulationTick, incidentCounter]);

  // Attach variables to window for browser console testing & diagnostics
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.calculateAverageDensity = calculateAverageDensity;
      window.getRecommendations = getRecommendations;
      window.mockZones = mockZones;
      window.dispatchAction = (action: Action) => {
        handleUpdate(action);
      };
    }
  }, [handleUpdate]);

  // Derive decision engine recommendations and average density
  const averageDensity = calculateAverageDensity(zones);
  const recommendations = getRecommendations(zones);
  const totalOccupancy = zones.reduce((sum, z) => sum + z.occupancy, 0);
  const totalCapacity = zones.reduce((sum, z) => sum + z.capacity, 0);

  // Helper function to color map sections based on density
  const getZoneDensityStyles = (zoneId: string) => {
    const zone = zones.find(z => z.id === zoneId);
    if (!zone) return { fill: "fill-zinc-800/40", stroke: "stroke-zinc-700/50", labelColor: "fill-zinc-400" };

    const density = zone.capacity > 0 ? (zone.occupancy / zone.capacity) * 100 : 0;
    const hasAlert = incidents.some(i => i.zoneId === zoneId);

    if (hasAlert || density > 80) {
      return {
        fill: "fill-rose-500/20 hover:fill-rose-500/35",
        stroke: hasAlert ? "stroke-rose-500 stroke-[2] animate-pulse" : "stroke-rose-500/80 stroke-1.5",
        labelColor: "fill-rose-300",
        labelGlow: "drop-shadow-[0_0_2px_rgba(244,63,94,0.3)]",
        pulse: true
      };
    } else if (density > 60) {
      return {
        fill: "fill-amber-500/15 hover:fill-amber-500/30",
        stroke: "stroke-amber-500/60 stroke-1.5",
        labelColor: "fill-amber-300",
        labelGlow: "",
        pulse: false
      };
    } else {
      return {
        fill: "fill-emerald-500/15 hover:fill-emerald-500/30",
        stroke: "stroke-emerald-500/50 stroke-1.5",
        labelColor: "fill-emerald-300",
        labelGlow: "",
        pulse: false
      };
    }
  };

  return (
    <div className="min-h-screen bg-[#070709] text-[#f4f4f5] font-sans antialiased selection:bg-indigo-500 selection:text-white pb-16 relative">
      {/* Background Radial Glow Point 1 */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
      {/* Background Radial Glow Point 2 */}
      <div className="absolute top-[400px] right-1/4 w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-[120px] pointer-events-none" />

      <header className="relative border-b border-zinc-800/80 bg-zinc-950/60 backdrop-blur-xl px-6 py-5 shadow-xl shadow-black/25">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-violet-500 rounded border border-indigo-500/30 opacity-70 blur-xs group-hover:opacity-100 transition duration-300" />
              <Image
                src="/stadium_logo.jpg"
                alt="AURA Stadium Operations Digital Logo"
                width={48}
                height={48}
                priority
                placeholder="blur"
                blurDataURL="data:image/jpeg;base64,/9j/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAAYABgBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="
                className="relative rounded border border-zinc-800 object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
                <span className="sr-only">{'System Status: Active and Live'}</span>
                <span className="text-[10px] font-bold tracking-widest uppercase text-indigo-400">{'Live Telemetry Control'}</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight mt-1 bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                {'AURA Operations Assistant'}
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">{'High-stability central controller for stadium operations and safety dispatch'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleUpdate({ type: "RESET" })}
              aria-label="Reset system state to default mock data"
              className="px-4 py-2 border border-zinc-700/80 bg-zinc-900/40 hover:bg-zinc-800/80 text-zinc-300 text-sm font-semibold rounded transition-all duration-200 ease-in-out cursor-pointer shadow-sm hover:border-zinc-500/30"
            >
              {'Reset System State'}
            </button>
            <button
              onClick={() => {
                setIsSimulating(true);
                handleUpdate({ type: "SIMULATE_TICK" });
                setTimeout(() => {
                  setIsSimulating(false);
                }, 300);
              }}
              disabled={isSimulating}
              aria-label="Simulate stadium crowd flow tick"
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold rounded transition-all duration-200 ease-in-out cursor-pointer shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-500/20"
            >
              {isSimulating ? <>{'Simulating...'}</> : <>{'Simulate Crowd Tick'}</>}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
        
        {/* KPI Summary Block */}
        <section className="lg:col-span-12 grid grid-cols-1 sm:grid-cols-3 gap-6" aria-label="Stadium Operational Status Indicators">
          
          {/* Average Density KPI */}
          <div className="bg-zinc-900/25 backdrop-blur-md border border-zinc-800/80 rounded-xl p-5 flex flex-col justify-between shadow-lg shadow-black/40 hover:shadow-indigo-500/5 hover:border-zinc-700/60 transition-all duration-300 ease-out hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{'Average Density'}</span>
              <div className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${averageDensity > 80 ? 'bg-rose-500 animate-pulse' : averageDensity > 60 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`} />
                <span className={`text-xs font-bold uppercase tracking-wider ${averageDensity > 80 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {averageDensity > 80 ? <>{'Critical'}</> : <>{'Stable'}</>}
                </span>
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-4">
              <span className="text-4xl font-black tracking-tight text-white">{averageDensity.toFixed(1)}{'%'}</span>
            </div>
            
            {/* Custom Glowing Progress Bar */}
            <div 
              className="w-full bg-zinc-950 border border-zinc-800/50 h-2 rounded-full mt-4 overflow-hidden"
              role="progressbar"
              aria-valuenow={Math.round(averageDensity)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Average Crowd Density: ${averageDensity.toFixed(1)}%`}
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  averageDensity > 80 
                    ? "bg-gradient-to-r from-rose-600 to-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" 
                    : averageDensity > 60 
                    ? "bg-gradient-to-r from-amber-600 to-yellow-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]" 
                    : "bg-gradient-to-r from-emerald-600 to-teal-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                }`}
                style={{ width: `${Math.min(100, averageDensity)}%` }}
              />
            </div>
          </div>

          {/* Total Occupancy KPI */}
          <div className="bg-zinc-900/25 backdrop-blur-md border border-zinc-800/80 rounded-xl p-5 flex flex-col justify-between shadow-lg shadow-black/40 hover:shadow-indigo-500/5 hover:border-zinc-700/60 transition-all duration-300 ease-out hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{'Total Occupancy'}</span>
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/25">{'Limit Enforced'}</span>
            </div>
            <div className="flex items-baseline gap-2 mt-4">
              <span className="text-4xl font-black tracking-tight text-white">{totalOccupancy.toLocaleString()}</span>
              <span className="text-xs text-zinc-500 font-medium">{' / '}{totalCapacity.toLocaleString()}{' limit'}</span>
            </div>
            <div 
              className="w-full bg-zinc-950 border border-zinc-800/50 h-2 rounded-full mt-4 overflow-hidden"
              role="progressbar"
              aria-valuenow={Math.round((totalOccupancy / totalCapacity) * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Total Occupancy: ${totalOccupancy} out of ${totalCapacity} maximum limit`}
            >
              <div
                className="h-full bg-gradient-to-r from-indigo-600 to-violet-500 rounded-full transition-all duration-500 ease-out shadow-[0_0_8px_rgba(99,102,241,0.4)]"
                style={{ width: `${(totalOccupancy / totalCapacity) * 100}%` }}
              />
            </div>
          </div>

          {/* Active Incidents KPI */}
          <div className="bg-zinc-900/25 backdrop-blur-md border border-zinc-800/80 rounded-xl p-5 flex flex-col justify-between shadow-lg shadow-black/40 hover:shadow-indigo-500/5 hover:border-zinc-700/60 transition-all duration-300 ease-out hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{'Active Incidents'}</span>
              <div className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${incidents.length > 0 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`} />
                <span className={`text-xs font-bold uppercase tracking-wider ${incidents.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {incidents.length > 0 ? <>{'Action Required'}</> : <>{'System Safe'}</>}
                </span>
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-4">
              <span className="text-4xl font-black tracking-tight text-white">{incidents.length}</span>
              {incidents.length > 0 && (
                <>
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping self-center" aria-hidden="true" />
                  <span className="sr-only">{'Active incidents alert flash'}</span>
                </>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-4 border-t border-zinc-800/50 pt-2">
              {incidents.filter(i => i.severity === 'high').length}{' high-severity dispatches currently active.'}
            </p>
          </div>
        </section>

        {/* Left Column: Interactive Stadium Map and Stand Lists */}
        <section className="lg:col-span-7 flex flex-col gap-6" aria-label="Stadium Spatial Mapping and Monitoring">
          
          {/* Spatial SVG Arena Map Card */}
          <div className="bg-zinc-900/25 backdrop-blur-md border border-zinc-800/80 rounded-xl p-6 shadow-xl shadow-black/40">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-5">
              <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                <span className="text-indigo-400 text-xl">{'🏟️'}</span> {'Live Spatial Arena Map'}
              </h2>
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20">{'Click Stand to Select'}</span>
            </div>

            {/* Stadium Visual Layout Map */}
            <div className="flex items-center justify-center p-2 bg-zinc-950/40 rounded-xl border border-zinc-900/80 shadow-inner relative overflow-hidden">
              <svg 
                viewBox="0 0 400 300" 
                className="w-full max-w-lg h-auto select-none"
                aria-label="Stadium interactive stand map diagram"
              >
                {/* Outer Stadium Wall Border */}
                <rect x="45" y="10" width="310" height="280" rx="90" fill="none" stroke="#27272a" strokeWidth="3" strokeDasharray="6 4" opacity="0.3" />

                {/* Pitch (Football Field Representation) */}
                <g opacity="0.85">
                  {/* Field base rect */}
                  <rect x="130" y="95" width="140" height="110" rx="8" fill="#0c0d12" stroke="#4f46e5" strokeWidth="1.5" strokeOpacity="0.4" />
                  {/* Midline */}
                  <line x1="200" y1="95" x2="200" y2="205" stroke="#4f46e5" strokeWidth="1" strokeOpacity="0.3" />
                  {/* Center Circle */}
                  <circle cx="200" cy="150" r="22" fill="none" stroke="#4f46e5" strokeWidth="1" strokeOpacity="0.3" />
                  {/* Penalty Box Left */}
                  <rect x="130" y="125" width="20" height="50" fill="none" stroke="#4f46e5" strokeWidth="1" strokeOpacity="0.3" />
                  {/* Penalty Box Right */}
                  <rect x="250" y="125" width="20" height="50" fill="none" stroke="#4f46e5" strokeWidth="1" strokeOpacity="0.3" />
                </g>

                {/* Interactive Stands Groups */}
                
                {/* Zone A: North Stand */}
                <g 
                  onClick={() => handleStandSelect("zone-a")}
                  onMouseEnter={() => setHoveredZoneId("zone-a")}
                  onMouseLeave={() => setHoveredZoneId(null)}
                  className="cursor-pointer transition-all duration-300"
                >
                  <rect 
                    x="120" y="25" width="160" height="35" rx="6"
                    className={`transition-all duration-300 ${getZoneDensityStyles("zone-a").fill} ${getZoneDensityStyles("zone-a").stroke} ${
                      hoveredZoneId === "zone-a" ? "stroke-indigo-400 stroke-2" : ""
                    }`}
                  />
                  <text 
                    x="200" y="46" textAnchor="middle" 
                    className={`text-[9px] font-bold pointer-events-none uppercase transition-colors duration-300 ${getZoneDensityStyles("zone-a").labelColor}`}
                  >
                    {'North Stand (A)'}
                  </text>
                </g>

                {/* Zone B: South Stand */}
                <g 
                  onClick={() => handleStandSelect("zone-b")}
                  onMouseEnter={() => setHoveredZoneId("zone-b")}
                  onMouseLeave={() => setHoveredZoneId(null)}
                  className="cursor-pointer transition-all duration-300"
                >
                  <rect 
                    x="120" y="240" width="160" height="35" rx="6"
                    className={`transition-all duration-300 ${getZoneDensityStyles("zone-b").fill} ${getZoneDensityStyles("zone-b").stroke} ${
                      hoveredZoneId === "zone-b" ? "stroke-indigo-400 stroke-2" : ""
                    }`}
                  />
                  <text 
                    x="200" y="261" textAnchor="middle" 
                    className={`text-[9px] font-bold pointer-events-none uppercase transition-colors duration-300 ${getZoneDensityStyles("zone-b").labelColor}`}
                  >
                    {'South Stand (B)'}
                  </text>
                </g>

                {/* Zone C: East Stand */}
                <g 
                  onClick={() => handleStandSelect("zone-c")}
                  onMouseEnter={() => setHoveredZoneId("zone-c")}
                  onMouseLeave={() => setHoveredZoneId(null)}
                  className="cursor-pointer transition-all duration-300"
                >
                  <rect 
                    x="305" y="85" width="35" height="130" rx="6"
                    className={`transition-all duration-300 ${getZoneDensityStyles("zone-c").fill} ${getZoneDensityStyles("zone-c").stroke} ${
                      hoveredZoneId === "zone-c" ? "stroke-indigo-400 stroke-2" : ""
                    }`}
                  />
                  <text 
                    x="322" y="150" textAnchor="middle" transform="rotate(90 322 150)" 
                    className={`text-[9px] font-bold pointer-events-none uppercase transition-colors duration-300 ${getZoneDensityStyles("zone-c").labelColor}`}
                  >
                    {'East Stand (C)'}
                  </text>
                </g>

                {/* Zone D: West Stand */}
                <g 
                  onClick={() => handleStandSelect("zone-d")}
                  onMouseEnter={() => setHoveredZoneId("zone-d")}
                  onMouseLeave={() => setHoveredZoneId(null)}
                  className="cursor-pointer transition-all duration-300"
                >
                  <rect 
                    x="60" y="85" width="35" height="130" rx="6"
                    className={`transition-all duration-300 ${getZoneDensityStyles("zone-d").fill} ${getZoneDensityStyles("zone-d").stroke} ${
                      hoveredZoneId === "zone-d" ? "stroke-indigo-400 stroke-2" : ""
                    }`}
                  />
                  <text 
                    x="77" y="150" textAnchor="middle" transform="rotate(-90 77 150)" 
                    className={`text-[9px] font-bold pointer-events-none uppercase transition-colors duration-300 ${getZoneDensityStyles("zone-d").labelColor}`}
                  >
                    {'West Stand (D)'}
                  </text>
                </g>

                {/* Zone E: VIP Suites */}
                <g 
                  onClick={() => handleStandSelect("zone-e")}
                  onMouseEnter={() => setHoveredZoneId("zone-e")}
                  onMouseLeave={() => setHoveredZoneId(null)}
                  className="cursor-pointer transition-all duration-300"
                >
                  <rect 
                    x="130" y="70" width="140" height="18" rx="4"
                    className={`transition-all duration-300 ${getZoneDensityStyles("zone-e").fill} ${getZoneDensityStyles("zone-e").stroke} ${
                      hoveredZoneId === "zone-e" ? "stroke-indigo-400 stroke-2" : ""
                    }`}
                  />
                  <text 
                    x="200" y="82" textAnchor="middle" 
                    className={`text-[7px] font-black pointer-events-none uppercase tracking-wider transition-colors duration-300 ${getZoneDensityStyles("zone-e").labelColor}`}
                  >
                    {'VIP Suites (E)'}
                  </text>
                </g>

                {/* Zone F: General Admission */}
                <g 
                  onClick={() => handleStandSelect("zone-f")}
                  onMouseEnter={() => setHoveredZoneId("zone-f")}
                  onMouseLeave={() => setHoveredZoneId(null)}
                  className="cursor-pointer transition-all duration-300"
                >
                  <rect 
                    x="130" y="212" width="140" height="18" rx="4"
                    className={`transition-all duration-300 ${getZoneDensityStyles("zone-f").fill} ${getZoneDensityStyles("zone-f").stroke} ${
                      hoveredZoneId === "zone-f" ? "stroke-indigo-400 stroke-2" : ""
                    }`}
                  />
                  <text 
                    x="200" y="224" textAnchor="middle" 
                    className={`text-[7px] font-black pointer-events-none uppercase tracking-wider transition-colors duration-300 ${getZoneDensityStyles("zone-f").labelColor}`}
                  >
                    {'Gen Admission (F)'}
                  </text>
                </g>
              </svg>

              {/* Float Hover Details Panel inside Map */}
              <div className="absolute bottom-3 left-3 bg-zinc-950/80 backdrop-blur-md border border-zinc-900/60 p-2.5 rounded text-[10px] font-medium text-zinc-400 space-y-0.5 shadow-md max-w-[150px] w-full select-none pointer-events-none">
                {hoveredZoneId ? (
                  <>
                    <p className="text-white font-extrabold truncate">
                      {zones.find(z => z.id === hoveredZoneId)?.name}
                    </p>
                    <p>{'Occupancy: '}{zones.find(z => z.id === hoveredZoneId)?.occupancy}</p>
                    <p>{'Capacity: '}{zones.find(z => z.id === hoveredZoneId)?.capacity}</p>
                    <p className="font-bold text-indigo-400">
                      {'Density: '}{((zones.find(z => z.id === hoveredZoneId)?.occupancy || 0) / (zones.find(z => z.id === hoveredZoneId)?.capacity || 1) * 100).toFixed(0)}{'%'}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-zinc-300 font-extrabold">{'Spatial Inspector'}</p>
                    <p>{'Hover on stand shapes for live data.'}</p>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Detailed Stadium Zone Monitor Cards */}
          <div className="bg-zinc-900/25 backdrop-blur-md border border-zinc-800/80 rounded-xl p-6 shadow-xl shadow-black/40">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-5">
              <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                <span className="text-indigo-400 text-xl">{'🏟️'}</span> {'Stadium Zone Monitor'}
              </h2>
              <span className="text-xs text-zinc-400 font-medium bg-zinc-900/60 border border-zinc-850 px-2 py-1 rounded">{'Total stands: '}{zones.length}</span>
            </div>

            {/* Responsive grid for Zone Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {zones.map((zone) => {
                const zoneDensity = zone.capacity > 0 ? (zone.occupancy / zone.capacity) * 100 : 0;
                let statusColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                let statusLabel = "Optimal";
                let progressGlow = "from-emerald-600 to-teal-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]";

                if (zoneDensity > 80) {
                  statusColor = "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_12px_rgba(244,63,94,0.05)]";
                  statusLabel = "Congested";
                  progressGlow = "from-rose-600 to-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]";
                } else if (zoneDensity > 60) {
                  statusColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                  statusLabel = "Warning";
                  progressGlow = "from-amber-600 to-yellow-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]";
                }

                // Check for incidents in this specific zone
                const zoneIncidents = incidents.filter((i) => i.zoneId === zone.id);
                const hasAlert = zoneIncidents.length > 0;

                return (
                  <div 
                    key={zone.id} 
                    onClick={() => handleStandSelect(zone.id)}
                    className={`p-4 bg-zinc-950/40 border rounded-lg hover:shadow-lg hover:shadow-indigo-500/2 transition-all duration-300 ease-out flex flex-col justify-between h-40 cursor-pointer ${
                      hasAlert 
                        ? "border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.08)] bg-rose-950/5" 
                        : "border-zinc-800/80 hover:border-zinc-700/80"
                    } ${hoveredZoneId === zone.id ? "border-indigo-500/40 shadow-[0_0_12px_rgba(99,102,241,0.04)]" : ""}`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <h3 className="font-extrabold text-white text-sm tracking-tight truncate">{zone.name}</h3>
                        {hasAlert && (
                          <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-rose-900/60 text-rose-300 border border-rose-800 animate-pulse shrink-0">
                            {'🚨'}{' ALERT'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 mt-2 font-medium">
                        {'Occupancy: '}<strong className="text-zinc-200">{zone.occupancy}</strong> <span className="text-zinc-650">{' / '}</span> {zone.capacity}
                      </p>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-[10px] mb-1.5 font-bold">
                        <span className="text-zinc-500">{'DENSITY'}</span>
                        <span className={`px-2 py-0.5 rounded-sm border uppercase tracking-widest ${statusColor}`}>
                          {statusLabel} {'('}{zoneDensity.toFixed(0)}{'%)'}
                        </span>
                      </div>
                      {/* Zone Density Progress Bar */}
                      <div 
                        className="w-full bg-zinc-900 border border-zinc-850 h-2 rounded-full overflow-hidden"
                        role="progressbar"
                        aria-valuenow={Math.round(zoneDensity)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${zone.name} Density Progress: ${zoneDensity.toFixed(0)}% (${statusLabel})`}
                      >
                        <div
                          className={`h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r ${progressGlow}`}
                          style={{ width: `${Math.min(100, zoneDensity)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Right Column: Routing Decisions & Control Inputs */}
        <section className="lg:col-span-5 flex flex-col gap-6" aria-label="Routing Decisions and Operator Controls">
          
          {/* Decision Engine recommendations Card */}
          <div className="bg-zinc-900/25 backdrop-blur-md border border-zinc-800/80 rounded-xl p-6 shadow-xl shadow-black/40">
            <h2 className="text-lg font-extrabold text-white border-b border-zinc-800/80 pb-4 mb-4 flex items-center gap-2">
              <span className="text-indigo-400">{'🧠'}</span> {'Routing Decisions'}
              <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 uppercase tracking-widest font-mono ml-auto">{'Pure Engine'}</span>
            </h2>

            {recommendations.length === 0 ? (
              <div className="p-4 bg-emerald-950/15 border border-emerald-900/30 text-emerald-400 rounded-lg text-sm text-center font-semibold">
                {'✅ Stadium density within normal operating parameters. No detours required.'}
              </div>
            ) : (
              <div className="space-y-3.5" aria-label="Active redirection recommendation alerts">
                {recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 bg-indigo-950/15 border border-indigo-900/30 text-indigo-300 rounded-lg text-sm shadow-md shadow-indigo-950/20 hover:border-indigo-500/20 transition-colors">
                    <span className="text-indigo-400 font-extrabold text-lg" aria-hidden="true">{'⚠️'}</span>
                    <div>
                      <p className="font-extrabold text-white tracking-tight">{'Crowd Diversion Required'}</p>
                      <p className="text-xs text-indigo-200/85 mt-1 font-medium leading-relaxed">{'Instruction: '}{rec}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Manual Overrides Box */}
          <div className="bg-zinc-900/25 backdrop-blur-md border border-zinc-800/80 rounded-xl p-6 shadow-xl shadow-black/40">
            <h2 className="text-base font-extrabold text-white mb-4 flex items-center gap-2">
              <span className="text-zinc-400">{'🔧'}</span> {'Manual Crowd Override'}
            </h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="override-zone-select" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">{'Select Zone'}</label>
                <select
                  id="override-zone-select"
                  value={manualZoneId}
                  onChange={(e) => setManualZoneId(e.target.value)}
                  aria-label="Select zone for manual crowd occupancy override"
                  className="w-full bg-zinc-950 border border-zinc-850 rounded px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all duration-200"
                >
                  {zones.map(z => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="override-occupancy-input" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">{'Occupancy'}</label>
                <input
                  id="override-occupancy-input"
                  type="number"
                  min="0"
                  max="5000"
                  value={manualOccupancy}
                  onChange={(e) => setManualOccupancy(Math.max(0, parseInt(e.target.value) || 0))}
                  aria-label="Enter override crowd occupancy number"
                  className="w-full bg-zinc-950 border border-zinc-855 rounded px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all duration-200"
                />
              </div>

              <button
                onClick={() => handleUpdate({
                  type: "MANUAL_OCCUPANCY",
                  payload: { zoneId: manualZoneId, occupancy: manualOccupancy }
                })}
                aria-label="Apply manual occupancy override value to selected zone"
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 py-2 rounded text-sm font-semibold transition-all duration-200 ease-in-out cursor-pointer border border-zinc-700 shadow-md shadow-black/20"
              >
                {'Apply Occupancy Update'}
              </button>
            </div>
          </div>

          {/* Dispatch Incident Report Box */}
          <div className="bg-zinc-900/25 backdrop-blur-md border border-zinc-800/80 rounded-xl p-6 shadow-xl shadow-black/40">
            <h2 className="text-base font-extrabold text-white mb-4 flex items-center gap-2">
              <span className="text-rose-500">{'🚨'}</span> {'Dispatch Incident Report'}
            </h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="incident-zone-select" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">{'Select Zone'}</label>
                <select
                  id="incident-zone-select"
                  value={incidentZoneId}
                  onChange={(e) => setIncidentZoneId(e.target.value)}
                  aria-label="Select zone for dispatch incident report"
                  className="w-full bg-zinc-950 border border-zinc-850 rounded px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all duration-200"
                >
                  {zones.map(z => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="incident-severity-select" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">{'Severity'}</label>
                <select
                  id="incident-severity-select"
                  value={incidentSeverity}
                  onChange={(e) => setIncidentSeverity(e.target.value as "low" | "medium" | "high")}
                  aria-label="Select incident severity level"
                  className="w-full bg-zinc-950 border border-zinc-850 rounded px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all duration-200"
                >
                  <option value="low">{'Low Severity'}</option>
                  <option value="medium">{'Medium Severity'}</option>
                  <option value="high">{'High Severity'}</option>
                </select>
              </div>

              <div>
                <label htmlFor="incident-description-input" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">{'Incident Description'}</label>
                <input
                  id="incident-description-input"
                  type="text"
                  placeholder="e.g. Broken gate, minor altercation, spill"
                  value={incidentDesc}
                  onChange={(e) => setIncidentDesc(e.target.value)}
                  aria-label="Enter description of the incident"
                  className="w-full bg-zinc-950 border border-zinc-850 rounded px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all duration-200"
                />
              </div>

              <button
                onClick={() => {
                  handleUpdate({
                    type: "REPORT_INCIDENT",
                    payload: { zoneId: incidentZoneId, description: sanitizeInput(incidentDesc), severity: incidentSeverity }
                  });
                  setIncidentDesc(""); // Clear description input
                }}
                aria-label="Log incident report and notify dispatchers"
                className="w-full bg-rose-600/90 hover:bg-rose-600 text-white py-2 rounded text-sm font-semibold transition-all duration-200 ease-in-out cursor-pointer shadow-md shadow-rose-950/20 border border-rose-600/30"
              >
                {'Log Operational Alert'}
              </button>
            </div>
          </div>
        </section>

        {/* Active Incident Log Panel */}
        <section className="lg:col-span-12 bg-zinc-900/25 backdrop-blur-md border border-zinc-800/80 rounded-xl p-6 shadow-xl shadow-black/40" aria-label="Active Incident Log Panel">
          <div className="border-b border-zinc-800/80 pb-4 mb-5 flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
              <span className="text-rose-500 animate-pulse">{'📋'}</span> {'Active Operations Incident Log'}
            </h2>
            <span className="text-xs text-zinc-400 font-semibold bg-zinc-900/60 border border-zinc-850 px-2 py-1 rounded">{'Alert queue: '}{incidents.length}{' reports'}</span>
          </div>

          {incidents.length === 0 ? (
            <div className="py-8 text-center bg-zinc-950/20 border border-zinc-900/50 rounded-lg">
              <p className="text-sm font-semibold text-zinc-500">{'No active operational alerts registered. Operations normal.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-label="Active incident alert entries">
              {incidents.map((inc) => {
                const zoneObj = zones.find(z => z.id === inc.zoneId);
                const severityStyles =
                  inc.severity === "high"
                    ? "bg-rose-950/30 text-rose-400 border-rose-800/40"
                    : inc.severity === "medium"
                    ? "bg-amber-950/30 text-amber-400 border-amber-800/40"
                    : "bg-blue-950/30 text-blue-400 border-blue-800/40";

                return (
                  <div key={inc.id} className="p-4 bg-zinc-950/40 border border-zinc-850/80 rounded-lg flex justify-between items-start hover:border-zinc-700/80 transition-all shadow-md shadow-black/10">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-sm text-[8px] font-black uppercase tracking-widest border ${severityStyles}`}>
                          {inc.severity}
                        </span>
                        <strong className="text-xs font-bold text-zinc-300">{zoneObj?.name || inc.zoneId}</strong>
                        <span className="text-[9px] text-zinc-500 font-bold font-mono bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-850">{inc.reportedAt}</span>
                      </div>
                      <p className="text-sm font-medium text-zinc-200">{inc.description}</p>
                    </div>

                    <button
                      onClick={() => handleUpdate({ type: "RESOLVE_INCIDENT", payload: { id: inc.id } })}
                      aria-label={`Mark incident ${inc.description} in ${zoneObj?.name || inc.zoneId} as resolved`}
                      className="text-[11px] font-bold px-3 py-1.5 text-zinc-400 hover:text-emerald-400 bg-zinc-900/60 border border-zinc-800 hover:border-emerald-500/30 rounded transition-all duration-200 ease-in-out cursor-pointer shadow-sm"
                    >
                      {'Resolve'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Visual Debugger (Data Inspector) */}
        <section className="lg:col-span-12" aria-label="Real-Time Data Inspector Debugger">
          <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-6 shadow-xl shadow-black/45">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-2 w-2 bg-indigo-500 rounded-full animate-pulse" aria-hidden="true" />
                <span className="sr-only">{'Live JSON Data Inspector Active'}</span>
                <h2 className="text-xs font-bold text-zinc-400 tracking-widest uppercase">{'Real-Time Data Inspector'}</h2>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={copyJSONToClipboard}
                  aria-label="Copy current zones JSON data state to clipboard"
                  className="px-3 py-1.5 text-[11px] font-bold bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white rounded transition-all duration-200 ease-in-out cursor-pointer hover:border-zinc-700 shadow-sm"
                >
                  {'Copy JSON Payload'}
                </button>
                <span className="text-[10px] font-mono text-zinc-500">{'Live JSON.stringify(zones)'}</span>
              </div>
            </div>
            
            {/* Syntax highlighted raw display */}
            <div className="relative">
              <pre className="p-4 bg-black/60 border border-zinc-900/80 text-emerald-400 text-xs font-mono rounded-lg overflow-auto max-h-72 leading-relaxed custom-scrollbar shadow-inner">
                {JSON.stringify(zones, null, 2)}
              </pre>
            </div>
          </div>
        </section>

      </main>

      {/* Toast Notifications Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3.5 max-w-sm w-full pointer-events-none" role="alert" aria-live="assertive">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-lg border shadow-2xl flex items-center justify-between pointer-events-auto transition-all duration-300 transform translate-y-0 opacity-100 animate-slide-in-right ${
              toast.type === "success"
                ? "bg-zinc-950/95 border-emerald-500/30 text-emerald-400 shadow-emerald-950/15"
                : toast.type === "warning"
                ? "bg-zinc-950/95 border-rose-500/30 text-rose-400 shadow-rose-950/15"
                : "bg-zinc-950/95 border-indigo-500/30 text-indigo-400 shadow-indigo-950/15"
            }`}
          >
            <span className="text-xs font-bold tracking-tight">{toast.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-zinc-500 hover:text-zinc-300 ml-4 cursor-pointer text-xs transition-colors duration-150 p-1"
              aria-label="Close notification"
            >
              {'✕'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomeWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <Home />
    </ErrorBoundary>
  );
}
