import React, { useState } from "react";
import { 
  TrendingUp, 
  ArrowUp, 
  TrafficCone, 
  Filter, 
  Download, 
  MoreVertical, 
  X, 
  Layers, 
  PlusCircle, 
  ArrowUpRight, 
  AlertCircle,
  FileText,
  Wrench,
  CheckCircle,
  Search
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AssetRecord {
  id: string;
  type: string;
  location: string;
  status: "NOMINAL" | "DEGRADED" | "FAULT";
  lastMaint: string;
  manufacturer?: string;
  installDate?: string;
  firmware?: string;
  powerDraw?: string;
  notes?: string;
}

const INITIAL_ASSETS: AssetRecord[] = [
  {
    id: "TRK-09A2",
    type: "High-Speed Rail",
    location: "North Corridor, KM 14.2",
    status: "NOMINAL",
    lastMaint: "2023-10-12",
    manufacturer: "Voestalpine AG",
    installDate: "2019-06-15",
    firmware: "N/A (Mechanical)",
    powerDraw: "0W (Track Rail)"
  },
  {
    id: "SIG-44B1",
    type: "Block Signal",
    location: "East Junction, Approach C",
    status: "DEGRADED",
    lastMaint: "2022-11-05",
    manufacturer: "Siemens Mobility",
    installDate: "2018-04-12",
    firmware: "v4.1.2 (Outdated)",
    powerDraw: "42W (Nominal)"
  },
  {
    id: "OHE-88X",
    type: "Catenary Line",
    location: "West Line, Viaduct 4",
    status: "NOMINAL",
    lastMaint: "2023-08-21",
    manufacturer: "Alstom Grid",
    installDate: "2020-01-20",
    firmware: "v2.0.4 (Traction Gov)",
    powerDraw: "25kV AC"
  },
  {
    id: "TRK-09A3",
    type: "High-Speed Rail",
    location: "North Corridor, KM 18.5",
    status: "NOMINAL",
    lastMaint: "2023-10-12",
    manufacturer: "Voestalpine AG",
    installDate: "2019-06-15",
    firmware: "N/A (Mechanical)",
    powerDraw: "0W (Track Rail)"
  },
  {
    id: "SWT-12C",
    type: "Point Switch",
    location: "Central Hub, Interlock 2",
    status: "FAULT",
    lastMaint: "2024-01-02",
    manufacturer: "Wabtec Corporation",
    installDate: "2017-09-30",
    firmware: "v3.8.1 (Switch Drive)",
    powerDraw: "120W (Point Motor)"
  },
  {
    id: "TRK-09A4",
    type: "High-Speed Rail",
    location: "North Corridor, KM 22.0",
    status: "NOMINAL",
    lastMaint: "2023-10-12",
    manufacturer: "Voestalpine AG",
    installDate: "2019-06-15",
    firmware: "N/A (Mechanical)",
    powerDraw: "0W (Track Rail)"
  }
];

import { Language, translations } from "../lib/translations";

interface AssetsViewProps {
  workOrders?: any[];
  onCreateWorkOrder: (assetId: string) => void;
  onOpenCadMap?: (assetId: string) => void;
  lang?: Language;
}

export const AssetsView: React.FC<AssetsViewProps> = ({ workOrders = [], onCreateWorkOrder, onOpenCadMap, lang = "EN" }) => {
  const t = translations[lang] || translations.EN;
  const [assets, setAssets] = useState<AssetRecord[]>(INITIAL_ASSETS);
  const [selectedAsset, setSelectedAsset] = useState<AssetRecord | null>(INITIAL_ASSETS[1]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredAssets = assets.filter(a => {
    const matchesSearch = a.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          a.type.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          a.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto max-w-full bg-slate-100 font-sans">
      
      {/* Official Government Ministry Header Ribbon */}
      <div className="bg-slate-900 border-l-4 border-l-amber-500 border border-slate-800 rounded-lg p-3 sm:p-4 mb-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-white">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-mono text-amber-400 font-bold uppercase tracking-widest font-serif">
            <span>{t.govtTitle}</span>
            <span>•</span>
            <span className="text-slate-300">TMS / SMMS</span>
          </div>
          <h1 className="text-lg sm:text-2xl font-black text-white font-serif tracking-tight uppercase mt-0.5">
            {t.assetsTitle}
          </h1>
          <p className="text-xs text-slate-300 font-sans mt-0.5">
            {t.assetsSubtitle}
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-slate-950 p-2.5 rounded border border-slate-800 font-mono text-xs">
          <div>
            <div className="text-[9px] text-slate-400 uppercase font-bold">ASSET HEALTH INDEX</div>
            <div className="text-emerald-400 font-bold">94.2% OPTIMAL</div>
          </div>
        </div>
      </div>

      {/* 1. Top Banner & Health Index Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
        
        {/* Left Banner: Asset Inventory Management (Span 8) */}
        <div 
          className="lg:col-span-8 bg-white border border-slate-300 rounded-lg p-5 flex flex-col justify-between shadow-xs"
        >
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-black tracking-tight text-slate-900 font-serif uppercase">
                Central Asset Registry & Telemetry
              </h1>
              <span className="bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-bold px-2.5 py-0.5 rounded uppercase font-mono">
                MINISTRY REGISTRY
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 font-mono">
              Official corridor infrastructure health & telemetry registry across 3,420 monitoring points.
            </p>
          </div>

          <div className="flex items-center space-x-12 mt-5 pt-4 border-t border-slate-200">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 block font-sans">
                GLOBAL HEALTH INDEX
              </span>
              <div className="flex items-center space-x-3 mt-1">
                <span className="text-3xl font-black text-blue-950 font-mono">94.2%</span>
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
            </div>

            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 block font-sans">
                CRITICAL ANOMALIES
              </span>
              <div className="text-3xl font-black text-rose-700 mt-1 font-mono">3</div>
            </div>

            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 block font-sans">
                INSPECTION CYCLES
              </span>
              <div className="text-3xl font-black text-slate-900 mt-1 font-mono">99.8%</div>
            </div>
          </div>
        </div>

        {/* Right Stats: Track Segments & Signal Posts (Span 4) */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          
          {/* Track Segments */}
          <motion.div 
            whileHover={{ y: -2 }}
            className="glass-panel rounded-2xl p-5 flex items-center justify-between"
          >
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                TRACK SEGMENTS ACTIVE
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                1,248 <span className="text-xs font-semibold text-slate-500">/ 1,250</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <ArrowUp className="w-5 h-5 stroke-[2.5]" />
            </div>
          </motion.div>

          {/* Signal Posts */}
          <motion.div 
            whileHover={{ y: -2 }}
            className="glass-panel rounded-2xl p-5 flex items-center justify-between"
          >
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                SIGNAL POST INTERLOCKS
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                412 <span className="text-xs font-black text-amber-700 ml-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">2 MAINT</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <TrafficCone className="w-5 h-5 stroke-[2.5]" />
            </div>
          </motion.div>

        </div>

      </div>

      {/* 2. Main Content Grid: Asset Registry Table + Right Details Drawer */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Asset Registry Table */}
        <div className={`glass-panel rounded-2xl p-5 ${selectedAsset ? "lg:col-span-7 xl:col-span-8" : "lg:col-span-12"}`}>
          
          {/* Table Header Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center space-x-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Asset Registry</h3>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  placeholder="Search assets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-100 border border-slate-200 text-slate-900 text-xs pl-8 pr-3 py-1.5 rounded-xl placeholder-slate-400 focus:outline-none focus:border-blue-500 w-48"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                {(["ALL", "NOMINAL", "DEGRADED", "FAULT"] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-black transition ${
                      statusFilter === status ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
              
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-white hover:bg-slate-50 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 flex items-center space-x-1.5 transition shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Export</span>
              </motion.button>
            </div>
          </div>

          <div className="text-right text-[10px] text-slate-500 mb-2 font-mono">
            Showing {filteredAssets.length} of {assets.length} monitored nodes
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase">
                  <th className="pb-3 pl-2">Asset ID</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Location / Corridor</th>
                  <th className="pb-3">Status (TMS)</th>
                  <th className="pb-3">Last Maint.</th>
                  <th className="pb-3 text-right pr-2">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredAssets.map((asset) => {
                  const isSelected = selectedAsset?.id === asset.id;
                  return (
                    <motion.tr
                      key={asset.id}
                      whileHover={{ backgroundColor: "rgba(241,245,249,0.7)" }}
                      onClick={() => setSelectedAsset(asset)}
                      className={`cursor-pointer transition-all ${
                        isSelected 
                          ? "bg-blue-50/70 border-l-4 border-l-blue-600" 
                          : ""
                      }`}
                    >
                      <td className="py-3.5 pl-2 font-black text-blue-600 flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                        <span>{asset.id}</span>
                      </td>
                      <td className="py-3.5 text-slate-900 font-sans font-bold">
                        {asset.type}
                      </td>
                      <td className="py-3.5 text-slate-600 font-sans">{asset.location}</td>
                      <td className="py-3.5 font-sans">
                        <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase inline-flex items-center space-x-1 border ${
                          asset.status === "NOMINAL"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : asset.status === "DEGRADED"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}>
                          <span>●</span>
                          <span>{asset.status}</span>
                        </span>
                      </td>
                      <td className="py-3.5 font-mono text-[11px] text-slate-500">{asset.lastMaint}</td>
                      <td className="py-3.5 text-right pr-2">
                        <span className="text-xs font-bold text-blue-600 hover:underline">
                          Inspect →
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>

        {/* 3. Right Slide-out Details Drawer */}
        <AnimatePresence>
          {selectedAsset && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="lg:col-span-5 xl:col-span-4 glass-panel rounded-2xl p-5 border-l-4 border-l-blue-600 space-y-5"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                    {selectedAsset.id}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase border ${
                    selectedAsset.status === "NOMINAL" ? "bg-blue-50 text-blue-700 border-blue-200" :
                    selectedAsset.status === "DEGRADED" ? "bg-amber-50 text-amber-700 border-amber-200" :
                    "bg-rose-50 text-rose-700 border-rose-200"
                  }`}>
                    {selectedAsset.status}
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedAsset(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  {selectedAsset.type === "Block Signal" ? "Block Signal Controller" : selectedAsset.type}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">
                  📍 {selectedAsset.location}
                </p>
              </div>

              {/* TDMS Latency & Signal Strength Chart */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between text-[10px] font-black text-slate-600 uppercase tracking-wider mb-2">
                  <span>TDMS Latency & Signal Strength</span>
                  <span className="text-blue-600 font-mono">Real-time Oscilloscope</span>
                </div>

                {/* Bar Chart Visualization */}
                <div className="h-20 flex items-end justify-between space-x-1 pt-4 pb-1 border-b border-slate-200 relative">
                  {/* Warning threshold dotted line */}
                  <div className="absolute top-4 left-0 right-0 border-t border-dashed border-amber-400"></div>
                  
                  {[30, 45, 55, 75, 88, 95, 90, 80, 50, 40].map((val, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ height: 0 }}
                      animate={{ height: `${val}%` }}
                      transition={{ duration: 0.5, delay: idx * 0.03 }}
                      className={`w-full rounded-t-sm transition-all ${
                        val > 70 ? "bg-amber-500" : "bg-blue-600"
                      }`}
                    ></motion.div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 mt-2">
                  <span>-12h historical</span>
                  <span className="text-amber-600 font-bold tracking-wider uppercase animate-pulse">Live Warning (142ms)</span>
                </div>
              </div>

              {/* Specification Key-Value Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-black text-slate-500 uppercase block">Manufacturer</span>
                  <span className="text-slate-900 font-bold">{selectedAsset.manufacturer || "Voestalpine / Siemens"}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-black text-slate-500 uppercase block">Install Date</span>
                  <span className="font-mono text-slate-900 font-bold">{selectedAsset.installDate || "2019-06-15"}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-black text-slate-500 uppercase block">Firmware</span>
                  <span className="font-mono text-amber-600 font-bold">{selectedAsset.firmware || "v4.1.2 (Outdated)"}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-black text-slate-500 uppercase block">Power Draw</span>
                  <span className="text-slate-900 font-bold">{selectedAsset.powerDraw || "42W (Nominal)"}</span>
                </div>
              </div>

              {/* Work Orders List for Asset */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  <span>Enqueued Work Orders</span>
                  <span className="text-blue-600 font-mono font-bold">{workOrders.length} Total</span>
                </div>
                {workOrders.length === 0 ? (
                  <div className="text-[11px] text-slate-400 font-mono italic py-1">No active maintenance work orders enqueued.</div>
                ) : (
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {workOrders.map((wo: any) => (
                      <div key={wo.id} className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-200 text-xs flex flex-col space-y-1">
                        <div className="flex items-center justify-between font-mono text-[10px] font-bold">
                          <span className="text-blue-900">WO #{wo.id} ({wo.department})</span>
                          <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[9px] uppercase font-black">{wo.urgency}</span>
                        </div>
                        <p className="text-[11px] text-slate-700">{wo.notes}</p>
                        <div className="text-[9px] font-mono text-slate-500 flex justify-between">
                          <span>Target Asset: {wo.assetId || selectedAsset.id}</span>
                          <span>Est: {wo.duration}m</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Logs Timeline */}
              <div className="space-y-3 pt-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  Sensor Telemetry Logs
                </span>

                <div className="space-y-3 pl-2 border-l border-slate-200 relative text-xs">
                  {/* Log 1 */}
                  <div className="relative pl-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 absolute -left-[17px] top-1"></div>
                    <span className="text-[10px] font-mono text-amber-700 font-bold block">TODAY, 14:32</span>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      Telemetry packet drop rate exceeded 5% threshold. TDMS re-sync initiated.
                    </p>
                  </div>

                  {/* Log 2 */}
                  <div className="relative pl-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-600 absolute -left-[17px] top-1"></div>
                    <span className="text-[10px] font-mono text-slate-500 block">2024-05-10, 09:15</span>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      Routine visual inspection passed. Minor rust on casing noted.
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottom Drawer Actions */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-200">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onOpenCadMap && onOpenCadMap(selectedAsset.id)}
                  className="bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold py-2.5 px-3 rounded-xl border border-slate-200 transition flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>View CAD Map</span>
                </motion.button>

                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onCreateWorkOrder(selectedAsset.id)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black py-2.5 px-3 rounded-xl shadow-xs transition flex items-center justify-center space-x-1.5"
                >
                  <Wrench className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Create Work Order</span>
                </motion.button>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>

    </div>
  );
};


