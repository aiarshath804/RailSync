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

export interface FactorBreakdown {
  score: number;
  weight: string;
  factors: string[];
  degradation_profile?: string;
}

export interface PrioritizationExplanation {
  criticality: FactorBreakdown;
  urgency: FactorBreakdown;
  impact: FactorBreakdown;
  final_priority: {
    score: number;
    level: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    formula: string;
  };
  safety_override: {
    is_active: boolean;
    reason: string | null;
  };
  summary: string;
}

export interface MaintenanceRequest {
  id: number;
  request_id?: string;
  department_id: number;
  department_code: "TMS" | "SMMS" | "TDMS" | string;
  source_system?: string;
  asset_id: string;
  asset_type?: string;
  defect_type?: string;
  work_type?: string;
  requested_start_time: string;
  duration_minutes: number;
  defect_severity: number;
  urgency_level: number;
  criticality_score?: number;
  urgency_score?: number;
  impact_score?: number;
  priority_score?: number;
  priority_level?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | string;
  safety_override?: boolean;
  override_reason?: string | null;
  scoring_method?: string;
  scored_at?: string;
  status: "PENDING" | "BUNDLED" | "APPROVED" | "REJECTED" | string;
  notes: string;
  explanation?: PrioritizationExplanation;
  metadata?: Record<string, any>;
}

export interface TrainSchedule {
  id: number;
  train_number: string;
  name: string;
  priority_class: "RAJDHANI" | "EXPRESS" | "FREIGHT";
  corridor_id: string;
  arrival_window_start: string;
  departure_window_end: string;
  delay_minutes?: number;
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
  priority_score?: number;
  safety_override?: boolean;
}

export interface DashboardMetrics {
  saved_block_hours: number;
  asset_availability_pct: number;
  compliance_rate: number;
  total_requests_count?: number;
  pending_requests_count: number;
  bundled_requests_count: number;
  approved_blocks_count: number;
  critical_defects_count?: number;
  safety_overrides_count?: number;
}

export interface PrioritizationConfigSummary {
  engine_name: string;
  version: string;
  model_type: string;
  composite_formula: string;
  weights: {
    criticality: number;
    urgency: number;
    operational_impact: number;
  };
  priority_tiers: {
    critical_threshold: number;
    high_threshold: number;
    medium_threshold: number;
    low_ceiling: number;
  };
  safety_override_rules_count: number;
  safety_critical_defect_types: string[];
  prototype_disclaimer: string;
}

export interface PrioritizationScenario {
  id: string;
  title: string;
  description: string;
  request?: Record<string, any>;
  evaluation?: {
    priority_score: number;
    priority_level: string;
    criticality_score: number;
    urgency_score: number;
    impact_score: number;
    safety_override: boolean;
    override_reason: string | null;
    explanation: PrioritizationExplanation;
  };
  trunk_evaluation?: any;
  branch_evaluation?: any;
  impact_difference?: number;
  priority_difference?: number;
  verified: boolean;
}
