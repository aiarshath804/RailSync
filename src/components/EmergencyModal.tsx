import React, { useState, useEffect } from "react";
import { AlertTriangle, ShieldAlert, CheckCircle2, RotateCcw, X, Info, Flame, Radio } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useLiveData } from "../contexts/LiveDataContext";

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEmergencyHaltIssued?: (data: any) => void;
  onEmergencyResolved?: () => void;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({
  isOpen,
  onClose,
  onEmergencyHaltIssued,
  onEmergencyResolved
}) => {
  const [selectedBlock, setSelectedBlock] = useState<string>("B2");
  const [department, setDepartment] = useState<string>("TMS");
  const [emergencyType, setEmergencyType] = useState<string>("Track Obstruction");
  const [severity, setSeverity] = useState<number>(4);
  const [description, setDescription] = useState<string>("Micro-fracture alert on UP line requiring immediate stop & track inspection");
  const [loading, setLoading] = useState<boolean>(false);
  const [activeEmergency, setActiveEmergency] = useState<any | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Shared Live Context
  const { corridorData, refreshNow } = useLiveData();

  useEffect(() => {
    if (isOpen && corridorData) {
      const emergencyBlock = (corridorData.blocks || []).find((b: any) => b.operational_status === "EMERGENCY_CLOSED");
      setActiveEmergency(emergencyBlock || null);
      setSuccessMessage(null);
    }
  }, [isOpen, corridorData]);

  const handleTriggerHalt = async () => {
    setLoading(true);
    try {
      const payload = {
        block_id: selectedBlock,
        department,
        emergency_type: emergencyType,
        severity,
        description
      };
      const res = await fetch("/api/v1/emergency/halt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.status === "EMERGENCY_HALT_ACTIVE") {
        setSuccessMessage(`Emergency halt broadcasted to ${data.affected_block_id}. Signals set to RED ASPECT.`);
        setActiveEmergency(data);
        refreshNow();
        if (onEmergencyHaltIssued) {
          onEmergencyHaltIssued(data);
        }
      } else {
        alert(data.message || "Failed to trigger emergency halt");
      }
    } catch (err) {
      console.error("Emergency Halt error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveEmergency = async () => {
    setLoading(true);
    try {
      const blockIdToResolve = activeEmergency?.block_id || activeEmergency?.affected_block_id || selectedBlock;
      const res = await fetch("/api/v1/emergency/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ block_id: blockIdToResolve })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage("Emergency resolved successfully. Corridor restored to operational status.");
        setActiveEmergency(null);
        refreshNow();
        if (onEmergencyResolved) {
          onEmergencyResolved();
        }
      }
    } catch (err) {
      console.error("Emergency Resolve error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-2xl max-w-lg w-full p-6 text-slate-900 shadow-2xl relative border-2 border-rose-300 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200">
                <AlertTriangle className="w-6 h-6 text-rose-600 animate-bounce" />
              </div>
              <div>
                <h2 className="text-sm font-black tracking-wide uppercase text-rose-700">EMERGENCY CORRIDOR HALT CONTROL</h2>
                <p className="text-[11px] text-slate-500 font-mono">MAS-SR-01 • Chennai Central – Tiruvallur Prototype</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Prototype Disclaimer Badge */}
          <div className="my-3 p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-[10px] text-amber-900 leading-relaxed font-sans flex items-start space-x-2">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <span>
              <strong>PROTOTYPE DEMONSTRATION ONLY:</strong> These 5 blocks (B1–B5) are simulation prototype segments for operational testing. Not connected to live Indian Railways signalling interlocking.
            </span>
          </div>

          {/* Active Emergency Banner if any */}
          {activeEmergency && (
            <div className="mb-4 p-3 bg-rose-600 text-white rounded-xl shadow-md border border-rose-700">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-black uppercase tracking-wider flex items-center space-x-1.5">
                  <Flame className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span>ACTIVE EMERGENCY LOCKOUT</span>
                </span>
                <span className="px-2 py-0.5 bg-white text-rose-800 text-[10px] font-mono font-bold rounded">
                  RED ASPECT TRANSMITTED
                </span>
              </div>
              <p className="text-xs text-rose-100 mb-2">
                Block <strong>{activeEmergency.block_id || activeEmergency.affected_block_id}</strong> is locked in EMERGENCY_CLOSED status.
              </p>
              <button
                onClick={handleResolveEmergency}
                disabled={loading}
                className="w-full bg-white hover:bg-rose-50 text-rose-700 font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center space-x-1.5 shadow-xs transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>RESOLVE EMERGENCY & RESTORE SIGNALS</span>
              </button>
            </div>
          )}

          {successMessage && (
            <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-800 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Emergency Form */}
          <div className="space-y-3 text-xs">
            {/* Target Block */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Target Operational Block</label>
              <select 
                value={selectedBlock}
                onChange={(e) => setSelectedBlock(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-xs text-slate-800 focus:outline-none focus:border-rose-500"
              >
                <option value="B1">B1: Chennai Central (MAS) → Basin Bridge (BBQ)</option>
                <option value="B2">B2: Basin Bridge (BBQ) → Perambur (PER)</option>
                <option value="B3">B3: Perambur (PER) → Ambattur (ABU)</option>
                <option value="B4">B4: Ambattur (ABU) → Avadi (AVD)</option>
                <option value="B5">B5: Avadi (AVD) → Tiruvallur (TRL)</option>
                <option value="ALL">ALL: Complete Corridor Shutdown (B1 to B5)</option>
              </select>
            </div>

            {/* Department & Severity Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Department</label>
                <select 
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-rose-500"
                >
                  <option value="TMS">TMS (Track & Engineering)</option>
                  <option value="SMMS">SMMS (Signals & Telecom)</option>
                  <option value="TDMS">TDMS (Traction & OHE)</option>
                  <option value="OPERATIONS">OPERATIONS (Dispatch Control)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Severity Level</label>
                <select 
                  value={severity}
                  onChange={(e) => setSeverity(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-rose-500 font-mono"
                >
                  <option value={5}>Level 5 - Catastrophic / Total Block Lockout</option>
                  <option value={4}>Level 4 - Major Obstruction / Immediate Stop</option>
                  <option value={3}>Level 3 - Cautionary / Speed Hold</option>
                </select>
              </div>
            </div>

            {/* Emergency Type */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Emergency Nature / Defect Type</label>
              <select 
                value={emergencyType}
                onChange={(e) => setEmergencyType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-rose-500"
              >
                <option value="Track Obstruction">Track Obstruction / Boulder / Debris</option>
                <option value="Rail Fracture">Rail Fracture / Weld Crack Detected</option>
                <option value="Signal Interlocking Failure">Signal Interlocking / Point Machine Failure</option>
                <option value="OHE Wire Snap">OHE 25kV Traction Wire Snap / Loss of Power</option>
                <option value="Axle Counter Fault">Digital Axle Counter Fault (False Occupancy)</option>
                <option value="Flash Flood / Waterlogging">Waterlogging on Tracks (Monsoon Alert)</option>
              </select>
            </div>

            {/* Description / Dispatcher Notes */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Incident Notes / Broadcast Message</label>
              <textarea 
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details of incident..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-rose-500 font-sans"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 pt-4 border-t border-slate-200 mt-4">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-xs font-bold py-2.5 rounded-xl border border-slate-200 text-slate-700 transition"
            >
              Cancel
            </button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleTriggerHalt}
              disabled={loading}
              className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-xs font-black py-2.5 rounded-xl text-white shadow-md transition tracking-wider uppercase flex items-center justify-center space-x-1.5"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>{loading ? "TRANSMITTING..." : "ISSUE RED ASPECT HALT"}</span>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
