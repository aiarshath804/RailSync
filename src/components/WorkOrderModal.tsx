import React, { useState } from "react";
import { Wrench, X, CheckCircle, Calendar, Clock, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface WorkOrderModalProps {
  assetId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export const WorkOrderModal: React.FC<WorkOrderModalProps> = ({
  assetId,
  isOpen,
  onClose,
  onSubmit
}) => {
  const [department, setDepartment] = useState<string>("SMMS");
  const [urgency, setUrgency] = useState<string>("HIGH");
  const [duration, setDuration] = useState<number>(90);
  const [notes, setNotes] = useState<string>("Replace degraded point circuit breaker and re-align telemetry packet transmitter.");

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-2xl max-w-lg w-full p-6 text-slate-900 shadow-2xl relative border border-slate-200"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600 border border-blue-200">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 uppercase tracking-wide">Create Work Order</h2>
                <p className="text-xs text-slate-500 font-mono">Asset ID: <strong className="text-blue-600">{assetId || "SIG-44B1"}</strong></p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            onSubmit({ assetId, department, urgency, duration, notes });
            onClose();
          }} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block mb-1.5 font-sans">Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-sans"
                >
                  <option value="TMS">TMS (Track Machine & Rail)</option>
                  <option value="SMMS">SMMS (Signal & Interlocking)</option>
                  <option value="TDMS">TDMS (Traction & OHE Power)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block mb-1.5 font-sans">Severity Level</label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-sans"
                >
                  <option value="HIGH">Level 4 - Critical (Immediate Block)</option>
                  <option value="MEDIUM">Level 3 - Degraded (Within 6h)</option>
                  <option value="ROUTINE">Level 2 - Routine Maintenance</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block mb-1.5 font-sans">Est. Window Duration (Minutes)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block mb-1.5 font-sans">Work Instructions & Notes</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-sans"
              ></textarea>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition"
              >
                Cancel
              </button>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition uppercase tracking-wider"
              >
                Submit & Enqueue Work Order
              </motion.button>
            </div>

          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

