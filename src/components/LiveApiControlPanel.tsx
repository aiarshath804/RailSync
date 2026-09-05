import React from "react";
import { Play, Pause, Square, RefreshCw, Radio, Shield, Database, Clock, Activity, Zap } from "lucide-react";

export type LiveDataAction = "START" | "PAUSE" | "STOP" | "REFRESH";

export interface LiveControlState {
  liveStatus: string;
  pollingEnabled: boolean;
  requestsThisSession: number;
  lastSuccessfulUpdate: string | null;
  nextRefresh: string;
  loading: boolean;
  dataSource?: string;
  mode?: string;
  apiStatus?: string;
}

interface LiveApiControlPanelProps {
  controlState: LiveControlState;
  onAction: (action: LiveDataAction) => void;
  compact?: boolean;
}

export const LiveApiControlPanel: React.FC<LiveApiControlPanelProps> = ({
  controlState,
  onAction,
  compact = false
}) => {
  const {
    liveStatus,
    pollingEnabled,
    requestsThisSession,
    lastSuccessfulUpdate,
    nextRefresh,
    loading,
    dataSource,
    mode,
    apiStatus
  } = controlState;

  const isLiveActive = pollingEnabled && liveStatus?.includes("ACTIVE");
  const isPaused = liveStatus?.includes("PAUSED") || mode === "PAUSED";
  const isStopped = liveStatus?.includes("STOPPED");

  const formatTimestamp = (ts: string | null) => {
    if (!ts) return "None";
    try {
      const date = new Date(ts);
      return date.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return ts;
    }
  };

  return (
    <div className="w-full bg-slate-900 border-b border-amber-500/30 text-slate-100 shadow-md font-sans text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-2.5 flex flex-col lg:flex-row items-center justify-between gap-3">
        
        {/* Left Side: Status Indicator & Operational Notice */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Badge */}
          <div className="flex items-center space-x-2">
            <div className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-black tracking-wide border flex items-center space-x-1.5 shadow-xs ${
              isLiveActive
                ? "bg-emerald-950/80 text-emerald-400 border-emerald-500/50"
                : isStopped
                ? "bg-rose-950/80 text-rose-400 border-rose-500/50"
                : "bg-amber-950/80 text-amber-400 border-amber-500/50"
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                isLiveActive ? "bg-emerald-400 animate-ping" : isStopped ? "bg-rose-500" : "bg-amber-400"
              }`} />
              <Radio className="w-3.5 h-3.5 shrink-0" />
              <span className="uppercase">{liveStatus || (pollingEnabled ? "LIVE DATA ACTIVE" : "LIVE DATA PAUSED")}</span>
            </div>

            {/* Polling Mode Indicator */}
            <div className="hidden sm:flex items-center space-x-1 px-2 py-1 bg-slate-950 rounded border border-slate-700 text-[10px] font-mono text-slate-300">
              <span className="text-slate-500">POLLING:</span>
              <span className={`font-bold ${pollingEnabled ? "text-emerald-400" : "text-amber-400"}`}>
                {pollingEnabled ? "ON (Every 10s)" : "OFF"}
              </span>
            </div>
          </div>

          {/* Operational Source Notice */}
          <div className="hidden md:flex items-center space-x-1.5 text-[11px] text-slate-300 font-sans">
            <span className="text-slate-500">|</span>
            <Database className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-semibold text-slate-200">
              {dataSource || (isPaused ? "LIVE DATA PAUSED – Showing last received data" : "RailRadar Indian Railways Live Stream")}
            </span>
          </div>
        </div>

        {/* Center/Right: Live Data Control Buttons */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* START LIVE DATA */}
          <button
            onClick={() => onAction("START")}
            disabled={loading || pollingEnabled}
            className={`px-3 py-1.5 rounded text-xs font-bold font-sans tracking-wide flex items-center space-x-1.5 transition cursor-pointer border shadow-xs ${
              pollingEnabled
                ? "bg-emerald-950 text-emerald-600 border-emerald-800 opacity-60 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 active:scale-95"
            }`}
            title="Enable continuous live polling from RailRadar API"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>START LIVE DATA</span>
          </button>

          {/* PAUSE LIVE DATA */}
          <button
            onClick={() => onAction("PAUSE")}
            disabled={loading || !pollingEnabled}
            className={`px-3 py-1.5 rounded text-xs font-bold font-sans tracking-wide flex items-center space-x-1.5 transition cursor-pointer border shadow-xs ${
              !pollingEnabled
                ? "bg-amber-950 text-amber-600 border-amber-800 opacity-60 cursor-not-allowed"
                : "bg-amber-600 hover:bg-amber-500 text-slate-950 border-amber-400 active:scale-95 font-extrabold"
            }`}
            title="Pause continuous polling to preserve RailRadar API quota"
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
            <span>PAUSE LIVE DATA</span>
          </button>

          {/* STOP LIVE DATA */}
          <button
            onClick={() => onAction("STOP")}
            disabled={loading}
            className="px-2.5 py-1.5 rounded text-xs font-bold font-sans tracking-wide bg-rose-900/80 hover:bg-rose-800 text-rose-100 border border-rose-600/70 flex items-center space-x-1 transition cursor-pointer active:scale-95"
            title="Stop live polling completely"
          >
            <Square className="w-3 h-3 fill-current" />
            <span className="hidden sm:inline">STOP</span>
          </button>

          {/* REFRESH NOW */}
          <button
            onClick={() => onAction("REFRESH")}
            disabled={loading}
            className="px-3 py-1.5 rounded text-xs font-bold font-sans tracking-wide bg-blue-700 hover:bg-blue-600 text-white border border-blue-400 flex items-center space-x-1.5 transition cursor-pointer active:scale-95 shadow-xs"
            title="Execute exactly 1 controlled live refresh cycle"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>REFRESH NOW</span>
          </button>
        </div>

        {/* Far Right: Quota & Session Stats Display Panel */}
        <div className="flex items-center space-x-3 text-[10px] font-mono bg-slate-950 px-3 py-1 rounded-md border border-amber-500/30 shrink-0">
          {/* RailRadar Requests This Session */}
          <div className="flex items-center space-x-1 text-slate-300">
            <Zap className="w-3 h-3 text-amber-400" />
            <span className="text-slate-400">RailRadar Calls:</span>
            <span className="font-bold text-amber-300 text-xs px-1 bg-amber-950/80 rounded border border-amber-500/40">
              {requestsThisSession}
            </span>
          </div>

          <span className="text-slate-700">|</span>

          {/* Last Successful Update */}
          <div className="hidden xl:flex items-center space-x-1 text-slate-300">
            <Clock className="w-3 h-3 text-slate-400" />
            <span className="text-slate-400">Last Update:</span>
            <span className="text-slate-200 font-semibold">{formatTimestamp(lastSuccessfulUpdate)}</span>
          </div>

          <span className="hidden xl:inline text-slate-700">|</span>

          {/* Next Refresh */}
          <div className="hidden xl:flex items-center space-x-1 text-slate-300">
            <Activity className="w-3 h-3 text-slate-400" />
            <span className="text-slate-400">Next Refresh:</span>
            <span className={pollingEnabled ? "text-emerald-400 font-bold" : "text-slate-400"}>{nextRefresh}</span>
          </div>
        </div>

      </div>
    </div>
  );
};
