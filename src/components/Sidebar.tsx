import React from "react";
import { 
  BarChart2, 
  Share2, 
  Sparkles, 
  Wrench, 
  History, 
  AlertTriangle, 
  Train, 
  Activity,
  Cpu,
  X,
  User
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Language, translations } from "../lib/translations";

export type DepartmentCode = "TMS" | "SMMS" | "TDMS" | "AI_INSIGHTS";

interface SidebarProps {
  activeDept: DepartmentCode;
  setActiveDept: (dept: DepartmentCode) => void;
  onEmergencyStop: () => void;
  lang?: Language;
  onOpenLogs?: () => void;
  onOpenMaintenance?: () => void;
  onOpenProfile?: () => void;
  onOpenAnalytics?: () => void;
  onOpenDataPipeline?: () => void;
  activeTab?: string;
  showEmergencyTop?: boolean;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeDept,
  setActiveDept,
  onEmergencyStop,
  lang = "EN",
  onOpenLogs,
  onOpenMaintenance,
  onOpenProfile,
  onOpenAnalytics,
  onOpenDataPipeline,
  activeTab,
  showEmergencyTop = false,
  isOpenMobile = false,
  onCloseMobile
}) => {
  const t = translations[lang] || translations.EN;

  const departments = [
    { code: "TMS", label: t.tmsDept, icon: Train, badge: "98% Normal" },
    { code: "SMMS", label: t.smmsDept, icon: BarChart2, badge: "1 Warning" },
    { code: "TDMS", label: t.tdmsDept, icon: Share2, badge: "25kV Stable" },
    { code: "AI_INSIGHTS", label: t.aiDept, icon: Sparkles, badge: "Gemini 2.5" },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <AnimatePresence>
        {isOpenMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCloseMobile}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Main Sidebar (Responsive: drawer on mobile, fixed width on md+) */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50 md:z-10
          w-72 md:w-64 md:min-w-[16rem] bg-slate-900 border-r border-slate-800 text-slate-100
          flex flex-col justify-between p-3.5 shrink-0 select-none shadow-lg transition-transform duration-300 ease-in-out font-sans
          ${isOpenMobile ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <div className="space-y-3.5">
          
          {/* Top Row on Mobile: Close button */}
          <div className="flex items-center justify-between md:hidden pb-2 border-b border-slate-800">
            <div className="text-xs font-black text-amber-400 flex items-center space-x-1.5 font-mono uppercase tracking-wider">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>MINISTRY CONTROL CONSOLE</span>
            </div>
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* System Control Profile widget - Government Portal Badge */}
          <motion.div 
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              if (onOpenProfile) onOpenProfile();
              if (onCloseMobile) onCloseMobile();
            }}
            className="flex items-center space-x-3 p-3 rounded-lg bg-slate-950 border border-amber-500/40 shadow-xs cursor-pointer hover:border-amber-400 transition"
            title="View Controller Profile & Shift Console"
          >
            <div className="relative">
              <div className="w-9 h-9 rounded bg-blue-950 border border-amber-400 text-amber-400 flex items-center justify-center font-mono font-black text-xs shadow-xs">
                RTC
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full animate-pulse"></span>
            </div>
            <div>
              <div className="text-xs font-black text-white flex items-center space-x-1 font-serif">
                <span>Sector Controller</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono font-bold">
                Console: <span className="text-amber-400">IR-NDLS-04</span>
              </div>
            </div>
          </motion.div>

          {/* Emergency Stop Button (Top position) */}
          {showEmergencyTop && (
            <motion.button
              onClick={() => {
                onEmergencyStop();
                if (onCloseMobile) onCloseMobile();
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              className="w-full bg-rose-700 hover:bg-rose-600 text-white text-xs font-black py-2.5 px-3 rounded-md shadow-sm transition flex items-center justify-center space-x-2 border border-rose-500 tracking-wider uppercase font-sans cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4 text-amber-300 animate-bounce" />
              <span>{t.emergencyHalt}</span>
            </motion.button>
          )}

          {/* Navigation / Department Selection items */}
          <div className="space-y-1 pt-1">
            <div className="text-[9px] font-black uppercase tracking-widest text-amber-400/90 px-2 py-1 font-mono border-b border-slate-800 flex justify-between items-center">
              <span>SUBSYSTEM TELEMETRY</span>
              <span className="text-[8px] text-emerald-400">ONLINE</span>
            </div>

            {departments.map((dept) => {
              const Icon = dept.icon;
              const isActive = activeDept === dept.code;
              return (
                <motion.button
                  key={dept.code}
                  onClick={() => {
                    setActiveDept(dept.code as DepartmentCode);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-bold transition-all border cursor-pointer ${
                    isActive
                      ? "bg-amber-500 text-slate-950 border-amber-400 font-black shadow-xs"
                      : "text-slate-300 hover:bg-slate-800/90 hover:text-white border-transparent"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? "text-slate-950" : dept.code === "AI_INSIGHTS" ? "text-amber-400" : "text-slate-400"}`} />
                    <span>{dept.code}</span>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                    isActive ? "bg-slate-950 text-amber-300 font-bold" : "bg-slate-800 text-slate-400"
                  }`}>
                    {dept.badge}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Bottom links & Emergency button */}
        <div className="space-y-1 pt-3 border-t border-slate-800">
          <motion.button
            onClick={() => {
              if (onOpenDataPipeline) onOpenDataPipeline();
              if (onCloseMobile) onCloseMobile();
            }}
            whileHover={{ x: 2 }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-bold text-amber-400 bg-slate-950 border border-amber-500/40 hover:border-amber-400 hover:bg-slate-900 transition cursor-pointer"
          >
            <div className="flex items-center space-x-2.5">
              <Cpu className="w-4 h-4 text-amber-400" />
              <span>Data Pipeline (Step 2)</span>
            </div>
            <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-amber-950 text-amber-300 border border-amber-700">
              CSV/JSON
            </span>
          </motion.button>

          <motion.button
            onClick={() => {
              if (onOpenAnalytics) onOpenAnalytics();
              if (onCloseMobile) onCloseMobile();
            }}
            whileHover={{ x: 2 }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-bold transition cursor-pointer ${
              activeTab === "analytics"
                ? "bg-amber-500 text-slate-950 shadow-xs border border-amber-400"
                : "text-slate-200 hover:text-white hover:bg-slate-800/90"
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Activity className={`w-4 h-4 ${activeTab === "analytics" ? "text-slate-950" : "text-amber-400"}`} />
              <span>{t.navAnalytics}</span>
            </div>
            <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
              activeTab === "analytics" ? "bg-slate-950 text-amber-300 font-bold" : "bg-emerald-950 text-emerald-300 border border-emerald-800"
            }`}>
              AUDIT
            </span>
          </motion.button>

          <motion.button
            onClick={() => {
              if (onOpenMaintenance) onOpenMaintenance();
              if (onCloseMobile) onCloseMobile();
            }}
            whileHover={{ x: 2 }}
            className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-md text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <Wrench className="w-4 h-4 text-amber-400" />
            <span>Maintenance Windows</span>
          </motion.button>

          <motion.button
            onClick={() => {
              if (onOpenLogs) onOpenLogs();
              if (onCloseMobile) onCloseMobile();
            }}
            whileHover={{ x: 2 }}
            className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-md text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <History className="w-4 h-4 text-amber-400" />
            <span>Dispatch History</span>
          </motion.button>

          {!showEmergencyTop && (
            <motion.button
              onClick={() => {
                onEmergencyStop();
                if (onCloseMobile) onCloseMobile();
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              className="w-full bg-rose-700 hover:bg-rose-600 text-white text-xs font-black py-2.5 px-3 rounded-md shadow-sm transition flex items-center justify-center space-x-2 border border-rose-500 tracking-wider uppercase mt-2 cursor-pointer font-sans"
            >
              <AlertTriangle className="w-4 h-4 text-amber-300 animate-bounce" />
              <span>EMERGENCY NETWORK HALT</span>
            </motion.button>
          )}
        </div>
      </aside>
    </>
  );
};


