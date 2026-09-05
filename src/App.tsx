import React, { useState } from "react";
import { Header, NavTab } from "./components/Header";
import { Sidebar, DepartmentCode } from "./components/Sidebar";
import { CorridorsView } from "./components/CorridorsView";
import { NetworkView } from "./components/NetworkView";
import { AssetsView } from "./components/AssetsView";
import { SchedulesView } from "./components/SchedulesView";
import { PrioritizationView } from "./components/PrioritizationView";
import { EmergencyModal } from "./components/EmergencyModal";
import { WorkOrderModal } from "./components/WorkOrderModal";
import { AIInsightsModal } from "./components/AIInsightsModal";
import { DispatchAdvisoryModal } from "./components/DispatchAdvisoryModal";
import { NotificationsModal, NotificationItem } from "./components/NotificationsModal";
import { SettingsModal, AppSettingsState } from "./components/SettingsModal";
import { ProfileModal, OperatorProfile } from "./components/ProfileModal";
import { CadMapModal } from "./components/CadMapModal";
import { AnalyticsView } from "./components/AnalyticsView";
import { MLIntelligenceView } from "./components/MLIntelligenceView";
import { DataPipelineModal } from "./components/DataPipelineModal";
import { SafetyGuardrailModal } from "./components/SafetyGuardrailModal";
import { LiveApiControlPanel } from "./components/LiveApiControlPanel";
import { LiveDataProvider, useLiveData } from "./contexts/LiveDataContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LoginPage } from "./components/LoginPage";
import { Train } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Language, translations } from "./lib/translations";

