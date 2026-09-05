import { CorridorLiveState, CorridorBlockState, LiveTrain, CorridorBlockId } from "../types";

export function normalizeTrain(raw: any, defaultBlock?: CorridorBlockId): LiveTrain | null {
  if (!raw || typeof raw !== "object") return null;
  const trainNumber = raw?.train_number || raw?.number;
  if (!trainNumber) return null;

  const blockId = (raw?.assigned_block_id || raw?.current_block || raw?.assigned_block || defaultBlock) as CorridorBlockId;
  const progress = Number(raw?.relative_progress ?? raw?.segment_progress);
  const safeProgress = isNaN(progress) ? 0.5 : Math.max(0.05, Math.min(0.95, progress));
  
  return {
    id: String(raw?.id || trainNumber),
    train_number: String(trainNumber),
    trainNumber: String(trainNumber),
    train_name: String(raw?.train_name || raw?.name || `Train #${trainNumber}`),
    trainName: String(raw?.train_name || raw?.name || `Train #${trainNumber}`),
    type: String(raw?.type || raw?.train_type || "EXPRESS"),
    source: String(raw?.source || "MAS"),
    destination: String(raw?.destination || "TRL"),
    current_block: blockId,
    assigned_block: blockId,
    assigned_block_id: blockId,
    currentBlockId: blockId,
    direction: raw?.direction === "UP" ? "UP" : "DOWN",
    current_station: String(raw?.current_station || raw?.source || "MAS"),
    currentStationId: String(raw?.current_station || raw?.source || "MAS"),
    previous_station: String(raw?.previous_station || "MAS"),
    next_station: String(raw?.next_station || "TRL"),
    segment_progress: safeProgress,
    relative_progress: safeProgress,
    progress: safeProgress,
    speed_kmh: Number(raw?.speed_kmh ?? raw?.speed ?? 0),
    speed: Number(raw?.speed_kmh ?? raw?.speed ?? 0),
    delay_minutes: Number(raw?.delay_minutes ?? raw?.delay ?? 0),
    running_status: String(raw?.running_status || raw?.status || "RUNNING"),
    status: String(raw?.status || raw?.running_status || "RUNNING"),
    cancellation_status: String(raw?.cancellation_status || "NORMAL"),
    diversion_status: String(raw?.diversion_status || "NORMAL"),
    is_simulation: Boolean(raw?.is_simulation),
    last_updated: String(raw?.last_updated || new Date().toISOString()),
  };
}

export function normalizeCorridorBlock(raw: any): CorridorBlockState | null {
  if (!raw || typeof raw !== "object") return null;
  const blockId = raw?.block_id as CorridorBlockId;
  if (!blockId) return null;

  const rawTrains = Array.isArray(raw?.trains) ? raw.trains : Array.isArray(raw?.active_trains) ? raw.active_trains : [];
  const normalizedTrains: LiveTrain[] = rawTrains
    .map((t: any) => normalizeTrain(t, blockId))
    .filter((t: LiveTrain | null): t is LiveTrain => t !== null);

  const status = String(raw?.operational_status || raw?.status || "NORMAL");
  const isEmergency = Boolean(raw?.is_emergency_closed || status === "EMERGENCY_CLOSED");
  
  let aspect = String(raw?.signal_aspect || "GREEN").toUpperCase();
  if (isEmergency) {
    aspect = "RED";
  } else if (status === "CONGESTED" || status === "RESERVED" || status === "CAUTION_SPEED_RESTRICTION") {
    aspect = "YELLOW";
  } else if (normalizedTrains.length > 0 && aspect !== "YELLOW" && aspect !== "RED") {
    aspect = "YELLOW";
  }

  const lineType = String(raw?.line_type || "Quadruple Trunk Electrified (25kV AC)");

  return {
    id: String(raw?.id || blockId),
    block_id: blockId,
    name: String(raw?.name || `Block ${blockId}`),
    sequence: Number(raw?.sequence ?? 0),
    startStationId: String(raw?.startStationId || raw?.from_station || raw?.from_code || ""),
    endStationId: String(raw?.endStationId || raw?.to_station || raw?.to_code || ""),
    from_station: String(raw?.from_station || raw?.from_code || ""),
    to_station: String(raw?.to_station || raw?.to_code || ""),
    from_code: String(raw?.from_code || raw?.from_station || ""),
    to_code: String(raw?.to_code || raw?.to_station || ""),
    start_km: Number(raw?.start_km ?? 0),
    end_km: Number(raw?.end_km ?? 0),
    length_km: Number(raw?.length_km ?? (raw?.end_km ? raw.end_km - (raw.start_km || 0) : 0)),
    speed_limit_kmh: Number(raw?.speed_limit_kmh ?? raw?.max_speed_kmh ?? 80),
    max_speed_kmh: Number(raw?.max_speed_kmh ?? raw?.speed_limit_kmh ?? 80),
    track_count: Number(raw?.track_count ?? 2),
    line_type: lineType,
    description: String(raw?.description || ""),
    status: status as any,
    operational_status: status,
    signal_aspect: aspect,
    trains: normalizedTrains,
    active_trains: normalizedTrains,
    active_train_count: normalizedTrains.length,
    occupancy_count: normalizedTrains.length,
    is_emergency_closed: isEmergency,
    conflict_detected: Boolean(raw?.conflict_detected || isEmergency || normalizedTrains.length > 1),
    emergency_details: raw?.emergency_details || null,
    conflict_details: raw?.conflict_details || null,
    active_maintenance: raw?.active_maintenance || null,
  };
}

