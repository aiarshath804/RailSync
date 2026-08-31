import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  Filter, 
  Plus, 
  Wrench, 
  AlertTriangle, 
  Clock, 
  ChevronRight,
  Sparkles,
  Sliders,
  CheckCircle2,
  XCircle,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Radio,
  Check,
  X,
  Layers,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { Language, translations } from "../lib/translations";

interface CorridorsViewProps {
  workOrders?: any[];
  trains?: any[];
  onNewPath?: () => void;
  lang?: Language;
  onSelectBlock?: (block: any) => void;
  onOpenDefectModal?: () => void;
  onOpenCadMap?: (assetId?: string) => void;
  onOpenWorkOrder?: (assetId?: string) => void;
}

export const CorridorsView: React.FC<CorridorsViewProps> = ({
  workOrders = [],
  trains = [],
  onNewPath,
  lang = "EN",
  onSelectBlock,
  onOpenDefectModal,
  onOpenCadMap,
  onOpenWorkOrder
}) => {
  const t = translations[lang] || translations.EN;
  const [activeModalBlock, setActiveModalBlock] = useState<any | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [playheadPos, setPlayheadPos] = useState<number>(22); // percent across timeline
  const [hoveredTrain, setHoveredTrain] = useState<string | null>(null);

  // Optimized Blocks & State management
  const [optimizedBlocks, setOptimizedBlocks] = useState<any[]>([]);
  const [savedHoursTotal, setSavedHoursTotal] = useState<number>(0);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);

  // Today Date filter state
  const [selectedDate, setSelectedDate] = useState<string>("2026-08-31");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState<boolean>(false);

  // Filter modal state
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [deptFilter, setDeptFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const hours = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00"];

  // Fetch initial corridor state from backend
  const fetchCorridorState = async () => {
    try {
      const res = await fetch("/api/v1/dashboard/corridor-state");
      if (res.ok) {
        const data = await res.json();
        if (data.optimized_blocks) {
          setOptimizedBlocks(data.optimized_blocks);
          const totalSaved = data.optimized_blocks.reduce((acc: number, b: any) => acc + (b.saved_block_hours || 0), 0);
          setSavedHoursTotal(parseFloat(totalSaved.toFixed(2)));
        }
      }
    } catch (err) {
      console.error("Failed to fetch corridor state:", err);
    }
  };

  useEffect(() => {
    fetchCorridorState();
  }, []);

  // Trigger Solver Re-Optimization API
  const handleGeneratePlan = async () => {
    setIsOptimizing(true);
    try {
      const res = await fetch("/api/v1/optimize/generate-plan", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setOptimizedBlocks(data.optimized_blocks || []);
        setSavedHoursTotal(data.saved_block_hours || 0);
      }
    } catch (err) {
      console.error("Failed to generate optimization plan:", err);
    } finally {
      setIsOptimizing(false);
    }
  };

  // Controller Approve or Reject block API call
  const handleApproveReject = async (blockId: number, approve: boolean) => {
    try {
      const res = await fetch("/api/v1/optimize/approve-block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ block_id: blockId, approve })
      });
      if (res.ok) {
        setOptimizedBlocks(prev => prev.map(b => b.id === blockId ? { ...b, controller_approval_status: approve ? "APPROVED" : "REJECTED" } : b));
      }
    } catch (err) {
      console.error("Failed to approve/reject block:", err);
    }
  };

  // Real-time animation simulation loop for the timetable playhead
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setPlayheadPos((prev) => (prev >= 98 ? 4 : prev + 0.15 * simSpeed));
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying, simSpeed]);

  // Filtered blocks helper
  const filteredBlocks = optimizedBlocks.filter(b => {
    if (deptFilter !== "ALL" && !b.bundled_departments.includes(deptFilter)) return false;
    if (statusFilter !== "ALL" && b.controller_approval_status !== statusFilter) return false;
    return true;
  });

  const activeFilterCount = (deptFilter !== "ALL" ? 1 : 0) + (statusFilter !== "ALL" ? 1 : 0);

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto max-w-full bg-slate-100 relative font-sans">
      
      {/* Official Government Ministry Header Ribbon */}
      <div className="bg-slate-900 border-l-4 border-l-amber-500 border border-slate-800 rounded-lg p-3 sm:p-4 mb-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-white">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-mono text-amber-400 font-bold uppercase tracking-widest font-serif">
            <span>{t.govtTitle}</span>
            <span>•</span>
            <span className="text-slate-300">DCMS</span>
          </div>
          <h1 className="text-lg sm:text-2xl font-black text-white font-serif tracking-tight uppercase mt-0.5">
            {t.corridorTitle}
          </h1>
          <p className="text-xs text-slate-300 font-sans mt-0.5">
            {t.corridorSubtitle}
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-slate-950 p-2.5 rounded border border-slate-800 font-mono text-xs">
          <div>
            <div className="text-[9px] text-slate-400 uppercase font-bold">DIVISION STATUS</div>
            <div className="text-emerald-400 font-bold flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>100% NOMINAL</span>
            </div>
          </div>
          <span className="text-slate-700">|</span>
          <div>
            <div className="text-[9px] text-slate-400 uppercase font-bold">{t.activePaths}</div>
            <div className="text-amber-400 font-bold">42 TRAINS</div>
          </div>
        </div>
      </div>

      {/* Top Header Bar with Corridor info & Action buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white border border-slate-300 rounded-lg shadow-xs mb-6 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-base font-black tracking-tight text-slate-900 flex items-center space-x-2 font-serif uppercase">
              <span>{t.telemetrySummary}</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-bold tracking-wider uppercase font-mono">
              {t.officialRecord}
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-600 tracking-wider uppercase mt-1 flex flex-wrap items-center gap-2">
            <span>{t.latency}: <strong className="text-slate-900 font-bold">12ms</strong></span>
            <span>•</span>
            <span>{t.activePaths}: <strong className="text-blue-900 font-bold">42</strong></span>
            <span>•</span>
            <span>{t.blocks}: <strong className="text-amber-800 font-bold">{optimizedBlocks.length}</strong></span>
            <span>•</span>
            <span>{t.savedHours}: <strong className="text-emerald-700 font-bold">{savedHoursTotal}h</strong></span>
          </div>
        </div>

        {/* Action Buttons with Motion */}
        <div className="flex items-center space-x-2.5 relative">
          {/* Simulation Playback Controller */}
          <div className="flex items-center space-x-1 bg-slate-100 border border-slate-300 rounded-md p-1 shadow-xs">
            <motion.button 
              onClick={() => setIsPlaying(!isPlaying)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-1.5 rounded text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
                isPlaying ? "bg-blue-950 text-amber-400" : "bg-slate-200 text-slate-800"
              }`}
              title={isPlaying ? "Pause Timeline" : "Resume Timeline"}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            </motion.button>

            <button 
              onClick={() => setSimSpeed((prev) => (prev === 1 ? 2 : prev === 2 ? 5 : 1))}
              className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-amber-100 text-amber-900 border border-amber-300 cursor-pointer"
            >
              {simSpeed}x SPEED
            </button>

            <motion.button 
              onClick={() => setPlayheadPos(4)}
              whileHover={{ rotate: -90 }}
              whileTap={{ scale: 0.9 }}
              className="p-1.5 rounded text-slate-600 hover:text-slate-900 transition cursor-pointer"
              title="Reset Timeline"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </motion.button>
          </div>

          {/* Today Button & Selector */}
          <div className="relative">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
              className={`text-xs font-semibold px-3.5 py-2 rounded-xl border flex items-center space-x-1.5 transition shadow-xs ${
                selectedDate === "2026-08-31" 
                  ? "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                  : "bg-blue-50 border-blue-300 text-blue-800"
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>{selectedDate === "2026-08-31" ? "Today (Aug 31)" : selectedDate === "2026-09-01" ? "Tomorrow (Sep 1)" : "Sep 2, 2026"}</span>
            </motion.button>

            {/* Today Date Dropdown Popover */}
            <AnimatePresence>
              {isDatePickerOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDatePickerOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50"
                  >
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 py-1.5 border-b border-slate-100 mb-1">
                      <span>Select Dispatch Window</span>
                      <button 
                        onClick={() => setIsDatePickerOpen(false)}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    {[
                      { label: "Today (Aug 31, 2026)", val: "2026-08-31" },
                      { label: "Tomorrow (Sep 01, 2026)", val: "2026-09-01" },
                      { label: "Sep 02, 2026", val: "2026-09-02" }
                    ].map((d) => (
                      <button
                        key={d.val}
                        onClick={() => {
                          setSelectedDate(d.val);
                          setIsDatePickerOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl flex items-center justify-between transition ${
                          selectedDate === d.val ? "bg-blue-50 text-blue-700 font-black" : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span>{d.label}</span>
                        {selectedDate === d.val && <Check className="w-3.5 h-3.5 text-blue-600" />}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          
          {/* Filter Button */}
          <div className="relative">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`text-xs font-semibold px-3.5 py-2 rounded-xl border flex items-center space-x-1.5 transition shadow-xs ${
                activeFilterCount > 0 
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              <Filter className={`w-3.5 h-3.5 ${activeFilterCount > 0 ? "text-white" : "text-blue-600"}`} />
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-white text-blue-700 text-[9px] font-black flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </motion.button>

            {/* Filter Drawer Popover */}
            <AnimatePresence>
              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-50 space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-black text-slate-900 flex items-center space-x-1.5">
                        <Sliders className="w-3.5 h-3.5 text-blue-600" />
                        <span>Corridor View Filters</span>
                      </span>
                      <div className="flex items-center space-x-2">
                        {(deptFilter !== "ALL" || statusFilter !== "ALL") && (
                          <button 
                            onClick={() => { setDeptFilter("ALL"); setStatusFilter("ALL"); }}
                            className="text-[10px] font-bold text-blue-600 hover:underline"
                          >
                            Reset All
                          </button>
                        )}
                        <button
                          onClick={() => setIsFilterOpen(false)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                          title="Close Filter"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                  {/* Department Filter */}
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">
                      Department Code
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {["ALL", "TMS", "SMMS", "TDMS"].map((code) => (
                        <button
                          key={code}
                          onClick={() => setDeptFilter(code)}
                          className={`px-2.5 py-1.5 text-xs font-bold rounded-xl border text-center transition ${
                            deptFilter === code 
                              ? "bg-blue-50 border-blue-300 text-blue-700"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {code}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">
                      Approval Status
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {["ALL", "PENDING", "APPROVED", "REJECTED"].map((st) => (
                        <button
                          key={st}
                          onClick={() => setStatusFilter(st)}
                          className={`px-2 py-1.5 text-[11px] font-bold rounded-xl border text-center transition ${
                            statusFilter === st 
                              ? "bg-blue-50 border-blue-300 text-blue-700"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setIsFilterOpen(false)}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition"
                  >
                    Apply Filter View
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Main Content: Left Column (Metrics + Consists) & Right Column (Gantt Grid) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        
        {/* Left Column (Span 3) */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Card 1: Network Load */}
          <motion.div 
            whileHover={{ y: -2 }}
            className="glass-panel rounded-2xl p-4 relative overflow-hidden"
          >
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              <span>Network Load</span>
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></span>
            </div>
            
            <div className="relative z-10">
              <div className="text-4xl font-black text-slate-900 tracking-tight flex items-baseline space-x-2">
                <span>78%</span>
                <span className="text-xs text-blue-600 font-mono font-bold">NOMINAL</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden border border-slate-200">
                <motion.div 
                  className="bg-gradient-to-r from-blue-500 to-sky-500 h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: "78%" }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
              </div>
            </div>

            <div className="absolute right-3 top-3 opacity-10 pointer-events-none grid grid-cols-6 gap-1">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="w-1 h-1 bg-blue-600 rounded-full"></div>
              ))}
            </div>
          </motion.div>

          {/* Card 2: Maintenance Active */}
          <motion.div 
            whileHover={{ y: -2 }}
            className="glass-panel rounded-2xl p-4"
          >
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              <span>Maintenance (Active)</span>
              <Wrench className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-3xl font-black text-slate-900">{optimizedBlocks.length} Blocks</div>
            <div className="text-[10px] font-mono font-semibold text-slate-500 tracking-wider uppercase mt-2 flex items-center justify-between">
              <span>Saved Block-Hours:</span>
              <span className="text-emerald-600 font-bold">{savedHoursTotal} hrs</span>
            </div>
          </motion.div>

          {/* Card 3: Critical Alerts */}
          <motion.div 
            whileHover={{ y: -2 }}
            className="glass-panel-alert rounded-2xl p-4 cursor-pointer"
            onClick={onOpenDefectModal}
          >
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-rose-600 mb-2">
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                <span>Critical Alerts</span>
              </div>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <div className="text-3xl font-black text-slate-900">1 Incident</div>
            <div className="text-[10px] font-bold text-rose-700 tracking-wider uppercase mt-2 flex items-center justify-between">
              <span>TRK-9 Signal Failure</span>
              <span className="underline text-rose-900 font-mono">INSPECT →</span>
            </div>
          </motion.div>

          {/* Card 4: Active Consists */}
          <div className="glass-panel rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black text-slate-900 tracking-wide uppercase">Active Consists</h3>
              <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
            </div>
            <div className="space-y-2.5">
              
              {/* Consist 1 */}
              <motion.div 
                whileHover={{ scale: 1.02, x: 2 }}
                onClick={() => setActiveModalBlock({ title: "EXP-402 (BOS-NYP)", type: "HIGH-SPEED PASSENGER", status: "ON TIME", duration: "90 min", speed: "160 km/h", pax: "420" })}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3 hover:border-blue-300 hover:bg-blue-50/40 transition cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-slate-900 block">EXP-402</span>
                    <span className="text-[10px] text-slate-500 font-mono">BOS → NYP • 160km/h</span>
                  </div>
                  <span className="text-[9px] font-black bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200">
                    ON TIME
                  </span>
                </div>
              </motion.div>

              {/* Consist 2 */}
              <motion.div 
                whileHover={{ scale: 1.02, x: 2 }}
                onClick={() => setActiveModalBlock({ title: "FRT-991", type: "CONTAINER FREIGHT", status: "DELAY +5M", duration: "75 min", speed: "75 km/h", tonnage: "3,200T" })}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3 hover:border-amber-300 hover:bg-amber-50/40 transition cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-slate-900 block">FRT-991</span>
                    <span className="text-[10px] text-slate-500 font-mono">PHL → BAL • 3,200T</span>
                  </div>
                  <span className="text-[9px] font-black bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md border border-amber-200">
                    DELAY +5M
                  </span>
                </div>
              </motion.div>

              {/* Consist 3 */}
              <motion.div 
                whileHover={{ scale: 1.02, x: 2 }}
                onClick={() => setActiveModalBlock({ title: "LCL-112", type: "COMMUTER REGIONAL", status: "ON TIME", duration: "60 min", speed: "110 km/h", pax: "310" })}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3 hover:border-blue-300 hover:bg-blue-50/40 transition cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-slate-900 block">LCL-112</span>
                    <span className="text-[10px] text-slate-500 font-mono">WAS → PHL • 110km/h</span>
                  </div>
                  <span className="text-[9px] font-black bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200">
                    ON TIME
                  </span>
                </div>
              </motion.div>

            </div>
          </div>

        </div>

        {/* Right Column: Main Gantt Schedule Timetable (Span 9) */}
        <div className="lg:col-span-9 flex flex-col space-y-6">
          <div className="glass-panel rounded-2xl p-5 flex-1 flex flex-col relative overflow-hidden min-h-[480px]">
            
            {/* Gantt Header Columns */}
            <div className="grid grid-cols-[110px_repeat(6,1fr)] border-b border-slate-200 pb-3 text-center text-xs font-bold text-slate-500">
              <div className="text-left pl-2 uppercase tracking-wider text-[11px] text-slate-900">Track Lane</div>
              {hours.map((hour) => (
                <div key={hour} className="border-l border-slate-200 font-mono">{hour}</div>
              ))}
            </div>

            {/* Gantt Interactive Track Grid */}
            <div className="flex-1 relative flex flex-col justify-around py-3">
              
              {/* Animated Vertical Playhead */}
              <div 
                className="absolute top-0 bottom-0 w-[2px] bg-blue-600 z-30 pointer-events-none transition-all duration-100 ease-linear shadow-[0_0_8px_rgba(37,99,235,0.4)]"
                style={{ left: `calc(110px + ${playheadPos}%)` }}
              >
                <div className="absolute -top-1 -left-[5px] w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-blue-600"></div>
                <div className="absolute top-2 -left-8 bg-blue-600 border border-blue-500 text-[9px] font-mono font-bold text-white px-1.5 py-0.5 rounded shadow-sm">
                  NOW
                </div>
              </div>

              {/* Background grid lines for hours */}
              <div className="absolute inset-0 grid grid-cols-[110px_repeat(6,1fr)] pointer-events-none">
                <div></div>
                {hours.map((_, idx) => (
                  <div key={idx} className="border-l border-slate-100 h-full"></div>
                ))}
              </div>

              {/* TRACK ROW 1: TRK-1 (N) */}
              <div className="grid grid-cols-[110px_1fr] items-center min-h-[56px] relative z-10 group">
                <div className="text-xs font-black text-slate-800 pl-2 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span>TRK-1 (N)</span>
                </div>
                <div className="relative h-11 w-full">
                  {/* EXP-402 block */}
                  <motion.div 
                    whileHover={{ scale: 1.02, y: -2, boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)" }}
                    whileTap={{ scale: 0.98 }}
                    className="absolute top-1 bottom-1 bg-gradient-to-r from-blue-600 to-blue-500 border border-blue-400 rounded-xl px-3 flex items-center justify-between text-xs font-bold text-white shadow-sm cursor-pointer"
                    style={{ left: "8%", width: "26%" }}
                    onClick={() => setActiveModalBlock({ title: "EXP-402 (BOS-NYP)", type: "HIGH-SPEED PASSENGER", status: "ON TIME", duration: "90 min", speed: "160 km/h", route: "Boston South → New York Penn", traction: "25kV AC" })}
                    onMouseEnter={() => setHoveredTrain("EXP-402")}
                    onMouseLeave={() => setHoveredTrain(null)}
                  >
                    <span className="truncate flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                      <span>EXP-402 (BOS-NYP)</span>
                    </span>
                    <span className="text-[9px] font-mono text-blue-100 ml-1">160 km/h</span>
                  </motion.div>
                </div>
              </div>

              {/* TRACK ROW 2: TRK-2 (S) */}
              <div className="grid grid-cols-[110px_1fr] items-center min-h-[56px] relative z-10 group">
                <div className="text-xs font-black text-slate-800 pl-2 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>TRK-2 (S)</span>
                </div>
                <div className="relative h-11 w-full">
                  {/* TRACK MAINT M-44 (Striped maintenance block) */}
                  <motion.div 
                    whileHover={{ scale: 1.02, y: -2, boxShadow: "0 4px 12px rgba(245, 158, 11, 0.25)" }}
                    whileTap={{ scale: 0.98 }}
                    className="absolute top-1 bottom-1 maint-striped border-2 border-amber-400 rounded-xl px-3 flex items-center text-xs font-black text-amber-900 shadow-sm cursor-pointer space-x-1.5"
                    style={{ left: "38%", width: "36%" }}
                    onClick={() => setActiveModalBlock({ title: "TRACK MAINT M-44", type: "CORRIDOR MAINTENANCE", status: "IN PROGRESS", duration: "120 min", details: "Track weld ultrasonic inspection & tamp alignment", crew: "TMS Unit 7 (4 Engineers)" })}
                  >
                    <Wrench className="w-4 h-4 shrink-0 text-amber-700 animate-spin" style={{ animationDuration: "12s" }} />
                    <span className="truncate">TRACK MAINT M-44 (TMS + SMMS)</span>
                  </motion.div>
                </div>
              </div>

              {/* TRACK ROW 3: TRK-3 (L) */}
              <div className="grid grid-cols-[110px_1fr] items-center min-h-[56px] relative z-10 group">
                <div className="text-xs font-black text-slate-800 pl-2 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                  <span>TRK-3 (L)</span>
                </div>
                <div className="relative h-11 w-full">
                  {/* LCL-112 block */}
                  <motion.div 
                    whileHover={{ scale: 1.02, y: -2, boxShadow: "0 4px 12px rgba(14, 165, 233, 0.25)" }}
                    whileTap={{ scale: 0.98 }}
                    className="absolute top-1 bottom-1 bg-sky-50 border border-sky-300 rounded-xl px-3 flex items-center justify-between text-xs font-bold text-sky-800 shadow-sm cursor-pointer"
                    style={{ left: "4%", width: "18%" }}
                    onClick={() => setActiveModalBlock({ title: "LCL-112", type: "COMMUTER REGIONAL", status: "ON TIME", duration: "60 min", speed: "110 km/h" })}
                  >
                    <span className="truncate">LCL-112</span>
                    <span className="text-[9px] font-mono text-sky-600">11:00</span>
                  </motion.div>

                  {/* FRT-991 block */}
                  <motion.div 
                    whileHover={{ scale: 1.02, y: -2, boxShadow: "0 4px 12px rgba(245, 158, 11, 0.25)" }}
                    whileTap={{ scale: 0.98 }}
                    className="absolute top-1 bottom-1 bg-amber-50 border border-amber-300 rounded-xl px-3 flex items-center justify-between text-xs font-bold text-amber-800 shadow-sm cursor-pointer"
                    style={{ left: "56%", width: "23%" }}
                    onClick={() => setActiveModalBlock({ title: "FRT-991", type: "HEAVY FREIGHT", status: "DELAY +5M", duration: "75 min", speed: "75 km/h" })}
                  >
                    <span className="truncate">FRT-991</span>
                    <span className="text-[9px] font-mono text-amber-600">+5m</span>
                  </motion.div>
                </div>
              </div>

              {/* TRACK ROW 4: TRK-9 (Y) */}
              <div className="grid grid-cols-[110px_1fr] items-center min-h-[56px] relative z-10 group">
                <div className="text-xs font-black text-rose-600 pl-2 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                  <span>TRK-9 (Y)</span>
                </div>
                <div className="relative h-11 w-full">
                  {/* SIG FAIL red alert block */}
                  <motion.div 
                    whileHover={{ scale: 1.02, y: -2, boxShadow: "0 4px 12px rgba(239, 68, 68, 0.25)" }}
                    whileTap={{ scale: 0.98 }}
                    className="absolute top-1 bottom-1 bg-rose-50 border-2 border-rose-400 rounded-xl px-3 flex items-center justify-between text-xs font-black text-rose-800 shadow-sm cursor-pointer space-x-1.5"
                    style={{ left: "19%", width: "16%" }}
                    onClick={() => setActiveModalBlock({ title: "SIG FAIL (TRK-9)", type: "CRITICAL INCIDENT", status: "RED ASPECT LOCKED", duration: "Active 24m", details: "Point interlocking switch telemetry drop - SMMS work order enqueued", location: "Sector 7 Interlocking" })}
                  >
                    <div className="flex items-center space-x-1.5 truncate">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 animate-bounce" />
                      <span className="truncate">SIG FAIL</span>
                    </div>
                    <span className="text-[9px] font-mono bg-rose-600 px-1.5 py-0.5 rounded text-white">
                      HALT
                    </span>
                  </motion.div>
                </div>
              </div>

              {/* Empty background track grid rows */}
              <div className="grid grid-cols-[110px_1fr] items-center min-h-[48px] border-t border-slate-100 opacity-60">
                <div className="text-xs font-bold text-slate-400 pl-2">TRK-4</div>
                <div></div>
              </div>

              <div className="grid grid-cols-[110px_1fr] items-center min-h-[48px] border-t border-slate-100 opacity-60">
                <div className="text-xs font-bold text-slate-400 pl-2">TRK-5</div>
                <div></div>
              </div>

            </div>

          </div>

          {/* Controller Optimized Block Approval Panel */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                    CP-SAT Optimized Maintenance Bundles
                  </h2>
                </div>
                <p className="text-[11px] font-semibold text-slate-500 mt-0.5 font-mono">
                  Cross-department spatial co-location engine (TMS + SMMS + TDMS)
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black px-3 py-1.5 rounded-xl flex items-center space-x-1.5">
                  <Zap className="w-3.5 h-3.5 text-emerald-600" />
                  <span>+{savedHoursTotal} hrs Saved</span>
                </div>

                <motion.button
                  onClick={handleGeneratePlan}
                  disabled={isOptimizing}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black px-3.5 py-2 rounded-xl shadow-xs flex items-center space-x-1.5 transition disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isOptimizing ? "animate-spin" : ""}`} />
                  <span>{isOptimizing ? "Solving..." : "Re-Run CP-SAT Solver"}</span>
                </motion.button>
              </div>
            </div>

            {/* List of Optimized Blocks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {filteredBlocks.length === 0 ? (
                <div className="col-span-2 text-center py-6 text-xs text-slate-400 font-mono">
                  No maintenance blocks match the active filter criteria.
                </div>
              ) : (
                filteredBlocks.map((block) => (
                  <motion.div
                    key={block.id}
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`rounded-xl p-4 border transition flex flex-col justify-between space-y-3 ${
                      block.controller_approval_status === "APPROVED"
                        ? "bg-emerald-50/40 border-emerald-300"
                        : block.controller_approval_status === "REJECTED"
                        ? "bg-rose-50/40 border-rose-300"
                        : "bg-white border-slate-200 shadow-xs hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-black text-slate-900 font-mono">
                            BLOCK #{block.id}
                          </span>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
                            block.controller_approval_status === "APPROVED"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                              : block.controller_approval_status === "REJECTED"
                              ? "bg-rose-100 text-rose-800 border-rose-300"
                              : "bg-amber-100 text-amber-800 border-amber-300"
                          }`}>
                            {block.controller_approval_status}
                          </span>
                        </div>
                        <div className="text-[11px] font-bold text-slate-600 mt-1">
                          {block.corridor_id}
                        </div>
                      </div>

                      {block.saved_block_hours > 0 && (
                        <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-1 rounded-lg border border-emerald-300 font-mono">
                          +{block.saved_block_hours}h Saved
                        </span>
                      )}
                    </div>

                    {/* Department Badges & Requests list */}
                    <div className="flex items-center space-x-2 pt-1 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">
                        Co-located Depts:
                      </span>
                      <div className="flex items-center space-x-1">
                        {block.bundled_departments.map((d: string) => (
                          <span
                            key={d}
                            className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${
                              d === "TMS" ? "bg-blue-50 text-blue-700 border-blue-200" :
                              d === "SMMS" ? "bg-amber-50 text-amber-700 border-amber-200" :
                              "bg-purple-50 text-purple-700 border-purple-200"
                            }`}
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Schedule & Controller Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div className="text-[10px] text-slate-500 font-mono flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Req IDs: {block.bundled_request_ids.join(", ")}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        {block.controller_approval_status !== "APPROVED" && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleApproveReject(block.id, true)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs flex items-center space-x-1"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Approve</span>
                          </motion.button>
                        )}

                        {block.controller_approval_status !== "REJECTED" && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleApproveReject(block.id, false)}
                            className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-rose-100 text-slate-700 hover:text-rose-700 text-xs font-bold transition flex items-center space-x-1"
                          >
                            <X className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Reject</span>
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Enqueued Maintenance Work Orders Panel */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-200 mt-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <Wrench className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  Enqueued Maintenance Work Orders
                </h2>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                {workOrders.length} Enqueued
              </span>
            </div>

            {workOrders.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 font-mono">
                No custom maintenance work orders enqueued yet. Click "Create Work Order" from any asset or CAD map to enqueue.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                {workOrders.map((wo: any) => (
                  <motion.div
                    key={wo.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 font-mono text-xs font-black text-slate-900">
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                          WO #{wo.id}
                        </span>
                        <span className="text-slate-600 font-sans font-bold">{wo.assetId || "Corridor Track"}</span>
                      </div>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                        wo.urgency === "HIGH" ? "bg-rose-50 text-rose-700 border-rose-200" :
                        wo.urgency === "MEDIUM" ? "bg-amber-50 text-amber-700 border-amber-200" :
                        "bg-slate-50 text-slate-700 border-slate-200"
                      }`}>
                        {wo.urgency} SEVERITY
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-snug">{wo.notes}</p>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-100">
                      <span>Dept: <strong className="text-slate-800">{wo.department}</strong></span>
                      <span>Window: <strong className="text-blue-600">{wo.duration} mins</strong></span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Block & Consist Details Telemetry Control Panel */}
      <AnimatePresence>
        {activeModalBlock && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50"
            onClick={() => setActiveModalBlock(null)}
          >
            <motion.div 
              initial={{ scale: 0.94, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-lg w-full p-6 text-slate-900 shadow-2xl relative border border-slate-200"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between mb-4 border-b border-slate-200 pb-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono font-black px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200 uppercase">
                      {activeModalBlock.asset_id || activeModalBlock.title.split(" ")[0] || "TRK-01"}
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg border ${
                      activeModalBlock.status.includes("CRITICAL") || activeModalBlock.status.includes("RED") || activeModalBlock.status.includes("HALT")
                        ? "bg-rose-50 text-rose-700 border-rose-200 animate-pulse" 
                        : activeModalBlock.status === "ON TIME" 
                        ? "bg-blue-50 text-blue-700 border-blue-200" 
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}>
                      {activeModalBlock.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mt-1">{activeModalBlock.title}</h3>
                </div>

                <button 
                  onClick={() => setActiveModalBlock(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Detailed Specs Grid */}
              <div className="grid grid-cols-2 gap-2.5 text-xs font-mono mb-4">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Category / Type</span>
                  <span className="font-bold text-slate-900">{activeModalBlock.type}</span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Corridor Window</span>
                  <span className="font-bold text-slate-900">{activeModalBlock.duration}</span>
                </div>

                {activeModalBlock.speed && (
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Operating Speed</span>
                    <span className="font-bold text-blue-600">{activeModalBlock.speed}</span>
                  </div>
                )}

                {activeModalBlock.tonnage && (
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Freight Tonnage</span>
                    <span className="font-bold text-slate-900">{activeModalBlock.tonnage}</span>
                  </div>
                )}

                {activeModalBlock.location && (
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 col-span-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Interlocking Sector</span>
                    <span className="font-bold text-slate-900">{activeModalBlock.location}</span>
                  </div>
                )}
              </div>

              {/* Telemetry Waveform / Diagnostics Box */}
              <div className="bg-slate-900 text-slate-100 rounded-xl p-3.5 mb-5 border border-slate-800">
                <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-400 uppercase mb-2">
                  <span>Live Telemetry Sensor Packet</span>
                  <span className="text-emerald-400 flex items-center space-x-1">
                    <Radio className="w-3 h-3 animate-ping text-emerald-400" />
                    <span>Active Feed (12ms)</span>
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  {activeModalBlock.details || "Acoustic strain & signal interlock telemetry verified. Corridor isolation buffer active."}
                </p>
              </div>

              {/* Action Buttons Toolbar */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-3 border-t border-slate-200">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    const targetAsset = activeModalBlock.asset_id || (activeModalBlock.title.includes("SIG") ? "SIG-44B1" : activeModalBlock.title.includes("MAINT") ? "TRK-01" : "TRK-01");
                    if (onOpenCadMap) onOpenCadMap(targetAsset);
                    setActiveModalBlock(null);
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2.5 px-3 rounded-xl border border-slate-300 transition flex items-center justify-center space-x-1.5"
                >
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>View CAD Map</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    const targetAsset = activeModalBlock.asset_id || (activeModalBlock.title.includes("SIG") ? "SIG-44B1" : activeModalBlock.title.includes("MAINT") ? "TRK-01" : "TRK-01");
                    if (onOpenWorkOrder) onOpenWorkOrder(targetAsset);
                    setActiveModalBlock(null);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-3 rounded-xl shadow-xs transition flex items-center justify-center space-x-1.5"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Work Order</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveModalBlock(null)}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition flex items-center justify-center space-x-1.5 col-span-2 sm:col-span-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Dismiss</span>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


