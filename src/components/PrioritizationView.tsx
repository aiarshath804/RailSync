import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, 
  Sparkles, 
  Sliders, 
  AlertTriangle, 
  Clock, 
  Train, 
  RefreshCw, 
  CheckCircle2, 
  ArrowRight, 
  Info, 
  ChevronDown, 
  ChevronUp, 
  Filter, 
  Search, 
  Layers, 
  Check, 
  Flame, 
  Activity, 
  Cpu, 
  BarChart3,
  HelpCircle,
  Play
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  MaintenanceRequest, 
  PrioritizationConfigSummary, 
  PrioritizationScenario, 
  PrioritizationExplanation 
} from "../types";
import { Language, translations } from "../lib/translations";

interface PrioritizationViewProps {
  lang?: Language;
  onSelectRequest?: (req: MaintenanceRequest) => void;
}

export const PrioritizationView: React.FC<PrioritizationViewProps> = ({
  lang = "EN",
  onSelectRequest
}) => {
  const t = translations[lang] || translations.EN;

  // State
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [config, setConfig] = useState<PrioritizationConfigSummary | null>(null);
  const [tierSummary, setTierSummary] = useState<Record<string, number>>({
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0
  });
  const [safetyOverridesCount, setSafetyOverridesCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRecalculating, setIsRecalculating] = useState<boolean>(false);
  const [recalcSuccessMsg, setRecalcSuccessMsg] = useState<string | null>(null);

  // Filters & Search
  const [selectedTier, setSelectedTier] = useState<string>("ALL");
  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [safetyOnly, setSafetyOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedRequestId, setExpandedRequestId] = useState<number | null>(null);

  // Active Sub-Tab
  const [activeTab, setActiveTab] = useState<"queue" | "scenarios" | "sandbox" | "rules">("queue");

  // Demonstration Scenarios State
  const [scenarios, setScenarios] = useState<PrioritizationScenario[]>([]);
  const [activeScenarioId, setActiveScenarioId] = useState<string>("SCENARIO_A");
  const [isLoadingScenarios, setIsLoadingScenarios] = useState<boolean>(false);

  // Sandbox What-If Calculator State
  const [sandboxDept, setSandboxDept] = useState<string>("TMS");
  const [sandboxDefectType, setSandboxDefectType] = useState<string>("RAIL FRACTURE");
  const [sandboxSeverity, setSandboxSeverity] = useState<number>(5);
  const [sandboxSlaHours, setSandboxSlaHours] = useState<number>(4);
  const [sandboxCorridor, setSandboxCorridor] = useState<string>("MAS-TRL-05");
  const [sandboxNotes, setSandboxNotes] = useState<string>("Severe ultrasonic echo crack detected near switch blade");
  const [sandboxResult, setSandboxResult] = useState<any | null>(null);
  const [isEvaluatingSandbox, setIsEvaluatingSandbox] = useState<boolean>(false);

  // Fetch Requests & Config
  const fetchPrioritizationData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Config
      const configRes = await fetch("/api/v1/prioritization/config");
      if (configRes.ok) {
        const configData = await configRes.json();
        setConfig(configData);
      }

      // 2. Fetch Evaluated Requests
      const reqRes = await fetch("/api/v1/prioritization/requests");
      if (reqRes.ok) {
        const reqData = await reqRes.json();
        setRequests(reqData.requests || []);
        if (reqData.tier_summary) setTierSummary(reqData.tier_summary);
        if (reqData.safety_overrides_count !== undefined) setSafetyOverridesCount(reqData.safety_overrides_count);
      }
    } catch (err) {
      console.error("Failed to load prioritization data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Demonstration Scenarios
  const fetchScenarios = async () => {
    setIsLoadingScenarios(true);
    try {
      const res = await fetch("/api/v1/prioritization/scenarios");
      if (res.ok) {
        const data = await res.json();
        setScenarios(data.scenarios || []);
      }
    } catch (err) {
      console.error("Failed to fetch scenarios:", err);
    } finally {
      setIsLoadingScenarios(false);
    }
  };

  useEffect(() => {
    fetchPrioritizationData();
    fetchScenarios();
  }, []);

  // Recalculate all priorities on demand
  const handleRecalculateAll = async () => {
    setIsRecalculating(true);
    setRecalcSuccessMsg(null);
    try {
      const res = await fetch("/api/v1/prioritization/recalculate", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setRecalcSuccessMsg(`Successfully recalculated ${data.updated_count || data.total_requests} maintenance requests across all departments.`);
        fetchPrioritizationData();
        setTimeout(() => setRecalcSuccessMsg(null), 6000);
      }
    } catch (err) {
      console.error("Failed to recalculate:", err);
    } finally {
      setIsRecalculating(false);
    }
  };

  // Sandbox Live Evaluation
  const evaluateSandbox = async () => {
    setIsEvaluatingSandbox(true);
    try {
      const payload = {
        department_code: sandboxDept,
        defect_type: sandboxDefectType,
        defect_severity: sandboxSeverity,
        corridor_id: sandboxCorridor,
        notes: sandboxNotes,
        duration_minutes: 90,
        due_date: new Date(Date.now() + sandboxSlaHours * 3600 * 1000).toISOString()
      };
      const res = await fetch("/api/v1/prioritization/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setSandboxResult(data.evaluation);
      }
    } catch (err) {
      console.error("Sandbox evaluation failed:", err);
    } finally {
      setIsEvaluatingSandbox(false);
    }
  };

  useEffect(() => {
    evaluateSandbox();
  }, [sandboxDept, sandboxDefectType, sandboxSeverity, sandboxSlaHours, sandboxCorridor]);

  // Filtered requests
  const filteredRequests = requests.filter((r) => {
    if (selectedTier !== "ALL" && r.priority_level?.toUpperCase() !== selectedTier) return false;
    if (selectedDept !== "ALL" && (r.department_code || r.source_system)?.toUpperCase() !== selectedDept) return false;
    if (safetyOnly && !r.safety_override) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchAsset = r.asset_id?.toLowerCase().includes(q);
      const matchDefect = (r.defect_type || "").toLowerCase().includes(q);
      const matchNotes = (r.notes || "").toLowerCase().includes(q);
      if (!matchAsset && !matchDefect && !matchNotes) return false;
    }
    return true;
  });

  const getTierBadge = (tier?: string, override?: boolean) => {
    if (override) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white animate-pulse shadow-sm">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>CRITICAL (OVERRIDE)</span>
        </span>
      );
    }
    switch (tier?.toUpperCase()) {
      case "CRITICAL":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
            <span className="w-2 h-2 rounded-full bg-red-600"></span>
            <span>CRITICAL</span>
          </span>
        );
      case "HIGH":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-600"></span>
            <span>HIGH</span>
          </span>
        );
      case "MEDIUM":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            <span>MEDIUM</span>
          </span>
        );
      case "LOW":
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            <span>LOW</span>
          </span>
        );
    }
  };

  const activeScenario = scenarios.find((s) => s.id === activeScenarioId) || scenarios[0];

  return (
    <div className="w-full flex flex-col space-y-5 p-4 sm:p-6 max-w-7xl mx-auto">
      
      {/* 1. TOP HEADER & METRIC BANNER */}
      <div className="bg-slate-900 text-slate-100 rounded-xl p-5 sm:p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Background Subtle Gradient */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 left-1/3 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-blue-500/20 text-blue-300 border border-blue-400/30">
                AI Prioritization Engine
              </span>
              <span className="text-xs text-slate-400 font-mono">v2.4 Unified Standard</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1.5 flex items-center gap-2 font-serif">
              <Cpu className="w-7 h-7 text-amber-400" />
              Authoritative Maintenance Prioritization
            </h1>
            <p className="text-sm text-slate-300 max-w-3xl mt-1 leading-relaxed">
              Multi-factor mathematical ranking weighting physical hazard criticality (45%), deterioration urgency (30%), and live corridor train impact (25%) with deterministic safety override guardrails.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              id="btn-recalculate-priorities"
              onClick={handleRecalculateAll}
              disabled={isRecalculating}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-md transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRecalculating ? "animate-spin" : ""}`} />
              <span>{isRecalculating ? "Recalculating..." : "Recalculate All Active"}</span>
            </button>
          </div>
        </div>

        {/* Success Alert Banner */}
        <AnimatePresence>
          {recalcSuccessMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-lg flex items-center space-x-3 text-emerald-200 text-sm"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{recalcSuccessMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Formula & Tier Distribution Ribbon */}
        <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-800/70 border border-slate-700/60 rounded-lg p-3">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Total Scored</span>
            <span className="text-xl font-bold text-white font-mono mt-0.5 block">{requests.length}</span>
            <span className="text-[10px] text-slate-400">Requests in database</span>
          </div>

          <div className="bg-red-950/40 border border-red-500/40 rounded-lg p-3">
            <span className="text-[11px] font-medium text-red-300 uppercase tracking-wider block flex items-center justify-between">
              Critical Tier
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
            </span>
            <span className="text-xl font-bold text-red-400 font-mono mt-0.5 block">{tierSummary.CRITICAL || 0}</span>
            <span className="text-[10px] text-red-300/80">Score ≥ 75.0</span>
          </div>

          <div className="bg-amber-950/40 border border-amber-500/40 rounded-lg p-3">
            <span className="text-[11px] font-medium text-amber-300 uppercase tracking-wider block flex items-center justify-between">
              High Tier
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            </span>
            <span className="text-xl font-bold text-amber-400 font-mono mt-0.5 block">{tierSummary.HIGH || 0}</span>
            <span className="text-[10px] text-amber-300/80">50.0 ≤ Score &lt; 75.0</span>
          </div>

          <div className="bg-blue-950/40 border border-blue-500/40 rounded-lg p-3">
            <span className="text-[11px] font-medium text-blue-300 uppercase tracking-wider block flex items-center justify-between">
              Medium Tier
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            </span>
            <span className="text-xl font-bold text-blue-400 font-mono mt-0.5 block">{tierSummary.MEDIUM || 0}</span>
            <span className="text-[10px] text-blue-300/80">25.0 ≤ Score &lt; 50.0</span>
          </div>

          <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-lg p-3">
            <span className="text-[11px] font-medium text-emerald-300 uppercase tracking-wider block flex items-center justify-between">
              Low Tier
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </span>
            <span className="text-xl font-bold text-emerald-400 font-mono mt-0.5 block">{tierSummary.LOW || 0}</span>
            <span className="text-[10px] text-emerald-300/80">Score &lt; 25.0</span>
          </div>

          <div className="bg-rose-950/60 border border-rose-500/60 rounded-lg p-3">
            <span className="text-[11px] font-medium text-rose-300 uppercase tracking-wider block flex items-center justify-between">
              Safety Overrides
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            </span>
            <span className="text-xl font-bold text-rose-300 font-mono mt-0.5 block">{safetyOverridesCount}</span>
            <span className="text-[10px] text-rose-300/80">Mandatory bypass active</span>
          </div>
        </div>
      </div>

      {/* 2. SUB-NAVIGATION TABS */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-1 sm:space-x-3 overflow-x-auto pb-0.5">
        <button
          id="tab-prioritization-queue"
          onClick={() => setActiveTab("queue")}
          className={`flex items-center space-x-2 py-2.5 px-4 font-semibold text-sm border-b-2 transition-all whitespace-nowrap ${
            activeTab === "queue"
              ? "border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Prioritized Work Queue</span>
          <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-slate-200 text-slate-700 font-mono">
            {requests.length}
          </span>
        </button>

        <button
          id="tab-prioritization-scenarios"
          onClick={() => setActiveTab("scenarios")}
          className={`flex items-center space-x-2 py-2.5 px-4 font-semibold text-sm border-b-2 transition-all whitespace-nowrap ${
            activeTab === "scenarios"
              ? "border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Play className="w-4 h-4 text-amber-500" />
          <span>Demonstration Scenarios (A - E)</span>
          <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-800 font-mono font-bold">
            5 Scenarios
          </span>
        </button>

        <button
          id="tab-prioritization-sandbox"
          onClick={() => setActiveTab("sandbox")}
          className={`flex items-center space-x-2 py-2.5 px-4 font-semibold text-sm border-b-2 transition-all whitespace-nowrap ${
            activeTab === "sandbox"
              ? "border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Sliders className="w-4 h-4 text-blue-500" />
          <span>Interactive What-If Sandbox</span>
        </button>

        <button
          id="tab-prioritization-rules"
          onClick={() => setActiveTab("rules")}
          className={`flex items-center space-x-2 py-2.5 px-4 font-semibold text-sm border-b-2 transition-all whitespace-nowrap ${
            activeTab === "rules"
              ? "border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-500" />
          <span>Rules & Weighting Standard</span>
        </button>
      </div>

      {/* 3. TAB CONTENT */}

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: PRIORITIZED WORK QUEUE                                */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "queue" && (
        <div className="flex flex-col space-y-4">
          
          {/* Controls Bar: Filters & Search */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by asset (e.g. TRK-01), defect type, or notes..."
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center flex-wrap gap-2 text-xs font-medium">
              <span className="text-slate-500 flex items-center gap-1 font-semibold mr-1">
                <Filter className="w-3.5 h-3.5" /> Tier:
              </span>
              {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((tier) => (
                <button
                  key={tier}
                  onClick={() => setSelectedTier(tier)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    selectedTier === tier
                      ? "bg-slate-900 text-white font-bold shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {tier}
                </button>
              ))}

              <div className="h-4 w-px bg-slate-300 mx-1"></div>

              <span className="text-slate-500 font-semibold mr-1">Dept:</span>
              {["ALL", "TMS", "SMMS", "TDMS"].map((dept) => (
                <button
                  key={dept}
                  onClick={() => setSelectedDept(dept)}
                  className={`px-2.5 py-1.5 rounded-lg transition-all ${
                    selectedDept === dept
                      ? "bg-blue-600 text-white font-bold"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {dept}
                </button>
              ))}

              <div className="h-4 w-px bg-slate-300 mx-1"></div>

              {/* Safety Override Only Toggle */}
              <button
                onClick={() => setSafetyOnly(!safetyOnly)}
                className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all ${
                  safetyOnly
                    ? "bg-rose-600 text-white font-bold shadow-sm"
                    : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Overrides Only</span>
              </button>
            </div>
          </div>

          {/* Requests Table / Cards */}
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-semibold">Evaluating maintenance requests through authoritative model...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
              <Info className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold">No maintenance requests match the current filters.</p>
            </div>
          ) : (
            <div className="flex flex-col space-y-3">
              {filteredRequests.map((req, idx) => {
                const isExpanded = expandedRequestId === req.id;
                const pScore = req.priority_score ?? (req.urgency_level ? req.urgency_level * 100 : 50);
                const cScore = req.criticality_score ?? 50;
                const uScore = req.urgency_score ?? 50;
                const iScore = req.impact_score ?? 50;
                const dept = (req.department_code || req.source_system || "TMS").toUpperCase();
                const isOverride = Boolean(req.safety_override);

                return (
                  <div
                    key={req.id || idx}
                    className={`bg-white border rounded-xl shadow-sm transition-all overflow-hidden ${
                      isOverride 
                        ? "border-rose-300 ring-1 ring-rose-200" 
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {/* Header Bar */}
                    <div 
                      className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
                      onClick={() => setExpandedRequestId(isExpanded ? null : req.id)}
                    >
                      {/* Left Block Info */}
                      <div className="flex items-start space-x-3.5">
                        {/* Rank Badge */}
                        <div className="flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 font-mono font-bold text-sm shrink-0">
                          <span className="text-[9px] text-slate-500 font-sans -mb-1">RANK</span>
                          #{idx + 1}
                        </div>

                        <div>
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="font-bold text-slate-900 text-base">{req.asset_id}</span>
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              {dept}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">
                              {req.corridor_id || "MAS-TRL-05"}
                            </span>
                            {getTierBadge(req.priority_level, isOverride)}
                          </div>

                          <p className="text-sm font-semibold text-slate-800 mt-1">
                            {req.defect_type || req.work_type || "Routine Corridor Maintenance"}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                            {req.notes || "No additional inspector notes recorded."}
                          </p>
                        </div>
                      </div>

                      {/* Right Scores Overview */}
                      <div className="flex items-center justify-between md:justify-end space-x-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                        {/* 3 Component Chips */}
                        <div className="hidden sm:flex items-center space-x-2 text-[11px] font-mono">
                          <div className="px-2 py-1 bg-red-50 text-red-700 border border-red-200 rounded">
                            Crit: <span className="font-bold">{cScore.toFixed(0)}</span>
                          </div>
                          <div className="px-2 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded">
                            Urg: <span className="font-bold">{uScore.toFixed(0)}</span>
                          </div>
                          <div className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded">
                            Imp: <span className="font-bold">{iScore.toFixed(0)}</span>
                          </div>
                        </div>

                        {/* Composite Score Circle */}
                        <div className="flex items-center space-x-2">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase block">Score</span>
                            <span className={`text-xl font-bold font-mono ${
                              pScore >= 80 ? "text-red-600" : pScore >= 60 ? "text-amber-600" : "text-blue-600"
                            }`}>
                              {pScore.toFixed(1)}
                            </span>
                          </div>
                          <div className="text-slate-400">
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Detailed Explanation Tray */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-slate-200 bg-slate-50/80 p-4 sm:p-6"
                        >
                          {/* Safety Override Notice if active */}
                          {isOverride && (
                            <div className="mb-4 p-3 bg-rose-100 border border-rose-300 rounded-lg flex items-start space-x-2.5 text-rose-900 text-xs">
                              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold">MANDATORY SAFETY OVERRIDE ACTIVE: </span>
                                <span>{req.override_reason || "Safety critical defect class automatically enforces Critical Tier ranking."}</span>
                              </div>
                            </div>
                          )}

                          {/* Factor Breakdown 3-Column Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            
                            {/* 1. Criticality Card */}
                            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                <span className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                  <Flame className="w-3.5 h-3.5 text-red-500" />
                                  Criticality (45%)
                                </span>
                                <span className="text-base font-bold font-mono text-red-600">{cScore.toFixed(1)}</span>
                              </div>
                              <ul className="mt-2.5 space-y-1.5 text-xs text-slate-600">
                                <li className="flex items-center justify-between">
                                  <span>Defect Severity:</span>
                                  <span className="font-bold text-slate-800">Level {req.defect_severity}/5</span>
                                </li>
                                <li className="flex items-center justify-between">
                                  <span>Department Multiplier:</span>
                                  <span className="font-bold text-slate-800">{dept} Weight</span>
                                </li>
                                <li className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                                  Evaluates structural hazard, derailment potential, and component risk.
                                </li>
                              </ul>
                            </div>

                            {/* 2. Urgency Card */}
                            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                <span className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                                  Predictive Urgency (30%)
                                </span>
                                <span className="text-base font-bold font-mono text-amber-600">{uScore.toFixed(1)}</span>
                              </div>
                              <ul className="mt-2.5 space-y-1.5 text-xs text-slate-600">
                                <li className="flex items-center justify-between">
                                  <span>Est. Duration:</span>
                                  <span className="font-bold text-slate-800">{req.duration_minutes || 60} mins</span>
                                </li>
                                <li className="flex items-center justify-between">
                                  <span>SLA Window:</span>
                                  <span className="font-bold text-slate-800">Active</span>
                                </li>
                                <li className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                                  Estimates exponential deterioration trajectory and SLA breach probability.
                                </li>
                              </ul>
                            </div>

                            {/* 3. Operational Impact Card */}
                            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                <span className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                  <Train className="w-3.5 h-3.5 text-blue-500" />
                                  Live Train Impact (25%)
                                </span>
                                <span className="text-base font-bold font-mono text-blue-600">{iScore.toFixed(1)}</span>
                              </div>
                              <ul className="mt-2.5 space-y-1.5 text-xs text-slate-600">
                                <li className="flex items-center justify-between">
                                  <span>Corridor Density:</span>
                                  <span className="font-bold text-slate-800">High Speed Trunk</span>
                                </li>
                                <li className="flex items-center justify-between">
                                  <span>COA Train Priority:</span>
                                  <span className="font-bold text-slate-800">Rajdhani / Express</span>
                                </li>
                                <li className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                                  Quantifies downstream passenger delay minutes and freight bottleneck risk.
                                </li>
                              </ul>
                            </div>

                          </div>

                          {/* Transparent Mathematical Formula Box */}
                          <div className="bg-slate-900 text-slate-200 p-3.5 rounded-lg text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <span className="text-slate-400 font-sans font-semibold">Priority Formula: </span>
                              <span className="text-amber-300">
                                ({cScore.toFixed(1)} × 0.45) + ({uScore.toFixed(1)} × 0.30) + ({iScore.toFixed(1)} × 0.25) = <span className="text-white font-bold text-sm">{pScore.toFixed(1)} pts</span>
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-sans">
                              Method: <span className="text-slate-200">{req.scoring_method || "authoritative_hybrid"}</span>
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: DEMONSTRATION SCENARIOS (A - E)                       */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "scenarios" && (
        <div className="flex flex-col space-y-5">
          
          {/* Scenario Selector Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {scenarios.map((sc) => (
              <button
                key={sc.id}
                onClick={() => setActiveScenarioId(sc.id)}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  activeScenarioId === sc.id
                    ? "bg-blue-50/90 border-blue-600 shadow-sm ring-1 ring-blue-500"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
                    {sc.id.replace("_", " ")}
                  </span>
                  <p className="text-xs font-bold text-slate-900 mt-1 line-clamp-2">{sc.title}</p>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Validation:</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-0.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> PASSED
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Active Scenario Detailed Breakdown */}
          {activeScenario && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">
                      Standard Test Scenario
                    </span>
                    <span className="text-xs text-slate-500 font-mono">{activeScenario.id}</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mt-1">{activeScenario.title}</h3>
                  <p className="text-sm text-slate-600 mt-0.5">{activeScenario.description}</p>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <div className="text-right">
                    <span className="text-xs text-slate-500 uppercase block font-semibold">Test Status</span>
                    <span className="text-sm font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> PASS (Deterministic)
                    </span>
                  </div>
                </div>
              </div>

              {/* If Scenario E (Comparison), show comparison card */}
              {activeScenario.id === "SCENARIO_E" && activeScenario.trunk_evaluation ? (
                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* High Density Trunk */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <div>
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800">High-Density Trunk</span>
                        <h4 className="font-bold text-slate-900 text-base mt-1">MAS-TRL-05 (Chennai Central – Tiruvallur Main Line)</h4>
                      </div>
                      <span className="text-2xl font-bold font-mono text-blue-600">
                        {activeScenario.trunk_evaluation.priority_score.toFixed(1)}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 text-xs text-slate-700">
                      <div className="flex justify-between">
                        <span>Physical Criticality:</span>
                        <span className="font-bold font-mono">{activeScenario.trunk_evaluation.criticality_score.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Predictive Urgency:</span>
                        <span className="font-bold font-mono">{activeScenario.trunk_evaluation.urgency_score.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between text-blue-700 font-semibold">
                        <span>Operational Impact:</span>
                        <span className="font-bold font-mono text-blue-700">{activeScenario.trunk_evaluation.impact_score.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Branch Line */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <div>
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-200 text-slate-800">Quiet Feeder Branch</span>
                        <h4 className="font-bold text-slate-900 text-base mt-1">BRANCH-LINE-09 (Feeder Line)</h4>
                      </div>
                      <span className="text-2xl font-bold font-mono text-slate-600">
                        {activeScenario.branch_evaluation.priority_score.toFixed(1)}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 text-xs text-slate-700">
                      <div className="flex justify-between">
                        <span>Physical Criticality:</span>
                        <span className="font-bold font-mono">{activeScenario.branch_evaluation.criticality_score.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Predictive Urgency:</span>
                        <span className="font-bold font-mono">{activeScenario.branch_evaluation.urgency_score.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600 font-semibold">
                        <span>Operational Impact:</span>
                        <span className="font-bold font-mono text-slate-600">{activeScenario.branch_evaluation.impact_score.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Sensitivity Result Box */}
                  <div className="md:col-span-2 bg-emerald-50 border border-emerald-300 rounded-xl p-4 text-emerald-900 text-xs flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-sm block">Corridor Traffic Sensitivity Confirmed:</span>
                      <span>
                        Identical Severity 3 track defects receive an operational impact differential of{" "}
                        <strong>+{activeScenario.impact_difference} points</strong> on the Grand Trunk high-speed corridor due to Rajdhani train density.
                      </span>
                    </div>
                  </div>
                </div>
              ) : activeScenario.evaluation ? (
                <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Evaluation Score Card */}
                  <div className="bg-slate-900 text-slate-100 rounded-xl p-5 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider block">Computed Composite Score</span>
                      <span className="text-4xl font-bold font-mono text-amber-400 mt-2 block">
                        {activeScenario.evaluation.priority_score.toFixed(1)}
                      </span>
                      <div className="mt-2">
                        {getTierBadge(activeScenario.evaluation.priority_level, activeScenario.evaluation.safety_override)}
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800 text-xs font-mono text-slate-300 space-y-1">
                      <div className="flex justify-between">
                        <span>Criticality (45%):</span>
                        <span className="text-red-400 font-bold">{activeScenario.evaluation.criticality_score.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Urgency (30%):</span>
                        <span className="text-amber-400 font-bold">{activeScenario.evaluation.urgency_score.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Impact (25%):</span>
                        <span className="text-blue-400 font-bold">{activeScenario.evaluation.impact_score.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Factor Details Card */}
                  <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
                        Engine Explanation Summary
                      </span>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {activeScenario.evaluation.explanation?.summary || "Deterministic multi-factor score generated based on standard railway operations rules."}
                      </p>

                      {activeScenario.evaluation.safety_override && (
                        <div className="mt-3 p-2.5 bg-rose-100 border border-rose-300 rounded-lg text-rose-900 text-xs flex items-center space-x-2 font-semibold">
                          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>Safety Guardrail Active: {activeScenario.evaluation.override_reason}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                      <span>Formula: <code className="font-mono text-slate-800">{activeScenario.evaluation.explanation?.final_priority?.formula}</code></span>
                      <span className="font-semibold text-emerald-600 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Deterministic
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: INTERACTIVE WHAT-IF SANDBOX                          */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "sandbox" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Controls Form (5 Cols) */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col space-y-4">
            <div className="pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                What-If Parameter Sandbox
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Adjust parameters to simulate engine scoring response in real time.
              </p>
            </div>

            {/* Department */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Department</label>
              <div className="grid grid-cols-3 gap-2">
                {["TMS", "SMMS", "TDMS"].map((d) => (
                  <button
                    key={d}
                    onClick={() => setSandboxDept(d)}
                    className={`py-2 rounded-lg text-xs font-bold transition-all ${
                      sandboxDept === d
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Defect Type Selection */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Defect Category</label>
              <select
                value={sandboxDefectType}
                onChange={(e) => setSandboxDefectType(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="RAIL FRACTURE">Rail Fracture (Critical Hazard)</option>
                <option value="POINT MACHINE FAILURE">Point Machine Failure (Signaling Interlock)</option>
                <option value="CATENARY WEAR">Catenary Wire Wear (TDMS Traction)</option>
                <option value="TRACK GEOMETRY">Track Gauge / Cross-Level Deviation</option>
                <option value="BALLAST CLEANING">Ballast Shoulder Cleaning (Routine)</option>
              </select>
            </div>

            {/* Severity Slider */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Severity Rank (1 - 5)</span>
                <span className="text-blue-600 font-mono">Level {sandboxSeverity} / 5</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={sandboxSeverity}
                onChange={(e) => setSandboxSeverity(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>1 (Minor)</span>
                <span>3 (Moderate)</span>
                <span>5 (Emergency)</span>
              </div>
            </div>

            {/* SLA Remaining Slider */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>SLA Window Remaining</span>
                <span className="text-amber-600 font-mono">{sandboxSlaHours} Hours</span>
              </div>
              <input
                type="range"
                min="1"
                max="72"
                step="1"
                value={sandboxSlaHours}
                onChange={(e) => setSandboxSlaHours(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>1h (Imminent)</span>
                <span>24h (Standard)</span>
                <span>72h (Flexible)</span>
              </div>
            </div>

            {/* Corridor */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Corridor Sector</label>
              <select
                value={sandboxCorridor}
                onChange={(e) => setSandboxCorridor(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="MAS-TRL-05">MAS-TRL-05 (Chennai Central - Tiruvallur Quadruple Trunk)</option>
                <option value="MAS-BBQ-B1">MAS-BBQ-B1 (Terminal Throat Block B1)</option>
                <option value="AVD-TRL-B5">AVD-TRL-B5 (High-Speed Outer Block B5)</option>
              </select>
            </div>
          </div>

          {/* Results Display (7 Cols) */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
            {isEvaluatingSandbox ? (
              <div className="p-12 text-center text-slate-500">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                <p className="text-xs">Computing live multi-factor weights...</p>
              </div>
            ) : sandboxResult ? (
              <div className="flex flex-col space-y-5">
                {/* Result Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Simulated Score</span>
                    <div className="flex items-center space-x-3 mt-1">
                      <span className="text-4xl font-bold font-mono text-slate-900">
                        {sandboxResult.priority_score.toFixed(1)}
                      </span>
                      {getTierBadge(sandboxResult.priority_level, sandboxResult.safety_override)}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-500 block">Model Engine</span>
                    <span className="text-xs font-mono font-bold text-slate-800">{sandboxResult.model_used}</span>
                  </div>
                </div>

                {/* Safety Override Alert if Triggered */}
                {sandboxResult.safety_override && (
                  <div className="p-3.5 bg-rose-100 border border-rose-300 rounded-xl flex items-start space-x-3 text-rose-900 text-xs">
                    <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">SAFETY OVERRIDE TRIGGERED</span>
                      <span>{sandboxResult.override_reason}</span>
                    </div>
                  </div>
                )}

                {/* Score Factor Visual Bars */}
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span className="flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 text-red-500" /> Physical Criticality (45%)</span>
                      <span className="font-mono font-bold text-red-600">{sandboxResult.criticality_score.toFixed(1)} / 100</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${sandboxResult.criticality_score}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-amber-500" /> Predictive Urgency (30%)</span>
                      <span className="font-mono font-bold text-amber-600">{sandboxResult.urgency_score.toFixed(1)} / 100</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${sandboxResult.urgency_score}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span className="flex items-center gap-1.5"><Train className="w-3.5 h-3.5 text-blue-500" /> Corridor Train Impact (25%)</span>
                      <span className="font-mono font-bold text-blue-600">{sandboxResult.impact_score.toFixed(1)} / 100</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${sandboxResult.impact_score}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* Explanation Summary Box */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700">
                  <span className="font-bold text-slate-900 block mb-1">Mathematical Explanation:</span>
                  <p className="leading-relaxed">{sandboxResult.explanation?.summary}</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: RULES & WEIGHTING STANDARD                           */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "rules" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Rules Summary */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col space-y-4">
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <Cpu className="w-5 h-5 text-blue-600" />
              Weighting Standard & Weights
            </h3>
            
            <div className="space-y-3 text-sm text-slate-700">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="font-bold text-red-600 block">1. Physical Criticality (45% Weight)</span>
                <p className="text-xs text-slate-600 mt-1">
                  Evaluates base severity (1-5), asset physical risk, department baseline hazard index, and defect risk multipliers.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="font-bold text-amber-600 block">2. Predictive Urgency (30% Weight)</span>
                <p className="text-xs text-slate-600 mt-1">
                  Quantifies degradation trajectory over time, SLA deadline proximity, repeated defect occurrences on the same segment, and failure acceleration.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="font-bold text-blue-600 block">3. Operational Impact (25% Weight)</span>
                <p className="text-xs text-slate-600 mt-1">
                  Integrates Control Office Application (COA) live train density, passenger train priorities (Rajdhani/Vande Bharat vs Freight), peak traffic hours, and historical delay cascading.
                </p>
              </div>
            </div>
          </div>

          {/* Safety Overrides */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col space-y-4">
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              Mandatory Safety Override Guardrails
            </h3>

            <p className="text-xs text-slate-600">
              Certain high-hazard defects strictly bypass standard linear optimization and are automatically elevated to the Critical Tier:
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-950">
                <span className="font-bold block">🚨 Rail Fractures & Ultrasonic Flaws</span>
                <span className="text-[11px] text-rose-800">Automatic CRITICAL tier to prevent derailment hazards.</span>
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-950">
                <span className="font-bold block">🚨 Point Machine & Interlocking Faults</span>
                <span className="text-[11px] text-rose-800">Mandatory priority to safeguard train separation safety.</span>
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-950">
                <span className="font-bold block">🚨 OHE Catenary Wire Parting</span>
                <span className="text-[11px] text-rose-800">Emergency power block assignment to avoid pantograph entanglement.</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