export function normalizeCorridorLiveState(raw: any): CorridorLiveState {
  const rawBlocks = Array.isArray(raw?.blocks) ? raw.blocks : [];
  
  const blocks: CorridorBlockState[] = rawBlocks
    .map((b: any) => normalizeCorridorBlock(b))
    .filter((b: CorridorBlockState | null): b is CorridorBlockState => b !== null);

  const rawActiveTrains = Array.isArray(raw?.active_trains) 
    ? raw.active_trains 
    : Array.isArray(raw?.trains) 
    ? raw.trains 
    : [];
  let allTrains: LiveTrain[] = [];
  if (rawActiveTrains.length > 0) {
    allTrains = rawActiveTrains
      .map((t: any) => normalizeTrain(t))
      .filter((t: LiveTrain | null): t is LiveTrain => t !== null);
  } else {
    // Gather trains from blocks if active_trains top-level array was empty
    blocks.forEach(b => {
      if (b.active_trains) {
        allTrains.push(...b.active_trains);
      }
    });
  }

  const rawStations = Array.isArray(raw?.stations) ? raw.stations : [];
  const stations = rawStations.map((s: any, idx: number) => ({
    id: String(s?.id || s?.code || `STN-${idx}`),
    code: String(s?.code || s?.id || `STN${idx}`),
    name: String(s?.name || s?.code || `Station ${idx + 1}`),
    km: Number(s?.km ?? 0),
    sequence: Number(s?.sequence ?? idx + 1),
    is_terminal: Boolean(s?.is_terminal),
  }));

  const activeEmergencies = blocks.filter(b => b.is_emergency_closed).length;

  return {
    corridor_title: String(raw?.corridor_title || raw?.corridorName || "North Tamil Nadu Railway Operations – Chennai Central to Tiruvallur Corridor"),
    corridor_code: String(raw?.corridor_code || raw?.corridorId || "MAS-TRL-05"),
    section: String(raw?.section || "Chennai Central – Tiruvallur Trunk Line"),
    prototype_disclaimer: String(raw?.prototype_disclaimer || "Prototype operational segments for demonstration."),
    mode: (raw?.mode === "LIVE" || raw?.mode === "CACHED" ? raw.mode : "SIMULATION") as any,
    data_source: String(raw?.data_source || "Live Telemetry Feed"),
    last_updated: String(raw?.last_updated || new Date().toISOString()),
    blocks,
    active_trains: allTrains,
    total_active_trains: allTrains.length,
    stations,
    active_emergency_count: Number(raw?.active_emergency_count ?? activeEmergencies),
    emergency_closures: Array.isArray(raw?.emergency_closures) ? raw.emergency_closures : [],
  };
}

