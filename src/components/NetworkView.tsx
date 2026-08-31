import React, { useState, useEffect } from "react";
import { 
  Train, 
  Wifi, 
  ShieldCheck, 
  Plus, 
  Minus, 
  Crosshair, 
  AlertTriangle, 
  Info, 
  MoreHorizontal,
  ArrowRight,
  ExternalLink,
  Activity,
  Zap,
  Navigation
} from "lucide-react";
import { motion } from "motion/react";

import { Language, translations } from "../lib/translations";

interface NetworkViewProps {
  lang?: Language;
}

export const NetworkView: React.FC<NetworkViewProps> = ({ lang = "EN" }) => {
  const t = translations[lang] || translations.EN;
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [trainPos, setTrainPos] = useState<number>(35);
  const [train2Pos, setTrain2Pos] = useState<number>(75);
  const [signalState, setSignalState] = useState<"GREEN" | "YELLOW" | "RED">("GREEN");
  const [activeStation, setActiveStation] = useState<string | null>(null);

  // Train travel loop animation
  useEffect(() => {
    const timer = setInterval(() => {
      setTrainPos((prev) => (prev >= 92 ? 10 : prev + 0.4));
      setTrain2Pos((prev) => (prev <= 12 ? 90 : prev - 0.3));
    }, 80);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto max-w-full bg-slate-100 font-sans">
      
      {/* Official Government Ministry Header Ribbon */}
      <div className="bg-slate-900 border-l-4 border-l-amber-500 border border-slate-800 rounded-lg p-3 sm:p-4 mb-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-white">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-mono text-amber-400 font-bold uppercase tracking-widest font-serif">
            <span>{t.govtTitle}</span>
            <span>•</span>
            <span className="text-slate-300">CTC</span>
          </div>
          <h1 className="text-lg sm:text-2xl font-black text-white font-serif tracking-tight uppercase mt-0.5">
            {t.networkTitle}
          </h1>
          <p className="text-xs text-slate-300 font-sans mt-0.5">
            {t.networkSubtitle}
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-slate-950 p-2.5 rounded border border-slate-800 font-mono text-xs">
          <div>
            <div className="text-[9px] text-slate-400 uppercase font-bold">{t.telemetryLatency}</div>
            <div className="text-emerald-400 font-bold">14ms OPTICAL</div>
          </div>
        </div>
      </div>

      {/* 1. Top 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        
        {/* Card 1: Active Trains */}
        <div 
          className="bg-white rounded-lg p-5 flex flex-col justify-between border border-slate-300 border-t-4 border-t-blue-950 shadow-xs"
        >
          <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-700 font-sans">
            <span>ACTIVE CONVEYANCE ON GRID</span>
            <Train className="w-4 h-4 text-blue-950" />
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-black text-slate-900 font-mono">142</span>
            <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 font-mono">
              +12% NOMINAL
            </span>
          </div>
        </div>

        {/* Card 2: Network Latency */}
        <div 
          className="bg-white rounded-lg p-5 flex flex-col justify-between border border-slate-300 border-t-4 border-t-amber-500 shadow-xs"
        >
          <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-700 font-sans">
            <span>TELEMETRY LATENCY</span>
            <Wifi className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-black text-slate-900 font-mono">14ms</span>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono">
              STABLE
            </span>
          </div>
        </div>

        {/* Card 3: Track Health Index */}
        <div 
          className="bg-white rounded-lg p-5 flex flex-col justify-between border border-slate-300 border-t-4 border-t-emerald-700 shadow-xs"
        >
          <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-700 font-sans">
            <span>TRACK HEALTH INDEX</span>
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-black text-slate-900 font-mono">98.4%</span>
            <span className="text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-mono">
              SECURE
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Schematic Railway Map */}
      <div className="glass-panel rounded-2xl p-6 flex-1 min-h-[400px] relative flex flex-col justify-center items-center overflow-hidden mb-6">
        
        {/* Top Info Bar on the Map */}
        <div className="absolute top-4 left-6 right-6 flex items-center justify-between z-20 pointer-events-none">
          <div className="flex items-center space-x-3 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-xs pointer-events-auto">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping"></span>
            <span className="text-xs font-mono font-bold text-slate-900">CORRIDOR SECTOR 04 INTERLOCKING</span>
          </div>

          <div className="flex items-center space-x-2 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-xs pointer-events-auto">
            <span className="text-[10px] text-slate-500 font-mono font-bold">ASPECT SIGNAL:</span>
            <button 
              onClick={() => setSignalState(s => s === "GREEN" ? "YELLOW" : s === "YELLOW" ? "RED" : "GREEN")}
              className={`text-[10px] font-black px-2 py-0.5 rounded border transition ${
                signalState === "GREEN" ? "bg-blue-50 text-blue-700 border-blue-200" :
                signalState === "YELLOW" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-rose-50 text-rose-700 border-rose-200"
              }`}
            >
              {signalState} (CLICK TO CYCLE)
            </button>
          </div>
        </div>

        {/* Subtle Map / Grid Background Texture */}
        <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:28px_28px] opacity-25"></div>

        {/* The Linear Track Route Line */}
        <div 
          className="relative w-4/5 max-w-4xl h-3 bg-slate-200 rounded-full shadow-inner flex items-center transition-transform duration-300"
          style={{ transform: `scale(${zoomLevel / 100})` }}
        >
          {/* Active Glowing Track Segment */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-sky-500 to-blue-500 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.4)]"></div>

          {/* Node Station 1 (Left) */}
          <motion.div 
            whileHover={{ scale: 1.15 }}
            onClick={() => setActiveStation("SEC-A1 (New Delhi Junction)")}
            className="absolute left-[15%] -translate-x-1/2 flex flex-col items-center cursor-pointer z-10"
          >
            <div className="w-6 h-6 rounded-full bg-white border-2 border-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.3)] flex items-center justify-center">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping"></div>
            </div>
            <span className="text-[10px] text-slate-700 mt-2 font-mono font-bold bg-white px-2 py-0.5 rounded shadow-xs border border-slate-200">
              SEC-A1 (NDLS)
            </span>
          </motion.div>

          {/* Moving Train Marker 1 (TRN-8942) Eastbound */}
          <div 
            className="absolute -translate-x-1/2 z-20 flex flex-col items-center cursor-pointer group transition-all duration-100 ease-linear"
            style={{ left: `${trainPos}%` }}
          >
            {/* Tooltip Card */}
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-200 rounded-xl p-2.5 text-[10px] text-slate-900 shadow-lg mb-2 min-w-[120px]"
            >
              <div className="font-mono font-black text-blue-700 flex items-center justify-between">
                <span>VANDE BHARAT (8942)</span>
              </div>
              <div className="text-[9px] text-slate-600 mt-1 font-mono">Speed: <strong className="text-slate-900">160 km/h</strong></div>
              <div className="text-[9px] text-slate-600 font-mono">Next: <strong className="text-blue-600">SEC-B4</strong></div>
            </motion.div>

            {/* Train Badge Icon on the Track */}
            <motion.div 
              whileHover={{ scale: 1.2 }}
              className="w-7 h-7 rounded-full bg-blue-600 border-2 border-white shadow-md flex items-center justify-center text-white"
            >
              <Train className="w-4 h-4 stroke-[2.5]" />
            </motion.div>
          </div>

          {/* Node Station Mid Junction */}
          <motion.div 
            whileHover={{ scale: 1.15 }}
            onClick={() => setActiveStation("SEC-M2 (Kanpur Yard)")}
            className="absolute left-[50%] -translate-x-1/2 flex flex-col items-center cursor-pointer z-10"
          >
            <div className="w-5 h-5 rounded-full bg-white border-2 border-sky-500 shadow-xs flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-sky-500 rounded-full"></div>
            </div>
            <span className="text-[10px] text-slate-700 mt-2 font-mono font-bold bg-white px-2 py-0.5 rounded shadow-xs border border-slate-200">
              SEC-M2 (CNB)
            </span>
          </motion.div>

          {/* Moving Train Marker 2 (FRT-4099) Westbound */}
          <div 
            className="absolute -translate-x-1/2 z-20 flex flex-col items-center cursor-pointer group transition-all duration-100 ease-linear"
            style={{ left: `${train2Pos}%` }}
          >
            {/* Train Badge Icon */}
            <motion.div 
              whileHover={{ scale: 1.2 }}
              className="w-7 h-7 rounded-full bg-sky-600 border-2 border-white shadow-md flex items-center justify-center text-white"
            >
              <Train className="w-4 h-4 stroke-[2.5]" />
            </motion.div>

            {/* Bottom Tooltip */}
            <div className="bg-white border border-slate-200 rounded-xl p-2 text-[9px] text-slate-900 shadow-lg mt-2 min-w-[110px] font-mono">
              <span className="font-bold text-sky-700">FREIGHT 4099</span>
              <div className="text-[8px] text-slate-600">75 km/h • 4,100T</div>
            </div>
          </div>

          {/* Node Station 3 (Right) */}
          <motion.div 
            whileHover={{ scale: 1.15 }}
            onClick={() => setActiveStation("SEC-B4 (Varanasi Gateway)")}
            className="absolute left-[85%] -translate-x-1/2 flex flex-col items-center cursor-pointer z-10"
          >
            <div className="w-6 h-6 rounded-full bg-white border-2 border-blue-600 shadow-xs flex items-center justify-center">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            </div>
            <span className="text-[10px] text-slate-700 mt-2 font-mono font-bold bg-white px-2 py-0.5 rounded shadow-xs border border-slate-200">
              SEC-B4 (BSB)
            </span>
          </motion.div>

        </div>

        {/* Right Zoom Controls */}
        <div className="absolute right-4 bottom-4 flex flex-col space-y-1 bg-white border border-slate-200 rounded-xl p-1 z-20 shadow-sm">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setZoomLevel(prev => Math.min(prev + 10, 150))}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition"
          >
            <Plus className="w-4 h-4" />
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setZoomLevel(prev => Math.max(prev - 10, 60))}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition"
          >
            <Minus className="w-4 h-4" />
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setZoomLevel(100)}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition"
          >
            <Crosshair className="w-4 h-4" />
          </motion.button>
        </div>

      </div>

      {/* 3. Bottom Split Panels: System Alerts vs Active Corridors Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* System Alerts (Span 4) */}
        <div className="lg:col-span-4 glass-panel rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black text-slate-900 tracking-wide uppercase">System Alerts</h3>
            <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[9px] font-black px-2 py-0.5 rounded-full">
              2 Active
            </span>
          </div>

          <div className="space-y-2.5">
            
            {/* Alert 1 */}
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="bg-rose-50/80 border border-rose-200 rounded-xl p-3.5 flex items-start space-x-3"
            >
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5 animate-bounce" />
              <div>
                <h4 className="text-xs font-black text-rose-900">Switch Interlock Malfunction</h4>
                <p className="text-[10px] text-rose-700 font-mono mt-0.5">Sector B4 • Signal aspect locked to red</p>
              </div>
            </motion.div>

            {/* Alert 2 */}
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 flex items-start space-x-3"
            >
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-black text-amber-900">Schedule Headway Delay</h4>
                <p className="text-[10px] text-amber-700 font-mono mt-0.5">TRN-112 +5m • Speed regulation in effect</p>
              </div>
            </motion.div>

          </div>
        </div>

        {/* Active Corridors Status (Span 8) */}
        <div className="lg:col-span-8 glass-panel rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black text-slate-900 tracking-wide uppercase">Corridor Section Telemetry</h3>
            <button className="text-[11px] font-black text-blue-600 hover:underline uppercase tracking-wider">
              Export Telemetry →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase">
                  <th className="pb-3 pl-2">Corridor</th>
                  <th className="pb-3">Capacity Load</th>
                  <th className="pb-3">Health Status</th>
                  <th className="pb-3 text-right pr-2">Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                
                {/* Row 1 */}
                <motion.tr whileHover={{ backgroundColor: "rgba(241,245,249,0.7)" }} className="transition">
                  <td className="py-3 pl-2 font-bold text-slate-900">NDLS-CNB Trunk Route</td>
                  <td className="py-3 text-slate-600">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900">85%</span>
                      <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200">
                        <div className="bg-blue-600 h-full" style={{ width: "85%" }}></div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3">
                    <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-md text-[9px] font-sans font-black uppercase">
                      Optimal
                    </span>
                  </td>
                  <td className="py-3 text-right pr-2">
                    <button className="text-slate-400 hover:text-slate-800 p-1 transition">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </motion.tr>

                {/* Row 2 */}
                <motion.tr whileHover={{ backgroundColor: "rgba(241,245,249,0.7)" }} className="transition">
                  <td className="py-3 pl-2 font-bold text-slate-900">CNB-BSB High Density</td>
                  <td className="py-3 text-slate-600">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900">92%</span>
                      <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200">
                        <div className="bg-amber-500 h-full" style={{ width: "92%" }}></div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3">
                    <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-md text-[9px] font-sans font-black uppercase">
                      Congested
                    </span>
                  </td>
                  <td className="py-3 text-right pr-2">
                    <button className="text-slate-400 hover:text-slate-800 p-1 transition">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </motion.tr>

                {/* Row 3 */}
                <motion.tr whileHover={{ backgroundColor: "rgba(241,245,249,0.7)" }} className="transition">
                  <td className="py-3 pl-2 font-bold text-slate-900">DFC-West Dedicated Freight</td>
                  <td className="py-3 text-slate-600">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900">45%</span>
                      <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200">
                        <div className="bg-rose-500 h-full" style={{ width: "45%" }}></div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3">
                    <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-md text-[9px] font-sans font-black uppercase">
                      Maintenance
                    </span>
                  </td>
                  <td className="py-3 text-right pr-2">
                    <button className="text-slate-400 hover:text-slate-800 p-1 transition">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </motion.tr>

              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
};