function AppContent() {
  // Navigation & View States
  const [activeTab, setActiveTab] = useState<NavTab>("corridors");
  const [activeDept, setActiveDept] = useState<DepartmentCode>("SMMS");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [lang, setLang] = useState<Language>("EN");

  // Modals States
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [isWorkOrderModalOpen, setIsWorkOrderModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isDispatchAdvisoryModalOpen, setIsDispatchAdvisoryModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCadModalOpen, setIsCadModalOpen] = useState(false);
  const [isDataPipelineModalOpen, setIsDataPipelineModalOpen] = useState(false);
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);
  const [selectedAssetForCad, setSelectedAssetForCad] = useState<string | null>("TRK-01");
  const [selectedAssetForWorkOrder, setSelectedAssetForWorkOrder] = useState<string | null>("SIG-44B1");

  // Shared Live Operational State & Controller from LiveDataContext
  const { trains, controlState, handleControlAction, refreshNow } = useLiveData();

  // Dynamic Work Orders State
  const [workOrders, setWorkOrders] = useState<any[]>([]);

  // Fetch live work orders from authoritative backend
  const fetchWorkOrders = React.useCallback(async () => {
    try {
      const res = await fetch("/api/v1/work-orders");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setWorkOrders(data);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch live work orders:", err);
    }
  }, []);

  React.useEffect(() => {
    fetchWorkOrders();
  }, [fetchWorkOrders]);

  // Notifications State
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

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
    stationId: "MAS-SR-01",
    autoScrollTimetable: true
  });

  // Operator Profile State
  const { user, hasPermission } = useAuth();
  const [profile, setProfile] = useState<OperatorProfile>({
    name: "R. Subramanian",
    role: "Chief Corridor Controller",
    consoleId: "MAS-SR-01",
    sectorDivision: "Chennai Division - Southern Railway (MAS-TRL Corridor)",
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

  // Synchronize authenticated user profile with system profile state
  React.useEffect(() => {
    if (user) {
      setProfile((prev) => ({
        ...prev,
        name: user.name,
        role: user.designation || user.role,
        consoleId: user.console_id,
        sectorDivision: `${user.department_name} (MAS-TRL Corridor)`,
        badgeLevel: user.badge_level,
        shift: user.shift || prev.shift,
      }));

      // Set default department view according to user role
      if (user.role === "ENGINEERING") {
        setActiveDept("TMS");
      } else if (user.role === "TRACTION") {
        setActiveDept("TDMS");
      } else if (user.role === "SIGNAL_TELECOM") {
        setActiveDept("SMMS");
      }
    }
  }, [user]);

  // Guard active tab against role permission revocations
  React.useEffect(() => {
    const permMap: Partial<Record<NavTab, string>> = {
      network: "VIEW_LIVE_OPERATIONS",
      corridors: "VIEW_CORRIDOR",
      prioritization: "VIEW_PRIORITIZATION",
      ml_intelligence: "VIEW_ML_INTELLIGENCE",
      schedules: "VIEW_SCHEDULES",
      assets: "VIEW_ALL_REQUESTS",
      analytics: "VIEW_ANALYTICS",
    };
    const requiredPerm = permMap[activeTab];
    if (requiredPerm && !hasPermission(requiredPerm)) {
      setActiveTab("corridors");
    }
  }, [activeTab, hasPermission]);

  // AI Insights State
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiInsights, setGeminiInsights] = useState<string>("");

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
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (data && data.analysis) {
          setGeminiInsights(data.analysis);
        }
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
        onDataPipelineClick={() => setIsDataPipelineModalOpen(true)}
        onSafetyGuardrailClick={() => setIsSafetyModalOpen(true)}
        onOpenAdvisoryModal={() => setIsDispatchAdvisoryModalOpen(true)}
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
          onOpenPrioritization={() => setActiveTab("prioritization")}
          onOpenDataPipeline={() => setIsDataPipelineModalOpen(true)}
          onOpenSafetyGuardrail={() => setIsSafetyModalOpen(true)}
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
                <NetworkView 
                  lang={lang} 
                  onOpenEmergencyModal={() => setIsEmergencyModalOpen(true)}
                  onOpenAdvisoryModal={() => setIsDispatchAdvisoryModalOpen(true)}
                />
              </motion.div>
            )}

            {activeTab === "prioritization" && (
              <motion.div
                key="prioritization"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="flex-1 flex flex-col"
              >
                <PrioritizationView
                  lang={lang}
                  onSelectRequest={(req) => {
                    handleOpenWorkOrder(req.asset_id);
                  }}
                />
              </motion.div>
            )}

            {activeTab === "ml_intelligence" && (
              <motion.div
                key="ml_intelligence"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="flex-1 flex flex-col"
              >
                <MLIntelligenceView lang={lang} />
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
          <span>{translations[lang]?.consoleId || "CTC Console ID"}: <strong className="text-amber-400 font-bold">MAS-SR-01</strong></span>
          <span>•</span>
          <span className="text-slate-500">{translations[lang]?.copyright || "© 2026 Indian Railways"}</span>
        </div>
      </footer>

      {/* Interactive Modals */}
      <EmergencyModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
        onEmergencyHaltIssued={(data) => {
          setNotifications(prev => [
            {
              id: `alert-emerg-${Date.now()}`,
              title: `EMERGENCY HALT BROADCAST: ${data.affected_block_id || "CORRIDOR"}`,
              message: `Red aspect transmitted to ${data.affected_block_id}. Reason: ${data.emergency_type} (${data.department}).`,
              timestamp: "Just now",
              type: "critical",
              sector: data.affected_block_id || "ALL",
              read: false
            },
            ...prev
          ]);
        }}
        onEmergencyResolved={() => {
          setNotifications(prev => [
            {
              id: `alert-resolve-${Date.now()}`,
              title: "EMERGENCY CLEARED & SIGNALS RESTORED",
              message: "Corridor blocks restored to normal aspect signals and automatic dispatch.",
              timestamp: "Just now",
              type: "success",
              sector: "CORRIDOR",
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
        onSuccess={() => {
          // Re-fetch authoritative work orders list from backend
          fetchWorkOrders();
          fetch("/api/v1/optimize/generate-plan", { method: "POST" }).catch(() => {});
          setNotifications(prev => [
            {
              id: `alert-wo-${Date.now()}`,
              title: `Work Order Created Successfully`,
              message: `Maintenance request recorded in authoritative repository.`,
              timestamp: "Just now",
              type: "success",
              sector: "MAINTENANCE",
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

      {/* Operational Dispatch Advisory Modal */}
      <DispatchAdvisoryModal
        isOpen={isDispatchAdvisoryModalOpen}
        onClose={() => setIsDispatchAdvisoryModalOpen(false)}
        onAdvisoryApplied={(appliedAdv) => {
          refreshNow();
          fetchWorkOrders();
          setNotifications(prev => [
            {
              id: `alert-adv-${Date.now()}`,
              title: `Advisory Action Applied: ${appliedAdv.action_label || appliedAdv.action_type}`,
              message: appliedAdv.recommended_action,
              timestamp: "Just now",
              type: "success",
              sector: appliedAdv.affected_section,
              read: false
            },
            ...prev
          ]);
        }}
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

      {/* Railway Data Pipeline & Ingestion Modal (Step 2) */}
      <DataPipelineModal
        isOpen={isDataPipelineModalOpen}
        onClose={() => setIsDataPipelineModalOpen(false)}
        onDataImported={() => {
          fetch("/api/v1/optimize/generate-plan", { method: "POST" })
            .catch(err => console.error("Optimize trigger error:", err));
        }}
      />

      {/* Railway Safety Constraints & Guardrail Modal (Step 4) */}
      <SafetyGuardrailModal
        isOpen={isSafetyModalOpen}
        onClose={() => setIsSafetyModalOpen(false)}
        onPlanUpdated={() => {
          fetch("/api/v1/optimize/generate-plan", { method: "POST" })
            .catch(err => console.error("Optimize trigger error:", err));
        }}
      />

    </div>
  );
}

function AppRoot() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 font-sans select-none">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-700 flex items-center justify-center mb-4 shadow-2xl border border-blue-400/30">
          <Train className="w-9 h-9 text-white animate-pulse" />
        </div>
        <div className="text-base font-bold tracking-tight text-white mb-1 font-serif">
          RailSync Enterprise
        </div>
        <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
          <span>Validating CRIS Railway Security Clearance...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <LiveDataProvider>
      <AppContent />
    </LiveDataProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoot />
    </AuthProvider>
  );
}
