import React from "react";
import { Sparkles, X, CheckCircle2, ShieldCheck, AlertCircle, RefreshCw } from "lucide-react";
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
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-2xl max-w-2xl w-full p-6 text-slate-900 shadow-2xl relative border border-slate-200"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-200">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 uppercase tracking-wide">RailSync AI Safety & Dispatch Engine</h2>
                <p className="text-xs text-slate-500 font-mono">Corridor Availability & Conflict Resolver (Gemini 2.5)</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <motion.button 
                whileHover={{ scale: 1.1, rotate: 180 }}
                whileTap={{ scale: 0.9 }}
                onClick={onRefresh} 
                disabled={loading}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-blue-600 border border-slate-200 transition disabled:opacity-50"
                title="Refresh AI Analysis"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </motion.button>
              <button 
                onClick={onClose} 
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-4">
                <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-mono text-slate-500 animate-pulse">Synthesizing cross-department telemetry & conflict safety buffers...</p>
              </div>
            ) : (
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-xs leading-relaxed text-slate-800 whitespace-pre-line space-y-2 font-mono">
                {insights}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200 mt-4">
            <div className="flex items-center space-x-2 text-[11px] text-slate-500">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span className="font-mono">Safety Isolation Standard: 15 min buffer enforced</span>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition uppercase tracking-wider"
            >
              Acknowledge & Close
            </motion.button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};


