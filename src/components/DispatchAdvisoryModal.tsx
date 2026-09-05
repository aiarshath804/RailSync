import React, { useState, useEffect } from "react";
import { 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  Clock, 
  Train, 
  Layers, 
  RefreshCw, 
  X, 
  Check, 
  ArrowRight, 
  FileText, 
  AlertCircle, 
  Info,
  Sliders,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface DispatchAdvisoryData {
  advisory_id: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  priority: string;
  title: string;
  situation: string;
  affected_corridor: string;
  affected_section: string;
  affected_trains: string[];
  recommended_action: string;
  reason: string;
  operational_impact: string;
  suggested_time_window: string;
  action_type?: string;
  action_payload?: Record<string, any>;
  action_label?: string;
  status: "ACTIVE" | "ACKNOWLEDGED" | "APPLIED";
  timestamp: string;
  audit_log_id?: number | null;
}

export interface CorridorSummaryData {
  corridor: string;
  active_trains_count: number;
  emergency_count: number;
  congested_blocks_count: number;
  pending_requests_count: number;
  critical_defects_count: number;
}

interface DispatchAdvisoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdvisoryApplied?: (advisory: DispatchAdvisoryData) => void;
}

export const DispatchAdvisoryModal: React.FC<DispatchAdvisoryModalProps> = ({
  isOpen,
  onClose,
  onAdvisoryApplied
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [advisory, setAdvisory] = useState<DispatchAdvisoryData | null>(null);
  const [allAdvisories, setAllAdvisories] = useState<DispatchAdvisoryData[]>([]);
  const [corridorSummary, setCorridorSummary] = useState<CorridorSummaryData | null>(null);
  const [selectedAdvisoryIndex, setSelectedAdvisoryIndex] = useState<number>(0);
  
  // Action states
  const [acknowledging, setAcknowledging] = useState<boolean>(false);
  const [acknowledged, setAcknowledged] = useState<boolean>(false);
  const [applying, setApplying] = useState<boolean>(false);
  const [applied, setApplied] = useState<boolean>(false);
  const [auditMessage, setAuditMessage] = useState<string | null>(null);

  // Fetch or generate fresh dispatch advisory from backend
  const fetchAdvisory = async () => {
    setLoading(true);
    setError(null);
    setAcknowledged(false);
    setApplied(false);
    setAuditMessage(null);

    try {
      const res = await fetch("/api/v1/dispatch/advisory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          controller_id: "CHIEF_DISPATCHER_MAS",
          force_refresh: true
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      if (data && data.advisory) {
        setAdvisory(data.advisory);
        if (Array.isArray(data.all_advisories) && data.all_advisories.length > 0) {
          setAllAdvisories(data.all_advisories);
          setSelectedAdvisoryIndex(0);
        } else {
          setAllAdvisories([data.advisory]);
        }
        if (data.corridor_summary) {
          setCorridorSummary(data.corridor_summary);
        }
      } else {
        throw new Error("No structured operational advisory returned by dispatch engine.");
      }
    } catch (err: any) {
      console.error("[DispatchAdvisoryModal] Error:", err);
      setError(err?.message || "Failed to contact dispatch advisory service.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAdvisory();
    }
  }, [isOpen]);

  const activeAdvisory = allAdvisories[selectedAdvisoryIndex] || advisory;

  useEffect(() => {
    if (activeAdvisory) {
      setAcknowledged(activeAdvisory.status === "ACKNOWLEDGED" || activeAdvisory.status === "APPLIED");
      setApplied(activeAdvisory.status === "APPLIED");
      setAuditMessage(null);
      setError(null);
    }
  }, [selectedAdvisoryIndex, activeAdvisory?.advisory_id]);

  // Handle Official Acknowledgment (persists to SQLite safety audit logs)
  const handleAcknowledge = async () => {
    if (!activeAdvisory || acknowledging || acknowledged) return;
    setAcknowledging(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/dispatch/advisory/acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          advisory_id: activeAdvisory.advisory_id,
          controller_id: "CHIEF_DISPATCHER_MAS",
          notes: `Controller reviewed and acknowledged: ${activeAdvisory.title}`
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAcknowledged(true);
        activeAdvisory.status = "ACKNOWLEDGED";
        setAllAdvisories(prev => prev.map((a, i) => i === selectedAdvisoryIndex ? { ...a, status: "ACKNOWLEDGED" } : a));
        setAuditMessage(`Advisory recorded in Safety Audit Log (Audit ID #${data.audit_log_id || "RECORDED"}).`);
      } else {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || errJson?.message || `Server error ${res.status}: Failed to record acknowledgment.`);
      }
    } catch (err: any) {
      setError(err?.message || "Acknowledgment submission failed.");
    } finally {
      setAcknowledging(false);
    }
  };

  // Handle Apply Recommendation (executes real backend workflow)
  const handleApplyRecommendation = async () => {
    if (!activeAdvisory || applying || applied) return;
    setApplying(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/dispatch/advisory/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          advisory_id: activeAdvisory.advisory_id,
          action_type: activeAdvisory.action_type || "GENERAL_ADVISORY",
          action_payload: activeAdvisory.action_payload || {},
          controller_id: "CHIEF_DISPATCHER_MAS",
          notes: `Executed operational recommendation: ${activeAdvisory.recommended_action}`
        })
      });

      if (res.ok) {
        const data = await res.json();
        setApplied(true);
        activeAdvisory.status = "APPLIED";
        setAllAdvisories(prev => prev.map((a, i) => i === selectedAdvisoryIndex ? { ...a, status: "APPLIED" } : a));
        setAuditMessage(`Action ${activeAdvisory.action_type} applied successfully. Safety Audit #${data.audit_log_id || "VERIFIED"} committed.`);
        if (onAdvisoryApplied) {
          onAdvisoryApplied(activeAdvisory);
        }
      } else {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || errJson?.message || `Server error ${res.status}: Failed to apply recommendation.`);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to apply recommendation.");
    } finally {
      setApplying(false);
    }
  };

  if (!isOpen) return null;

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
            <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
            <span>CRITICAL SECTOR ALERT</span>
          </span>
        );
      case "WARNING":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
            <AlertCircle className="w-3 h-3 text-amber-700 shrink-0" />
            <span>REGULATION WARNING</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-900 border border-blue-200">
            <Info className="w-3 h-3 text-blue-700 shrink-0" />
            <span>OPERATIONAL NOTICE</span>
          </span>
        );
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-2xl max-w-4xl w-full p-6 text-slate-900 shadow-2xl relative border border-slate-300 max-h-[92vh] flex flex-col"
        >
          {/* Top Header */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-amber-500 text-blue-950 rounded-xl border border-amber-400 shadow-xs">
                <AlertTriangle className="w-5 h-5 fill-blue-950 stroke-amber-500" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide font-serif">
                    Live Dispatch Advisory Console
                  </h2>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-blue-900 text-amber-300 font-bold tracking-wider">
                    REAL-TIME ENGINE
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-mono">
                  Synthesizing Live Corridor Occupancy, Timetables, Maintenance Blocks & Headway Buffers
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <motion.button 
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={fetchAdvisory} 
                disabled={loading || acknowledging || applying}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-blue-900 border border-slate-300 transition disabled:opacity-50 text-xs font-mono font-bold flex items-center space-x-1 cursor-pointer"
                title="Re-run Real-Time Operational Evaluation"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>EVALUATE NOW</span>
              </motion.button>
              <button 
                onClick={onClose} 
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Corridor Live Context Ribbon */}
          {corridorSummary && (
            <div className="mb-3 px-3 py-2 bg-slate-100 rounded-xl border border-slate-200 text-slate-700 text-xs font-mono flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-900">{corridorSummary.corridor}</span>
              </div>
              <div className="flex items-center space-x-3 text-[11px]">
                <span>Active Trains: <strong className="text-blue-900 font-bold">{corridorSummary.active_trains_count}</strong></span>
                <span>•</span>
                <span>Congested: <strong className={corridorSummary.congested_blocks_count > 0 ? "text-amber-700 font-bold" : "text-emerald-700"}>{corridorSummary.congested_blocks_count}</strong></span>
                <span>•</span>
                <span>Emergency Halts: <strong className={corridorSummary.emergency_count > 0 ? "text-rose-700 font-bold" : "text-slate-500"}>{corridorSummary.emergency_count}</strong></span>
                <span>•</span>
                <span>Pending Work: <strong className="text-slate-700">{corridorSummary.pending_requests_count}</strong></span>
              </div>
            </div>
          )}

          {/* Multi-Advisory Selector Tabs if multiple generated */}
          {allAdvisories.length > 1 && (
            <div className="mb-3 flex items-center space-x-2 overflow-x-auto pb-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider shrink-0">
                Active Advisories ({allAdvisories.length}):
              </span>
              {allAdvisories.map((adv, idx) => (
                <button
                  key={adv.advisory_id}
                  onClick={() => setSelectedAdvisoryIndex(idx)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition shrink-0 flex items-center space-x-1.5 cursor-pointer border ${
                    selectedAdvisoryIndex === idx
                      ? "bg-blue-900 text-white border-blue-900 shadow-xs"
                      : "bg-white text-slate-700 hover:bg-slate-100 border-slate-200"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${
                    adv.severity === "CRITICAL" ? "bg-rose-500 animate-pulse" : adv.severity === "WARNING" ? "bg-amber-400" : "bg-blue-400"
                  }`} />
                  <span>{adv.advisory_id.split("-").slice(0, 3).join("-")}</span>
                </button>
              ))}
            </div>
          )}

          {/* Audit / Success Toast Message */}
          {auditMessage && (
            <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-mono text-[11px] font-semibold">{auditMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="mb-3 p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-3">
                <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-mono text-slate-600 animate-pulse">
                  Querying authoritative corridor state, train conflicts & maintenance requests...
                </p>
              </div>
            ) : !activeAdvisory ? (
              <div className="py-16 text-center text-slate-500 text-xs font-mono">
                No active dispatch advisory found. Click "EVALUATE NOW" to re-check the corridor.
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* Advisory Title Card */}
                <div className={`p-4 rounded-xl border ${
                  activeAdvisory.severity === "CRITICAL" 
                    ? "bg-rose-50/70 border-rose-300" 
                    : activeAdvisory.severity === "WARNING" 
                    ? "bg-amber-50/70 border-amber-300" 
                    : "bg-blue-50/50 border-blue-200"
                }`}>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center space-x-2">
                      {getSeverityBadge(activeAdvisory.severity)}
                      <span className="text-[10px] font-mono text-slate-500 font-bold">
                        {activeAdvisory.priority}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400">
                      <span>ID: {activeAdvisory.advisory_id}</span>
                      {activeAdvisory.audit_log_id && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">
                          Audit #{activeAdvisory.audit_log_id}
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-sm font-black text-slate-900 tracking-tight font-serif mb-1">
                    {activeAdvisory.title}
                  </h3>
                  <div className="text-xs text-slate-700 leading-relaxed font-sans">
                    {activeAdvisory.situation}
                  </div>
                </div>

                {/* Section & Trains Info Bar */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                      Affected Section
                    </span>
                    <div className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-700" />
                      <span>{activeAdvisory.affected_section}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                      Affected Consists / Operations
                    </span>
                    <div className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                      <Train className="w-3.5 h-3.5 text-amber-600" />
                      <span>
                        {activeAdvisory.affected_trains && activeAdvisory.affected_trains.length > 0 
                          ? activeAdvisory.affected_trains.join(", ") 
                          : "None currently impacted"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recommended Operational Action (Primary Callout) */}
                <div className="p-4 bg-blue-950 text-white rounded-xl shadow-xs border border-blue-900">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider font-black flex items-center space-x-1">
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>AUTHORITATIVE RECOMMENDED ACTION</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-300 flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>Window: {activeAdvisory.suggested_time_window}</span>
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed font-sans font-semibold text-slate-100">
                    {activeAdvisory.recommended_action}
                  </p>
                </div>

                {/* Operational Reasoning & Expected Impact */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold block mb-1">
                      1. Operational Reasoning
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed font-sans">
                      {activeAdvisory.reason}
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold block mb-1">
                      2. Expected Network Impact
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed font-sans">
                      {activeAdvisory.operational_impact}
                    </p>
                  </div>
                </div>

                {/* Safety & Interlocking Compliance Notice */}
                <div className="p-2.5 bg-slate-100 rounded-lg border border-slate-200 text-[10px] text-slate-600 font-sans flex items-start space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Controller Verification Protocol:</strong> All dispatch recommendations adhere to Indian Railways Absolute Block & Automatic Permissive signalling standards, requiring minimum 15-minute headway protection behind express consists. Actions are audited in SQLite repository logs.
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-200 mt-3 gap-2">
            <div className="flex items-center space-x-2 text-[11px] text-slate-500 font-mono">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Generated: {activeAdvisory ? new Date(activeAdvisory.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "—"}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={onClose}
                disabled={acknowledging || applying}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition cursor-pointer"
              >
                Close
              </button>

              {/* Acknowledge Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAcknowledge}
                disabled={loading || acknowledging || acknowledged || !activeAdvisory}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer border ${
                  acknowledged
                    ? "bg-slate-100 text-emerald-700 border-emerald-300"
                    : "bg-blue-900 hover:bg-blue-800 text-white border-blue-900 shadow-xs disabled:opacity-50"
                }`}
              >
                {acknowledged ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ACKNOWLEDGED & LOGGED</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{acknowledging ? "LOGGING AUDIT..." : "ACKNOWLEDGE"}</span>
                  </>
                )}
              </motion.button>

              {/* Apply Recommendation Button (when action exists) */}
              {activeAdvisory?.action_type && activeAdvisory.action_type !== "GENERAL_ADVISORY" && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleApplyRecommendation}
                  disabled={loading || applying || applied}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center space-x-1.5 cursor-pointer uppercase tracking-wider shadow-sm border ${
                    applied
                      ? "bg-emerald-100 text-emerald-800 border-emerald-400"
                      : "bg-emerald-700 hover:bg-emerald-600 text-white border-emerald-800 disabled:opacity-50"
                  }`}
                >
                  {applied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      <span>RECOMMENDATION APPLIED</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>{applying ? "APPLYING..." : (activeAdvisory.action_label || "APPLY RECOMMENDATION")}</span>
                    </>
                  )}
                </motion.button>
              )}
            </div>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
