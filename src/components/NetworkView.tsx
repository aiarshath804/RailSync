import React, { useState, useEffect, useMemo } from "react";
import { 
  Train, 
  Wifi, 
  ShieldCheck, 
  Plus, 
  Minus, 
  Crosshair, 
  AlertTriangle, 
  RotateCw, 
  Radio, 
  MapPin, 
  CheckCircle2, 
  Activity,
  Layers,
  Wrench,
  Gauge
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { Language, translations } from "../lib/translations";
import { CorridorLiveState, CorridorBlockState, LiveTrain, CorridorStation } from "../types";
import { normalizeCorridorLiveState } from "../utils/normalizer";
import { useLiveData } from "../contexts/LiveDataContext";
import { LiveDataError } from "./LiveDataError";

interface NetworkViewProps {
  lang?: Language;
  onOpenEmergencyModal?: () => void;
  onOpenAdvisoryModal?: () => void;
}

export const NetworkView: React.FC<NetworkViewProps> = ({ 
  lang = "EN",
  onOpenEmergencyModal,
  onOpenAdvisoryModal
}) => {
  const t = translations[lang] || translations.EN;
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [corridorData, setCorridorData] = useState<CorridorLiveState>(() => normalizeCorridorLiveState({}));
  const [loading, setLoading] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [selectedTrain, setSelectedTrain] = useState<LiveTrain | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<CorridorBlockState | null>(null);
  const [activeStationCode, setActiveStationCode] = useState<string | null>(null);
  const [stationBoard, setStationBoard] = useState<any | null>(null);
  const [stationLoading, setStationLoading] = useState<boolean>(false);
  const [togglingSimulation, setTogglingSimulation] = useState<boolean>(false);

  // Shared Live Context
  const { corridorData: rawCorridorData, toggleSimulationMode, refreshNow, error } = useLiveData();

  useEffect(() => {
    if (rawCorridorData) {
      const data: CorridorLiveState = normalizeCorridorLiveState(rawCorridorData);
      setCorridorData(data);
      setLastRefreshed(new Date());
      setLoading(false);

      if (selectedTrain) {
        const updated = (data.active_trains || []).find(tr => tr.train_number === selectedTrain.train_number);
        if (updated) setSelectedTrain(updated);
      }
      if (selectedBlock) {
        const updatedB = (data.blocks || []).find(b => b.block_id === selectedBlock.block_id);
        if (updatedB) setSelectedBlock(updatedB);
      }
    }
  }, [rawCorridorData]);

  // Toggle Simulation Mode
  const handleToggleSimulation = async () => {
    setTogglingSimulation(true);
    try {
      await toggleSimulationMode();
    } catch (err) {
      console.error("Simulation toggle failed:", err);
    } finally {
      setTogglingSimulation(false);
    }
  };

  // Fetch Station Board when a station is clicked
  const handleSelectStation = async (code: string) => {
    setActiveStationCode(code);
    setStationLoading(true);
    try {
      const res = await fetch(`/api/v1/stations/${encodeURIComponent(code)}/live?hours=4`);
      if (res.ok) {
        const data = await res.json();
        setStationBoard(data);
      } else {
        setStationBoard(null);
      }
    } catch (err) {
      console.error("Failed to fetch station board:", err);
      setStationBoard(null);
    } finally {
      setStationLoading(false);
    }
  };

  const blocks = useMemo(() => corridorData?.blocks || [], [corridorData]);
  const activeTrains = useMemo(() => corridorData?.active_trains || [], [corridorData]);
  const stations: CorridorStation[] = useMemo(() => corridorData?.stations || [], [corridorData]);
  const totalTrains = corridorData?.total_active_trains || activeTrains.length;
  const isSimulation = corridorData?.mode === "SIMULATION";
  const activeEmergencyCount = corridorData?.active_emergency_count || 0;

  // Dynamically compute station positions along the schematic track (from 5% to 95%)
  const stationPositionMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!stations || stations.length === 0) return map;

    const kms = stations.map(s => Number(s.km ?? 0)).filter(k => !isNaN(k));
    const minKm = Math.min(...kms, 0);
    const maxKm = Math.max(...kms, 0);
    const hasValidKmSpread = maxKm > minKm;

    stations.forEach((stn, idx) => {
      let pos = 50;
      if (hasValidKmSpread && stn.km !== undefined) {
        pos = 5 + ((stn.km - minKm) / (maxKm - minKm)) * 90;
      } else if (stations.length > 1) {
        pos = 5 + (idx / (stations.length - 1)) * 90;
      }
      const clamped = Math.max(4, Math.min(96, pos));
      if (stn.id) map.set(stn.id.toUpperCase(), clamped);
      if (stn.code) map.set(stn.code.toUpperCase(), clamped);
    });

    return map;
  }, [stations]);

  // Dynamically compute block track spans between stations
  const blockSpans = useMemo(() => {
    const map = new Map<string, { left: number; width: number; startPos: number; endPos: number }>();
    if (!blocks || blocks.length === 0) return map;

    const fallbackWidth = 90 / Math.max(1, blocks.length);

    blocks.forEach((block, idx) => {
      const fromKey = String(block.startStationId || block.from_station || block.from_code || "").toUpperCase();
      const toKey = String(block.endStationId || block.to_station || block.to_code || "").toUpperCase();

      let startPos = stationPositionMap.get(fromKey);
      let endPos = stationPositionMap.get(toKey);

      if (startPos === undefined || endPos === undefined) {
        startPos = 5 + idx * fallbackWidth;
        endPos = startPos + fallbackWidth;
      }

      const left = Math.min(startPos, endPos);
      const right = Math.max(startPos, endPos);
      const width = Math.max(2, right - left);

      const spanInfo = { left, width, startPos, endPos };
      if (block.block_id) map.set(block.block_id.toUpperCase(), spanInfo);
      if (block.id) map.set(block.id.toUpperCase(), spanInfo);
    });

    return map;
  }, [blocks, stationPositionMap]);

  // Dynamically calculate position of a train based on real API progress and block geometry
  const calculateTrainPosition = (train: LiveTrain): number | null => {
    const blockKey = String(
      train.currentBlockId || 
      train.assigned_block_id || 
      train.current_block || 
      train.assigned_block || 
      ""
    ).toUpperCase();

    const span = blockSpans.get(blockKey);
    if (!span) {
      return null;
    }

    const rawProg = train.progress ?? train.relative_progress ?? train.segment_progress;
    if (rawProg === undefined || isNaN(rawProg)) {
      return null;
    }

    const clampedProgress = Math.max(0.04, Math.min(0.96, rawProg));
    const pos = span.startPos + (span.endPos - span.startPos) * clampedProgress;
    return Math.max(3, Math.min(97, pos));
  };

  // Helper for signal aspect styling
  const getAspectColor = (aspect: string) => {
    switch (aspect) {
      case "GREEN":
        return "bg-emerald-500 text-white border-emerald-600";
      case "YELLOW":
        return "bg-amber-400 text-slate-900 border-amber-500";
      case "RED":
        return "bg-rose-600 text-white border-rose-700 animate-pulse";
      default:
        return "bg-slate-400 text-white";
    }
  };

  // Calculate track health index based on operational blocks
  const normalBlocksCount = blocks.filter(b => b.operational_status === "NORMAL").length;
  const healthPercent = blocks.length > 0 ? ((normalBlocksCount / blocks.length) * 100).toFixed(1) : "100.0";

  // Separate trains with resolved track coordinates vs unassigned/unresolved coordinates
  const { positionedTrains, unresolvedTrains } = useMemo(() => {
    const positioned: { train: LiveTrain; pos: number }[] = [];
    const unresolved: LiveTrain[] = [];

    activeTrains.forEach(tr => {
      const pos = calculateTrainPosition(tr);
      if (pos !== null) {
        positioned.push({ train: tr, pos });
      } else {
        unresolved.push(tr);
      }
    });

    return { positionedTrains: positioned, unresolvedTrains: unresolved };
  }, [activeTrains, blockSpans]);

  if (error) {
    return <LiveDataError message="Error occurred while loading live data." onRetry={refreshNow} />;
  }

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto max-w-full bg-slate-100 font-sans">
      
      {/* 1. Official Demonstration Header Ribbon & Disclaimer */}
      <div className="bg-slate-900 border-l-4 border-l-amber-500 border border-slate-800 rounded-xl p-4 mb-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 text-white">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-mono text-amber-400 font-bold uppercase tracking-widest">
            <span>SOUTHERN RAILWAY</span>
            <span>•</span>
            <span>CHENNAI DIVISION CTC</span>
            <span>•</span>
            <span className="text-slate-400 font-normal">CORRIDOR MONITORING</span>
          </div>
          
          <h1 className="text-lg sm:text-2xl font-black text-white font-serif tracking-tight uppercase mt-0.5">
            {corridorData.corridor_title || "Railway Operations – Live Corridor Monitoring"}
          </h1>
          
          <p className="text-xs text-amber-300 font-medium font-sans mt-1 bg-slate-950/80 px-2.5 py-1 rounded inline-block border border-amber-500/30">
            ⚠️ <strong>OPERATIONAL NOTICE:</strong> {corridorData.prototype_disclaimer || "Prototype operational segments generated from live backend telemetry."}
          </p>
        </div>

        {/* Live Mode Controls */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {/* Simulation / Live API Toggle */}
          <button
            onClick={handleToggleSimulation}
            disabled={togglingSimulation}
            className={`px-3 py-1.5 rounded-lg font-bold border transition flex items-center space-x-2 ${
              isSimulation
                ? "bg-amber-500 text-slate-950 border-amber-400 hover:bg-amber-400"
                : "bg-blue-600 text-white border-blue-500 hover:bg-blue-500"
            }`}
            title="Toggle between Live Telemetry Query and Realistic Simulation"
          >
            <Radio className={`w-3.5 h-3.5 ${isSimulation ? "" : "animate-pulse"}`} />
            <span>{isSimulation ? "MODE: SIMULATION" : "MODE: LIVE API"}</span>
          </button>

          {/* Refresh button */}
          <button
            onClick={refreshNow}
            disabled={loading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            title="Refresh Live Corridor State"
          >
            <RotateCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          {/* Telemetry Status Box */}
          <div className="bg-slate-950 px-3 py-1.5 rounded border border-slate-800 text-[10px]">
            <div className="text-slate-400 uppercase font-bold">TELEMETRY</div>
            <div className="text-emerald-400 font-bold flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>LIVE SYNC</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        
        {/* Card 1: Active Trains on Corridor */}
        <div className="bg-white rounded-xl p-5 flex flex-col justify-between border border-slate-300 border-t-4 border-t-blue-950 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-700">
            <span>ACTIVE TRAINS ON CORRIDOR</span>
            <Train className="w-4 h-4 text-blue-950" />
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-black text-slate-900 font-mono">{totalTrains}</span>
            <span className="text-xs font-bold text-blue-900 bg-blue-100 px-2.5 py-0.5 rounded border border-blue-300 font-mono">
              {isSimulation ? "SYNTHETIC RUNNERS" : "LIVE MAPPED"}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            {blocks.length} Monitored Blocks • {corridorData.section || "Active Track Line"}
          </div>
        </div>

        {/* Card 2: Operational Data Provider */}
        <div className="bg-white rounded-xl p-5 flex flex-col justify-between border border-slate-300 border-t-4 border-t-amber-500 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-700">
            <span>LIVE DATA PROVIDER</span>
            <Wifi className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-xl font-black text-slate-900 font-mono truncate">
              {isSimulation ? "SIMULATION ENGINE" : "RAILRADAR API"}
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded border font-mono ${
              isSimulation 
                ? "text-amber-900 bg-amber-100 border-amber-300" 
                : "text-emerald-900 bg-emerald-100 border-emerald-300"
            }`}>
              {isSimulation ? "STANDALONE" : "ONLINE"}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1 truncate">
            {corridorData?.data_source || "Live Train Radar Proxy"}
          </div>
        </div>

        {/* Card 3: Track Health Index */}
        <div className="bg-white rounded-xl p-5 flex flex-col justify-between border border-slate-300 border-t-4 border-t-emerald-700 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-700">
            <span>CORRIDOR TRACK HEALTH</span>
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-black text-slate-900 font-mono">{healthPercent}%</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded border font-mono ${
              activeEmergencyCount > 0 
                ? "text-rose-900 bg-rose-100 border-rose-300 animate-pulse" 
                : "text-emerald-900 bg-emerald-100 border-emerald-300"
            }`}>
              {activeEmergencyCount > 0 ? `${activeEmergencyCount} EMERGENCY` : "NOMINAL"}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            {blocks.length} Railway Blocks Monitored
          </div>
        </div>
      </div>

      {/* 3. Main Schematic Railway Map for Dynamic Corridor */}
      <div className="bg-white rounded-2xl p-6 flex-1 min-h-[440px] relative flex flex-col justify-center items-center overflow-hidden mb-6 border border-slate-300 shadow-sm">
        
        {/* Top Info Bar on the Map */}
        <div className="absolute top-4 left-6 right-6 flex flex-wrap items-center justify-between z-20 gap-2 pointer-events-none">
          <div className="flex items-center space-x-3 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-xs pointer-events-auto">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-xs font-mono font-bold text-slate-900 uppercase">
              {corridorData.section || "MAIN CORRIDOR SCHEMATIC TRACK"}
            </span>
          </div>

          <div className="flex items-center space-x-2 pointer-events-auto">
            <span className="text-[10px] text-slate-500 font-mono font-bold bg-white/90 px-2 py-1 rounded border border-slate-200">
              CLICK ANY STATION OR TRAIN FOR TELEMETRY
            </span>
            {activeEmergencyCount > 0 && (
              <span className="bg-rose-600 text-white font-mono font-black text-[10px] px-2.5 py-1 rounded-lg animate-pulse">
                RED ASPECT HALT ACTIVE
              </span>
            )}
          </div>
        </div>

        {/* Subtle Map Background Texture */}
        <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:28px_28px] opacity-20 pointer-events-none"></div>

        {/* Schematic Track Container with Zoom Control */}
        <div 
          className="relative w-full max-w-5xl h-36 flex items-center justify-center transition-transform duration-300 px-8"
          style={{ transform: `scale(${zoomLevel / 100})` }}
        >
          {/* Base Track Rail */}
          <div className="relative w-full h-3.5 bg-slate-200 rounded-full shadow-inner flex items-center">
            
            {/* Dynamic Block Segments Overlay */}
            {blocks.map((block) => {
              const span = blockSpans.get(String(block.block_id || block.id).toUpperCase()) || { left: 0, width: 20 };
              const isEmergency = block.operational_status === "EMERGENCY_CLOSED" || block.is_emergency_closed;
              const isCaution = block.operational_status === "CAUTION_SPEED_RESTRICTION";

              return (
                <div
                  key={block.block_id || block.id}
                  onClick={() => setSelectedBlock(block)}
                  className={`absolute h-full rounded-full cursor-pointer transition-all duration-300 group ${
                    isEmergency 
                      ? "bg-rose-600 shadow-[0_0_12px_rgba(225,29,72,0.8)] animate-pulse" 
                      : isCaution 
                      ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" 
                      : "bg-gradient-to-r from-blue-700 via-sky-600 to-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]"
                  }`}
                  style={{ left: `${span.left}%`, width: `${span.width}%` }}
                  title={`Block ${block.block_id || block.name}: ${block.name}`}
                >
                  {/* Aspect Signal Bulb Indicator */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <span className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${
                      block.signal_aspect === "RED" ? "bg-rose-600 animate-ping" :
                      block.signal_aspect === "YELLOW" ? "bg-amber-400" : "bg-emerald-500"
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                    </span>
                    <span className="text-[9px] font-mono font-bold text-slate-700 mt-0.5 bg-white/90 px-1 rounded shadow-2xs border border-slate-200">
                      {block.block_id}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Dynamic Station Nodes from Backend API */}
            {stations.map((station) => {
              const pos = stationPositionMap.get(station.code?.toUpperCase() || station.id?.toUpperCase()) ?? 50;
              const isActive = activeStationCode === station.code;

              return (
                <motion.div
                  key={station.id || station.code}
                  whileHover={{ scale: 1.15 }}
                  onClick={() => handleSelectStation(station.code)}
                  className="absolute -translate-x-1/2 flex flex-col items-center cursor-pointer z-10"
                  style={{ left: `${pos}%` }}
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-md transition ${
                    isActive 
                      ? "bg-blue-600 border-amber-400 ring-2 ring-amber-400" 
                      : "bg-white border-blue-900 hover:border-amber-500"
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${isActive ? "bg-white" : "bg-blue-950"}`}></div>
                  </div>
                  
                  <div className="text-center mt-2">
                    <span className="text-[10px] text-slate-900 font-mono font-black bg-white px-2 py-0.5 rounded shadow-xs border border-slate-300 block">
                      {station.code}
                    </span>
                    <span className="text-[8px] text-slate-600 font-sans block mt-0.5 whitespace-nowrap">
                      {station.name}
                    </span>
                  </div>
                </motion.div>
              );
            })}

            {/* Dynamic Live Trains with CSS Position Interpolation */}
            {positionedTrains.map(({ train, pos }) => {
              const isSelected = selectedTrain?.train_number === train.train_number;
              const isHalted = train.speed_kmh === 0 || train.status === "HALTED_RED_ASPECT";

              return (
                <div
                  key={train.train_number}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTrain(train);
                  }}
                  className="absolute -translate-x-1/2 z-20 flex flex-col items-center cursor-pointer group transition-all duration-700 ease-out"
                  style={{ left: `${pos}%` }}
                >
                  {/* Tooltip Card on Hover or Selected */}
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`bg-white border rounded-xl p-2.5 text-[10px] text-slate-900 shadow-xl mb-2 min-w-[150px] transition ${
                      isSelected ? "border-amber-500 ring-2 ring-amber-400" : "border-slate-200"
                    }`}
                  >
                    <div className="font-mono font-black text-blue-900 flex items-center justify-between border-b border-slate-100 pb-1">
                      <span>{train.train_number}</span>
                      <span className={`text-[8px] px-1.5 py-0.2 rounded font-bold ${
                        isHalted ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {train.speed_kmh} km/h
                      </span>
                    </div>
                    
                    <div className="text-[9px] font-bold text-slate-800 mt-1 truncate">
                      {train.train_name}
                    </div>
                    
                    <div className="text-[8px] text-slate-500 font-mono mt-0.5 flex justify-between">
                      <span>Sector: <strong>{train.currentBlockId || train.assigned_block_id || "Track"}</strong></span>
                      <span className={train.delay_minutes > 0 ? "text-amber-700 font-bold" : "text-emerald-700"}>
                        {train.delay_minutes > 0 ? `+${train.delay_minutes}m` : "On Time"}
                      </span>
                    </div>
                  </motion.div>

                  {/* Train Icon Bubble */}
                  <motion.div
                    whileHover={{ scale: 1.25 }}
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-white shadow-lg transition ${
                      isHalted 
                        ? "bg-rose-600 border-white ring-2 ring-rose-400" 
                        : "bg-blue-900 border-amber-400"
                    }`}
                  >
                    <Train className="w-3.5 h-3.5 stroke-[2.5]" />
                  </motion.div>
                </div>
              );
            })}

          </div>
        </div>

        {/* Right Zoom Controls */}
        <div className="absolute right-4 bottom-4 flex flex-col space-y-1 bg-white border border-slate-200 rounded-xl p-1 z-20 shadow-sm">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setZoomLevel(prev => Math.min(prev + 10, 140))}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setZoomLevel(prev => Math.max(prev - 10, 70))}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setZoomLevel(100)}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition"
            title="Reset View (100%)"
          >
            <Crosshair className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Bottom Legend */}
        <div className="absolute left-6 bottom-4 flex flex-wrap items-center gap-4 text-[10px] font-mono text-slate-600 bg-white/90 p-2 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Green Aspect (Clear)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <span>Yellow Aspect (Caution)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
            <span>Red Aspect (Stop)</span>
          </div>
          <div className="flex items-center space-x-1.5 text-blue-900 font-bold">
            <Train className="w-3 h-3 text-blue-900" />
            <span>Live Train Marker</span>
          </div>
        </div>

      </div>

      {/* Unresolved Trains Warning if live GPS coordinates are pending */}
      {unresolvedTrains.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 mb-6 text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>{unresolvedTrains.length} Active Trains</strong> en route with pending block telemetry mapping:{" "}
              {unresolvedTrains.map(t => `${t.train_number} (${t.train_name})`).join(", ")}
            </span>
          </div>
          <span className="text-[10px] font-mono text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded">
            Live GPS Resolving
          </span>
        </div>
      )}

      {/* 4. Selected Inspector Drawer (Station Board or Train Detail) */}
      <AnimatePresence>
        {(activeStationCode || selectedTrain || selectedBlock) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-white rounded-xl p-5 mb-6 border border-slate-300 shadow-md relative"
          >
            <button
              onClick={() => {
                setActiveStationCode(null);
                setSelectedTrain(null);
                setSelectedBlock(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 text-xs font-bold px-2 py-1 bg-slate-100 rounded"
            >
              Close Inspector ✕
            </button>

            {/* Station Board View */}
            {activeStationCode && (
              <div>
                <div className="flex items-center space-x-2 text-blue-950 font-bold mb-2">
                  <MapPin className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base font-serif uppercase">
                    Live Station Board: {stations.find(s => s.code === activeStationCode)?.name || activeStationCode} ({activeStationCode})
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">
                    • 4-Hour Live Schedule Window
                  </span>
                </div>

                {stationLoading ? (
                  <div className="py-8 flex items-center justify-center space-x-2 text-xs font-mono text-slate-500">
                    <RotateCw className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Querying RailRadar Live Station Board API...</span>
                  </div>
                ) : stationBoard ? (
                  <div className="overflow-x-auto mt-3">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold">
                          <th className="pb-2">Train</th>
                          <th className="pb-2">Type</th>
                          <th className="pb-2">Route</th>
                          <th className="pb-2">Scheduled / Expected</th>
                          <th className="pb-2">Platform</th>
                          <th className="pb-2">Delay</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(stationBoard.trains || []).map((tr: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50 transition">
                            <td className="py-2.5 font-bold text-slate-900">
                              {tr.train_number} - {tr.train_name}
                            </td>
                            <td className="py-2.5 text-slate-600">{tr.train_type || "EXPRESS"}</td>
                            <td className="py-2.5 text-slate-600">{tr.source} → {tr.destination}</td>
                            <td className="py-2.5 text-slate-900 font-bold">
                              {tr.scheduled_arrival || tr.scheduled_departure || "LIVE"}
                            </td>
                            <td className="py-2.5 font-bold text-blue-900">{tr.platform || "PF 1"}</td>
                            <td className="py-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                tr.delay_minutes > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                              }`}>
                                {tr.delay_minutes > 0 ? `+${tr.delay_minutes} min` : "ON TIME"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 py-4 font-mono">No live train data retrieved for this station.</div>
                )}
              </div>
            )}

            {/* Train Detail View */}
            {selectedTrain && !activeStationCode && (
              <div>
                <div className="flex items-center space-x-2 text-blue-950 font-bold mb-2">
                  <Train className="w-5 h-5 text-blue-900" />
                  <h3 className="text-base font-serif uppercase">
                    Train Telemetry: #{selectedTrain.train_number} - {selectedTrain.train_name}
                  </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 text-[10px] block uppercase">Assigned Block</span>
                    <span className="font-black text-blue-900 text-sm">{selectedTrain.currentBlockId || selectedTrain.assigned_block_id || "Track"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block uppercase">Current Speed</span>
                    <span className="font-black text-slate-900 text-sm">{selectedTrain.speed_kmh} km/h</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block uppercase">Running Delay</span>
                    <span className={`font-black text-sm ${selectedTrain.delay_minutes > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                      {selectedTrain.delay_minutes > 0 ? `+${selectedTrain.delay_minutes} mins` : "On Time"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block uppercase">Next Scheduled Station</span>
                    <span className="font-black text-slate-900 text-sm">{selectedTrain.next_station || "En Route"}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Block Detail View */}
            {selectedBlock && !activeStationCode && !selectedTrain && (
              <div>
                <div className="flex items-center space-x-2 text-blue-950 font-bold mb-2">
                  <Activity className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-base font-serif uppercase">
                    Block {selectedBlock.block_id}: {selectedBlock.name}
                  </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 text-[10px] block uppercase">Operational Status</span>
                    <span className={`font-black text-xs px-2 py-0.5 rounded inline-block mt-0.5 ${
                      selectedBlock.operational_status === "EMERGENCY_CLOSED" ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                    }`}>
                      {selectedBlock.operational_status}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block uppercase">Signal Aspect</span>
                    <span className={`font-black text-xs px-2 py-0.5 rounded inline-block mt-0.5 ${getAspectColor(selectedBlock.signal_aspect)}`}>
                      {selectedBlock.signal_aspect}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block uppercase">Track Length & Speed</span>
                    <span className="font-black text-slate-900 text-sm">{selectedBlock.length_km} km • {selectedBlock.max_speed_kmh} km/h</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block uppercase">Line Infrastructure</span>
                    <span className="font-bold text-slate-800 text-xs">{selectedBlock.line_type}</span>
                  </div>
                </div>
              </div>
            )}

          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Bottom Split Panels: Prototype Blocks Telemetry vs Active Corridor Advisories */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Prototype Corridor Blocks Telemetry Table (Span 8) */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-5 border border-slate-300 shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
            <div>
              <h3 className="text-xs font-black text-slate-900 tracking-wide uppercase font-serif">
                Corridor Blocks Telemetry ({blocks.length} Monitored Segments)
              </h3>
              <p className="text-[10px] text-slate-500 font-mono">{corridorData.section || "Railway Operational Line"}</p>
            </div>
            <span className="text-[10px] font-mono text-slate-500 font-bold">
              Updated: {lastRefreshed.toLocaleTimeString()}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase">
                  <th className="pb-3 pl-2">Block ID & Segment</th>
                  <th className="pb-3">Length / Type</th>
                  <th className="pb-3">Signal Aspect</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Active Train</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {blocks.map((b) => (
                  <tr 
                    key={b.block_id || b.id} 
                    onClick={() => setSelectedBlock(b)}
                    className="hover:bg-slate-50 transition cursor-pointer"
                  >
                    <td className="py-3 pl-2 font-bold text-slate-900">
                      <div className="flex items-center space-x-2">
                        <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-950 font-black text-[10px]">
                          {b.block_id}
                        </span>
                        <span className="text-xs">
                          {b.from_code || b.from_station || "MAS"} → {b.to_code || b.to_station || "TRL"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-slate-600 text-[11px]">
                      {b.length_km} km • {(b.line_type || "Track").split(" ")[0]}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${getAspectColor(b.signal_aspect || "GREEN")}`}>
                        {b.signal_aspect || "GREEN"}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        b.operational_status === "EMERGENCY_CLOSED" 
                          ? "bg-rose-100 text-rose-800 border border-rose-300"
                          : b.operational_status === "CAUTION_SPEED_RESTRICTION"
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      }`}>
                        {b.operational_status || b.status || "NORMAL"}
                      </span>
                    </td>
                    <td className="py-3 text-slate-800 font-bold text-[11px]">
                      {(b.active_trains || b.trains) && (b.active_trains || b.trains)!.length > 0 ? (
                        <span className="text-blue-900">
                          {(b.active_trains || b.trains)![0].train_number} ({((b.active_trains || b.trains)![0].train_name || "Train").slice(0, 14)}...)
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">Block Clear</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Corridor Operations & Advisory Column (Span 4) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-300 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
              <h3 className="text-xs font-black text-slate-900 tracking-wide uppercase font-serif">
                Dispatch Advisories
              </h3>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                activeEmergencyCount > 0 
                  ? "bg-rose-50 text-rose-700 border-rose-200" 
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}>
                {activeEmergencyCount > 0 ? `${activeEmergencyCount} Critical` : "All Clear"}
              </span>
            </div>

            <div className="space-y-3">
              {/* Emergency Alert if active */}
              {activeEmergencyCount > 0 ? (
                <div className="bg-rose-50 border border-rose-300 rounded-xl p-3.5 text-xs text-rose-900">
                  <div className="flex items-center space-x-2 font-bold mb-1">
                    <AlertTriangle className="w-4 h-4 text-rose-600 animate-bounce" />
                    <span>Active Emergency Stop Broadcasted</span>
                  </div>
                  <p className="text-[11px] text-rose-800 leading-relaxed">
                    Block locked out. Red aspect signal transmitted. Re-planning engine rerouting upcoming trains to loop lines.
                  </p>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-[11px]">Normal Operations Active</div>
                    <p className="text-[10px] text-emerald-700 mt-0.5">
                      Automatic block signalling active across all blocks with standard headway buffers.
                    </p>
                  </div>
                </div>
              )}

              {/* Dynamic Advisory: Blocks with conflicts or maintenance */}
              {blocks.filter(b => b.is_emergency_closed || b.conflict_detected || b.active_maintenance).map((b) => (
                <div key={b.block_id} className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs">
                  <div className="font-bold text-amber-900 text-[11px] flex items-center justify-between">
                    <span>Block {b.block_id} ({b.name})</span>
                    <span className="text-[9px] text-amber-800 font-mono font-bold uppercase">{b.operational_status}</span>
                  </div>
                  <p className="text-[10px] text-amber-800 mt-1 font-mono">
                    {b.emergency_details?.description || b.conflict_details?.description || `Caution speed restriction: max ${b.max_speed_kmh || 80} km/h.`}
                  </p>
                </div>
              ))}

              {/* Dynamic Overview of Endpoints */}
              {blocks.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
                  <div className="font-bold text-slate-900 text-[11px] flex items-center justify-between">
                    <span>{blocks[0]?.name || "Origin Terminal"}</span>
                    <span className="text-[9px] text-blue-800 font-mono font-bold">ROUTE CLEAR</span>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-1 font-mono">
                    {blocks[0]?.line_type || "Quadruple Line"} operating at standard headway capacity.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 space-y-2">
            {onOpenAdvisoryModal && (
              <button
                onClick={onOpenAdvisoryModal}
                className="w-full bg-amber-500 hover:bg-amber-400 text-blue-950 font-black text-xs py-2.5 rounded-xl transition flex items-center justify-center space-x-2 tracking-wider uppercase font-sans border border-amber-300 shadow-xs cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4 fill-blue-950 stroke-amber-500" />
                <span>+ DISPATCH ADVISORY CONSOLE</span>
              </button>
            )}
            {onOpenEmergencyModal && (
              <button
                onClick={onOpenEmergencyModal}
                className="w-full bg-rose-700 hover:bg-rose-600 text-white font-black text-xs py-2.5 rounded-xl transition flex items-center justify-center space-x-2 tracking-wider uppercase font-sans cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4 text-amber-300" />
                <span>EMERGENCY HALT CONSOLE</span>
              </button>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
