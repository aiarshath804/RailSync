import React, { useState } from "react";
import { Sparkles, X, CheckCircle2, ShieldCheck, AlertTriangle, RefreshCw, Cpu, Check, Layers } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AIInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  insights: string;
  onRefresh: () => void;
  loading: boolean;
}

export const AIInsightsModal: React.FC<AIInsightsModalProps> = ({
  isOpen,
  onClose,
  insights,
  onRefresh,
  loading
}) => {
  const [applied, setApplied] = useState(false);

  if (!isOpen) return null;

  // Simple section parser if the insights follow markdown with ##
  const sections = insights ? insights.split(/(?=##\s+\d+\.)/) : [];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-2xl max-w-3xl w-full p-6 text-slate-900 shadow-2xl relative border border-slate-300 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-blue-50 text-blue-800 rounded-xl border border-blue-200">
                <Sparkles className="w-5 h-5 text-blue-800 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide font-serif">
                    AI / RULE-BASED OPERATIONAL RECOMMENDATION
                  </h2>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold">
                    PROTOTYPE CORRIDOR
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-mono">
                  Chennai Central to Tiruvallur Corridor (B1–B5) • Southern Railway
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onRefresh} 
                disabled={loading}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-blue-900 border border-slate-300 transition disabled:opacity-50 text-xs font-mono font-bold flex items-center space-x-1"
                title="Re-run Corridor Analysis"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>RE-ANALYZE</span>
              </motion.button>
              <button 
                onClick={onClose} 
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Official Prototype Advisory Disclaimer */}
          <div className="mb-3 p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-[10px] text-amber-900 font-sans flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong>ADVISORY OPERATIONAL DISCLAIMER:</strong> Recommendations are advisory operational suggestions generated for the North Tamil Nadu demonstration prototype corridor. They synthesize live train positions, punctuality priorities, and maintenance blocks, but do NOT replace manual controller sign-off or official Indian Railways interlocking regulations.
            </div>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3">
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-4">
                <div className="w-10 h-10 border-3 border-blue-800 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-mono text-slate-600 animate-pulse">
                  Synthesizing B1–B5 live train occupancy, train priorities & headway conflict buffers...
                </p>
              </div>
            ) : sections.length > 1 ? (
              <div className="space-y-3 font-sans">
                {sections.map((sec, idx) => {
                  const lines = sec.trim().split("\n");
                  const title = lines[0].replace(/^##\s+/, "");
                  const body = lines.slice(1).join("\n").trim();
                  return (
                    <div key={idx} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <div className="text-xs font-black text-blue-950 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-800"></span>
                        <span>{title}</span>
                      </div>
                      <div className="text-xs text-slate-700 leading-relaxed font-sans whitespace-pre-line pl-3.5 border-l-2 border-blue-200">
                        {body}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs leading-relaxed text-slate-800 whitespace-pre-line font-sans">
                {insights || "Corridor analysis will evaluate current live train occupancy, priority sorting, and headway conflict buffers."}
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 mt-3">
            <div className="flex items-center space-x-2 text-[11px] text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="font-mono">15-Minute Headway Buffer Enforced</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition"
              >
                Close
              </button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setApplied(true);
                  setTimeout(() => {
                    onClose();
                  }, 900);
                }}
                className="px-5 py-2 rounded-xl text-xs font-black bg-blue-900 hover:bg-blue-800 text-white shadow-sm transition uppercase tracking-wider flex items-center space-x-1.5"
              >
                {applied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>ADVISORY ACKNOWLEDGED</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ACCEPT ADVISORY & LOG</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
