/**
 * RailSync Client API Service: Full-stack gateway to Authoritative Python Backend.
 * Handles Dataset File Imports, Multi-Department Ingestion, CP-SAT Optimization,
 * Corridor Telemetry SSE, Real-Time Re-planning, and Lineage Queries.
 */

export interface ImportBatchResponse {
  batch_id: string;
  source_system: "TMS" | "SMMS" | "TDMS" | "COA" | string;
  filename: string;
  format_detected: string;
  total_records: number;
  imported_records: number;
  duplicate_records: number;
  invalid_records: number;
  validation_errors: Array<{
    row: number;
    field: string;
    message: string;
    rejected_value?: string;
  }>;
  imported_ids: number[];
}

export interface ImportBatchRecord {
  id: number;
  batch_id: string;
  source_system: string;
  filename: string;
  total_records: number;
  imported_records: number;
  duplicate_records: number;
  invalid_records: number;
  imported_at: string;
  status: string;
  linked_requests_count?: number;
  linked_trains_count?: number;
}

export interface OptimizedBlockItem {
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
  total_requests_count: number;
  pending_requests_count: number;
  bundled_requests_count: number;
  approved_blocks_count: number;
  critical_defects_count: number;
}

export interface CorridorState {
  assets: Array<{
    id: number;
    asset_id: string;
    name: string;
    asset_type: string;
    line_section: string;
    start_km: number;
    end_km: number;
    speed_limit_kmh: number;
    status: string;
  }>;
  train_schedules: Array<{
    id: number;
    train_number: string;
    name: string;
    priority_class: string;
    corridor_id: string;
    section_id: string;
    arrival_window_start: string;
    departure_window_end: string;
    delay_minutes: number;
    status: string;
  }>;
  maintenance_requests: Array<{
    id: number;
    request_code?: string;
    source_system: string;
    department_id: number;
    department_code: string;
    asset_id: string;
    asset_type: string;
    corridor_id: string;
    location_start_km: number;
    location_end_km: number;
    work_type: string;
    defect_type: string;
    requested_start_time: string;
    duration_minutes: number;
    defect_severity: number;
    urgency_level: number;
    status: string;
    notes?: string;
    crew_required: number;
    machines_required?: string;
    raw_source_reference?: string;
    import_batch_id?: string;
  }>;
  optimized_blocks: OptimizedBlockItem[];
}

export interface AnalyticsData {
  total_requests: number;
  total_blocks: number;
  department_distribution: Record<string, number>;
  severity_distribution: Record<string, number>;
  saved_block_hours_total: number;
  avg_urgency_score: number;
}

export const RailSyncAPI = {
  // -------------------------------------------------------------
  // 1. Dataset Imports (TMS, SMMS, TDMS, COA)
  // -------------------------------------------------------------
  async importDataset(
    source: "TMS" | "SMMS" | "TDMS" | "COA",
    fileOrContent: File | Blob | string,
    filename?: string
  ): Promise<ImportBatchResponse> {
    const endpoint = `/api/v1/import/${source.toLowerCase()}`;
    let body: any;
    let headers: Record<string, string> = {};

    if (typeof fileOrContent === "string") {
      body = fileOrContent;
      headers["Content-Type"] = fileOrContent.trim().startsWith("[") || fileOrContent.trim().startsWith("{")
        ? "application/json"
        : "text/csv";
    } else if (fileOrContent instanceof File || fileOrContent instanceof Blob) {
      const formData = new FormData();
      formData.append("file", fileOrContent, filename || (fileOrContent instanceof File ? fileOrContent.name : `${source.toLowerCase()}_sample.csv`));
      body = formData;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Import failed (${res.status}): ${errText}`);
    }

    return res.json();
  },

  async importFromDataFolder(
    source: "TMS" | "SMMS" | "TDMS" | "COA",
    filepath: string
  ): Promise<ImportBatchResponse> {
    const res = await fetch(`/api/v1/import/${source.toLowerCase()}?filepath=${encodeURIComponent(filepath)}`, {
      method: "POST",
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Import from file failed: ${errText}`);
    }
    return res.json();
  },

  // -------------------------------------------------------------
  // 2. Lineage & Import History
  // -------------------------------------------------------------
  async getImportBatches(): Promise<{ batches: ImportBatchRecord[]; count: number }> {
    const res = await fetch("/api/v1/data/imports");
    if (!res.ok) throw new Error("Failed to fetch import batches");
    return res.json();
  },

  async getImportBatch(batchId: string): Promise<{ batch: ImportBatchRecord }> {
    const res = await fetch(`/api/v1/data/imports/${encodeURIComponent(batchId)}`);
    if (!res.ok) throw new Error(`Failed to fetch import batch ${batchId}`);
    return res.json();
  },

  async deleteImportBatch(batchId: string): Promise<{ status: string; message: string }> {
    const res = await fetch(`/api/v1/data/imports/${encodeURIComponent(batchId)}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error(`Failed to delete import batch ${batchId}`);
    return res.json();
  },

  // -------------------------------------------------------------
  // 3. Optimization & Real-Time Re-planning
  // -------------------------------------------------------------
  async generatePlan(): Promise<{
    status: string;
    saved_block_hours: number;
    total_blocks_created: number;
    optimized_blocks: OptimizedBlockItem[];
  }> {
    const res = await fetch("/api/v1/optimize/generate-plan", {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to generate optimized block plan");
    return res.json();
  },

  async emergencyReplan(payload: {
    asset_id: string;
    duration_minutes: number;
    defect_severity: number;
    notes: string;
  }): Promise<{
    status: string;
    emergency_asset: string;
    optimized_blocks: OptimizedBlockItem[];
  }> {
    const res = await fetch("/api/v1/optimize/emergency-replan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Emergency re-planning failed");
    return res.json();
  },

  async approveBlock(blockId: number, approve: boolean = true): Promise<{
    status: string;
    block_id: number;
    approval_status: "APPROVED" | "REJECTED";
  }> {
    const res = await fetch("/api/v1/optimize/approve-block", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ block_id: blockId, approve }),
    });
    if (!res.ok) throw new Error(`Failed to update approval for block ${blockId}`);
    return res.json();
  },

  async deleteRequest(requestId: number): Promise<{ status: string; message: string }> {
    const res = await fetch(`/api/v1/optimize/delete-request/${requestId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error(`Failed to delete request ${requestId}`);
    return res.json();
  },

  // -------------------------------------------------------------
  // 4. Dashboards, Telemetry & Analytics
  // -------------------------------------------------------------
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const res = await fetch("/api/v1/dashboard/metrics");
    if (!res.ok) throw new Error("Failed to load dashboard metrics");
    return res.json();
  },

  async getCorridorState(): Promise<CorridorState> {
    const res = await fetch("/api/v1/dashboard/corridor-state");
    if (!res.ok) throw new Error("Failed to load corridor state");
    return res.json();
  },

  async getAnalyticsData(): Promise<AnalyticsData> {
    const res = await fetch("/api/v1/analytics/data");
    if (!res.ok) throw new Error("Failed to load analytics data");
    return res.json();
  },

  async getAIInsights(corridorId: string = "NDLS-HWH-01"): Promise<{
    corridor_id: string;
    critical_alerts: number;
    recommendation: string;
    generated_at: string;
  }> {
    const res = await fetch("/api/v1/insights/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ corridor_id: corridorId }),
    });
    if (!res.ok) throw new Error("Failed to generate AI insights");
    return res.json();
  },
};
