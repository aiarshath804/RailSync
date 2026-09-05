import React, { useState, useEffect } from "react";
import { 
  Train, 
  CheckCircle2, 
  Wrench, 
  Filter, 
  Plus, 
  AlertTriangle, 
  CloudRain, 
  Clock,
  ShieldAlert,
  Zap,
  Check,
  X,
  Send,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Language, translations } from "../lib/translations";
import { useLiveData } from "../contexts/LiveDataContext";

export interface AdvisoryRecord {
  id: string;
  title: string;
  type: "CRITICAL" | "WEATHER" | "MAINTENANCE" | "SIGNAL" | "CONGESTION";
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
  const [filterType, setFilterType] = useState<"ALL" | "RAJDHANI" | "FREIGHT" | "SUBURBAN">("ALL");
  const [heldTrains, setHeldTrains] = useState<string[]>([]);
  const [reroutedTrains, setReroutedTrains] = useState<string[]>([]);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState<boolean>(false);
  const [isNewAdvisoryModalOpen, setIsNewAdvisoryModalOpen] = useState<boolean>(false);

  // New Advisory Form State
  const [newAdvTitle, setNewAdvTitle] = useState("");
  const [newAdvType, setNewAdvType] = useState<"CRITICAL" | "WEATHER" | "MAINTENANCE" | "SIGNAL">("CRITICAL");
  const [newAdvSector, setNewAdvSector] = useState("Block B1 (MAS → BBQ)");
  const [newAdvDesc, setNewAdvDesc] = useState("");

  // Dynamic Advisories State
  const [advisories, setAdvisories] = useState<AdvisoryRecord[]>([]);
  const [loadingAdvisories, setLoadingAdvisories] = useState<boolean>(true);

  // Shared Live Context
  const { corridorData } = useLiveData();

  // Dynamically evaluate advisories based on shared corridor operational state
  useEffect(() => {
    if (!corridorData) {
      setLoadingAdvisories(false);
      return;
    }

    const generated: AdvisoryRecord[] = [];

    // 1. Emergency Closures
    if (corridorData.emergency_closures && corridorData.emergency_closures.length > 0) {
      corridorData.emergency_closures.forEach((emg: any) => {
        generated.push({
          id: `ADV-EMG-${emg.block_id || 'B1'}`,
          title: `EMERGENCY BLOCK LOCKOUT: BLOCK ${emg.block_id}`,
          type: "CRITICAL",
          description: `${emg.description || 'Emergency track lockout active.'} Department: ${emg.department || 'OPERATIONS'}.`,
          sector: `Block ${emg.block_id}`,
          status: "ACTIVE",
          timestamp: "Live Event"
        });
      });
    }

    // 2. Block Congestion / Overlaps
    if (corridorData.blocks) {
      corridorData.blocks.forEach((blk: any) => {
        if (blk.operational_status === "CONGESTED" || (blk.trains && blk.trains.length > 1)) {
          generated.push({
            id: `ADV-CONG-${blk.block_id}`,
            title: `HEADWAY COMPRESSION WARNING: ${blk.name}`,
            type: "CONGESTION",
            description: `Multiple movements (${blk.trains.length} trains) mapped simultaneously inside ${blk.block_id}.`,
            sector: blk.name,
            status: "ACTIVE",
            timestamp: "Live Status"
          });
        }
      });
    }

    // 3. Significant Train Delays
    if (corridorData.active_trains) {
      corridorData.active_trains.forEach((tr: any) => {
        if (tr.delay_minutes && tr.delay_minutes >= 10) {
          generated.push({
            id: `ADV-DELAY-${tr.train_number}`,
            title: `SCHEDULE DELAY ADVISORY: TRAIN ${tr.train_number}`,
            type: "SIGNAL",
            description: `${tr.train_name} running with +${tr.delay_minutes} mins cumulative delay. En route to ${tr.next_station || 'next sector'}.`,
            trainId: tr.train_number,
            sector: `Block ${tr.assigned_block_id || tr.current_block || 'B1'}`,
            status: "ACTIVE",
            timestamp: "Live Telemetry"
          });
        }
      });
    }

    setAdvisories(generated);
    setLoadingAdvisories(false);
  }, [corridorData]);

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
      id: `ADV-USER-${Date.now().toString().slice(-4)}`,
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

  const filteredTrains = trains.filter(t => {
    if (filterType === "ALL") return true;
    if (filterType === "RAJDHANI") return t.type === "SUPERFAST_EXPRESS" || t.type === "VANDE_BHARAT" || t.cat === "RAJDHANI";
    if (filterType === "FREIGHT") return t.type === "FREIGHT" || t.cat === "FREIGHT";
    if (filterType === "SUBURBAN") return t.type === "SUBURBAN_LOCAL" || t.cat === "SUBURBAN";
    return true;
  });

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto max-w-full bg-slate-100 font-sans">
      
