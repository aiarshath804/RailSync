import React, { useState, useEffect, useCallback } from "react";
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
  Search,
  Radio
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Language, translations } from "../lib/translations";
import { LiveDataError } from "./LiveDataError";

export interface AssetRecord {
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

interface AssetsViewProps {
  workOrders?: any[];
  onCreateWorkOrder: (assetId: string) => void;
  onOpenCadMap?: (assetId: string) => void;
  lang?: Language;
}

export const AssetsView: React.FC<AssetsViewProps> = ({ 
  workOrders = [], 
  onCreateWorkOrder, 
  onOpenCadMap, 
  lang = "EN" 
}) => {
  const t = translations[lang] || translations.EN;
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<AssetRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("" );
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Dynamic fetch of assets from backend API
  const fetchAssets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/assets");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const mapped: AssetRecord[] = data.map((item: any) => ({
          id: String(item.asset_id || item.id),
          type: item.asset_type === "TRACK" ? "High-Speed Rail" : item.asset_type === "SIGNAL" ? "Block Signal" : item.asset_type === "OHE" ? "Catenary Line" : (item.asset_type || "Railway Infrastructure"),
          location: item.line_section ? `MAS-TRL ${item.line_section}` : `Block B${item.id || 1} (KM ${item.start_km || 0.0} - ${item.end_km || 5.0})`,
          status: (item.status === "FAULT" || item.status === "DEGRADED") ? item.status : "NOMINAL",
          lastMaint: item.last_maintenance || "Active Log",
          manufacturer: item.asset_type === "SIGNAL" ? "Siemens Mobility" : item.asset_type === "OHE" ? "Alstom Grid" : "Voestalpine AG",
          installDate: item.install_date || "2020-01-01",
          firmware: item.asset_type === "SIGNAL" ? "v4.2.0 (Solid State Interlocking)" : "N/A",
          powerDraw: item.asset_type === "OHE" ? "25kV AC" : item.asset_type === "SIGNAL" ? "42W (Aspect Unit)" : "0W (Track Rail)"
        }));
        setAssets(mapped);
        setSelectedAsset(mapped[0]);
      } else {
        throw new Error("No usable asset data returned from API.");
      }
    } catch (err) {
      console.error("Failed to load live assets:", err);
      setError("Error occurred while loading live data.");
      setAssets([]);
      setSelectedAsset(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const filteredAssets = assets.filter(a => {
    const matchesSearch = a.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          a.type.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          a.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const nominalCount = assets.filter(a => a.status === "NOMINAL").length;
  const degradedCount = assets.filter(a => a.status === "DEGRADED").length;
  const faultCount = assets.filter(a => a.status === "FAULT").length;
  const healthPercentage = assets.length > 0 ? ((nominalCount / assets.length) * 100).toFixed(1) : "0.0";

  if (isLoading) {
    return (
      <div id="assets-loading-state" className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 min-h-[400px]">
        <div className="bg-white border border-slate-300 rounded-2xl p-8 shadow-xs max-w-md w-full text-center space-y-4">
          <div className="relative w-12 h-12 mx-auto">
            <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-amber-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Radio className="w-4 h-4 text-slate-700 animate-pulse" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 font-serif uppercase tracking-tight">
              CONNECTING TO ASSET TELEMETRY API
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-1">
              Querying live infrastructure registry & telemetry feed...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || assets.length === 0) {
    return (
      <div className="flex-1 flex flex-col p-4 sm:p-6 bg-slate-100">
        <LiveDataError 
          message="Error occurred while loading live data." 
          onRetry={fetchAssets}
        />
      </div>
    );
  }

  return (
    <div id="assets-view-container" className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto max-w-full bg-slate-100 font-sans">
      
      {/* Official Government Ministry Header Ribbon */}
      <div className="bg-slate-900 border-l-4 border-l-amber-500 border border-slate-800 rounded-lg p-3 sm:p-4 mb-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-white">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-mono text-amber-400 font-bold uppercase tracking-widest font-serif">
            <span>{t.govtTitle}</span>
            <span>•</span>
            <span className="text-slate-300">TMS / SMMS / TDMS</span>
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
            <div className="text-emerald-400 font-bold">{healthPercentage}% OPTIMAL</div>
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
                LIVE REGISTRY
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 font-mono">
              Live corridor infrastructure health & telemetry registry across {assets.length} monitored assets.
            </p>
          </div>

          <div className="flex items-center space-x-12 mt-5 pt-4 border-t border-slate-200">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 block font-sans">
                GLOBAL HEALTH INDEX
              </span>
              <div className="flex items-center space-x-3 mt-1">
                <span className="text-3xl font-black text-blue-950 font-mono">{healthPercentage}%</span>
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
            </div>

            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 block font-sans">
                CRITICAL ANOMALIES
              </span>
              <div className="text-3xl font-black text-rose-700 mt-1 font-mono">{faultCount + degradedCount}</div>
            </div>

            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 block font-sans">
                MONITORED ASSETS
              </span>
              <div className="text-3xl font-black text-slate-900 mt-1 font-mono">{assets.length}</div>
            </div>
          </div>
        </div>

        {/* Right Stats: Track Segments & Signal Posts (Span 4) */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          
          {/* Track Segments */}
          <div className="bg-white border border-slate-300 rounded-lg p-5 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 font-mono">
                NOMINAL ASSETS
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
                {nominalCount} <span className="text-xs font-semibold text-slate-500">/ {assets.length}</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-900">
              <ArrowUp className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>

          {/* Signal Posts / Anomalies */}
          <div className="bg-white border border-slate-300 rounded-lg p-5 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 font-mono">
                MAINTENANCE REQUIRED
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
                {degradedCount + faultCount} <span className="text-xs font-black text-amber-700 ml-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-mono">{faultCount} FAULT</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <TrafficCone className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>

        </div>

      </div>

      {/* 2. Main Content Grid: Asset Registry Table + Right Details Drawer */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Asset Registry Table */}
        <div className={`bg-white border border-slate-300 rounded-lg p-5 shadow-xs ${selectedAsset ? "lg:col-span-7 xl:col-span-8" : "lg:col-span-12"}`}>
          
          {/* Table Header Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center space-x-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider font-serif">Asset Registry</h3>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  placeholder="Search assets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-100 border border-slate-200 text-slate-900 text-xs pl-8 pr-3 py-1.5 rounded-xl placeholder-slate-400 focus:outline-none focus:border-blue-500 w-48 font-mono"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200 font-mono">
                {(["ALL", "NOMINAL", "DEGRADED", "FAULT"] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-black transition cursor-pointer ${
                      statusFilter === status ? "bg-blue-900 text-white" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase">
                  <th className="pb-3 pl-2">Asset ID</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Location Segment</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Last Maint</th>
                  <th className="pb-3 text-right pr-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAssets.map(asset => (
                  <tr 
                    key={asset.id}
                    onClick={() => setSelectedAsset(asset)}
                    className={`hover:bg-slate-50 transition cursor-pointer ${
                      selectedAsset?.id === asset.id ? "bg-blue-50/60 font-bold" : ""
                    }`}
                  >
                    <td className="py-3 pl-2 text-blue-900 font-black">{asset.id}</td>
                    <td className="py-3 text-slate-700 font-sans">{asset.type}</td>
                    <td className="py-3 text-slate-600">{asset.location}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        asset.status === "NOMINAL" ? "bg-emerald-100 text-emerald-800" :
                        asset.status === "DEGRADED" ? "bg-amber-100 text-amber-800" :
                        "bg-rose-100 text-rose-800"
                      }`}>
                        {asset.status}
                      </span>
                    </td>
                    <td className="py-3 text-slate-500">{asset.lastMaint}</td>
                    <td className="py-3 text-right pr-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onCreateWorkOrder(asset.id);
                        }}
                        className="p-1 text-slate-400 hover:text-blue-600 transition"
                        title="Create Work Order"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Asset Details Drawer */}
        {selectedAsset && (
          <div className="lg:col-span-5 xl:col-span-4 bg-white border border-slate-300 rounded-lg p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase block">ASSET TELEMETRY</span>
                <h3 className="text-base font-black text-slate-900 font-mono">{selectedAsset.id}</h3>
              </div>
              <span className={`px-2.5 py-1 rounded text-xs font-bold font-mono ${
                selectedAsset.status === "NOMINAL" ? "bg-emerald-100 text-emerald-800" :
                selectedAsset.status === "DEGRADED" ? "bg-amber-100 text-amber-800" :
                "bg-rose-100 text-rose-800"
              }`}>
                {selectedAsset.status}
              </span>
            </div>

            <div className="space-y-3 text-xs font-sans">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Component Type</label>
                <div className="font-bold text-slate-900">{selectedAsset.type}</div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Location Segment</label>
                <div className="text-slate-700 font-mono text-xs">{selectedAsset.location}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Manufacturer</label>
                  <div className="text-slate-800 font-semibold">{selectedAsset.manufacturer || "N/A"}</div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Install Date</label>
                  <div className="text-slate-800 font-semibold font-mono">{selectedAsset.installDate || "N/A"}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Firmware / Spec</label>
                  <div className="text-slate-800 font-semibold font-mono text-[11px]">{selectedAsset.firmware || "N/A"}</div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Power Rating</label>
                  <div className="text-slate-800 font-semibold font-mono">{selectedAsset.powerDraw || "N/A"}</div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center space-x-2">
              <button
                onClick={() => onCreateWorkOrder(selectedAsset.id)}
                className="flex-1 py-2.5 bg-blue-950 hover:bg-blue-900 text-amber-400 rounded-xl font-bold text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer font-mono"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Create Work Order</span>
              </button>
              {onOpenCadMap && (
                <button
                  onClick={() => onOpenCadMap(selectedAsset.id)}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer font-mono"
                  title="Open GIS / CAD Map"
                >
                  <Layers className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
