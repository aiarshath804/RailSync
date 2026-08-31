import React, { useState, useEffect } from "react";
import { Header, NavTab } from "./components/Header";
import { Sidebar, DepartmentCode } from "./components/Sidebar";
import { CorridorsView } from "./components/CorridorsView";
import { NetworkView } from "./components/NetworkView";
import { AssetsView } from "./components/AssetsView";
import { SchedulesView } from "./components/SchedulesView";
import { EmergencyModal } from "./components/EmergencyModal";
import { WorkOrderModal } from "./components/WorkOrderModal";
import { AIInsightsModal } from "./components/AIInsightsModal";
import { NotificationsModal, NotificationItem } from "./components/NotificationsModal";
import { SettingsModal, AppSettingsState } from "./components/SettingsModal";
import { ProfileModal, OperatorProfile } from "./components/ProfileModal";
import { CadMapModal } from "./components/CadMapModal";
import { AnalyticsView } from "./components/AnalyticsView";
import { motion, AnimatePresence } from "motion/react";
import { Language, translations } from "./lib/translations";

export default function App() {
  // Navigation & View States
  const [activeTab, setActiveTab] = useState<NavTab>("corridors");
  const [activeDept, setActiveDept] = useState<DepartmentCode>("SMMS");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [lang, setLang] = useState<Language>("EN");

  // Modals States
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [isWorkOrderModalOpen, setIsWorkOrderModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCadModalOpen, setIsCadModalOpen] = useState(false);
  const [selectedAssetForCad, setSelectedAssetForCad] = useState<string | null>("TRK-01");
  const [selectedAssetForWorkOrder, setSelectedAssetForWorkOrder] = useState<string | null>("SIG-44B1");

  // Dynamic Train Schedules State (Strictly Maintaining 5 Trains Allocation as Requested)
  const [trains, setTrains] = useState<any[]>([
    { id: "R-104", train_number: "12301", name: "Rajdhani Express", cat: "RAJDHANI", route: "NDLS → MMCT", arr: "14:30", dep: "14:45", priority: "P1 - Critical", status: "On Time", statusColor: "text-blue-600" },
    { id: "F-882", train_number: "58201", name: "Heavy Goods Freight", cat: "FREIGHT", route: "HWH → BSL", arr: "15:10", dep: "--:--", priority: "P3 - Standard", status: "Conflict", statusColor: "text-rose-600" },
    { id: "E-210", train_number: "12123", name: "Deccan Queen Express", cat: "RAJDHANI", route: "PUNE → CSMT", arr: "15:45", dep: "15:50", priority: "P2 - Elevated", status: "On Time", statusColor: "text-blue-600" },
    { id: "R-106", train_number: "20901", name: "Vande Bharat Express", cat: "RAJDHANI", route: "SBC → NDLS", arr: "16:20", dep: "16:35", priority: "P1 - Critical", status: "Delayed +15m", statusColor: "text-amber-600" },
    { id: "S-405", train_number: "12004", name: "Shatabdi Express", cat: "RAJDHANI", route: "CNB → LKO", arr: "17:05", dep: "17:15", priority: "P2 - High Priority", status: "On Time", statusColor: "text-blue-600" },
  ]);

  // Dynamic Work Orders State
  const [workOrders, setWorkOrders] = useState<any[]>([
    {
      id: 101,
      assetId: "SIG-44B1",
      department: "SMMS",
      urgency: "HIGH",
      duration: 90,
      status: "PENDING",
      notes: "Replace degraded point circuit breaker and re-align telemetry packet transmitter.",
      created_at: "Today 04:15"
    },
    {
      id: 102,
      assetId: "TRK-01",
      department: "TMS",
      urgency: "HIGH",
      duration: 120,
      status: "BUNDLED",
      notes: "Acoustic micro-crack vibration detected on UP Main line weld joint.",
      created_at: "Today 02:30"
    }
  ]);

  // Notifications State
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "notif-1",
      title: "Thermite Weld Stress Warning",
      message: "Sensor TRK-01 (KM 4.2) detected micro-fracture acoustic frequency. Speed restricted to 30 km/h.",
      timestamp: "2m ago",
      type: "critical",
      sector: "TRK-01 / NEC-11",
      read: false
    },
    {
      id: "notif-2",
      title: "Point Machine 44B Lubrication Due",
      message: "SMMS diagnostics suggest bundling with upcoming Track Machine (TMS) block at 14:30.",
      timestamp: "12m ago",
      type: "warning",
      sector: "SIG-44B1",
      read: false
    },
    {
      id: "notif-3",
      title: "Rajdhani Express (12301) Green Wave Clear",
      message: "Automated route locked through Ghaziabad Junction with 15-minute headway buffer.",
      timestamp: "24m ago",
      type: "info",
      sector: "GZB Interlocking",
      read: true
    },
    {
      id: "notif-4",
      title: "OHE Substation 02 Normalization",
      message: "Traction voltage steady at 25.4 kV across Kanpur - Prayagraj Trunk corridor.",
      timestamp: "45m ago",
      type: "success",
      sector: "TDMS / Sub-02",
      read: true
    }
  ]);

  // System Settings State
  const [settings, setSettings] = useState<AppSettingsState>({
    glassTransparency: 1,
    refreshIntervalMs: 1000,
    audioEnabled: true,
    alertVolume: 80,
    signalGlowIntensity: "high",
    showHudTelemetry: true,
    autoConflictDetection: true,
    safetyBufferMinutes: 15,
    stationId: "IR-NDLS-04",
    autoScrollTimetable: true
  });

  // Operator Profile State
  const [profile, setProfile] = useState<OperatorProfile>({
    name: "Sarah Chen",
    role: "Chief Corridor Controller",
    consoleId: "IR-NDLS-04",
    sectorDivision: "North Central Division - New Delhi Trunk",
    badgeLevel: "Tier 1 Master Dispatcher",
    shift: "Shift B (14:00 - 22:00)",
    shiftStartTime: "14:00",
    safetyScore: 99.8,
    trainsDispatched: 42,
    blocksBundled: 14,
    incidentsResolved: 6,
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
    status: "ACTIVE"
  });

  // AI Insights State
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiInsights, setGeminiInsights] = useState<string>(
    `### 🚄 Corridor Safety & Dispatch Audit (NDLS - CNB High-Density Trunk)
- **High-Risk Critical Asset Alert**: Asset **TRK-01** (KM 4.2) requires immediate containment (Thermite weld fracture detected).
- **Traffic Isolation Buffer**: Minimum 15-minute safety envelope enforced ahead of **NDLS-HWH Rajdhani Express (12301)**.
- **Cross-Department Bundling Yield**: Co-locating Track (TMS), Signal (SMMS), and Traction (TDMS) maintenance saves **3.5 corridor block-hours**, mitigating cascading downstream delays across Kanpur Outer.
- **Controller Action Directive**: Approve proposed **BLOCK 2001** to authorize simultaneous track clamp installation and point machine lubrication.`
  );

  // Mobile sidebar drawer state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Trigger department or AI modal
  const handleSelectDept = (dept: DepartmentCode) => {
    setActiveDept(dept);
    if (dept === "AI_INSIGHTS") {
      setIsAIModalOpen(true);
    }
  };

  const handleOpenWorkOrder = (assetId: string) => {
    setSelectedAssetForWorkOrder(assetId);
    setIsWorkOrderModalOpen(true);
  };

  const handleFetchInsights = async () => {
    setGeminiLoading(true);
    try {
      const res = await fetch("/api/v1/gemini/insights", { method: "POST" });
      const data = await res.json();
      if (data && data.analysis) {
        setGeminiInsights(data.analysis);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeminiLoading(false);
    }
  };

  const unreadAlertsCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col relative overflow-hidden font-sans select-none">
      
      {/* Top Header Bar with Crisp White & Blue Styling */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        lang={lang}
        setLang={setLang}
        opacityLevel={settings.glassTransparency}
        setOpacityLevel={(val) => setSettings(prev => ({ ...prev, glassTransparency: val }))}
        onToggleSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
        onNotificationsClick={() => setIsNotificationsModalOpen(true)}
        onSettingsClick={() => setIsSettingsModalOpen(true)}
        onProfileClick={() => setIsProfileModalOpen(true)}
        unreadAlertsCount={unreadAlertsCount}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative z-10 bg-slate-50">
        
        {/* Left Interactive Sidebar */}
        <Sidebar
          activeDept={activeDept}
          setActiveDept={handleSelectDept}
          onEmergencyStop={() => setIsEmergencyModalOpen(true)}
          lang={lang}
          onOpenLogs={() => setActiveTab("assets")}
          onOpenMaintenance={() => setActiveTab("corridors")}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          onOpenAnalytics={() => setActiveTab("analytics")}
          activeTab={activeTab}
          showEmergencyTop={activeTab === "network"}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* View Switcher Container */}
        <main className="flex-1 flex flex-col overflow-y-auto bg-slate-50 relative">
          <AnimatePresence mode="wait">
            {activeTab === "corridors" && (
              <motion.div
                key="corridors"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="flex-1 flex flex-col"
              >
                <CorridorsView
                  trains={trains}
                  workOrders={workOrders}
                  lang={lang}
                  onOpenDefectModal={() => handleOpenWorkOrder("TRK-01")}
                  onOpenCadMap={(assetId) => {
                    setSelectedAssetForCad(assetId || "TRK-01");
                    setIsCadModalOpen(true);
                  }}
                  onOpenWorkOrder={handleOpenWorkOrder}
                />
              </motion.div>
            )}

            {activeTab === "network" && (
              <motion.div
                key="network"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="flex-1 flex flex-col"
              >
                <NetworkView lang={lang} />
              </motion.div>
            )}

            {activeTab === "assets" && (
              <motion.div
                key="assets"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="flex-1 flex flex-col"
              >
                <AssetsView
                  workOrders={workOrders}
                  onCreateWorkOrder={handleOpenWorkOrder}
                  lang={lang}
                  onOpenCadMap={(assetId) => {
                    setSelectedAssetForCad(assetId || "TRK-01");
                    setIsCadModalOpen(true);
                  }}
                />
              </motion.div>
            )}

            {activeTab === "schedules" && (
              <motion.div
                key="schedules"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="flex-1 flex flex-col"
              >
                <SchedulesView
                  trains={trains}
                  workOrders={workOrders}
                  lang={lang}
                />
              </motion.div>
            )}

            {activeTab === "analytics" && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="flex-1 flex flex-col"
              >
                <AnalyticsView lang={lang} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Official Indian Government Portal Footer */}
      <footer className="bg-slate-900 text-slate-300 border-t-2 border-amber-500/80 px-4 sm:px-8 py-3 text-[11px] font-sans flex flex-col sm:flex-row items-center justify-between gap-2 z-30 relative">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 font-bold text-amber-400 font-serif">
            <span>{translations[lang]?.footerGovt || "GOVERNMENT OF INDIA • MINISTRY OF RAILWAYS"}</span>
          </div>
          <span className="hidden md:inline text-slate-600">|</span>
          <span className="hidden md:inline text-slate-400 font-mono text-[10px]">
            {translations[lang]?.footerPortal || "National Corridor Control & Advisory Portal (RailSync-v4.2)"}
          </span>
        </div>

        <div className="flex items-center space-x-4 text-[10px] text-slate-400 font-mono">
          <span>{translations[lang]?.securityLevel || "Security Level"}: <strong className="text-emerald-400 font-bold">NIC-RESTRICTED</strong></span>
          <span>•</span>
          <span>{translations[lang]?.consoleId || "CTC Console ID"}: <strong className="text-amber-400 font-bold">IR-NDLS-04</strong></span>
          <span>•</span>
          <span className="text-slate-500">{translations[lang]?.copyright || "© 2026 Indian Railways"}</span>
        </div>
      </footer>

      {/* Interactive Modals */}
      <EmergencyModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
        onConfirm={() => {
          console.log("Emergency stop broadcasted");
          setNotifications(prev => [
            {
              id: `alert-emerg-${Date.now()}`,
              title: "EMERGENCY HALT BROADCAST ISSUED",
              message: "Sector Dispatcher initiated immediate red aspect across all active blocks.",
              timestamp: "Just now",
              type: "critical",
              sector: "ALL SECTORS",
              read: false
            },
            ...prev
          ]);
        }}
      />

      <WorkOrderModal
        isOpen={isWorkOrderModalOpen}
        assetId={selectedAssetForWorkOrder}
        onClose={() => setIsWorkOrderModalOpen(false)}
        onSubmit={(data) => {
          const newWO = {
            id: Math.floor(1000 + Math.random() * 9000),
            assetId: data.assetId || selectedAssetForWorkOrder || "SIG-44B1",
            department: data.department || "SMMS",
            urgency: data.urgency || "HIGH",
            duration: data.duration || 90,
            status: "PENDING",
            notes: data.notes || "Point switch repair and telemetry alignment.",
            created_at: "Just now"
          };

          setWorkOrders(prev => [newWO, ...prev]);

          // Post to backend API
          const dept = (data.department || "TMS").toLowerCase();
          let payload: any = {};
          if (dept === "tms") {
            payload = {
              trackCode: newWO.assetId,
              defectId: `DEF-${Date.now().toString().slice(-4)}`,
              severityRank: data.urgency === "HIGH" ? 5 : data.urgency === "MEDIUM" ? 3 : 1,
              inspectorNotes: data.notes,
              requiredRepairDuration: Number(data.duration) || 90
            };
          } else if (dept === "smms") {
            payload = {
              signalPostId: newWO.assetId,
              faultType: data.notes || "Signal interlocking telemetry fail",
              criticalityFlag: data.urgency || "HIGH",
              repairTimeEst: Number(data.duration) || 90
            };
          } else {
            payload = {
              sectionId: newWO.assetId,
              oheDefectType: data.notes || "OHE tension drop wear",
              tensionDropPercentage: 18,
              durationNeeded: Number(data.duration) || 90
            };
          }

          fetch(`/api/v1/ingest/${dept}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          }).then(() => {
            fetch("/api/v1/optimize/generate-plan", { method: "POST" });
          }).catch(err => console.error("Work Order Ingest Error:", err));

          setNotifications(prev => [
            {
              id: `alert-wo-${Date.now()}`,
              title: `Work Order Enqueued: #${newWO.id} (${newWO.assetId})`,
              message: `Dept: ${newWO.department} | Urgency: ${newWO.urgency} | Duration: ${newWO.duration} mins`,
              timestamp: "Just now",
              type: "info",
              sector: newWO.department || "TMS",
              read: false
            },
            ...prev
          ]);
        }}
      />

      <AIInsightsModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        insights={geminiInsights}
        onRefresh={handleFetchInsights}
        loading={geminiLoading}
      />

      {/* Live Telemetry & Dispatch Alerts Modal */}
      <NotificationsModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
        notifications={notifications}
        setNotifications={setNotifications}
        onAcknowledgeAlert={(alert) => {
          setIsNotificationsModalOpen(false);
          setActiveTab("assets");
        }}
      />

      {/* Dispatcher System Configuration Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        setSettings={setSettings}
      />

      {/* Operator Profile & Shift Handover Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={profile}
        setProfile={setProfile}
        onShiftHandover={() => {
          setNotifications(prev => [
            {
              id: `alert-shift-${Date.now()}`,
              title: "Shift Handover Protocol Initiated",
              message: `Controller ${profile.name} generated electronic handover record for Console ${profile.consoleId}.`,
              timestamp: "Just now",
              type: "info",
              sector: profile.consoleId,
              read: false
            },
            ...prev
          ]);
        }}
      />

      {/* CAD Schematic Map Modal */}
      <CadMapModal
        isOpen={isCadModalOpen}
        onClose={() => setIsCadModalOpen(false)}
        assetId={selectedAssetForCad}
        onCreateWorkOrder={handleOpenWorkOrder}
      />

    </div>
  );
}
