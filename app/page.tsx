"use client";

import { useState, useEffect, useCallback } from "react";
import { Zone, mockZones, calculateAverageDensity } from "../lib/stadium-data";
import { getRecommendations } from "../lib/decision-engine";

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

export default function Home() {
  // Centralized State Controller
  const [zones, setZones] = useState<Zone[]>(mockZones);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  // Local Form States
  const [manualZoneId, setManualZoneId] = useState<string>("zone-a");
  const [manualOccupancy, setManualOccupancy] = useState<number>(400);

  const [incidentZoneId, setIncidentZoneId] = useState<string>("zone-a");
  const [incidentSeverity, setIncidentSeverity] = useState<"low" | "medium" | "high">("medium");
  const [incidentDesc, setIncidentDesc] = useState<string>("");

  // Single handleUpdate function processing all state changes
  const handleUpdate = useCallback((action: Action) => {
    let nextZones = [...zones];
    let nextIncidents = [...incidents];
    let descriptionOfChange = "";

    switch (action.type) {
      case "SIMULATE_TICK":
        nextZones = zones.map((zone) => {
          // Fluctuates crowd size by -100 to +150 to simulate incoming/outgoing flows
          const delta = Math.floor(Math.random() * 250) - 100;
          const targetOccupancy = zone.occupancy + delta;
          const clampedOccupancy = Math.max(0, Math.min(zone.capacity, targetOccupancy));
          return { ...zone, occupancy: clampedOccupancy };
        });
        descriptionOfChange = "Simulated tick: Crowd movement and occupancy updated across all zones.";
        break;

      case "REPORT_INCIDENT":
        const newIncident: Incident = {
          id: `incident-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          zoneId: action.payload.zoneId,
          description: action.payload.description || "Unspecified operational alert",
          severity: action.payload.severity,
          reportedAt: new Date().toLocaleTimeString(),
        };
        nextIncidents = [newIncident, ...incidents];
        descriptionOfChange = `Reported Incident: ${newIncident.description} [Severity: ${newIncident.severity.toUpperCase()}] in Zone ${action.payload.zoneId}.`;
        break;

      case "RESOLVE_INCIDENT":
        nextIncidents = incidents.filter((inc) => inc.id !== action.payload.id);
        descriptionOfChange = `Resolved Incident ID: ${action.payload.id}.`;
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
        break;

      case "RESET":
        nextZones = mockZones;
        nextIncidents = [];
        descriptionOfChange = "System Reset: Restored default mock zones (40% density) and cleared incidents.";
        break;

      default:
        return;
    }

    // Atomically commit state changes
    setZones(nextZones);
    setIncidents(nextIncidents);

    // Calculate metrics using pure function
    const nextAvg = calculateAverageDensity(nextZones).toFixed(1);

    // Interaction Integrity Log & Alert
    const logSummary = `[State Controller Action] ${action.type}\nSummary: ${descriptionOfChange}\nNew Stadium Average Density: ${nextAvg}%`;
    console.log(logSummary, { action, previousZones: zones, updatedZones: nextZones, incidents: nextIncidents });
    alert(logSummary);
  }, [zones, incidents]);

  // Attach variables to window for browser console testing & diagnostics
  useEffect(() => {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      w.calculateAverageDensity = calculateAverageDensity;
      w.getRecommendations = getRecommendations;
      w.mockZones = mockZones;
      w.dispatchAction = (action: Action) => {
        handleUpdate(action);
      };
    }
  }, [handleUpdate]);

  // Derive decision engine recommendations and average density
  const averageDensity = calculateAverageDensity(zones);
  const recommendations = getRecommendations(zones);
  const totalOccupancy = zones.reduce((sum, z) => sum + z.occupancy, 0);
  const totalCapacity = zones.reduce((sum, z) => sum + z.capacity, 0);

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] font-sans antialiased selection:bg-indigo-500 selection:text-white pb-12">
      {/* Background Radial Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[350px] bg-gradient-radial from-indigo-500/10 via-transparent to-transparent pointer-events-none" />

      <header className="relative border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold tracking-widest uppercase text-indigo-400">Live Control</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mt-1">AURA Operations Assistant</h1>
            <p className="text-xs text-zinc-400 mt-0.5">High-stability central controller for stadium operations and safety dispatch</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleUpdate({ type: "RESET" })}
              className="px-4 py-2 border border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300 text-sm font-medium rounded transition-all cursor-pointer shadow-sm hover:border-zinc-600"
            >
              Reset System State
            </button>
            <button
              onClick={() => handleUpdate({ type: "SIMULATE_TICK" })}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold rounded transition-all cursor-pointer shadow-lg shadow-indigo-500/20"
            >
              Simulate Crowd Tick
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* KPI Summary Block */}
        <section className="lg:col-span-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-5 flex flex-col justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Average Density</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold tracking-tight text-white">{averageDensity.toFixed(1)}%</span>
              <span className={`text-xs font-semibold ${averageDensity > 80 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {averageDensity > 80 ? "Critical" : "Stable"}
              </span>
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  averageDensity > 80 ? "bg-rose-500" : averageDensity > 60 ? "bg-amber-500" : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(100, averageDensity)}%` }}
              />
            </div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-5 flex flex-col justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Total Occupancy</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold tracking-tight text-white">{totalOccupancy.toLocaleString()}</span>
              <span className="text-xs text-zinc-500">/ {totalCapacity.toLocaleString()} limit</span>
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${(totalOccupancy / totalCapacity) * 100}%` }}
              />
            </div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-5 flex flex-col justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Active Incidents</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold tracking-tight text-white">{incidents.length}</span>
              {incidents.length > 0 && (
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping self-center" />
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-3">
              {incidents.filter(i => i.severity === 'high').length} high-severity dispatches currently active.
            </p>
          </div>
        </section>

        {/* Left Column: Read-Only Grid View of Zones */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
              <h2 className="text-lg font-bold text-white">Stadium Zone Monitor</h2>
              <span className="text-xs text-zinc-400">Total zones monitored: {zones.length}</span>
            </div>

            <div className="space-y-4">
              {zones.map((zone) => {
                const zoneDensity = zone.capacity > 0 ? (zone.occupancy / zone.capacity) * 100 : 0;
                let statusColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                let statusLabel = "Optimal";

                if (zoneDensity > 80) {
                  statusColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                  statusLabel = "Congested";
                } else if (zoneDensity > 60) {
                  statusColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                  statusLabel = "Warning";
                }

                // Check for incidents in this specific zone
                const zoneIncidents = incidents.filter((i) => i.zoneId === zone.id);

                return (
                  <div key={zone.id} className="p-4 bg-zinc-950/60 border border-zinc-800/80 rounded-lg hover:border-zinc-700/80 transition-all">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-white text-sm">{zone.name}</h3>
                        <p className="text-xs text-zinc-400 mt-1">
                          Occupancy: <strong className="text-zinc-200">{zone.occupancy}</strong> / {zone.capacity} spectators
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {zoneIncidents.length > 0 && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-900/60 text-rose-300 border border-rose-800">
                            {zoneIncidents.length} ALERT
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${statusColor}`}>
                          {statusLabel} ({zoneDensity.toFixed(0)}%)
                        </span>
                      </div>
                    </div>

                    {/* Zone Density Progress Bar */}
                    <div className="w-full bg-zinc-800/80 h-2 rounded-full mt-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          zoneDensity > 80 ? "bg-rose-500" : zoneDensity > 60 ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(100, zoneDensity)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Right Column: Routing Decisions & Control Inputs */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Decision Engine recommendations Card */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-6">
            <h2 className="text-lg font-bold text-white border-b border-zinc-800 pb-3 mb-4 flex items-center gap-2">
              <span>🧠 Routing Decisions</span>
              <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20">Pure Engine</span>
            </h2>

            {recommendations.length === 0 ? (
              <div className="p-4 bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 rounded-lg text-sm text-center">
                ✅ Stadium density within normal operating parameters. No detours required.
              </div>
            ) : (
              <div className="space-y-2">
                {recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-indigo-950/20 border border-indigo-900/30 text-indigo-300 rounded-lg text-sm">
                    <span className="text-indigo-400 font-bold">⚠️</span>
                    <div>
                      <p className="font-semibold text-white">Crowd Diversion Required</p>
                      <p className="text-xs text-indigo-200/80 mt-0.5">Instruction: {rec}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Manual Overrides Box */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-6">
            <h2 className="text-base font-bold text-white mb-4">Manual Crowd Override</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Select Zone</label>
                <select
                  value={manualZoneId}
                  onChange={(e) => setManualZoneId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-700 transition-all"
                >
                  {zones.map(z => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Occupancy</label>
                <input
                  type="number"
                  min="0"
                  max="5000"
                  value={manualOccupancy}
                  onChange={(e) => setManualOccupancy(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-700 transition-all"
                />
              </div>

              <button
                onClick={() => handleUpdate({
                  type: "MANUAL_OCCUPANCY",
                  payload: { zoneId: manualZoneId, occupancy: manualOccupancy }
                })}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 py-2 rounded text-sm font-semibold transition-all cursor-pointer border border-zinc-700"
              >
                Apply Occupancy Update
              </button>
            </div>
          </div>

          {/* Dispatch Incident Report Box */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-6">
            <h2 className="text-base font-bold text-white mb-4">Dispatch Incident Report</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Select Zone</label>
                <select
                  value={incidentZoneId}
                  onChange={(e) => setIncidentZoneId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-700 transition-all"
                >
                  {zones.map(z => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Severity</label>
                <select
                  value={incidentSeverity}
                  onChange={(e) => setIncidentSeverity(e.target.value as "low" | "medium" | "high")}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-700 transition-all"
                >
                  <option value="low">Low Severity</option>
                  <option value="medium">Medium Severity</option>
                  <option value="high">High Severity</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Incident Description</label>
                <input
                  type="text"
                  placeholder="e.g. Broken gate, minor altercation, spill"
                  value={incidentDesc}
                  onChange={(e) => setIncidentDesc(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-700 transition-all"
                />
              </div>

              <button
                onClick={() => {
                  handleUpdate({
                    type: "REPORT_INCIDENT",
                    payload: { zoneId: incidentZoneId, description: incidentDesc, severity: incidentSeverity }
                  });
                  setIncidentDesc(""); // Clear description input
                }}
                className="w-full bg-rose-600/90 hover:bg-rose-600 text-white py-2 rounded text-sm font-semibold transition-all cursor-pointer shadow-md shadow-rose-950/20"
              >
                Log Operational Alert
              </button>
            </div>
          </div>
        </section>

        {/* Active Incident Log Panel */}
        <section className="lg:col-span-12 bg-zinc-900/40 border border-zinc-800 rounded-lg p-6">
          <div className="border-b border-zinc-800 pb-3 mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Active Operations Incident Log</h2>
            <span className="text-xs text-zinc-400">Alert queue: {incidents.length} reports</span>
          </div>

          {incidents.length === 0 ? (
            <p className="text-sm text-zinc-500 py-4 text-center">No active operational alerts registered. Operations normal.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {incidents.map((inc) => {
                const zoneObj = zones.find(z => z.id === inc.zoneId);
                const severityStyles =
                  inc.severity === "high"
                    ? "bg-rose-950/30 text-rose-400 border-rose-800/40"
                    : inc.severity === "medium"
                    ? "bg-amber-950/30 text-amber-400 border-amber-800/40"
                    : "bg-blue-950/30 text-blue-400 border-blue-800/40";

                return (
                  <div key={inc.id} className="p-4 bg-zinc-950/40 border border-zinc-800/60 rounded flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${severityStyles}`}>
                          {inc.severity}
                        </span>
                        <strong className="text-xs text-zinc-300">{zoneObj?.name || inc.zoneId}</strong>
                        <span className="text-[10px] text-zinc-500 font-mono">{inc.reportedAt}</span>
                      </div>
                      <p className="text-sm text-zinc-200">{inc.description}</p>
                    </div>

                    <button
                      onClick={() => handleUpdate({ type: "RESOLVE_INCIDENT", payload: { id: inc.id } })}
                      className="text-xs font-semibold px-2.5 py-1 text-zinc-400 hover:text-emerald-400 bg-zinc-900 border border-zinc-800 hover:border-emerald-950 rounded transition-all cursor-pointer"
                    >
                      Resolve
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Visual Debugger (Data Inspector) */}
        <section className="lg:col-span-12">
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-5 mt-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3.5 mb-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-indigo-500 rounded-full animate-pulse" />
                <h2 className="text-sm font-bold text-zinc-300 tracking-wide uppercase">Real-Time Data Inspector</h2>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">Live JSON.stringify(zones)</span>
            </div>
            
            {/* The Data Inspector requirement */}
            <pre className="p-4 bg-black/60 border border-zinc-900 text-emerald-400 text-xs font-mono rounded overflow-auto max-h-72 leading-relaxed">
              {JSON.stringify(zones, null, 2)}
            </pre>
          </div>
        </section>

      </main>
    </div>
  );
}
