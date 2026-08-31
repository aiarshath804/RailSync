export interface CorridorAsset {
  id: number;
  asset_id: string;
  name: string;
  asset_type: "TRACK" | "SIGNAL" | "OHE";
  line_section: string;
  start_km: number;
  end_km: number;
  speed_limit_kmh: number;
  status: "OPERATIONAL" | "MAINTENANCE" | "FAULT";
}

export interface MaintenanceRequest {
  id: number;
  department_id: number;
  department_code: "TMS" | "SMMS" | "TDMS";
  asset_id: string;
  requested_start_time: string;
  duration_minutes: number;
  defect_severity: number;
  urgency_level: number;
  status: "PENDING" | "BUNDLED" | "APPROVED" | "REJECTED";
  notes: string;
  metadata: Record<string, any>;
}

export interface TrainSchedule {
  id: number;
  train_number: string;
  name: string;
  priority_class: "RAJDHANI" | "EXPRESS" | "FREIGHT";
  corridor_id: string;
  arrival_window_start: string;
  departure_window_end: string;
  status: string;
}

export interface OptimizedBlock {
  id: number;
  corridor_id: string;
  bundled_request_ids: number[];
  scheduled_start: string;
  scheduled_end: string;
  allocated_safety_buffer: number;
  controller_approval_status: "PENDING" | "APPROVED" | "REJECTED";
  saved_block_hours: number;
  bundled_departments: string[];
  urgency_score: number;
}

export interface DashboardMetrics {
  saved_block_hours: number;
  asset_availability_pct: number;
  compliance_rate: number;
  pending_requests_count: number;
  bundled_requests_count: number;
  approved_blocks_count: number;
}
