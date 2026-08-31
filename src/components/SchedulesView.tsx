import React, { useState } from "react";
import { 
  Train, 
  CheckCircle2, 
  Wrench, 
  Volume2, 
  Filter, 
  Plus, 
  AlertTriangle, 
  CloudRain, 
  Clock,
  ArrowRight,
  ShieldAlert,
  Zap,
  Check,
  X,
  Send
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { Language, translations } from "../lib/translations";

export interface AdvisoryRecord {
  id: string;
  title: string;
  type: "CRITICAL" | "WEATHER" | "MAINTENANCE" | "SIGNAL";
  description: string;
  trainId?: string;
  sector?: string;
  status: "ACTIVE" | "RESOLVED" | "ENFORCED";
  resolutionNote?: string;
  timestamp: string;
}

interface SchedulesViewProps {
  trains?: any[];
  workOrders?: any[];
  onNewAllocation?: () => void;
  lang?: Language;
  onHoldTrain?: (trainId: string) => void;
  onRerouteTrain?: (trainId: string) => void;
}

export const SchedulesView: React.FC<SchedulesViewProps> = ({
  trains = [],
  workOrders = [],
  onNewAllocation,
  lang = "EN",
  onHoldTrain,
  onRerouteTrain
}) => {
  const t = translations[lang] || translations.EN;
  const [filterType, setFilterType] = useState<"ALL" | "RAJDHANI" | "FREIGHT">("ALL");
  const [heldTrains, setHeldTrains] = useState<string[]>([]);
  const [reroutedTrains, setReroutedTrains] = useState<string[]>([]);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState<boolean>(false);
  const [isNewAdvisoryModalOpen, setIsNewAdvisoryModalOpen] = useState<boolean>(false);

  // New Advisory Form State
  const [newAdvTitle, setNewAdvTitle] = useState("");
  const [newAdvType, setNewAdvType] = useState<"CRITICAL" | "WEATHER" | "MAINTENANCE" | "SIGNAL">("CRITICAL");
  const [newAdvSector, setNewAdvSector] = useState("Sector 7");
  const [newAdvDesc, setNewAdvDesc] = useState("");

  // Dynamic Advisories State
  const [advisories, setAdvisories] = useState<AdvisoryRecord[]>([
    {
      id: "ADV-401",
      title: "CRITICAL CONFLICT",
      type: "CRITICAL",
      description: "Freight F-882 schedule overlaps with emergency maintenance block MB-442 on Track 3, Sector 7.",
      trainId: "F-882",
      sector: "Sector 7",
      status: "ACTIVE",
      timestamp: "live signal"
    },
    {
      id: "ADV-402",
      title: "WX WEATHER ADVISORY",
      type: "WEATHER",
      description: "Heavy monsoon rain reported near NDLS corridor. Speed restrictions (60km/h) enforced for Sector 4.",
      sector: "Sector 4",
      status: "ACTIVE",
      timestamp: "15m ago"
    },
    {
      id: "ADV-403",
      title: "SIGNAL INTERLOCKING LOCKOUT",
      type: "SIGNAL",
      description: "Point switch motor fault on SIG-44B1. Manual locking in progress. Caution speed 30km/h required.",
      sector: "Sector 2",
      status: "ACTIVE",
      timestamp: "32m ago"
    }
  ]);

  const handleHold = (trainId: string, advisoryId?: string) => {
    setHeldTrains(prev => [...prev, trainId]);
    if (onHoldTrain) onHoldTrain(trainId);

    if (advisoryId) {
      setAdvisories(prev => prev.map(a => 
        a.id === advisoryId 
          ? { ...a, status: "RESOLVED", resolutionNote: `Held Train ${trainId} at loop line.` }
          : a
      ));
    }
  };

  const handleReroute = (trainId: string, advisoryId?: string) => {
    setReroutedTrains(prev => [...prev, trainId]);
    if (onRerouteTrain) onRerouteTrain(trainId);

    if (advisoryId) {
      setAdvisories(prev => prev.map(a => 
        a.id === advisoryId 
          ? { ...a, status: "RESOLVED", resolutionNote: `Rerouted Train ${trainId} to Track 2 (T2).` }
          : a
      ));
    }
  };

  const handleEnforceWeather = (advisoryId: string) => {
    setAdvisories(prev => prev.map(a => 
      a.id === advisoryId 
        ? { ...a, status: "ENFORCED", resolutionNote: "60km/h Speed Limit Active & Broadcasted" }
        : a
    ));
  };

  const handleResolveAdvisory = (advisoryId: string) => {
    setAdvisories(prev => prev.map(a => 
      a.id === advisoryId 
        ? { ...a, status: "RESOLVED", resolutionNote: "Cleared by Dispatch Controller" }
        : a
    ));
  };

  const handleCreateAdvisory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdvTitle.trim()) return;

    const created: AdvisoryRecord = {
      id: `ADV-${Math.floor(500 + Math.random() * 500)}`,
      title: newAdvTitle.toUpperCase(),
      type: newAdvType,
      description: newAdvDesc || "Custom dispatch advisory issued by controller.",
      sector: newAdvSector,
      status: "ACTIVE",
      timestamp: "Just now"
    };

    setAdvisories(prev => [created, ...prev]);
    setIsNewAdvisoryModalOpen(false);
    setNewAdvTitle("");
    setNewAdvDesc("");
  };

  const defaultTrains = [
    { id: "R-104", train_number: "12301", name: "Rajdhani Express", cat: "RAJDHANI", route: "NDLS → MMCT", arr: "14:30", dep: "14:45", priority: "P1 - Critical", status: "On Time", statusColor: "text-blue-600" },
    { id: "F-882", train_number: "58201", name: "Heavy Goods Freight", cat: "FREIGHT", route: "HWH → BSL", arr: "15:10", dep: "--:--", priority: "P3 - Standard", status: "Conflict", statusColor: "text-rose-600" },
    { id: "E-210", train_number: "12123", name: "Deccan Queen Express", cat: "RAJDHANI", route: "PUNE → CSMT", arr: "15:45", dep: "15:50", priority: "P2 - Elevated", status: "On Time", statusColor: "text-blue-600" },
    { id: "R-106", train_number: "20901", name: "Vande Bharat Express", cat: "RAJDHANI", route: "SBC → NDLS", arr: "16:20", dep: "16:35", priority: "P1 - Critical", status: "Delayed +15m", statusColor: "text-amber-600" },
    { id: "S-405", train_number: "12004", name: "Shatabdi Express", cat: "RAJDHANI", route: "CNB → LKO", arr: "17:05", dep: "17:15", priority: "P2 - High Priority", status: "On Time", statusColor: "text-blue-600" }
  ];

  const displayTrains = trains.length > 0 ? trains : defaultTrains;
  const filteredTrains = displayTrains.filter(t => filterType === "ALL" || t.cat === filterType);

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto max-w-full bg-slate-100 font-sans">
      
      {/* Official Government Ministry Header Ribbon */}
      <div className="bg-slate-900 border-l-4 border-l-amber-500 border border-slate-800 rounded-lg p-3 sm:p-4 mb-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-white">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-mono text-amber-400 font-bold uppercase tracking-widest font-serif">
            <span>{t.govtTitle}</span>
            <span>•</span>
            <span className="text-slate-300">COA</span>
          </div>
          <h1 className="text-lg sm:text-2xl font-black text-white font-serif tracking-tight uppercase mt-0.5">
            {t.schedulesTitle}
          </h1>
          <p className="text-xs text-slate-300 font-sans mt-0.5">
            {t.schedulesSubtitle}
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-slate-950 p-2.5 rounded border border-slate-800 font-mono text-xs">
          <div>
            <div className="text-[9px] text-slate-400 uppercase font-bold">{t.rosterGazette}</div>
            <div className="text-amber-400 font-bold">{t.liveSynced}</div>
          </div>
        </div>
      </div>

      {/* 1. Top Banner & Filter Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white border border-slate-300 rounded-lg shadow-xs mb-6 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-base font-black tracking-tight text-slate-900 font-serif uppercase">
              {t.rosterTitle}
            </h2>
            <span className="px-2.5 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-bold tracking-wider uppercase font-mono">
              {t.gazetteRecord}
            </span>
          </div>
          <div className="text-xs font-semibold text-slate-600 mt-1 flex items-center space-x-2 font-mono">
            <span className="w-2 h-2 rounded-full bg-blue-900 animate-ping"></span>
            <span>{t.dispatchSlotsSynced}</span>
          </div>
        </div>

        <div className="flex items-center space-x-3 relative">
          <div className="relative">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              className={`text-xs font-bold px-4 py-2 rounded-xl border flex items-center space-x-1.5 transition shadow-xs ${
                filterType !== "ALL"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              <Filter className={`w-3.5 h-3.5 ${filterType !== "ALL" ? "text-white" : "text-blue-600"}`} />
              <span>{t.filter} ({filterType})</span>
            </motion.button>

            <AnimatePresence>
              {isFilterDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50"
                >
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 py-1.5">
                    Category
                  </div>
                  {[
                    { label: t.allCategories, val: "ALL" },
                    { label: t.highSpeed, val: "RAJDHANI" },
                    { label: t.heavyFreight, val: "FREIGHT" }
                  ].map((cat) => (
                    <button
                      key={cat.val}
                      onClick={() => {
                        setFilterType(cat.val as any);
                        setIsFilterDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl flex items-center justify-between transition ${
                        filterType === cat.val ? "bg-blue-50 text-blue-700 font-black" : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* 2. 4 Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        
        {/* Metric 1: Total Active */}
        <motion.div 
          whileHover={{ y: -2 }}
          className="glass-panel rounded-2xl p-5 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-500">
            <span>Total Active Consists</span>
            <Train className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-3">
            <div className="text-4xl font-black text-slate-900">{142 + (displayTrains.length > 4 ? displayTrains.length - 4 : 0)}</div>
            <div className="text-[11px] font-bold text-blue-600 mt-1 font-mono">↑ +{12 + (displayTrains.length > 4 ? displayTrains.length - 4 : 0)} from avg</div>
          </div>
        </motion.div>

        {/* Metric 2: Punctuality */}
        <motion.div 
          whileHover={{ y: -2 }}
          className="glass-panel rounded-2xl p-5 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-500">
            <span>Punctuality Index</span>
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-3">
            <div className="text-4xl font-black text-slate-900">94.2%</div>
            <div className="text-[11px] font-bold text-amber-600 mt-1 font-mono">↓ -1.5% due to WX</div>
          </div>
        </motion.div>

        {/* Metric 3: Maintenance Blocks */}
        <motion.div 
          whileHover={{ y: -2 }}
          className="glass-panel rounded-2xl p-5 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-500">
            <span>Maintenance Blocks</span>
            <Wrench className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-3">
            <div className="text-4xl font-black text-slate-900">{3 + workOrders.length}</div>
            <div className="text-[11px] font-bold text-amber-600 mt-1 flex items-center space-x-1 font-mono">
              <AlertTriangle className="w-3.5 h-3.5 animate-bounce" />
              <span>{1 + workOrders.length} Active Work Orders</span>
            </div>
          </div>
        </motion.div>

        {/* Metric 4: Network Status */}
        <motion.div 
          whileHover={{ y: -2 }}
          className="glass-panel-alert rounded-2xl p-5 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-rose-600">
            <span>Network Risk Level</span>
            <Volume2 className="w-4 h-4 text-rose-500 animate-pulse" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-700">Elevated Risk</div>
            <div className="text-[11px] text-rose-600 mt-1 font-mono">Sector 7 Interlock Congestion</div>
          </div>
        </motion.div>

      </div>

      {/* 3. Train Roster Table */}
      <div className="glass-panel rounded-2xl p-5 mt-6">
        
        {/* Table Header Controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-black text-slate-900 flex items-center space-x-2 uppercase tracking-wide">
              <span>Train Dispatch Roster</span>
            </span>
          </div>

          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {(["ALL", "RAJDHANI", "FREIGHT"] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterType(cat)}
                className={`px-3 py-1 rounded-lg text-[10px] font-black transition relative ${
                  filterType === cat ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase">
                <th className="pb-3 pl-2">{t.trainCol}</th>
                <th className="pb-3">{t.categoryCol}</th>
                <th className="pb-3">{t.routeCol}</th>
                <th className="pb-3">{t.timeCol}</th>
                <th className="pb-3">{t.priorityCol}</th>
                <th className="pb-3 text-right pr-2">{t.actionsCol}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredTrains.map((train) => {
                const isHeld = heldTrains.includes(train.id);
                const isRerouted = reroutedTrains.includes(train.id);
                return (
                  <motion.tr 
                    key={train.id}
                    whileHover={{ backgroundColor: "rgba(241,245,249,0.7)" }}
                    className={`transition ${train.id === "F-882" ? "bg-rose-50/50" : ""}`}
                  >
                    <td className="py-3.5 pl-2 font-black text-slate-900 flex items-center space-x-1.5 font-mono">
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                      <span>[{train.train_number || train.id}]</span>
                    </td>
                    <td className="py-3.5 font-sans">
                      <span className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-700">
                        {train.name}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-700 font-sans font-bold">{train.route}</td>
                    <td className="py-3.5 text-slate-900">
                      <div>{train.arr} <span className="text-[10px] text-slate-500">(A)</span></div>
                      <div className="text-[10px] text-slate-500">{train.dep} (D)</div>
                    </td>
                    <td className="py-3.5 font-sans">
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black border ${
                        train.priority.includes("Critical") ? "bg-amber-50 border-amber-300 text-amber-800" :
                        train.priority.includes("Elevated") ? "bg-blue-50 border-blue-300 text-blue-800" :
                        "bg-slate-50 border-slate-200 text-slate-600"
                      }`}>
                        {train.priority}
                      </span>
                    </td>
                    <td className="py-3.5 text-right pr-2 font-sans">
                      {train.id === "F-882" ? (
                        <div className="inline-flex items-center space-x-2">
                          <motion.button 
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => handleHold("F-882")}
                            className={`px-3 py-1 rounded-lg text-xs font-black transition inline-flex items-center space-x-1 shadow-xs ${
                              isHeld ? "bg-blue-600 text-white" : "bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300"
                            }`}
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            <span>{isHeld ? t.holding : t.holdBtn}</span>
                          </motion.button>
                        </div>
                      ) : (
                        <span className={`${train.statusColor} font-bold text-xs inline-flex items-center space-x-1`}>
                          <span>●</span>
                          <span>{train.status === "On Time" ? t.onTime : train.status === "Conflict" ? t.conflict : train.status}</span>
                        </span>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

      {/* 4. Bottom Split: Corridor Timeline vs Active Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-start">
        
        {/* Left: Corridor Timeline Sector 7 (Span 7) */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-5 min-h-[260px] flex flex-col justify-between">
          
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Corridor Timeline: Sector 7 (HWH - BSL)
            </h3>

            {/* Legend */}
            <div className="flex items-center space-x-3 text-[10px] text-slate-500 font-mono">
              <span className="flex items-center space-x-1">
                <span className="w-3 h-1 bg-blue-500 rounded-full inline-block"></span>
                <span>Rajdhani</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-3 h-1 bg-slate-400 rounded-full inline-block"></span>
                <span>Freight</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-3 h-1 border border-dashed border-amber-500 inline-block"></span>
                <span>Maint. Block</span>
              </span>
            </div>
          </div>

          {/* Mini Timeline Visualization */}
          <div className="relative py-4 my-2 flex-1">
            {/* Timeline Header Hours */}
            <div className="grid grid-cols-4 text-center text-[10px] font-mono text-slate-500 border-b border-slate-200 pb-2">
              <div>14:00</div>
              <div>15:00</div>
              <div>16:00</div>
              <div>17:00</div>
            </div>

            {/* Playhead Red Indicator at 15:05 */}
            <div className="absolute top-0 bottom-0 left-[36%] w-[2px] bg-rose-500 z-20 pointer-events-none shadow-sm">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 -translate-x-[4px] -top-1 animate-ping"></div>
            </div>

            {/* Track 1 */}
            <div className="grid grid-cols-[40px_1fr] items-center h-10 relative">
              <span className="text-[10px] font-mono text-slate-500 font-bold">T1</span>
              <div className="relative h-7 w-full">
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="absolute top-1 bottom-1 bg-blue-50 border border-blue-300 rounded-lg px-2.5 text-[9px] font-mono text-blue-900 flex items-center shadow-xs"
                  style={{ left: "15%", width: "35%" }}
                >
                  R-104 (Rajdhani)
                </motion.div>
              </div>
            </div>

            {/* Track 2 */}
            <div className="grid grid-cols-[40px_1fr] items-center h-10 relative">
              <span className="text-[10px] font-mono text-slate-500 font-bold">T2</span>
              <div className="relative h-7 w-full">
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="absolute top-1 bottom-1 bg-sky-50 border border-sky-300 rounded-lg px-2.5 text-[9px] font-mono text-sky-900 flex items-center shadow-xs"
                  style={{ left: "55%", width: "30%" }}
                >
                  E-210 (Express)
                </motion.div>
              </div>
            </div>

            {/* Track 3 */}
            <div className="grid grid-cols-[40px_1fr] items-center h-10 relative">
              <span className="text-[10px] font-mono text-slate-500 font-bold">T3</span>
              <div className="relative h-7 w-full">
                {/* Maintenance dashed block MB-442 */}
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="absolute top-1 bottom-1 border-2 border-dashed border-amber-400 bg-amber-50 rounded-lg px-2 text-[9px] font-mono text-amber-900 flex items-center justify-center shadow-xs"
                  style={{ left: "32%", width: "24%" }}
                >
                  MB-442 (MAINT)
                </motion.div>
              </div>
            </div>

          </div>

        </div>

        {/* Right: Active Dispatch Advisories (Span 5) */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-black text-slate-900 uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Active Dispatch Advisories</span>
              <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300">
                {advisories.filter(a => a.status === "ACTIVE").length} ACTIVE
              </span>
            </div>

            <button
              onClick={() => setIsNewAdvisoryModalOpen(true)}
              className="bg-slate-900 hover:bg-slate-800 text-amber-400 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-slate-700 flex items-center space-x-1 cursor-pointer transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Issue Advisory</span>
            </button>
          </div>

          {/* New Advisory Modal / Form Drawer */}
          <AnimatePresence>
            {isNewAdvisoryModalOpen && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleCreateAdvisory}
                className="bg-white rounded-2xl p-4 border-2 border-amber-400 shadow-md space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    <span>Broadcast New Dispatch Advisory</span>
                  </h3>
                  <button type="button" onClick={() => setIsNewAdvisoryModalOpen(false)}>
                    <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Advisory Title</label>
                    <input
                      type="text"
                      placeholder="e.g. SPEED RESTRICTION"
                      value={newAdvTitle}
                      onChange={e => setNewAdvTitle(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-xs text-slate-900 font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Type / Sector</label>
                    <div className="grid grid-cols-2 gap-1">
                      <select
                        value={newAdvType}
                        onChange={e => setNewAdvType(e.target.value as any)}
                        className="bg-slate-50 border border-slate-300 rounded-lg p-1 text-[11px] font-bold"
                      >
                        <option value="CRITICAL">Critical</option>
                        <option value="WEATHER">Weather</option>
                        <option value="MAINTENANCE">Maintenance</option>
                        <option value="SIGNAL">Signal</option>
                      </select>
                      <input
                        type="text"
                        value={newAdvSector}
                        onChange={e => setNewAdvSector(e.target.value)}
                        className="bg-slate-50 border border-slate-300 rounded-lg p-1 text-[11px] font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Advisory Instructions</label>
                  <textarea
                    rows={2}
                    placeholder="Enter corridor caution or speed restriction details..."
                    value={newAdvDesc}
                    onChange={e => setNewAdvDesc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-xs text-slate-900"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsNewAdvisoryModalOpen(false)}
                    className="px-3 py-1 rounded-lg border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center space-x-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Broadcast Advisory</span>
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Advisories Cards List */}
          <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
            {advisories.map((advisory) => (
              <motion.div 
                key={advisory.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl p-4 shadow-xs border transition-all ${
                  advisory.status === "RESOLVED"
                    ? "bg-slate-100/80 border-slate-300 opacity-80"
                    : advisory.type === "CRITICAL" 
                      ? "glass-panel-alert border-rose-300" 
                      : advisory.type === "WEATHER"
                        ? "bg-sky-50/80 border-sky-300"
                        : "bg-amber-50/80 border-amber-300"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
                  <span className={`px-2.5 py-0.5 rounded-md border ${
                    advisory.status === "RESOLVED"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : advisory.type === "CRITICAL"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : advisory.type === "WEATHER"
                          ? "bg-sky-100 text-sky-800 border-sky-300"
                          : "bg-amber-100 text-amber-800 border-amber-300"
                  }`}>
                    {advisory.status === "RESOLVED" ? "RESOLVED & DISPATCHED" : advisory.title}
                  </span>

                  <div className="flex items-center space-x-2">
                    <span className="text-slate-500 font-mono text-[10px]">{advisory.timestamp}</span>
                    <button
                      onClick={() => handleResolveAdvisory(advisory.id)}
                      className="text-slate-400 hover:text-slate-700"
                      title="Clear Advisory"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-700 mt-2.5 leading-relaxed font-sans font-medium">
                  {advisory.description}
                </p>

                {advisory.resolutionNote && (
                  <div className="mt-2 text-[11px] font-mono text-emerald-700 font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-200 flex items-center space-x-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{advisory.resolutionNote}</span>
                  </div>
                )}

                {/* Interactive Action Buttons if active */}
                {advisory.status === "ACTIVE" && (
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-slate-200/60">
                    {advisory.trainId ? (
                      <>
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleHold(advisory.trainId!, advisory.id)}
                          className={`text-xs font-bold py-2 rounded-xl border transition text-center shadow-xs cursor-pointer ${
                            heldTrains.includes(advisory.trainId!)
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-white hover:bg-slate-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {heldTrains.includes(advisory.trainId!) ? "HELD AT LOOP ✓" : `HOLD ${advisory.trainId}`}
                        </motion.button>

                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleReroute(advisory.trainId!, advisory.id)}
                          className={`text-xs font-black py-2 rounded-xl shadow-xs transition text-center uppercase tracking-wide cursor-pointer ${
                            reroutedTrains.includes(advisory.trainId!)
                              ? "bg-emerald-600 text-white"
                              : "bg-blue-600 hover:bg-blue-700 text-white"
                          }`}
                        >
                          {reroutedTrains.includes(advisory.trainId!) ? "REROUTED T2 ✓" : "REROUTE TO T2"}
                        </motion.button>
                      </>
                    ) : advisory.type === "WEATHER" ? (
                      <>
                        <button 
                          onClick={() => handleEnforceWeather(advisory.id)}
                          className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold py-2 rounded-xl shadow-xs transition text-center col-span-2 cursor-pointer uppercase tracking-wide"
                        >
                          Enforce 60km/h Speed Limit
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => handleResolveAdvisory(advisory.id)}
                          className="bg-slate-800 hover:bg-slate-900 text-amber-400 text-xs font-bold py-2 rounded-xl shadow-xs transition text-center col-span-2 cursor-pointer uppercase tracking-wide"
                        >
                          Acknowledge & Clear Caution
                        </button>
                      </>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </div>

        </div>

      </div>

    </div>
  );
};


