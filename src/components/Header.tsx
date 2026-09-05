import React, { useState } from "react";
import { 
  Bell, 
  Settings, 
  HelpCircle, 
  Search,
  Train,
  Activity,
  Zap,
  Eye,
  Sliders,
  Menu,
  User,
  Shield,
  Globe,
  Radio,
  FileText,
  AlertTriangle,
  ChevronDown,
  Play,
  Square,
  LogOut,
  UserCheck,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Language, translations } from "../lib/translations";
import { useLiveData } from "../contexts/LiveDataContext";
import { useAuth } from "../contexts/AuthContext";
import { UserRole } from "../types";

export type NavTab = "network" | "corridors" | "prioritization" | "ml_intelligence" | "schedules" | "assets" | "analytics";

interface HeaderProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  lang: Language;
  setLang: (lang: Language) => void;
  onNotificationsClick?: () => void;
  onSettingsClick?: () => void;
  onProfileClick?: () => void;
  onOpenAdvisoryModal?: () => void;
  onDataPipelineClick?: () => void;
  onSafetyGuardrailClick?: () => void;
  unreadAlertsCount?: number;
  opacityLevel?: number;
  setOpacityLevel?: (val: number) => void;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  lang,
  setLang,
  opacityLevel = 1,
  setOpacityLevel,
  onToggleSidebar,
  onNotificationsClick,
  onSettingsClick,
  onProfileClick,
  onOpenAdvisoryModal,
  onDataPipelineClick,
  onSafetyGuardrailClick,
  unreadAlertsCount = 0
}) => {
  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg">("base");
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const t = translations[lang] || translations.EN;
  const { controlState, handleControlAction } = useLiveData();
  const { user, logout, demoAccounts, loginAsDemoRole, hasPermission } = useAuth();
  const isLiveActive = controlState.pollingEnabled;

  const allNavItems: { id: NavTab; label: string; code: string; perm?: string }[] = [
    { id: "network", label: t.navNetwork, code: "SYS-01", perm: "VIEW_LIVE_OPERATIONS" },
    { id: "corridors", label: t.navCorridors, code: "SEC-07", perm: "VIEW_CORRIDOR" },
    { id: "prioritization", label: t.navPrioritization || "AI Prioritization", code: "PRI-02", perm: "VIEW_PRIORITIZATION" },
    { id: "ml_intelligence", label: "ML Intelligence", code: "ML-RF", perm: "VIEW_ML_INTELLIGENCE" },
    { id: "schedules", label: t.navSchedules, code: "COA-4", perm: "VIEW_SCHEDULES" },
    { id: "assets", label: t.navAssets, code: "TMS-8", perm: "VIEW_ALL_REQUESTS" },
    { id: "analytics", label: t.navAnalytics, code: "ANL-09", perm: "VIEW_ANALYTICS" },
  ];

  const navItems = allNavItems.filter((item) => !item.perm || hasPermission(item.perm));

  const getRoleColor = (role?: string) => {
    switch (role) {
      case "ADMINISTRATOR":
        return { bg: "bg-amber-600", text: "text-amber-400", border: "border-amber-400", badge: "bg-amber-100 text-amber-900 border-amber-300" };
      case "ENGINEERING":
        return { bg: "bg-emerald-600", text: "text-emerald-400", border: "border-emerald-400", badge: "bg-emerald-100 text-emerald-900 border-emerald-300" };
      case "TRACTION":
        return { bg: "bg-cyan-600", text: "text-cyan-400", border: "border-cyan-400", badge: "bg-cyan-100 text-cyan-900 border-cyan-300" };
      case "SIGNAL_TELECOM":
        return { bg: "bg-indigo-600", text: "text-indigo-400", border: "border-indigo-400", badge: "bg-indigo-100 text-indigo-900 border-indigo-300" };
      case "OPERATIONS_CONTROLLER":
        return { bg: "bg-rose-600", text: "text-rose-400", border: "border-rose-400", badge: "bg-rose-100 text-rose-900 border-rose-300" };
      default:
        return { bg: "bg-blue-600", text: "text-blue-400", border: "border-blue-400", badge: "bg-blue-100 text-blue-900 border-blue-300" };
    }
  };

  const roleStyles = getRoleColor(user?.role);

  return (
    <header className="w-full sticky top-0 z-40 flex flex-col shadow-md font-sans select-none">
      
      {/* 1. TOP UTILITY RIBBON (Govt Portal Header Bar) */}
      <div className="bg-slate-900 text-slate-200 text-[11px] px-3 sm:px-8 py-1 flex items-center justify-between border-b border-amber-500/30 relative">
        {/* Top Tricolor Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-orange-500 via-white to-emerald-600"></div>

        {/* Left Side: Official Ministry Branding */}
        <div className="flex items-center space-x-2 sm:space-x-3 pt-0.5">
          <div className="flex items-center space-x-1.5 font-bold tracking-wide text-amber-400 font-serif">
            <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">{t.govtTitle}</span>
          </div>
          <span className="hidden md:inline-block text-slate-500">|</span>
          <span className="hidden lg:inline-block text-slate-400 font-mono text-[10px]">
            {t.govtSubtitle}
          </span>
        </div>

        {/* Right Side: Govt Portal Controls (Accessibility, 3-Language Toggle, Server Clock) */}
        <div className="flex items-center space-x-2 sm:space-x-4 pt-0.5 text-[10px] font-mono">
          {/* Live Server Clock */}
          <div className="hidden lg:flex items-center space-x-1 text-emerald-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{t.istClock}</span>
          </div>

          <span className="hidden sm:inline text-slate-600">|</span>

          {/* Text Size Controls */}
          <div className="hidden sm:flex items-center space-x-1 text-slate-300 font-sans">
            <span className="text-[9px] text-slate-400 uppercase font-bold mr-0.5">Size:</span>
            <button 
              onClick={() => setFontSize("sm")} 
              className={`px-1 rounded hover:bg-slate-800 cursor-pointer ${fontSize === "sm" ? "text-amber-400 font-bold" : ""}`}
            >
              A-
            </button>
            <button 
              onClick={() => setFontSize("base")} 
              className={`px-1 rounded hover:bg-slate-800 cursor-pointer ${fontSize === "base" ? "text-amber-400 font-bold" : ""}`}
            >
              A
            </button>
            <button 
              onClick={() => setFontSize("lg")} 
              className={`px-1 rounded hover:bg-slate-800 cursor-pointer ${fontSize === "lg" ? "text-amber-400 font-bold" : ""}`}
            >
              A+
            </button>
          </div>

          <span className="text-slate-600">|</span>

          {/* 3-Language Selector (English, हिंदी, தமிழ்) */}
          <div className="flex items-center space-x-1 bg-slate-950 px-1.5 py-0.5 rounded border border-amber-500/40 font-bold font-sans">
            <Globe className="w-3 h-3 text-amber-400 shrink-0 mr-0.5" />
            <button 
              onClick={() => setLang("EN")} 
              className={`px-1.5 py-0.5 text-[10px] rounded transition cursor-pointer ${lang === "EN" ? "bg-amber-400 text-slate-950 font-black" : "text-slate-300 hover:text-white"}`}
              title="Switch to English"
            >
              English
            </button>
            <button 
              onClick={() => setLang("HI")} 
              className={`px-1.5 py-0.5 text-[10px] rounded transition cursor-pointer ${lang === "HI" ? "bg-amber-400 text-slate-950 font-black" : "text-slate-300 hover:text-white"}`}
              title="हिंदी में बदलें"
            >
              हिंदी
            </button>
            <button 
              onClick={() => setLang("TA")} 
              className={`px-1.5 py-0.5 text-[10px] rounded transition cursor-pointer ${lang === "TA" ? "bg-amber-400 text-slate-950 font-black" : "text-slate-300 hover:text-white"}`}
              title="தமிழுக்கு மாறவும்"
            >
              தமிழ்
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN BRANDING HEADER (Emblem + System Title + Search + Actions) */}
      <div className="bg-white border-b border-slate-300 px-4 sm:px-8 py-2.5 flex items-center justify-between">
        
        {/* Left Branding with Official Emblem Badge */}
        <div className="flex items-center space-x-3.5">
          {/* Mobile Sidebar Hamburger Toggle Button (Strictly Hidden on Tablet and Desktop) */}
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="md:hidden p-2 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 hover:bg-slate-200 transition"
              title="Toggle Navigation Drawer"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div 
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => setActiveTab("corridors")}
          >
            {/* Government Seal / Crest Graphic Badge */}
            <div className="w-10 h-10 rounded-full bg-blue-950 border-2 border-amber-400 flex items-center justify-center shadow-md relative overflow-hidden group-hover:scale-105 transition shrink-0">
              <div className="absolute inset-0 bg-gradient-to-b from-amber-400/20 via-transparent to-blue-950/40"></div>
              <Train className="w-5 h-5 text-amber-400 stroke-[2.2] relative z-10" />
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight flex items-center space-x-2 font-serif uppercase">
                  <span>{lang === "EN" ? "INDIAN RAILWAYS" : lang === "HI" ? "भारतीय रेल" : "இந்திய ரயில்வே"}</span>
                </h1>
                <span className="hidden sm:inline-block text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-sans">
                  {lang === "EN" ? "OFFICIAL PORTAL" : lang === "HI" ? "आधिकारिक पोर्टल" : "அதிகாரப்பூர்வ தளம்"}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-600 font-medium font-sans flex items-center space-x-1">
                <span className="font-bold text-blue-900 font-mono uppercase">RailSync Enterprise</span>
                <span>—</span>
                <span className="text-slate-500 truncate">
                  {t.govtSubtitle}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Right Search Bar & Controller Badge */}
        <div className="flex items-center space-x-3">
          
          {/* Search Bar for Assets & Schedules */}
          {(activeTab === "assets" || activeTab === "schedules") && (
            <div className="relative hidden md:block w-56 lg:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-md pl-8 pr-3 py-1 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800 font-sans shadow-inner"
              />
            </div>
          )}

          {/* Safety Guardrail Engine Button */}
          {onSafetyGuardrailClick && (
            <button
              onClick={onSafetyGuardrailClick}
              className="text-emerald-950 bg-emerald-100 hover:bg-emerald-200 border border-emerald-400 font-bold px-2.5 py-1.5 rounded-md text-xs font-mono flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
              title="Open Railway Safety Constraints & Guardrail Engine"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-800" />
              <span className="hidden sm:inline">SAFETY ENGINE</span>
            </button>
          )}

          {/* Dataset Pipeline Button */}
          {onDataPipelineClick && (
            <button
              onClick={onDataPipelineClick}
              className="text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 font-bold px-2.5 py-1.5 rounded-md text-xs font-mono flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
              title="Open Railway Data Pipeline & Dataset Manager"
            >
              <Activity className="w-3.5 h-3.5 text-amber-800" />
              <span className="hidden sm:inline">DATA PIPELINE</span>
            </button>
          )}

          {/* Quick Notifications Button */}
          <button 
            onClick={onNotificationsClick}
            className="text-slate-700 hover:text-blue-900 transition relative p-2 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-300 cursor-pointer flex items-center justify-center"
            title="Telemetry & Dispatch Advisories"
          >
            <Bell className="w-4 h-4 text-blue-950" />
            {unreadAlertsCount > 0 && (
              <span className="w-2.5 h-2.5 bg-rose-600 text-white rounded-full absolute -top-1 -right-1 text-[8px] font-bold flex items-center justify-center animate-pulse border border-white">
                {unreadAlertsCount}
              </span>
            )}
          </button>

          {/* System Settings */}
          <button 
            onClick={onSettingsClick}
            className="hidden sm:flex text-slate-700 hover:text-blue-900 transition p-2 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-300 cursor-pointer"
            title="System Settings"
          >
            <Settings className="w-4 h-4 text-blue-950" />
          </button>

          {/* Official Officer ID Badge & Role Switcher Popover */}
          <div className="relative pl-2 border-l border-slate-300">
            <div 
              onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
              className="flex items-center space-x-2 cursor-pointer group select-none hover:opacity-90 transition-opacity"
              title="Official Officer Profile & Security Role Switcher"
            >
              <div className={`w-8 h-8 rounded ${roleStyles.bg} text-white font-mono font-black text-xs flex items-center justify-center border ${roleStyles.border} shadow-sm`}>
                {user?.avatar_init || "RS"}
              </div>
              <div className="hidden lg:block text-left font-sans">
                <div className="text-[11px] font-bold text-slate-900 leading-none flex items-center gap-1.5">
                  <span>{user?.name ? user.name.split(" ")[0] + " " + (user.name.split(" ")[1] || "") : "Officer"}</span>
                  <ChevronDown className="w-3 h-3 text-slate-500 group-hover:text-slate-900 transition-transform" />
                </div>
                <div className="text-[9px] text-slate-500 leading-tight font-mono flex items-center gap-1">
                  <span className="font-semibold text-slate-700">{user?.console_id || "SEC-ADMIN-01"}</span>
                  <span>&bull;</span>
                  <span className="truncate max-w-[80px]">{user?.role ? user.role.split("_")[0] : "ADMIN"}</span>
                </div>
              </div>
            </div>

            {/* Account & Role Switcher Dropdown */}
            <AnimatePresence>
              {isAccountMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsAccountMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 text-slate-100 z-50 font-sans"
                  >
                    {/* Header info */}
                    <div className="flex items-start justify-between pb-3 border-b border-slate-800">
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-1.5">
                          <span>{user?.name || "Officer"}</span>
                          <UserCheck className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">
                          {user?.email || "admin@railsync.gov.in"}
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${roleStyles.badge}`}>
                            {user?.role || "ADMINISTRATOR"}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            {user?.console_id || "SEC-ADMIN-01"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Department & Designation */}
                    <div className="py-2.5 text-xs text-slate-300 border-b border-slate-800 space-y-1">
                      <div className="flex justify-between text-slate-400 text-[11px]">
                        <span>Department:</span>
                        <span className="font-semibold text-slate-200">{user?.department_name || "Executive Console"}</span>
                      </div>
                      <div className="flex justify-between text-slate-400 text-[11px]">
                        <span>Clearance:</span>
                        <span className="font-semibold text-amber-400">{user?.badge_level || "Tier 1"}</span>
                      </div>
                    </div>

                    {/* Quick Switch Role Section */}
                    <div className="pt-3 pb-2">
                      <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                        <span>Switch Operational Role</span>
                        {isSwitchingRole && <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />}
                      </div>
                      <div className="grid grid-cols-1 gap-1.5">
                        {demoAccounts.map((acc) => {
                          const isCurrent = user?.role === acc.role;
                          return (
                            <button
                              key={acc.role}
                              type="button"
                              disabled={isSwitchingRole}
                              onClick={async () => {
                                if (isCurrent) return;
                                setIsSwitchingRole(true);
                                await loginAsDemoRole(acc.role as UserRole);
                                setIsSwitchingRole(false);
                                setIsAccountMenuOpen(false);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                                isCurrent
                                  ? "bg-slate-800 text-amber-400 font-bold border border-amber-500/30"
                                  : "hover:bg-slate-800/80 text-slate-300 border border-transparent"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded flex items-center justify-center font-mono text-[10px] font-bold bg-slate-800 text-slate-200">
                                  {acc.avatar_init}
                                </span>
                                <div>
                                  <span className="block leading-tight text-[11px]">{acc.role_label}</span>
                                  <span className="block text-[9px] text-slate-500 leading-none">{acc.department}</span>
                                </div>
                              </div>
                              {isCurrent && (
                                <span className="text-[9px] font-mono text-emerald-400 font-semibold uppercase">
                                  ACTIVE
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Footer Actions: Profile & Sign Out */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAccountMenuOpen(false);
                          if (onProfileClick) onProfileClick();
                        }}
                        className="text-xs text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition flex items-center gap-1.5"
                      >
                        <User className="w-3.5 h-3.5 text-blue-400" />
                        <span>Shift Console</span>
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          setIsAccountMenuOpen(false);
                          await logout();
                        }}
                        className="text-xs text-rose-400 hover:text-rose-300 px-2.5 py-1.5 rounded-lg hover:bg-rose-950/40 border border-rose-900/40 transition flex items-center gap-1.5 font-semibold"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-400" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

        </div>

      </div>

      {/* 3. GOVERNMENT MAIN NAVIGATION BAR (Classic Gov Navy Banner) */}
      <nav className="bg-blue-950 text-white px-4 sm:px-8 flex items-center justify-between border-t border-amber-400/40 shadow-inner">
        
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar py-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3.5 py-2 text-xs font-bold font-sans tracking-wide transition-all border-b-2 whitespace-nowrap flex items-center space-x-2 cursor-pointer ${
                  isActive 
                    ? "bg-white text-blue-950 border-amber-500 shadow-xs font-black rounded-t-sm" 
                    : "text-slate-200 hover:text-white hover:bg-blue-900/80 border-transparent hover:border-amber-400/50"
                }`}
              >
                <span>{item.label}</span>
                <span className={`text-[9px] font-mono px-1 rounded ${
                  isActive ? "bg-blue-950 text-amber-300" : "bg-blue-900/60 text-slate-400"
                }`}>
                  {item.code}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Nav Action: Single Start/Stop Live Data Button & Advisory */}
        <div className="flex items-center space-x-2.5 py-1 shrink-0 ml-2">
          {/* SINGLE START / STOP LIVE DATA BUTTON */}
          <button
            onClick={() => handleControlAction(isLiveActive ? "STOP" : "START")}
            disabled={controlState.loading}
            className={`text-xs font-black font-sans tracking-wider px-3 py-1.5 rounded flex items-center space-x-1.5 shadow-md transition cursor-pointer border uppercase ${
              isLiveActive
                ? "bg-rose-600 hover:bg-rose-500 text-white border-rose-400 active:scale-95"
                : "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 active:scale-95"
            }`}
            title={isLiveActive ? "Click to stop live data polling" : "Click to start live data polling"}
          >
            {isLiveActive ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current text-white shrink-0" />
                <span>STOP LIVE DATA</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current text-white shrink-0" />
                <span>START LIVE DATA</span>
              </>
            )}
          </button>

          <button
            id="btn-dispatch-advisory"
            onClick={onOpenAdvisoryModal}
            className="flex bg-amber-500 hover:bg-amber-400 text-blue-950 text-xs font-black px-3 py-1.5 rounded items-center space-x-1.5 shadow-sm transition cursor-pointer border border-amber-300 uppercase tracking-wide"
          >
            <AlertTriangle className="w-3.5 h-3.5 fill-blue-950 stroke-amber-500" />
            <span>{t.dispatchAdvisory}</span>
          </button>
        </div>

      </nav>

    </header>
  );
};




