import React, { useState } from "react";
import { 
  User, 
  X, 
  Shield, 
  Award, 
  Clock, 
  Activity, 
  CheckCircle2, 
  Edit3, 
  LogOut, 
  FileText, 
  Train,
  Sparkles,
  MapPin,
  Flame,
  Radio,
  ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface OperatorProfile {
  name: string;
  role: string;
  consoleId: string;
  sectorDivision: string;
  badgeLevel: string;
  shift: string;
  shiftStartTime: string;
  safetyScore: number;
  trainsDispatched: number;
  blocksBundled: number;
  incidentsResolved: number;
  avatarUrl: string;
  status: "ACTIVE" | "HANDOVER" | "STANDBY";
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: OperatorProfile;
  setProfile: React.Dispatch<React.SetStateAction<OperatorProfile>>;
  onShiftHandover?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  setProfile,
  onShiftHandover
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const [editSector, setEditSector] = useState(profile.sectorDivision);
  const [editShift, setEditShift] = useState(profile.shift);
  const [handoverReportGenerated, setHandoverReportGenerated] = useState(false);

  if (!isOpen) return null;

  const handleSaveProfile = () => {
    setProfile(prev => ({
      ...prev,
      name: editName,
      sectorDivision: editSector,
      shift: editShift
    }));
    setIsEditing(false);
  };

  const handleGenerateHandover = () => {
    setHandoverReportGenerated(true);
    if (onShiftHandover) onShiftHandover();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-2xl max-w-2xl w-full p-6 text-slate-900 shadow-2xl relative border border-slate-200 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-200">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Dispatcher Profile & Shift Console</h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  Verified controller authorization, active shift telemetry, and safety records
                </p>
              </div>
            </div>

            <button 
              onClick={onClose} 
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar text-xs font-mono">
            {/* Operator Card Banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-500 border-2 border-blue-400 ring-4 ring-blue-100 shadow-sm flex items-center justify-center text-white">
                      <User className="w-7 h-7 stroke-[2.5]" />
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full animate-pulse"></span>
                  </div>

                  <div>
                    {isEditing ? (
                      <div className="space-y-1.5">
                        <input 
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="bg-white border border-slate-300 text-slate-900 px-2 py-1 rounded text-xs font-bold focus:outline-none focus:border-blue-500"
                          placeholder="Operator Name"
                        />
                        <input 
                          type="text"
                          value={editSector}
                          onChange={(e) => setEditSector(e.target.value)}
                          className="bg-white border border-slate-300 text-xs text-slate-600 px-2 py-0.5 rounded block focus:outline-none focus:border-blue-500"
                          placeholder="Sector Division"
                        />
                      </div>
                    ) : (
                      <>
                        <h4 className="text-base font-black text-slate-900 flex items-center space-x-2">
                          <span>{profile.name}</span>
                          <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                            {profile.badgeLevel}
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-600 font-medium flex items-center space-x-1.5 mt-0.5">
                          <MapPin className="w-3 h-3 text-blue-600" />
                          <span>{profile.sectorDivision}</span>
                        </p>
                        <div className="flex items-center space-x-2 mt-1.5 text-[10px] text-slate-500">
                          <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                            Console: <strong className="text-slate-900">{profile.consoleId}</strong>
                          </span>
                          <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                            Shift: <strong className="text-blue-600">{profile.shift}</strong>
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:items-end space-y-2">
                  {isEditing ? (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs hover:bg-slate-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        className="px-3 py-1 bg-blue-600 text-white font-bold rounded-lg text-xs hover:bg-blue-700 shadow-xs"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditName(profile.name);
                        setEditSector(profile.sectorDivision);
                        setEditShift(profile.shift);
                        setIsEditing(true);
                      }}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-300 transition shadow-xs"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Credentials</span>
                    </button>
                  )}

                  <div className="flex items-center space-x-1.5 text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
                    <Radio className="w-3 h-3 animate-ping" />
                    <span>ON DUTY (AUTHENTICATED)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance & Dispatcher Metric Stats HUD */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Punctuality Score</div>
                <div className="text-xl font-black text-emerald-600 mt-1">{profile.safetyScore}%</div>
                <div className="text-[9px] text-slate-500 mt-0.5">Zero Signal Breaches</div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Trains Controlled</div>
                <div className="text-xl font-black text-blue-600 mt-1">{profile.trainsDispatched}</div>
                <div className="text-[9px] text-slate-500 mt-0.5">Today's Total Paths</div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Blocks Bundled</div>
                <div className="text-xl font-black text-amber-600 mt-1">{profile.blocksBundled}</div>
                <div className="text-[9px] text-slate-500 mt-0.5">3.5 hrs saved</div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Conflicts Averted</div>
                <div className="text-xl font-black text-blue-600 mt-1">{profile.incidentsResolved}</div>
                <div className="text-[9px] text-slate-500 mt-0.5">AI Guided Rescheduling</div>
              </div>
            </div>

            {/* Shift Session & Handover Report */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-slate-900">Current Shift Timer & Log</span>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">Started: {profile.shiftStartTime} IST</span>
              </div>

              <div className="text-[11px] text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                Active interlocking sector: <strong>NDLS-CNB Trunk (KM 0.0 - 440.0)</strong>. Current train occupancy density: <strong>76%</strong>. High-speed envelope active for <strong>NDLS-HWH Rajdhani (12301)</strong>.
              </div>

              {handoverReportGenerated ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 space-y-1">
                  <div className="flex items-center space-x-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Shift Handover Summary Exported to Next Controller (OP-403)</span>
                  </div>
                  <p className="text-[10px] text-emerald-700">
                    All open track possession permits (BLOCK-2001) and catenary maintenance windows synced to central IR-TMS database.
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-600">Ready to transition sector dispatch console?</span>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleGenerateHandover}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-bold hover:bg-blue-100 transition"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Generate Shift Handover</span>
                  </motion.button>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-500">
              RailSync Central Authorization Token: <strong className="text-slate-900">AUTH-SEC-88319</strong>
            </span>

            <button
              onClick={onClose}
              className="px-5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