      {/* Official Government Ministry Header Ribbon */}
      <div className="bg-slate-900 border-l-4 border-l-amber-500 border border-slate-800 rounded-lg p-3 sm:p-4 mb-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-white">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-mono text-amber-400 font-bold uppercase tracking-widest font-serif">
            <span>{t.govtTitle}</span>
            <span>•</span>
            <span className="text-slate-300">COA DYNAMIC TIMETABLE</span>
          </div>
          <h1 className="text-lg sm:text-2xl font-black text-white font-serif tracking-tight uppercase mt-0.5">
            {t.schedulesTitle}
          </h1>
          <p className="text-xs text-slate-300 font-sans mt-0.5">
            Dynamic Scheduling & Conflict Detection for Chennai Central – Tiruvallur B1–B5 Corridor
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
              LIVE COA STREAM
            </span>
          </div>
          <div className="text-xs font-semibold text-slate-600 mt-1 flex items-center space-x-2 font-mono">
            <span className="w-2 h-2 rounded-full bg-blue-900 animate-ping"></span>
            <span>{trains.length} Active Movements Monitored</span>
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
                    { label: "Express / High-Speed", val: "RAJDHANI" },
                    { label: "Freight", val: "FREIGHT" },
                    { label: "Suburban EMU", val: "SUBURBAN" }
                  ].map((cat) => (
                    <button
                      key={cat.val}
                      onClick={() => {
                        setFilterType(cat.val as any);
                        setIsFilterDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                        filterType === cat.val ? "bg-blue-50 text-blue-900" : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>{cat.label}</span>
                      {filterType === cat.val && <Check className="w-3.5 h-3.5 text-blue-900" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsNewAdvisoryModalOpen(true)}
            className="text-xs font-bold px-4 py-2 bg-blue-950 hover:bg-blue-900 text-amber-400 rounded-xl transition shadow-xs flex items-center space-x-1.5 font-mono"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Issue Advisory</span>
          </motion.button>
        </div>
      </div>

      {/* 2. Active Operational Advisories (Dynamically Evaluated) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-300 shadow-xs mb-6">
        <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-3">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-black text-slate-900 uppercase font-serif tracking-wide">
              Dynamic Operational Conflicts & Advisories
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-500 font-bold">
            {advisories.filter(a => a.status === "ACTIVE").length} Active Advisories
          </span>
        </div>

        {loadingAdvisories ? (
          <div className="py-6 text-center text-xs font-mono text-slate-500">
            Evaluating live operational state for corridor conflicts...
          </div>
        ) : advisories.filter(a => a.status === "ACTIVE").length === 0 ? (
          <div className="py-8 bg-emerald-50 border border-emerald-200 rounded-xl text-center flex flex-col items-center justify-center p-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mb-2" />
            <span className="text-sm font-bold text-emerald-900 font-sans">
              No active operational conflicts or advisories.
            </span>
            <p className="text-xs text-emerald-700 mt-1 font-mono">
              All live movements on B1–B5 are operating within nominal timetable and safety parameters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {advisories.filter(a => a.status === "ACTIVE").map((adv) => (
              <div 
                key={adv.id}
                className={`p-4 rounded-xl border flex flex-col justify-between text-xs font-sans ${
                  adv.type === "CRITICAL"
                    ? "bg-rose-50 border-rose-300 text-rose-950"
                    : adv.type === "CONGESTION"
                    ? "bg-amber-50 border-amber-300 text-amber-950"
                    : "bg-slate-50 border-slate-300 text-slate-900"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between font-mono text-[10px] font-bold mb-1.5">
                    <span className="px-2 py-0.5 rounded bg-white/80 border border-slate-200">
                      {adv.id}
                    </span>
                    <span className="text-slate-500">{adv.timestamp}</span>
                  </div>
                  <h4 className="font-black text-sm uppercase tracking-tight mb-1 font-serif">
                    {adv.title}
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed mb-3">
                    {adv.description}
                  </p>
                  {adv.sector && (
                    <div className="text-[10px] font-mono font-bold text-slate-600 bg-white/60 p-1.5 rounded border border-slate-200 mb-3">
                      Sector: {adv.sector}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 pt-2 border-t border-slate-200/80">
                  {adv.trainId && (
                    <button
                      onClick={() => handleHold(adv.trainId!, adv.id)}
                      className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-1.5 px-2 rounded-lg text-[10px] transition"
                    >
                      Hold Train
                    </button>
                  )}
                  <button
                    onClick={() => handleResolveAdvisory(adv.id)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-1.5 px-2 rounded-lg text-[10px] transition"
                  >
                    Resolve Advisory
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Dynamic Timetable Roster Table */}
      <div className="bg-white rounded-2xl p-5 border border-slate-300 shadow-xs">
        <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-3">
          <h3 className="text-sm font-black text-slate-900 uppercase font-serif tracking-wide">
            Live Corridor Timetable & Movements
          </h3>
          <span className="text-[10px] font-mono text-slate-500 font-bold">
            Showing {filteredTrains.length} Movements
          </span>
        </div>

        {filteredTrains.length === 0 ? (
          <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200 p-6">
            <Info className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <div className="font-bold text-sm text-slate-800">No live train schedules available.</div>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              Waiting for live movements from RailRadar telemetry API stream.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase">
                  <th className="pb-3 pl-2">Train # & Name</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Mapped Block</th>
                  <th className="pb-3">Direction & Route</th>
                  <th className="pb-3">Speed</th>
                  <th className="pb-3">Delay / Status</th>
                  <th className="pb-3 text-right pr-2">Dispatch Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTrains.map((tr) => (
                  <tr key={tr.train_number} className="hover:bg-slate-50 transition">
                    <td className="py-3 pl-2 font-bold text-slate-900">
                      <div>
                        <span className="text-blue-900 font-black text-xs block">
                          #{tr.train_number}
                        </span>
                        <span className="text-slate-800 font-sans text-xs">
                          {tr.train_name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700">
                        {tr.type || "EXPRESS"}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-950 font-black text-[10px]">
                        {tr.current_block || tr.assigned_block_id || "B1"}
                      </span>
                    </td>
                    <td className="py-3 text-slate-700">
                      <span className="font-bold text-slate-900">{tr.direction || "DOWN"}</span>
                      <span className="text-[10px] text-slate-500 block">
                        {tr.previous_station || "MAS"} → {tr.next_station || "TRL"}
                      </span>
                    </td>
                    <td className="py-3 font-bold text-slate-900">
                      {tr.speed_kmh} km/h
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        tr.delay_minutes > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {tr.delay_minutes > 0 ? `+${tr.delay_minutes}m Delay` : "ON TIME"}
                      </span>
                    </td>
                    <td className="py-3 text-right pr-2">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleHold(tr.train_number)}
                          disabled={heldTrains.includes(tr.train_number)}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold transition ${
                            heldTrains.includes(tr.train_number)
                              ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                              : "bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300"
                          }`}
                        >
                          {heldTrains.includes(tr.train_number) ? "HELD" : "HOLD"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Advisory Modal */}
      <AnimatePresence>
        {isNewAdvisoryModalOpen && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-300 rounded-2xl p-6 max-w-lg w-full shadow-2xl text-slate-900 font-sans"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                <h3 className="text-base font-black uppercase font-serif tracking-wide text-slate-900">
                  Issue Controller Advisory
                </h3>
                <button
                  onClick={() => setIsNewAdvisoryModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateAdvisory} className="space-y-4 text-xs font-sans">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Advisory Title</label>
                  <input
                    type="text"
                    required
                    value={newAdvTitle}
                    onChange={(e) => setNewAdvTitle(e.target.value)}
                    placeholder="e.g. CAUTION SPEED RESTRICTION ON B3"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Type</label>
                    <select
                      value={newAdvType}
                      onChange={(e) => setNewAdvType(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    >
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="WEATHER">WEATHER</option>
                      <option value="MAINTENANCE">MAINTENANCE</option>
                      <option value="SIGNAL">SIGNAL</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Sector</label>
                    <select
                      value={newAdvSector}
                      onChange={(e) => setNewAdvSector(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    >
                      <option value="Block B1 (MAS → BBQ)">Block B1 (MAS → BBQ)</option>
                      <option value="Block B2 (BBQ → PER)">Block B2 (BBQ → PER)</option>
                      <option value="Block B3 (PER → ABU)">Block B3 (PER → ABU)</option>
                      <option value="Block B4 (ABU → AVD)">Block B4 (ABU → AVD)</option>
                      <option value="Block B5 (AVD → TRL)">Block B5 (AVD → TRL)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={newAdvDesc}
                    onChange={(e) => setNewAdvDesc(e.target.value)}
                    placeholder="Provide operational details and speed restrictions..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div className="flex items-center space-x-3 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsNewAdvisoryModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-blue-950 hover:bg-blue-900 text-amber-400 font-bold rounded-xl transition flex items-center justify-center space-x-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Issue Advisory</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
