import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[RailSync ErrorBoundary] Caught error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 m-4 bg-white border border-rose-200 rounded-xl shadow-sm text-slate-800">
          <div className="flex items-center space-x-3 text-rose-700 font-bold mb-3">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <h3 className="text-lg font-serif uppercase tracking-wide">
              {this.props.fallbackTitle || "Operational View Temporarily Interrupted"}
            </h3>
          </div>
          <p className="text-xs text-slate-600 mb-4 font-sans leading-relaxed">
            A rendering exception occurred while processing real-time corridor data.
            Telemetry feeds remain live and uninterrupted in the background.
          </p>
          {this.state.error && (
            <div className="bg-slate-900 text-rose-300 p-3 rounded-lg text-xs font-mono mb-4 overflow-x-auto">
              {this.state.error.toString()}
            </div>
          )}
          <button
            onClick={this.handleReset}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-950 hover:bg-blue-900 text-white rounded-lg text-xs font-bold font-mono transition"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Retry & Restore View</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
