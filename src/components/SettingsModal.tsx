import React, { useState } from "react";
import { 
  Settings, 
  X, 
  Sliders, 
  Eye, 
  Volume2, 
  Radio, 
  Cpu, 
  RotateCcw, 
  Check, 
  ShieldCheck, 
  Activity,
  Layers
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface AppSettingsState {
  glassTransparency: number;
  refreshIntervalMs: number;
  audioEnabled: boolean;
  alertVolume: number;
  signalGlowIntensity: "low" | "medium" | "high";
  showHudTelemetry: boolean;
  autoConflictDetection: boolean;
  safetyBufferMinutes: number;
  stationId: string;
  autoScrollTimetable: boolean;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettingsState;
  setSettings: React.Dispatch<React.SetStateAction<AppSettingsState>>;
  onSave?: (savedSettings: AppSettingsState) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  setSettings,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<"appearance" | "telemetry" | "audio" | "system">("appearance");
  const [showSavedToast, setShowSavedToast] = useState(false);

  if (!isOpen) return null;

  const handleResetDefaults = () => {
    const defaults: AppSettingsState = {
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
    };
    setSettings(defaults);
    triggerSaveFeedback();
  };

  const triggerSaveFeedback = () => {
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2500);
    if (onSave) onSave(settings);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-2xl max-w-2xl w-full p-6 text-slate-900 shadow-2xl relative border border-slate-200 flex flex-col max-h-[88vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-200">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Dispatcher System Configuration</h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  Display engine, audio telemetry, signal safety thresholds, and console preferences
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

          {/* Settings Tabs */}
          <div className="flex space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 mb-4">
            {[
              { id: "appearance", label: "Display & Theme", icon: Eye },
              { id: "telemetry", label: "Telemetry & HUD", icon: Activity },
              { id: "audio", label: "Audio & Alerts", icon: Volume2 },
              { id: "system", label: "Safety Protocols", icon: ShieldCheck }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center space-x-1.5 py-2 px-2 rounded-lg text-xs font-bold transition ${
                    isActive 
                      ? "bg-white text-blue-600 shadow-xs border border-slate-200" 
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Contents */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar text-xs font-mono">
            {/* Appearance Tab */}
            {activeTab === "appearance" && (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block font-sans">Theme Contrast & Panel Density</span>
                      <span className="text-[11px] text-slate-500 font-sans">Adjust surface density and contrast ratios</span>
                    </div>
                    <span className="text-sm font-bold text-blue-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                      {Math.round(settings.glassTransparency * 100)}%
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0.30"
                    max="1.00"
                    step="0.05"
                    value={settings.glassTransparency}
                    onChange={(e) => setSettings(prev => ({ ...prev, glassTransparency: parseFloat(e.target.value) }))}
                    className="w-full accent-blue-600 bg-slate-200 h-2 rounded-lg cursor-pointer"
                  />

                  <div className="flex justify-between text-[10px] text-slate-400 font-sans">
                    <span>Compact (30%)</span>
                    <span>Standard Density (75%)</span>
                    <span>High Contrast (100%)</span>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block font-sans">Signal Aspect & Badge Vibrancy</span>
                      <span className="text-[11px] text-slate-500 font-sans">Vibrancy of interlocking track signals (Clear / Caution / Stop)</span>
                    </div>
                    <div className="flex space-x-1">
                      {(["low", "medium", "high"] as const).map((level) => (
                        <button
                          key={level}
                          onClick={() => setSettings(prev => ({ ...prev, signalGlowIntensity: level }))}
                          className={`px-2.5 py-1 rounded-lg text-[10px] uppercase font-bold transition ${
                            settings.signalGlowIntensity === level
                              ? "bg-blue-600 text-white"
                              : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 block font-sans">Timetable Real-Time Auto Scroll</span>
                    <span className="text-[11px] text-slate-500 font-sans">Keep current time playhead cursor centered on corridor charts</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoScrollTimetable}
                    onChange={(e) => setSettings(prev => ({ ...prev, autoScrollTimetable: e.target.checked }))}
                    className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Telemetry Tab */}
            {activeTab === "telemetry" && (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block font-sans">Telemetry Refresh Polling Frequency</span>
                      <span className="text-[11px] text-slate-500 font-sans">Sensor update cycle for speed, track temp, and train positions</span>
                    </div>
                    <select
                      value={settings.refreshIntervalMs}
                      onChange={(e) => setSettings(prev => ({ ...prev, refreshIntervalMs: Number(e.target.value) }))}
                      className="bg-white border border-slate-300 text-slate-800 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                    >
                      <option value={500}>Ultra Fast (500ms)</option>
                      <option value={1000}>Standard Live (1000ms)</option>
                      <option value={3000}>Eco Mode (3000ms)</option>
                    </select>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 block font-sans">Live HUD Telemetry Overlays</span>
                    <span className="text-[11px] text-slate-500 font-sans">Display live speedometers and train consist tags on track views</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.showHudTelemetry}
                    onChange={(e) => setSettings(prev => ({ ...prev, showHudTelemetry: e.target.checked }))}
                    className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Audio Tab */}
            {activeTab === "audio" && (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 block font-sans">Dispatcher Telemetry Chimes</span>
                    <span className="text-[11px] text-slate-500 font-sans">Acoustic feedback on block clearance and conflict warning alerts</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.audioEnabled}
                    onChange={(e) => setSettings(prev => ({ ...prev, audioEnabled: e.target.checked }))}
                    className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                  />
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block font-sans">Alert Chime Volume</span>
                      <span className="text-[11px] text-slate-500 font-sans">Volume level for priority sirens and interlocking changes</span>
                    </div>
                    <span className="text-xs font-bold text-blue-600">{settings.alertVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.alertVolume}
                    disabled={!settings.audioEnabled}
                    onChange={(e) => setSettings(prev => ({ ...prev, alertVolume: parseInt(e.target.value) }))}
                    className="w-full accent-blue-600 bg-slate-200 h-2 rounded-lg cursor-pointer disabled:opacity-30"
                  />
                </div>
              </div>
            )}

            {/* System Tab */}
            {activeTab === "system" && (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 block font-sans">Automated AI Conflict Prediction Engine</span>
                    <span className="text-[11px] text-slate-500 font-sans">Run continuous predictive simulation for head-to-head block conflicts</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoConflictDetection}
                    onChange={(e) => setSettings(prev => ({ ...prev, autoConflictDetection: e.target.checked }))}
                    className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                  />
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block font-sans">Safety Envelop Buffer (Minutes)</span>
                      <span className="text-[11px] text-slate-500 font-sans">Mandatory headway margin enforced ahead of high-speed passenger trains</span>
                    </div>
                    <input
                      type="number"
                      min="5"
                      max="30"
                      value={settings.safetyBufferMinutes}
                      onChange={(e) => setSettings(prev => ({ ...prev, safetyBufferMinutes: Number(e.target.value) }))}
                      className="w-20 bg-white border border-slate-300 text-blue-600 text-center font-bold rounded-lg py-1 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block font-sans">Assigned Console Sector ID</span>
                      <span className="text-[11px] text-slate-500 font-sans">Hardware terminal binding ID</span>
                    </div>
                    <input
                      type="text"
                      value={settings.stationId}
                      onChange={(e) => setSettings(prev => ({ ...prev, stationId: e.target.value }))}
                      className="bg-white border border-slate-300 text-slate-900 font-mono px-3 py-1 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Toast Notification for Saved Changes */}
          <AnimatePresence>
            {showSavedToast && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-blue-600 text-white font-bold font-sans text-xs px-4 py-2 rounded-xl shadow-lg border border-blue-500 flex items-center space-x-2"
              >
                <Check className="w-4 h-4" />
                <span>Preferences applied successfully!</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer Controls */}
          <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
            <button
              onClick={handleResetDefaults}
              className="flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-800 font-sans transition px-2.5 py-1.5 rounded-lg hover:bg-slate-100"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>

            <div className="flex space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition"
              >
                Close
              </button>
              <button
                onClick={triggerSaveFeedback}
                className="px-5 py-1.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

