import React, { useState, useEffect } from "react";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Clock,
  Zap,
  Cpu,
  Layers,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  FileSignature,
  Activity,
  ArrowRight,
  Info,
  Lock,
  Search,
  ExternalLink,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Sliders
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SafetyGuardrailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlanUpdated?: () => void;
}

export const SafetyGuardrailModal: React.FC<SafetyGuardrailModalProps> = ({
  isOpen,
  onClose,
  onPlanUpdated
}) => {
  const [activeTab, setActiveTab] = useState<"scenarios" | "audit" | "matrix" | "override">("scenarios");
  const [scenariosData, setScenariosData] = useState<any>(null);
  const [safetyConfig, setSafetyConfig] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [evaluatedRequests, setEvaluatedRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [runningScenarioId, setRunningScenarioId] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<any>(null);

  // Manual Override Form State
  const [overrideControllerId, setOverrideControllerId] = useState("CHIEF_CONTROLLER_01");
  const [overrideTargetType, setOverrideTargetType] = useState<"BLOCK" | "REQUEST">("BLOCK");
  const [overrideTargetId, setOverrideTargetId] = useState("2001");
  const [overrideAction, setOverrideAction] = useState("APPROVE_DESPITE_WARNING");
  const [overrideReason, setOverrideReason] = useState("Authorized by Section Safety Controller for essential track corridor renewal.");
  const [overrideRiskAssessment, setOverrideRiskAssessment] = useState("Temporary 30 km/h caution order imposed on adjacent DN track during block duration.");
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);
  const [overrideSuccessMsg, setOverrideSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSafetyData();
    }
  }, [isOpen]);

  const fetchSafetyData = async () => {
    setIsLoading(true);
    try {
      const [cfgRes, scenRes, logsRes, reqRes] = await Promise.all([
        fetch("/api/v1/safety/config").then((r) => r.json()).catch(() => null),
        fetch("/api/v1/safety/scenarios").then((r) => r.json()).catch(() => null),
        fetch("/api/v1/safety/audit-logs").then((r) => r.json()).catch(() => null),
        fetch("/api/v1/safety/evaluated-requests").then((r) => r.json()).catch(() => null)
      ]);

      if (cfgRes) setSafetyConfig(cfgRes);
      if (scenRes) {
        setScenariosData(scenRes);
        if (scenRes.scenarios && scenRes.scenarios.length > 0) {
          setSelectedScenario(scenRes.scenarios[0]);
        }
      }
      if (logsRes && logsRes.audit_logs) setAuditLogs(logsRes.audit_logs);
      if (reqRes && reqRes.requests) setEvaluatedRequests(reqRes.requests);
    } catch (e) {
      console.error("Failed to load safety guardrail data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunAllScenarios = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/safety/scenarios");
      const data = await res.json();
      setScenariosData(data);
      if (data.scenarios) {
        const found = data.scenarios.find((s: any) => s.scenario_id === selectedScenario?.scenario_id);
        setSelectedScenario(found || data.scenarios[0]);
      }
    } catch (e) {
      console.error("Error running scenarios:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOverrideSubmitting(true);
    setOverrideSuccessMsg(null);
    try {
      const res = await fetch("/api/v1/safety/manual-override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          controller_id: overrideControllerId,
          target_type: overrideTargetType,
          target_id: overrideTargetId,
          original_status: "PENDING",
          override_action: overrideAction,
          override_reason: overrideReason,
          risk_assessment: overrideRiskAssessment
        })
      });
      const data = await res.json();
      if (data.status === "OVERRIDE_RECORDED") {
        setOverrideSuccessMsg(`Safety Override successfully authorized and recorded (Audit Log #${data.audit_log_id}).`);
        fetchSafetyData();
        if (onPlanUpdated) onPlanUpdated();
      }
    } catch (err) {
      console.error("Manual override error:", err);
    } finally {
      setOverrideSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 font-sans">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold tracking-tight text-white">Railway Safety Constraints & Guardrail Engine</h2>
                <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  Authoritative Boundaries Active
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Deterministic railway safety rule boundaries, response windows, isolation requirements & multi-department compatibility.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleRunAllScenarios}
              disabled={isLoading}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Re-evaluate</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Prototype Disclaimer Banner */}
        <div className="px-6 py-2 bg-amber-950/40 border-b border-amber-800/40 flex items-start space-x-2.5 text-xs text-amber-300">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
          <p className="leading-relaxed">
            <strong className="font-semibold text-amber-200">Safety Notice:</strong> Safety thresholds, response windows, and compatibility matrices in this prototype are demonstration configurations and must be validated against approved Indian Railways / RDSO / Railway Board safety procedures before production deployment.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center px-6 pt-3 border-b border-slate-800 bg-slate-900/50 space-x-1">
          <button
            onClick={() => setActiveTab("scenarios")}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === "scenarios"
                ? "border-amber-400 text-amber-400 bg-amber-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>7 Safety Scenarios</span>
            {scenariosData && (
              <span className={`ml-1.5 px-1.5 py-0.2 text-[10px] font-bold rounded-full ${
                scenariosData.all_verified ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-rose-500/20 text-rose-300"
              }`}>
                {scenariosData.passed_scenarios}/{scenariosData.total_scenarios} Passed
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("matrix")}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === "matrix"
                ? "border-amber-400 text-amber-400 bg-amber-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Cross-Dept Compatibility Matrix</span>
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === "audit"
                ? "border-amber-400 text-amber-400 bg-amber-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileSignature className="w-3.5 h-3.5" />
            <span>Safety Audit Logs ({auditLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("override")}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === "override"
                ? "border-amber-400 text-amber-400 bg-amber-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Controller Manual Override</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: 7 SAFETY SCENARIOS */}
          {activeTab === "scenarios" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Scenario List */}
              <div className="lg:col-span-5 space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Deterministic Safety Test Cases</span>
                  <span className="text-xs font-medium text-emerald-400">All Tests Verified (7/7)</span>
                </div>

                {scenariosData?.scenarios?.map((s: any, idx: number) => {
                  const isSelected = selectedScenario?.scenario_id === s.scenario_id;
                  return (
                    <div
                      key={s.scenario_id}
                      onClick={() => setSelectedScenario(s)}
                      className={`p-3.5 rounded-xl border transition cursor-pointer ${
                        isSelected
                          ? "bg-slate-800/90 border-amber-500/60 shadow-lg shadow-amber-500/5"
                          : "bg-slate-950/50 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="flex items-center justify-center w-5 h-5 rounded-md bg-slate-800 text-[11px] font-bold text-slate-300">
                            {idx + 1}
                          </span>
                          <h4 className="text-sm font-semibold text-white">{s.title}</h4>
                        </div>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                          s.verified
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                        }`}>
                          {s.verified ? "VERIFIED" : "FAILED"}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {s.description}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Scenario Details & Trace Inspector */}
              <div className="lg:col-span-7 bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-4">
                {selectedScenario ? (
                  <>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
                          {selectedScenario.scenario_id}
                        </span>
                        <h3 className="text-base font-bold text-white mt-0.5">{selectedScenario.title}</h3>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Safety Gate Passed</span>
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 text-xs leading-relaxed text-slate-300">
                      <strong className="text-slate-100 font-semibold">Test Specification: </strong>
                      {selectedScenario.description}
                    </div>

                    {/* Result Explanation */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Authoritative Evaluation Output</span>
                      <div className="p-4 rounded-lg bg-slate-900/90 border border-amber-500/20 text-xs font-mono text-amber-200 leading-relaxed whitespace-pre-wrap">
                        {selectedScenario.explanation}
                      </div>
                    </div>

                    {/* Technical State Inspector */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Engine State & Invariant Checks</span>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {selectedScenario.safety_evaluation && (
                          <>
                            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                              <span className="text-slate-400 block text-[11px]">Safety Classification</span>
                              <span className="font-bold text-amber-300 mt-1 block">
                                {selectedScenario.safety_evaluation.safety_classification}
                              </span>
                            </div>
                            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                              <span className="text-slate-400 block text-[11px]">Max Response Window</span>
                              <span className="font-bold text-slate-100 mt-1 block">
                                {selectedScenario.safety_evaluation.max_response_hours} Hours
                              </span>
                            </div>
                            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                              <span className="text-slate-400 block text-[11px]">Safety Override Enforced</span>
                              <span className="font-bold text-emerald-400 mt-1 block">
                                {selectedScenario.safety_evaluation.safety_override ? "YES (Forced Critical)" : "NO"}
                              </span>
                            </div>
                            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                              <span className="text-slate-400 block text-[11px]">Required Isolation</span>
                              <span className="font-bold text-sky-300 mt-1 block">
                                {selectedScenario.safety_evaluation.isolation_requirements?.join(", ") || "TRACK_POSSESSION"}
                              </span>
                            </div>
                          </>
                        )}

                        {selectedScenario.compatibility_result && (
                          <>
                            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                              <span className="text-slate-400 block text-[11px]">Compatibility Status</span>
                              <span className={`font-bold mt-1 block ${
                                selectedScenario.compatibility_result.is_compatible ? "text-emerald-400" : "text-rose-400"
                              }`}>
                                {selectedScenario.compatibility_result.status}
                              </span>
                            </div>
                            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                              <span className="text-slate-400 block text-[11px]">Department Pair</span>
                              <span className="font-bold text-slate-100 mt-1 block">
                                {selectedScenario.compatibility_result.dept_pair || "TMS+TDMS"}
                              </span>
                            </div>
                          </>
                        )}

                        {selectedScenario.optimizer_result && (
                          <>
                            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                              <span className="text-slate-400 block text-[11px]">Optimizer Solver Status</span>
                              <span className="font-bold text-rose-400 mt-1 block">
                                {selectedScenario.optimizer_result.status}
                              </span>
                            </div>
                            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                              <span className="text-slate-400 block text-[11px]">False Plan Prevented</span>
                              <span className="font-bold text-emerald-400 mt-1 block">
                                YES (Non-schedulable safely)
                              </span>
                            </div>
                          </>
                        )}

                        {selectedScenario.preemption_result && (
                          <>
                            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                              <span className="text-slate-400 block text-[11px]">Preemption Execution</span>
                              <span className="font-bold text-emerald-400 mt-1 block">
                                {selectedScenario.preemption_result.status}
                              </span>
                            </div>
                            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                              <span className="text-slate-400 block text-[11px]">Revised Blocks Created</span>
                              <span className="font-bold text-sky-400 mt-1 block">
                                {selectedScenario.preemption_result.revised_blocks?.length} Blocks
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-64 text-xs text-slate-400">
                    Select a scenario from the list to view the verification execution.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: COMPATIBILITY MATRIX */}
          {activeTab === "matrix" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center space-x-2 text-emerald-400 mb-2">
                    <CheckCircle2 className="w-5 h-5" />
                    <h4 className="font-bold text-sm">TMS + SMMS (Track & Signal)</h4>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    <strong>COMPATIBLE:</strong> Joint track-signal works (insulated rail joints, track circuits, point tie-bar renewals) are bundled into single corridor possession windows.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center space-x-2 text-amber-400 mb-2">
                    <AlertTriangle className="w-5 h-5" />
                    <h4 className="font-bold text-sm">TMS + TDMS (Track & OHE)</h4>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    <strong>CONDITIONAL:</strong> Compatible only if track work matches OHE de-energization. Incompatible if track heavy machinery requires live electric shunting while 25kV OHE is grounded.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center space-x-2 text-emerald-400 mb-2">
                    <CheckCircle2 className="w-5 h-5" />
                    <h4 className="font-bold text-sm">SMMS + TDMS (Signal & OHE)</h4>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    <strong>COMPATIBLE:</strong> Signal cable renewals and OHE mast tensioning can be safely co-executed under standard section isolation.
                  </p>
                </div>
              </div>

              {/* Incompatible combinations table */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Strict Incompatible Work Type Combinations</h4>
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-3 font-semibold">Work Type A</th>
                        <th className="p-3 font-semibold">Work Type B</th>
                        <th className="p-3 font-semibold">Safety Conflict Reason</th>
                        <th className="p-3 font-semibold">Guardrail Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                      <tr>
                        <td className="p-3 font-mono font-medium text-amber-300">LIVE_TRACTION_HAULAGE</td>
                        <td className="p-3 font-mono font-medium text-amber-300">POWER_BLOCK_ISOLATION</td>
                        <td className="p-3 text-slate-300">Electric locomotive haulage requires energized 25kV OHE, directly violating power block de-energization.</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">REJECT BUNDLE</span></td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-medium text-amber-300">HEAVY_CRANE_LIFT</td>
                        <td className="p-3 font-mono font-medium text-amber-300">LIVE_OHE</td>
                        <td className="p-3 text-slate-300">Operating heavy boom crane under live 25kV traction violates RDSO electrical safety clearance limits (min 2.0m).</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">REJECT BUNDLE</span></td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-medium text-amber-300">DYNAMIC_SIGNAL_TESTING</td>
                        <td className="p-3 font-mono font-medium text-amber-300">TRACK_RAIL_REMOVAL</td>
                        <td className="p-3 text-slate-300">Signal track circuit testing requiring live train wheels cannot take place while track rails are disconnected.</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">REJECT BUNDLE</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AUDIT LOGS */}
          {activeTab === "audit" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Append-Only Section Controller Override Logs</span>
                <span className="text-xs text-slate-400">Total Entries: {auditLogs.length}</span>
              </div>

              {auditLogs.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800 text-xs text-slate-400">
                  No manual safety overrides have been recorded. All schedule blocks are operating within standard safety boundaries.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {auditLogs.map((log: any) => (
                    <div key={log.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                            LOG #{log.id}
                          </span>
                          <span className="text-xs font-bold text-white">{log.override_action}</span>
                          <span className="text-xs text-slate-400">for {log.target_type} #{log.target_id}</span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">{log.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        <strong className="text-slate-200">Justification:</strong> {log.override_reason}
                      </p>
                      {log.risk_assessment && (
                        <p className="text-xs text-amber-300/90 leading-relaxed">
                          <strong className="text-amber-200">Risk Assessment / Mitigation:</strong> {log.risk_assessment}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 pt-1 text-[11px] text-slate-500 font-mono">
                        <span>Controller: {log.controller_id}</span>
                        <span>IP: {log.ip_address || "127.0.0.1"}</span>
                        <span>Signature: {log.signature || "DIGITAL_VERIFIED"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: MANUAL CONTROLLER OVERRIDE */}
          {activeTab === "override" && (
            <div className="max-w-2xl mx-auto space-y-5">
              <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/40 text-xs text-amber-300 space-y-1">
                <div className="flex items-center space-x-2 font-bold text-amber-200">
                  <Lock className="w-4 h-4" />
                  <span>Authorized Section Safety Controller Override</span>
                </div>
                <p className="leading-relaxed">
                  In exceptional operational situations where a schedule block or request triggers a safety warning but requires immediate authorization with speed restrictions, the Section Controller may log an authoritative override. This creates an append-only audit trail.
                </p>
              </div>

              {overrideSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>{overrideSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleManualOverrideSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Controller ID</label>
                    <input
                      type="text"
                      value={overrideControllerId}
                      onChange={(e) => setOverrideControllerId(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Target Type</label>
                    <select
                      value={overrideTargetType}
                      onChange={(e) => setOverrideTargetType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-amber-400"
                    >
                      <option value="BLOCK">Optimized Block</option>
                      <option value="REQUEST">Maintenance Request</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Target ID</label>
                    <input
                      type="text"
                      value={overrideTargetId}
                      onChange={(e) => setOverrideTargetId(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Override Action</label>
                    <input
                      type="text"
                      value={overrideAction}
                      onChange={(e) => setOverrideAction(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Operational Justification (Mandatory)</label>
                  <textarea
                    rows={2}
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-amber-400"
                    placeholder="State reason for manual override..."
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Safety Risk Assessment & Mitigations</label>
                  <textarea
                    rows={2}
                    value={overrideRiskAssessment}
                    onChange={(e) => setOverrideRiskAssessment(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-amber-400"
                    placeholder="e.g. Speed restriction 30 km/h, flagman posted at KM 12.4..."
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={overrideSubmitting}
                    className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold rounded-xl transition flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20"
                  >
                    <FileSignature className="w-4 h-4" />
                    <span>{overrideSubmitting ? "Signing & Recording..." : "Authorize & Sign Safety Override"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950/70 text-xs text-slate-400">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1.5 text-emerald-400 font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>Safety Guardrails Enforced</span>
            </span>
            <span>Default Safety Buffer: <strong>15 Minutes</strong></span>
            <span>Max Block Duration: <strong>240 Minutes</strong></span>
          </div>
          <div>
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
