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

export interface MLRiskAssessment {
  model_version: string;
  predicted_risk_level: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | string;
  failure_risk_probability: number;
  model_confidence: number;
  is_low_confidence: boolean;
  top_feature_contributions: Array<{
    feature: string;
    importance_weight: number;
    raw_value: any;
    contribution_score: number;
    direction: string;
  }>;
  explanation: string;
  class_probabilities?: Record<string, number>;
}

export interface MLModelStatus {
  status: string;
  model_type: string;
  model_version: string;
  trained_at: string;
  is_trained: boolean;
  summary_metrics: {
    accuracy: number;
    macro_f1: number;
    weighted_f1: number;
    brier_score: number;
    test_samples: number;
  };
  top_features: Array<[string, number]>;
  dataset_info?: {
    total_records: number;
    dataset_type: string;
    target_variable: string;
  };
  disclaimer: string;
}

export interface MLEvaluationMetrics {
  model_version: string;
  evaluated_at: string;
  evaluation_metrics: {
    total_test_samples: number;
    accuracy: number;
    macro_precision: number;
    macro_recall: number;
    macro_f1: number;
    weighted_precision: number;
    weighted_recall: number;
    weighted_f1: number;
    brier_score: number;
    class_labels: string[];
    confusion_matrix: number[][];
    per_class_metrics: Record<string, {
      class_index: number;
      class_label: string;
      precision: number;
      recall: number;
      f1_score: number;
      support: number;
    }>;
  };
  feature_importances: Record<string, number>;
  dataset_summary: {
    total_records: number;
    dataset_type: string;
    class_distribution: Record<string, number>;
    department_distribution: Record<string, number>;
    features_available: string[];
    target_variable: string;
  };
}

export interface BaselineComparisonReport {
  status: string;
  evaluated_at: string;
  workload_summary: {
    total_maintenance_requests: number;
    corridors_involved: string[];
    departments_involved: string[];
  };
  comparison_metrics: {
    blocks_required: {
      baseline: number;
      railsync: number;
      reduction: number;
      reduction_pct: number;
    };
    possession_hours: {
      baseline_hours: number;
      railsync_hours: number;
      saved_hours: number;
      efficiency_gain_pct: number;
    };
    asset_availability: {
      baseline_availability_pct: number;
      railsync_availability_pct: number;
      improvement_pts: number;
    };
    traffic_disruption: {
      baseline_delay_minutes: number;
      railsync_delay_minutes: number;
      delay_minutes_saved: number;
    };
    critical_risks_identified: {
      baseline_detected: number;
      railsync_detected: number;
      latent_risks_surfaced_by_ml: number;
    };
    safety_and_rules_compliance: {
      baseline_compliance_pct: number;
      railsync_compliance_pct: number;
      violations_prevented_by_guardrails: number;
    };
  };
  executive_summary: string;
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

export interface Step6Scenario {
  scenario_id: string;
  title: string;
  description: string;
  input_request?: Record<string, any>;
  ml_prediction?: MLRiskAssessment;
  prioritization_result?: Record<string, any>;
  explainability?: string;
  top_drivers?: any[];
  statistical_ml_assessment?: any;
  authoritative_safety_guardrail?: any;
  final_operational_priority?: any;
  confidence_metrics?: any;
  pipeline_stages?: any;
  comparison_report?: BaselineComparisonReport;
  verification_passed: boolean;
  verification_notes: string;
}

