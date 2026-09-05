import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { LiveControlState, LiveDataAction } from "../components/LiveApiControlPanel";

export interface CorridorLiveState {
  corridor_title?: string;
  corridor_code?: string;
  section?: string;
  prototype_disclaimer?: string;
  mode?: string;
  api_status?: string;
  live_status?: string;
  polling_enabled?: boolean;
  requests_this_session?: number;
  next_refresh?: string;
  error_message?: string;
  data_source?: string;
  last_updated?: string;
  last_live_success_time?: string;
  blocks?: any[];
  active_trains?: any[];
  total_active_trains?: number;
  stations?: any[];
  active_emergency_count?: number;
  emergency_closures?: any[];
}

interface LiveDataContextType {
  corridorData: CorridorLiveState | null;
  controlState: LiveControlState;
  trains: any[];
  blocks: any[];
  loading: boolean;
  error: string | null;
  handleControlAction: (action: LiveDataAction) => Promise<void>;
  refreshNow: () => Promise<void>;
  toggleSimulationMode: () => Promise<void>;
}

const LiveDataContext = createContext<LiveDataContextType | undefined>(undefined);

export const LiveDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [corridorData, setCorridorData] = useState<CorridorLiveState | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [controlState, setControlState] = useState<LiveControlState>({
    liveStatus: "LIVE DATA PAUSED – Showing last received data.",
    pollingEnabled: false,
    requestsThisSession: 0,
    lastSuccessfulUpdate: null,
    nextRefresh: "Not scheduled",
    loading: false
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear active polling timer
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Central fetch logic
  const fetchCorridorState = useCallback(async (action?: LiveDataAction) => {
    setLoading(true);
    try {
      let res: Response;
      if (action) {
        res = await fetch("/api/v1/corridor/live/control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action })
        });
      } else {
        res = await fetch("/api/v1/corridor/live");
      }

      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        const payload = await res.json();
        const data: CorridorLiveState = payload.corridor_state || payload;

        setCorridorData(data);
        setError(null);

        setControlState(prev => ({
          ...prev,
          liveStatus: data.live_status || (data.polling_enabled ? "LIVE DATA ACTIVE" : "LIVE DATA PAUSED – Showing last received data."),
          pollingEnabled: Boolean(data.polling_enabled),
          requestsThisSession: data.requests_this_session ?? prev.requestsThisSession,
          lastSuccessfulUpdate: data.last_live_success_time || prev.lastSuccessfulUpdate,
          nextRefresh: data.next_refresh || (data.polling_enabled ? "Every 10s" : "Not scheduled"),
          dataSource: data.data_source,
          mode: data.mode,
          apiStatus: data.api_status
        }));
      }
    } catch (err) {
      console.warn("Transient issue fetching corridor state:", err);
      setError("Unable to communicate with RailSync server.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle control action button clicks
  const handleControlAction = useCallback(async (action: LiveDataAction) => {
    setControlState(prev => ({ ...prev, loading: true }));

    if (action === "START") {
      stopTimer();
      await fetchCorridorState("START");
      // Start 10-second polling interval
      timerRef.current = setInterval(() => {
        fetchCorridorState();
      }, 10000);
    } else if (action === "PAUSE") {
      stopTimer();
      await fetchCorridorState("PAUSE");
    } else if (action === "STOP") {
      stopTimer();
      await fetchCorridorState("STOP");
    } else if (action === "REFRESH") {
      await fetchCorridorState("REFRESH");
    }

    setControlState(prev => ({ ...prev, loading: false }));
  }, [fetchCorridorState, stopTimer]);

  const refreshNow = useCallback(async () => {
    await handleControlAction("REFRESH");
  }, [handleControlAction]);

  const toggleSimulationMode = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/corridor/simulation-toggle", { method: "POST" });
      if (res.ok) {
        await fetchCorridorState();
      }
    } catch (err) {
      console.warn("Error toggling simulation mode:", err);
    }
  }, [fetchCorridorState]);

  // Initial fetch on mount with force_refresh=false (0 RailRadar calls made!)
  useEffect(() => {
    fetchCorridorState();
    return () => {
      stopTimer();
    };
  }, []);

  const trains = corridorData?.active_trains || [];
  const blocks = corridorData?.blocks || [];

  return (
    <LiveDataContext.Provider
      value={{
        corridorData,
        controlState,
        trains,
        blocks,
        loading,
        error,
        handleControlAction,
        refreshNow,
        toggleSimulationMode
      }}
    >
      {children}
    </LiveDataContext.Provider>
  );
};

export const useLiveData = () => {
  const context = useContext(LiveDataContext);
  if (!context) {
    throw new Error("useLiveData must be used within a LiveDataProvider");
  }
  return context;
};
