import React, { useState } from "react";
import { AlertTriangle, ShieldAlert, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  const [confirmed, setConfirmed] = useState(false);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-2xl max-w-md w-full p-6 text-slate-900 shadow-2xl relative border-2 border-red-200 overflow-hidden"
        >
          <div className="flex items-center space-x-3 text-red-600 mb-3">
            <div className="p-3 bg-red-50 rounded-xl border border-red-200">
              <AlertTriangle className="w-7 h-7 text-red-600 animate-bounce" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-wide uppercase text-red-600">EMERGENCY CORRIDOR HALT</h2>
              <p className="text-xs text-slate-500 font-mono">IR-NDLS Central Traffic Dispatch</p>
            </div>
          </div>

          <p className="text-xs text-red-700 leading-relaxed my-4 bg-red-50 p-3.5 rounded-xl border border-red-200">
            ⚠️ Triggering Emergency Stop will instantly transmit <strong>Red Aspect Signals (Stop Immediately)</strong> across all 42 active block sectors on the Northeast Corridor and disable automatic dispatchers.
          </p>

          <div className="flex items-center space-x-3 pt-4 border-t border-slate-200">
            <button
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-xs font-bold py-2.5 rounded-xl border border-slate-200 text-slate-700 transition"
            >
              Abort & Return
            </button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setConfirmed(true);
                onConfirm();
                setTimeout(onClose, 800);
              }}
              className="flex-1 bg-red-600 hover:bg-red-700 text-xs font-black py-2.5 rounded-xl text-white shadow-sm transition tracking-wider uppercase"
            >
              {confirmed ? "HALT BROADCASTED" : "CONFIRM EMERGENCY HALT"}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};


