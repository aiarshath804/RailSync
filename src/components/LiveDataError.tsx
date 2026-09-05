import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface LiveDataErrorProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

export const LiveDataError: React.FC<LiveDataErrorProps> = ({
  message = "Error occurred while loading live data.",
  onRetry,
  className = "",
  compact = false
}) => {
  if (compact) {
    return (
      <div 
        id="live-data-error-compact"
        className={`bg-rose-50 border border-rose-200 text-rose-900 rounded-lg p-3 flex items-center justify-between text-xs font-sans ${className}`}
      >
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-bold">{message}</span>
        </div>
        {onRetry && (
          <button
            id="live-data-error-retry-btn"
            onClick={onRetry}
            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-bold flex items-center space-x-1 transition cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div 
      id="live-data-error-container"
      className={`flex-1 flex flex-col items-center justify-center p-6 sm:p-10 bg-slate-50 min-h-[300px] ${className}`}
    >
      <div className="bg-white border border-rose-300 rounded-2xl p-6 sm:p-8 max-w-md w-full text-center shadow-xs space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto border border-rose-300">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-black text-rose-950 font-serif uppercase tracking-tight">
            Live Data Error
          </h3>
          <p className="text-xs text-rose-800 font-sans mt-1.5 font-medium leading-relaxed">
            {message}
          </p>
        </div>
        {onRetry && (
          <button
            id="live-data-error-primary-retry"
            onClick={onRetry}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl shadow-xs flex items-center justify-center space-x-2 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Loading Live Data</span>
          </button>
        )}
      </div>
    </div>
  );
};
