"""
RailSync Authoritative Backend HTTP Server.
Built with Python 3 standard library (http.server) with zero external dependency requirement.
Supports REST JSON endpoints, multi-part dataset uploads, SSE telemetry, and CORS.
"""

import os
import sys

# Ensure workspace root is in sys.path for backend.* imports
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

import json
import re
import io
import time
import argparse
import datetime
from http.server import HTTPServer, ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

from backend.database import init_db
from backend.repository import RailSyncRepository
from backend.ai_engine import AIRailSyncPrioritizationEngine
from backend.optimizer import CPOrToolsBlockOptimizer
from backend.pipeline.service import PipelineImportService
from backend.pipeline.validator import CanonicalMaintenanceRequest
from backend.services.prioritization_service import PrioritizationService
from backend.services.prioritization_scenarios import PrioritizationScenarioRunner
from backend.core.safety_config import SafetyConfig
from backend.services.safety_guardrail_service import SafetyGuardrailService
from backend.services.safety_scenarios import SafetyScenarioRunner
from backend.services.optimization_service import OptimizationService
from backend.services.corridor_availability_service import CorridorAvailabilityEngine
from backend.services.operational_validator_service import OperationalValidatorService
from backend.services.tactical_planning_service import TacticalPlanningService
from backend.services.what_if_simulation_service import WhatIfSimulationService
from backend.services.step5_scenarios import Step5ScenarioRunner
from backend.services.ml_service import MLDecisionService
from backend.services.baseline_comparison_service import BaselineComparisonService
from backend.services.step6_scenarios import Step6ScenarioRunner
from backend.services.step7_validation_service import Step7ValidationService
from backend.services.railradar_service import (
    corridor_engine,
    CORRIDOR_TITLE,
    CORRIDOR_BLOCKS_DEF,
    CORRIDOR_STATIONS,
    CORRIDOR_DISCLAIMER,
    EMERGENCY_DISCLAIMER,
)
from backend.services.dispatch_advisory_service import dispatch_advisory_service
from backend.services.auth_service import auth_service, ROLE_PERMISSIONS

# Initialize database and singletons
init_db()
repo = RailSyncRepository()
ai_engine = AIRailSyncPrioritizationEngine()
import_service = PipelineImportService(repo=repo, ai_engine=ai_engine)


class RailSyncAPIHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Keep logs clean and concise
        sys.stderr.write(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] {args[0]} {args[1]} {args[2]}\n")

    def _set_headers(self, status_code=200, content_type="application/json"):
        self.send_response(status_code)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()

    def _get_auth_user(self):
        """Extracts and validates user from Authorization or session header."""
        auth_header = self.headers.get("Authorization", "")
        token = ""
        if auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
        elif auth_header:
            token = auth_header.strip()
        else:
            token = self.headers.get("X-Session-Token", "").strip()

        if not token:
            return None
        return auth_service.get_user_from_token(token)

    def _require_auth(self):
        """Ensures request comes from an authenticated session."""
        user = self._get_auth_user()
        if not user:
            self._set_headers(401)
            self.wfile.write(json.dumps({
                "status": "ERROR",
                "code": "UNAUTHORIZED",
                "error": "Authentication required. Please sign in with your Railway Enterprise credentials."
            }).encode("utf-8"))
            return None
        return user

    def _require_permission(self, permission: str):
        """Enforces that the authenticated user possesses the specific RBAC permission."""
        user = self._get_auth_user()
        if not user:
            self._set_headers(401)
            self.wfile.write(json.dumps({
                "status": "ERROR",
                "code": "UNAUTHORIZED",
                "error": f"Authentication required to perform '{permission}'."
            }).encode("utf-8"))
            return None

        if not auth_service.has_permission(user, permission):
            self._set_headers(403)
            self.wfile.write(json.dumps({
                "status": "ERROR",
                "code": "FORBIDDEN",
                "error": f"Access Denied: Officer '{user.get('name')}' (Role: {user.get('role')}) lacks the authorized clearance '{permission}' for this operational action."
            }).encode("utf-8"))
            return None

        return user

    def do_OPTIONS(self):
        self._set_headers(200)

    def _read_body(self) -> bytes:
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length > 0:
            return self.rfile.read(content_length)
        return b""

    def _parse_multipart_or_body(self, query_params: dict, body_bytes: bytes) -> tuple:
        # Check query filepath first
        filepath = query_params.get("filepath", [None])[0]
        if filepath:
            candidates = [
                filepath,
                os.path.join(os.getcwd(), filepath),
                os.path.join(os.getcwd(), "data", filepath),
                os.path.join(os.path.dirname(__file__), "..", filepath),
                os.path.join(os.path.dirname(__file__), "..", "data", filepath),
            ]
            for p in candidates:
                if os.path.exists(p) and os.path.isfile(p):
                    with open(p, "rb") as f:
                        return f.read(), os.path.basename(p)

        content_type = self.headers.get("Content-Type", "")
        if "multipart/form-data" in content_type:
            match = re.search(r"boundary=([^;]+)", content_type)
            if match:
                boundary = match.group(1).strip().strip('"').encode()
                parts = body_bytes.split(b"--" + boundary)
                for part in parts:
                    if b'name="file"' in part or b'filename=' in part:
                        header_end = part.find(b"\r\n\r\n")
                        if header_end != -1:
                            headers = part[:header_end].decode("utf-8", errors="ignore")
                            fn_match = re.search(r'filename="([^"]+)"', headers)
                            filename = fn_match.group(1) if fn_match else "uploaded.csv"
                            file_data = part[header_end + 4:].rstrip(b"\r\n--")
                            return file_data, filename

        filename = "dataset.json" if "json" in content_type else "dataset.csv"
        return body_bytes, filename

    # -------------------------------------------------------------
    # GET Endpoints
    # -------------------------------------------------------------
    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        # Health Probe
        if path in ["/api/v1/health", "/healthz", "/api/health"]:
            assets = repo.get_all_assets()
            requests = repo.get_all_requests()
            trains = repo.get_all_trains()
            batches = repo.get_all_import_batches()
            self._set_headers(200)
            res = {
                "status": "HEALTHY",
                "service": "RailSync Authoritative Backend",
                "version": "2.0.0",
                "database": "Persistent SQLite (railsync.db)",
                "metrics": {
                    "assets_registered": len(assets),
                    "maintenance_requests": len(requests),
                    "train_schedules": len(trains),
                    "import_batches": len(batches)
                },
                "timestamp": datetime.datetime.now().isoformat()
            }
            self.wfile.write(json.dumps(res).encode("utf-8"))
            return

        # -------------------------------------------------------------
        # Authentication & Role-Based Access Control (RBAC) GET Endpoints
        # -------------------------------------------------------------
        if path in ["/api/v1/auth/me", "/api/v1/me"]:
            user = self._get_auth_user()
            if not user:
                self._set_headers(401)
                self.wfile.write(json.dumps({
                    "status": "UNAUTHENTICATED",
                    "authenticated": False,
                    "error": "No active officer session found. Please sign in."
                }).encode("utf-8"))
                return
            self._set_headers(200)
            self.wfile.write(json.dumps({
                "status": "SUCCESS",
                "authenticated": True,
                "user": user
            }).encode("utf-8"))
            return

        if path in ["/api/v1/auth/demo-accounts", "/api/v1/demo-accounts"]:
            accounts = auth_service.get_demo_accounts()
            self._set_headers(200)
            self.wfile.write(json.dumps({
                "status": "SUCCESS",
                "accounts": accounts
            }).encode("utf-8"))
            return

        if path in ["/api/v1/users", "/api/v1/auth/users"]:
            admin_user = self._require_permission("MANAGE_USERS")
            if not admin_user:
                return
            all_users = auth_service.get_all_users()
            self._set_headers(200)
            self.wfile.write(json.dumps({
                "status": "SUCCESS",
                "users": all_users,
                "total_users": len(all_users)
            }).encode("utf-8"))
            return

        if path in ["/api/v1/auth/roles", "/api/v1/roles"]:
            self._set_headers(200)
            self.wfile.write(json.dumps({
                "status": "SUCCESS",
                "roles": ROLE_PERMISSIONS
            }).encode("utf-8"))
            return

        # -------------------------------------------------------------
        # North Tamil Nadu Corridor & Real-Time RailRadar Endpoints
        # -------------------------------------------------------------
        # Live Corridor State (5 Prototype Blocks: B1 to B5)
        if path in ["/api/v1/corridor/live", "/api/v1/corridor/state", "/api/v1/trains/corridor-live"]:
            is_refresh = query.get("refresh", ["false"])[0].lower() == "true" or query.get("force", ["false"])[0].lower() == "true"
            corridor_state = corridor_engine.evaluate_corridor_state(force_refresh=is_refresh)
            self._set_headers(200)
            self.wfile.write(json.dumps(corridor_state).encode("utf-8"))
            return

        # Live Data Control Metadata (GET)
        if path in ["/api/v1/corridor/live/control", "/api/v1/live-control"]:
            state = corridor_engine.evaluate_corridor_state(force_refresh=False)
            self._set_headers(200)
            self.wfile.write(json.dumps({
                "status": "SUCCESS",
                "live_status": state.get("live_status"),
                "polling_enabled": state.get("polling_enabled"),
                "requests_this_session": state.get("requests_this_session"),
                "last_successful_update": state.get("last_live_success_time"),
                "next_refresh": state.get("next_refresh"),
            }).encode("utf-8"))
            return

        # Corridor Prototype Block Definitions
        if path == "/api/v1/corridor/blocks":
            self._set_headers(200)
            self.wfile.write(json.dumps({
                "corridor_title": CORRIDOR_TITLE,
                "disclaimer": CORRIDOR_DISCLAIMER,
                "blocks": CORRIDOR_BLOCKS_DEF,
                "stations": CORRIDOR_STATIONS
            }).encode("utf-8"))
            return

        # Live Train Movement Endpoint: GET /api/v1/trains/{trainNumber}/live
        if path.startswith("/api/v1/trains/") and path.endswith("/live"):
            parts = path.split("/")
            train_number = parts[4] if len(parts) >= 5 else ""
            if not train_number:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "Train number missing"}).encode("utf-8"))
                return
            
            # Check active mapped corridor trains first
            corridor_state = corridor_engine.evaluate_corridor_state()
            matched_train = next((t for t in corridor_state["active_trains"] if t["train_number"] == train_number), None)
            
            if matched_train:
                self._set_headers(200)
                self.wfile.write(json.dumps({
                    "status": "SUCCESS",
                    "source": corridor_state["data_source"],
                    "train": matched_train
                }).encode("utf-8"))
                return
            
            # Try live API directly via provider
            live_train, err = corridor_engine.provider.get_live_train(train_number)
            if live_train:
                self._set_headers(200)
                self.wfile.write(json.dumps({
                    "status": "SUCCESS",
                    "source": "RailRadar Live Stream",
                    "train": live_train
                }).encode("utf-8"))
                return

            self._set_headers(404)
            self.wfile.write(json.dumps({
                "status": "NOT_FOUND",
                "error": f"Train {train_number} not found in corridor telemetry or live provider."
            }).encode("utf-8"))
            return

        # Live Station Board Endpoint: GET /api/v1/stations/{stationCode}/live
        if path.startswith("/api/v1/stations/") and path.endswith("/live"):
            parts = path.split("/")
            station_code = parts[4] if len(parts) >= 5 else ""
            hours = int(query.get("hours", [4])[0])
            board, err = corridor_engine.provider.get_station_board(station_code, hours=hours)
            if board:
                self._set_headers(200)
                self.wfile.write(json.dumps(board).encode("utf-8"))
                return
            
            # Fallback station response for corridor station
            stn_def = next((s for s in CORRIDOR_STATIONS if s["code"] == station_code.upper()), None)
            corridor_state = corridor_engine.evaluate_corridor_state()
            station_trains = [
                t for t in corridor_state["active_trains"]
                if t.get("current_station") == station_code.upper() or t.get("next_station") == station_code.upper()
            ]
            self._set_headers(200)
            self.wfile.write(json.dumps({
                "station": station_code.upper(),
                "station_name": stn_def["name"] if stn_def else station_code.upper(),
                "hours_window": hours,
                "trains": station_trains,
                "data_source": corridor_state["data_source"],
                "last_updated": datetime.datetime.now().isoformat()
            }).encode("utf-8"))
            return

        # Emergency Event Logs: GET /api/v1/emergency/logs
        if path == "/api/v1/emergency/logs":
            self._set_headers(200)
            self.wfile.write(json.dumps({
                "active_count": len(corridor_engine.emergency_closures),
                "active_closures": list(corridor_engine.emergency_closures.values()),
                "logs": corridor_engine.emergency_logs,
                "disclaimer": EMERGENCY_DISCLAIMER
            }).encode("utf-8"))
            return

        # List Import Batches
        if path == "/api/v1/data/imports":
            batches = repo.get_all_import_batches()
            self._set_headers(200)
            self.wfile.write(json.dumps({"batches": batches, "count": len(batches)}).encode("utf-8"))
            return

        # Specific Import Batch Details
        if path.startswith("/api/v1/data/imports/"):
            batch_id = path.replace("/api/v1/data/imports/", "").strip()
            batch = repo.get_import_batch(batch_id)
            if not batch:
                self._set_headers(404)
                self.wfile.write(json.dumps({"error": f"Import batch '{batch_id}' not found"}).encode("utf-8"))
                return
            self._set_headers(200)
            self.wfile.write(json.dumps({"batch": batch}).encode("utf-8"))
            return

        # Prioritization Engine Configuration Summary
        if path == "/api/v1/prioritization/config":
            config_summary = PrioritizationService.get_configuration_summary()
            self._set_headers(200)
            self.wfile.write(json.dumps(config_summary).encode("utf-8"))
            return

        # Prioritization Demonstration Scenarios
        if path == "/api/v1/prioritization/scenarios":
            scenarios = PrioritizationScenarioRunner.run_all_scenarios()
            self._set_headers(200)
            self.wfile.write(json.dumps(scenarios).encode("utf-8"))
            return

        # Safety Guardrail Config
        if path == "/api/v1/safety/config":
            summary = SafetyConfig.get_summary()
            self._set_headers(200)
            self.wfile.write(json.dumps(summary).encode("utf-8"))
            return

        # Safety Guardrail Demonstration Scenarios (7 core safety tests)
        if path == "/api/v1/safety/scenarios":
            scenarios = SafetyScenarioRunner.run_all_scenarios()
            self._set_headers(200)
            self.wfile.write(json.dumps(scenarios).encode("utf-8"))
            return

        # Step 5 Demonstration Scenarios (8 core block planning & dynamic corridor optimization tests)
        if path in ["/api/v1/optimize/step5-scenarios", "/api/v1/optimize/step5/scenarios"]:
            scenarios = Step5ScenarioRunner.run_all_step5_scenarios()
            self._set_headers(200)
            self.wfile.write(json.dumps(scenarios).encode("utf-8"))
            return

        # Step 6 - ML Model Status
        if path == "/api/v1/ml/status":
            status_data = MLDecisionService.get_model_status()
            self._set_headers(200)
            self.wfile.write(json.dumps(status_data).encode("utf-8"))
            return

        # Step 6 - ML Evaluation Metrics
        if path == "/api/v1/ml/metrics":
            metrics_data = MLDecisionService.get_evaluation_metrics()
            self._set_headers(200)
            self.wfile.write(json.dumps(metrics_data).encode("utf-8"))
            return

        # Step 6 - Demonstration Scenarios (6 core real ML tests)
        if path in ["/api/v1/ml/scenarios", "/api/v1/ml/step6-scenarios", "/api/v1/ml/step6/scenarios"]:
            scenarios = Step6ScenarioRunner.run_all_step6_scenarios()
            self._set_headers(200)
            self.wfile.write(json.dumps(scenarios).encode("utf-8"))
            return

        # Step 6 - Baseline vs RailSync Comparison (GET)
        if path == "/api/v1/ml/baseline-comparison":
            requests = repo.get_all_requests()
            trains = repo.get_all_trains()
            assets = repo.get_all_assets()
            comp = BaselineComparisonService.compare_workload(requests, train_schedules=trains, assets=assets)
            self._set_headers(200)
            self.wfile.write(json.dumps(comp).encode("utf-8"))
            return

        # Candidate Block Windows (GET)
        if path == "/api/v1/optimize/candidate-windows":
            corridor_id = query.get("corridor_id", ["MAS-TRL-05"])[0]
            horizon_hours = float(query.get("horizon_hours", [24.0])[0])
            min_dur = int(query.get("min_duration_minutes", [60])[0])
            now = datetime.datetime.now()
            trains = repo.get_all_trains()
            candidate_windows = CorridorAvailabilityEngine.generate_candidate_windows(
                corridor_id=corridor_id,
                train_schedules=trains,
                start_time=now,
                end_time=now + datetime.timedelta(hours=horizon_hours),
                min_window_duration_mins=min_dur
            )
            self._set_headers(200)
            self.wfile.write(json.dumps({
                "status": "SUCCESS",
                "corridor_id": corridor_id,
                "horizon_hours": horizon_hours,
                "total_candidate_windows": len(candidate_windows),
                "candidate_windows": candidate_windows
            }).encode("utf-8"))
            return

        # Corridor Availability & Timeline (GET)
        if path == "/api/v1/optimize/corridor-availability":
            corridor_id = query.get("corridor_id", ["MAS-TRL-05"])[0]
            horizon_hours = float(query.get("horizon_hours", [24.0])[0])
            now = datetime.datetime.now()
            trains = repo.get_all_trains()
            blocks = repo.get_all_blocks()
            timeline = CorridorAvailabilityEngine.get_corridor_occupancy_timeline(
                corridor_id=corridor_id,
                train_schedules=trains,
                start_time=now,
                end_time=now + datetime.timedelta(hours=horizon_hours)
            )
            tot_possession_hrs = sum(int(b.get("duration_minutes", 60)) / 60.0 for b in blocks if b.get("corridor_id") == corridor_id or corridor_id == "ALL")
            avail = CorridorAvailabilityEngine.calculate_corridor_asset_availability(
                total_corridors=12,
                horizon_hours=horizon_hours,
                total_possession_hours=tot_possession_hrs
            )
            self._set_headers(200)
            self.wfile.write(json.dumps({
                "status": "SUCCESS",
                "corridor_id": corridor_id,
                "occupancy_timeline": timeline,
                "availability_metrics": avail
            }).encode("utf-8"))
            return

        # Safety Audit Logs
        if path == "/api/v1/safety/audit-logs":
            limit = int(query.get("limit", [50])[0])
            logs = repo.get_safety_audit_logs(limit=limit)
            self._set_headers(200)
            self.wfile.write(json.dumps({
                "status": "SUCCESS",
                "total_logs": len(logs),
                "audit_logs": logs
            }).encode("utf-8"))
            return

        # Dispatch Advisory Endpoint
        if path in ["/api/v1/dispatch/advisory", "/api/v1/dispatch/advisories"]:
            controller_id = query.get("controller_id", ["CHIEF_DISPATCHER_01"])[0]
            corridor_id = query.get("corridor_id", [None])[0]
            client_ip = self.client_address[0] if hasattr(self, "client_address") else "127.0.0.1"
            advisory_data = dispatch_advisory_service.generate_advisory(
                corridor_id=corridor_id,
                controller_id=controller_id,
                ip_address=client_ip
            )
            self._set_headers(200)
            self.wfile.write(json.dumps(advisory_data).encode("utf-8"))
            return

        # Safety Evaluated Requests (with classification, deadlines, isolations)
        if path == "/api/v1/safety/evaluated-requests":
            requests = repo.get_all_requests()
            trains = repo.get_all_trains()
            evaluated = SafetyGuardrailService.evaluate_batch_safety(
                requests, train_schedules=trains
            )
            self._set_headers(200)
            self.wfile.write(json.dumps({
                "status": "SUCCESS",
                "total_requests": len(evaluated),
                "requests": evaluated,
                "disclaimer": SafetyConfig.PROTOTYPE_DISCLAIMER
            }).encode("utf-8"))
            return

        # Prioritization Evaluated Requests
        if path == "/api/v1/prioritization/requests":
            priority_filter = query.get("priority_level", [None])[0]
            dept_filter = query.get("department_code", [None])[0]
            corridor_filter = query.get("corridor_id", [None])[0]
            safety_override_filter = query.get("safety_override_only", [None])[0]

            requests = repo.get_all_requests()
            trains = repo.get_all_trains()
            evaluated = []

            for r in requests:
                if priority_filter and r.get("priority_level", "").upper() != priority_filter.upper():
                    continue
                if dept_filter and r.get("source_system", "").upper() != dept_filter.upper():
                    continue
                if corridor_filter and r.get("corridor_id", "").upper() != corridor_filter.upper():
                    continue
                if safety_override_filter is not None:
                    is_ov = bool(r.get("safety_override", False))
                    req_ov = safety_override_filter.lower() in ["true", "1"]
                    if is_ov != req_ov:
                        continue

                r_copy = dict(r)
                # Compute explanation on the fly if needed
                eval_res = PrioritizationService.evaluate_request(r_copy, train_schedules=trains, all_requests=requests)
                r_copy["criticality_score"] = r_copy.get("criticality_score") or eval_res["criticality_score"]
                r_copy["urgency_score"] = r_copy.get("urgency_score") or eval_res["urgency_score"]
                r_copy["impact_score"] = r_copy.get("impact_score") or eval_res["impact_score"]
                r_copy["priority_score"] = r_copy.get("priority_score") or eval_res["priority_score"]
                r_copy["priority_level"] = r_copy.get("priority_level") or eval_res["priority_level"]
                r_copy["safety_override"] = bool(r_copy.get("safety_override") or eval_res["safety_override"])
                r_copy["override_reason"] = r_copy.get("override_reason") or eval_res["override_reason"]
                r_copy["model_used"] = eval_res.get("model_used", "RailSync-RF-v1.2.0")
                r_copy["ml_risk_assessment"] = eval_res.get("ml_risk_assessment")
                r_copy["explanation"] = eval_res["explanation"]
                evaluated.append(r_copy)

            evaluated.sort(
                key=lambda x: (
                    1 if x.get("safety_override") else 0,
                    float(x.get("priority_score") or (float(x.get("urgency_level", 0.5)) * 100.0))
                ),
                reverse=True
            )

            tier_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
            safety_count = 0
            for item in evaluated:
                lvl = item.get("priority_level", "MEDIUM").upper()
                if lvl in tier_counts:
                    tier_counts[lvl] += 1
                if item.get("safety_override"):
                    safety_count += 1

            res = {
                "status": "SUCCESS",
                "total_requests": len(evaluated),
                "tier_summary": tier_counts,
                "safety_overrides_count": safety_count,
                "requests": evaluated
            }
            self._set_headers(200)
            self.wfile.write(json.dumps(res).encode("utf-8"))
            return

        # Dashboard Metrics
        if path == "/api/v1/dashboard/metrics":
            requests = repo.get_all_requests()
            blocks = repo.get_all_blocks()
            saved_hrs = sum(b.get("saved_block_hours", 0.0) for b in blocks)
            active_downtime_hrs = saved_hrs
            asset_availability = max(75.0, round(99.4 - (active_downtime_hrs * 0.04), 1))
            res = {
                "saved_block_hours": round(saved_hrs, 2),
                "asset_availability_pct": asset_availability,
                "compliance_rate": 100.0,
                "total_requests_count": len(requests),
                "pending_requests_count": sum(1 for r in requests if r["status"] == "PENDING"),
                "bundled_requests_count": sum(1 for r in requests if r["status"] == "BUNDLED"),
                "approved_blocks_count": sum(1 for b in blocks if b.get("controller_approval_status") == "APPROVED"),
                "critical_defects_count": sum(1 for r in requests if r.get("defect_severity", 1) >= 4 or r.get("priority_level") == "CRITICAL"),
                "safety_overrides_count": sum(1 for r in requests if r.get("safety_override"))
            }
            self._set_headers(200)
            self.wfile.write(json.dumps(res).encode("utf-8"))
            return

        # Corridor State
        if path in ["/api/v1/dashboard/corridor-state", "/api/v1/corridor-state"]:
            res = {
                "assets": repo.get_all_assets(),
                "train_schedules": repo.get_all_trains(),
                "maintenance_requests": repo.get_all_requests(),
                "optimized_blocks": repo.get_all_blocks()
            }
            self._set_headers(200)
            self.wfile.write(json.dumps(res).encode("utf-8"))
            return

        # Corridor Assets Endpoint (GET)
        if path in ["/api/v1/assets", "/api/v1/corridor/assets"]:
            assets = repo.get_all_assets()
            self._set_headers(200)
            self.wfile.write(json.dumps(assets).encode("utf-8"))
            return

        # Maintenance Work Orders Endpoint (GET)
        if path in ["/api/v1/work-orders", "/api/v1/maintenance/work-orders"]:
            requests = repo.get_all_requests()
            work_orders = []
            for r in requests:
                work_orders.append({
                    "id": r["id"],
                    "title": r.get("request_code") or f"WO-{r['id']}",
                    "assetId": r.get("asset_id") or "TRK-01",
                    "department": r.get("source_system") or r.get("department_code") or "TMS",
                    "urgency": r.get("priority_level") or ("HIGH" if r.get("defect_severity", 1) >= 4 else "MEDIUM" if r.get("defect_severity", 1) >= 3 else "LOW"),
                    "duration": r.get("duration_minutes") or 90,
                    "status": r.get("status") or "PENDING",
                    "notes": r.get("notes") or r.get("defect_type") or "Maintenance inspection",
                    "assigned_to": r.get("crew_required") or "Operations Maintenance Crew",
                    "due_date": r.get("due_date") or r.get("requested_start_time"),
                    "created_at": r.get("imported_at") or r.get("requested_start_time") or "Recently"
                })
            self._set_headers(200)
            self.wfile.write(json.dumps(work_orders).encode("utf-8"))
            return

        # Analytics Data
        if path == "/api/v1/analytics/data":
            requests = repo.get_all_requests()
            blocks = repo.get_all_blocks()
            dept_distribution = {
                "TMS": sum(1 for r in requests if r.get("source_system") == "TMS"),
                "SMMS": sum(1 for r in requests if r.get("source_system") == "SMMS"),
                "TDMS": sum(1 for r in requests if r.get("source_system") == "TDMS")
            }
            severity_distribution = {
                "1_LOW": sum(1 for r in requests if r.get("defect_severity") == 1),
                "2_MODERATE": sum(1 for r in requests if r.get("defect_severity") == 2),
                "3_MEDIUM": sum(1 for r in requests if r.get("defect_severity") == 3),
                "4_HIGH": sum(1 for r in requests if r.get("defect_severity") == 4),
                "5_CRITICAL": sum(1 for r in requests if r.get("defect_severity") == 5)
            }
            res = {
                "total_requests": len(requests),
                "total_blocks": len(blocks),
                "department_distribution": dept_distribution,
                "severity_distribution": severity_distribution,
                "saved_block_hours_total": round(sum(b.get("saved_block_hours", 0.0) for b in blocks), 2),
                "avg_urgency_score": round(
                    sum(r.get("urgency_level", 0.5) for r in requests) / max(1, len(requests)), 3
                )
            }
            self._set_headers(200)
            self.wfile.write(json.dumps(res).encode("utf-8"))
            return

        # SSE Telemetry Events
        if path == "/api/v1/dashboard/events":
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            try:
                for _ in range(5):
                    metrics = {
                        "timestamp": datetime.datetime.now().isoformat(),
                        "traction_kv": 25.2,
                        "ambient_temp_c": 34.5,
                        "rail_stress_psi": 1420,
                        "status": "NOMINAL"
                    }
                    self.wfile.write(f"data: {json.dumps(metrics)}\n\n".encode("utf-8"))
                    self.wfile.flush()
                    time.sleep(3)
            except Exception:
                pass
            return

        # -------------------------------------------------------------
        # STEP 7 - End-to-End System Validation & Demo Mode GET Routes
        # -------------------------------------------------------------
        # Run 19-stage Full E2E Pipeline Integration Test
        if path == "/api/v1/validation/run-e2e":
            e2e_res = Step7ValidationService.run_full_e2e_integration_test()
            self._set_headers(200)
            self.wfile.write(json.dumps(e2e_res).encode("utf-8"))
            return

        # Load / View SIH Demo Day Scenario
        if path == "/api/v1/demo/load-scenario":
            demo_res = Step7ValidationService.load_demo_day_scenario(persist=False)
            self._set_headers(200)
            self.wfile.write(json.dumps(demo_res).encode("utf-8"))
            return

        # Demo Mode Status
        if path == "/api/v1/demo/status":
            requests = repo.get_all_requests()
            blocks = repo.get_all_blocks()
            demo_req_count = sum(1 for r in requests if r.get("is_demo") or "[DEMO" in str(r.get("notes", "")))
            self._set_headers(200)
            self.wfile.write(json.dumps({
                "status": "OPERATIONAL",
                "demo_mode_active": demo_req_count > 0,
                "demo_requests_count": demo_req_count,
                "total_requests_count": len(requests),
                "total_blocks_count": len(blocks),
                "disclaimer": Step7ValidationService.PROTOTYPE_DISCLAIMER
            }).encode("utf-8"))
            return

        # Regression Suite (Steps 1 through 6)
        if path == "/api/v1/validation/regression-suite":
            reg_res = Step7ValidationService.run_regression_suite()
            self._set_headers(200)
            self.wfile.write(json.dumps(reg_res).encode("utf-8"))
            return

        # Performance & Latency Benchmarks
        if path == "/api/v1/validation/benchmarks":
            bench_res = Step7ValidationService.run_performance_benchmarks()
            self._set_headers(200)
            self.wfile.write(json.dumps(bench_res).encode("utf-8"))
            return

        # Fail-Safe & Error Handling Audit
        if path == "/api/v1/validation/fail-safes":
            err_res = Step7ValidationService.test_error_handling_and_fail_safes()
            self._set_headers(200)
            self.wfile.write(json.dumps(err_res).encode("utf-8"))
            return

        # 21-Component Authoritative Verification Matrix
        if path == "/api/v1/validation/matrix":
            matrix_res = Step7ValidationService.get_final_verification_matrix()
            self._set_headers(200)
            self.wfile.write(json.dumps(matrix_res).encode("utf-8"))
            return

        self._set_headers(404)
        self.wfile.write(json.dumps({"error": f"Endpoint GET {path} not found"}).encode("utf-8"))

    # -------------------------------------------------------------
    # POST Endpoints
    # -------------------------------------------------------------
    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)
        body_bytes = self._read_body()

        # 1. Dataset Imports (TMS, SMMS, TDMS, COA)
        if path in ["/api/v1/import/tms", "/api/v1/import/smms", "/api/v1/import/tdms", "/api/v1/import/coa"]:
            source = path.split("/")[-1].upper()
            payload_data, filename = self._parse_multipart_or_body(query, body_bytes)
            if not payload_data:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "Empty dataset payload"}).encode("utf-8"))
                return
            result = import_service.import_dataset(source, payload_data, filename=filename)
            self._set_headers(200)
            self.wfile.write(json.dumps(result).encode("utf-8"))
            return

        # Parse JSON body for other POST requests
        json_body = {}
        if body_bytes:
            try:
                json_body = json.loads(body_bytes.decode("utf-8"))
            except Exception:
                json_body = {}

        # -------------------------------------------------------------
        # Authentication & Session Management Endpoints (POST)
        # -------------------------------------------------------------
        if path in ["/api/v1/auth/login", "/api/v1/login"]:
            email = str(json_body.get("email", "")).strip()
            password = str(json_body.get("password", "")).strip()
            client_ip = self.client_address[0] if hasattr(self, "client_address") else "127.0.0.1"

            if not email or not password:
                self._set_headers(400)
                self.wfile.write(json.dumps({
                    "status": "ERROR",
                    "code": "MISSING_CREDENTIALS",
                    "error": "Official Railway Enterprise email and password are required."
                }).encode("utf-8"))
                return

            auth_result = auth_service.authenticate(email, password, ip_address=client_ip)
            if not auth_result:
                self._set_headers(401)
                self.wfile.write(json.dumps({
                    "status": "ERROR",
                    "code": "INVALID_CREDENTIALS",
                    "error": "Invalid official credentials. Please verify your Railway Enterprise email and security password."
                }).encode("utf-8"))
                return

            self._set_headers(200)
            self.wfile.write(json.dumps({
                "status": "SUCCESS",
                "message": f"Officer {auth_result['user']['name']} authenticated successfully.",
                "session_token": auth_result["session_token"],
                "user": auth_result["user"],
                "expires_at": auth_result["expires_at"]
            }).encode("utf-8"))
            return

        if path in ["/api/v1/auth/logout", "/api/v1/logout"]:
            auth_header = self.headers.get("Authorization", "")
            token = auth_header.replace("Bearer ", "").strip() or self.headers.get("X-Session-Token", "").strip() or json_body.get("session_token", "")
            auth_service.logout(token)
            self._set_headers(200)
            self.wfile.write(json.dumps({
                "status": "SUCCESS",
                "message": "Railway Enterprise session terminated successfully."
            }).encode("utf-8"))
            return

        # -------------------------------------------------------------
        # Work Orders API (POST)
        # -------------------------------------------------------------
        if path in ["/api/v1/work-orders", "/api/v1/maintenance/work-orders"]:
            auth_user = self._get_auth_user()
            if auth_user:
                if not auth_service.has_permission(auth_user, "CREATE_REQUEST"):
                    self._set_headers(403)
                    self.wfile.write(json.dumps({
                        "status": "ERROR",
                        "error": f"Access Denied: Officer '{auth_user.get('name')}' (Role: {auth_user.get('role')}) lacks permission 'CREATE_REQUEST'."
                    }).encode("utf-8"))
                    return

            title = json_body.get("title") or json_body.get("request_code")
            asset_id = json_body.get("assetId") or json_body.get("asset_id") or json_body.get("asset")
            department = json_body.get("department") or json_body.get("department_code") or "TMS"

            if auth_user and not auth_service.can_access_department(auth_user, department):
                self._set_headers(403)
                self.wfile.write(json.dumps({
                    "status": "ERROR",
                    "error": f"Department Mismatch: Officer '{auth_user.get('name')}' belongs to {auth_user.get('department')} and is unauthorized to submit work orders for {department}."
                }).encode("utf-8"))
                return

            urgency = str(json_body.get("urgency") or json_body.get("priority") or "MEDIUM").upper()
            description = json_body.get("description") or json_body.get("notes")
            duration = int(json_body.get("duration") or json_body.get("duration_minutes") or 90)
            status = str(json_body.get("status") or "PENDING").upper()
            due_date_str = json_body.get("dueDate") or json_body.get("due_date")
            assigned_to = json_body.get("assignedTo") or json_body.get("assigned_to") or (auth_user.get("name") if auth_user else "Corridor Engineering Division")

            # Strict field validation
            if not title or not str(title).strip():
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "Work Order Title is required."}).encode("utf-8"))
                return
            if not asset_id or not str(asset_id).strip():
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "Asset selection is required."}).encode("utf-8"))
                return
            if not urgency or not str(urgency).strip():
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "Priority level is required."}).encode("utf-8"))
                return
            if not description or not str(description).strip():
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "Description is required."}).encode("utf-8"))
                return
            if not due_date_str or not str(due_date_str).strip():
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "Due Date is required."}).encode("utf-8"))
                return

            try:
                try:
                    due_date_dt = datetime.datetime.fromisoformat(str(due_date_str).replace("Z", "+00:00"))
                except Exception:
                    due_date_dt = datetime.datetime.now() + datetime.timedelta(days=2)

                now = datetime.datetime.now()
                req_obj = CanonicalMaintenanceRequest(
                    request_id=str(title).strip(),
                    source_system=str(department).upper(),
                    department=str(department).upper(),
                    department_id=1 if department == "TMS" else 2 if department == "SMMS" else 3,
                    department_code=str(department).upper(),
                    asset_id=str(asset_id).strip(),
                    asset_type="TRACK" if "TRK" in str(asset_id) else "SIGNAL" if "SIG" in str(asset_id) else "OHE" if "OHE" in str(asset_id) else "CORRIDOR",
                    corridor_id="MAS-TRL-05",
                    section_id="MAS-TRL-05",
                    location_start_km=0.0,
                    location_end_km=5.0,
                    work_type="CORRIDOR_MAINTENANCE",
                    defect_type=str(description).strip(),
                    description=str(description).strip(),
                    severity=5 if urgency == "CRITICAL" else 4 if urgency == "HIGH" else 3 if urgency == "MEDIUM" else 1,
                    reported_at=now,
                    due_date=due_date_dt,
                    estimated_duration_minutes=duration,
                    preferred_start=now,
                    preferred_end=now + datetime.timedelta(minutes=duration),
                    priority_score=90.0 if urgency == "CRITICAL" else 75.0 if urgency == "HIGH" else 50.0 if urgency == "MEDIUM" else 25.0,
                    priority_level=urgency,
                    notes=str(description).strip(),
                    status=status,
                    crew_required=4
                )
                inserted_id = repo.insert_maintenance_request(req_obj)

                saved_record = {
                    "id": inserted_id,
                    "title": str(title).strip(),
                    "assetId": str(asset_id).strip(),
                    "department": str(department).upper(),
                    "urgency": urgency,
                    "duration": duration,
                    "status": status,
                    "notes": str(description).strip(),
                    "assigned_to": str(assigned_to).strip(),
                    "due_date": str(due_date_str),
                    "created_at": now.isoformat()
                }
                self._set_headers(201)
                self.wfile.write(json.dumps({
                    "status": "SUCCESS",
                    "message": "Work order created successfully.",
                    "work_order": saved_record
                }).encode("utf-8"))
                return
            except Exception as e:
                self._set_headers(500)
                self.wfile.write(json.dumps({"error": f"Failed to persist work order: {str(e)}"}).encode("utf-8"))
                return

        # -------------------------------------------------------------
        # North Tamil Nadu Corridor & Real-Time RailRadar POST Endpoints
        # -------------------------------------------------------------
        # Live Data Control (START, PAUSE, STOP, REFRESH)
        if path in ["/api/v1/corridor/live/control", "/api/v1/live-control"]:
            auth_user = self._get_auth_user()
            if auth_user and not auth_service.has_permission(auth_user, "CONTROL_LIVE_DATA"):
                self._set_headers(403)
                self.wfile.write(json.dumps({
                    "status": "ERROR",
                    "error": f"Access Denied: Officer '{auth_user.get('name')}' (Role: {auth_user.get('role')}) lacks permission 'CONTROL_LIVE_DATA'. Only Operations Controllers and Administrators can toggle live telemetry control."
                }).encode("utf-8"))
                return

            action = str(json_body.get("action") or "PAUSE").upper()
            if action == "START":
                updated_state = corridor_engine.start_live_polling()
            elif action == "PAUSE":
                updated_state = corridor_engine.pause_live_polling()
            elif action == "STOP":
                updated_state = corridor_engine.stop_live_polling()
            elif action == "REFRESH":
                updated_state = corridor_engine.refresh_live_now()
            else:
                updated_state = corridor_engine.evaluate_corridor_state(force_refresh=False)

            self._set_headers(200)
            self.wfile.write(json.dumps({
                "status": "SUCCESS",
                "action": action,
                "live_status": updated_state.get("live_status"),
                "polling_enabled": updated_state.get("polling_enabled"),
                "requests_this_session": updated_state.get("requests_this_session"),
                "last_successful_update": updated_state.get("last_live_success_time"),
                "corridor_state": updated_state
            }).encode("utf-8"))
            return

        # Toggle Simulation / Live Mode
        if path in ["/api/v1/corridor/toggle-mode", "/api/v1/trains/toggle-mode", "/api/v1/corridor/simulation-toggle"]:
            req_sim = json_body.get("simulation_mode")
            if req_sim is not None:
                new_mode = corridor_engine.set_simulation_mode(bool(req_sim))
            else:
                new_mode = corridor_engine.set_simulation_mode(not corridor_engine.simulation_mode)
            updated_state = corridor_engine.evaluate_corridor_state()
            self._set_headers(200)
            self.wfile.write(json.dumps({
                "status": "SUCCESS",
                "simulation_mode": new_mode,
                "mode": updated_state["mode"],
                "data_source": updated_state["data_source"],
                "corridor_state": updated_state
            }).encode("utf-8"))
            return

        # Functional Emergency Halt Execution
        if path in ["/api/v1/emergency/halt", "/api/v1/emergency/stop"]:
            block_id = str(json_body.get("block_id") or json_body.get("blockId") or "B1").upper()
            department = str(json_body.get("department") or "OPERATIONS").upper()
            emergency_type = str(json_body.get("emergency_type") or json_body.get("emergencyType") or "Track obstruction")
            severity = int(json_body.get("severity") or 4)
            description = str(json_body.get("description") or "Emergency red aspect halt initiated by sector controller")
            controller_id = str(json_body.get("controller_id") or json_body.get("controllerId") or "CONTROLLER_MAS_01")

            try:
                halt_res = corridor_engine.trigger_emergency_halt(
                    block_id=block_id,
                    department=department,
                    emergency_type=emergency_type,
                    severity=severity,
                    description=description,
                    controller_id=controller_id
                )
                self._set_headers(200)
                self.wfile.write(json.dumps(halt_res).encode("utf-8"))
            except Exception as e:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
            return

        # Clear / Resolve Emergency Halt
        if path == "/api/v1/emergency/resolve":
            block_id = str(json_body.get("block_id") or json_body.get("blockId") or "").upper()
            notes = str(json_body.get("notes") or json_body.get("resolution_notes") or "Track cleared and certified safe by field supervisor.")
            if not block_id:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "block_id required to resolve emergency"}).encode("utf-8"))
                return
            resolve_res = corridor_engine.resolve_emergency(block_id, resolution_notes=notes)
            self._set_headers(200)
            self.wfile.write(json.dumps(resolve_res).encode("utf-8"))
            return

        # AI & Rule-Based Operational Recommendation Engine (Analyzing Live Inputs)
        if path in ["/api/v1/recommendations/analyze", "/api/v1/gemini/insights"]:
            maint_reqs = json_body.get("requests", repo.get_all_requests())
            rec = corridor_engine.generate_recommendation(maintenance_requests=maint_reqs)

            # Format formatted Markdown string for existing modals expecting { "analysis": "..." }
            md_analysis = (
                f"### 🚄 {rec['title']}\n"
                f"**Corridor**: {rec['corridor']}\n"
                f"**Engine Classification**: `{rec['engine_type']}`\n\n"
                f"#### 1. Situation Analysis\n{rec['sections']['situation_analysis']}\n\n"
                f"#### 2. Conflict & Risk Detection\n{rec['sections']['conflict_detection']}\n\n"
                f"#### 3. Recommended Operational Action\n{rec['sections']['recommended_action']}\n\n"
                f"#### 4. Operational Reasoning\n{rec['sections']['reasoning']}\n\n"
                f"#### 5. Expected Network Impact\n{rec['sections']['expected_impact']}\n\n"
                f"#### 6. Alternative Tactical Plan\n{rec['sections']['alternative_plan']}\n\n"
                f"> *{rec['disclaimer']}*"
            )

            self._set_headers(200)
            self.wfile.write(json.dumps({
                "status": "SUCCESS",
                "recommendation": rec,
                "analysis": md_analysis
            }).encode("utf-8"))
            return

        # Dispatch Advisory POST Endpoints (Generate, Acknowledge, Apply)
        if path in ["/api/v1/dispatch/advisory", "/api/v1/dispatch/advisories"]:
            controller_id = json_body.get("controller_id", "CHIEF_DISPATCHER_01")
            corridor_id = json_body.get("corridor_id")
            client_ip = self.client_address[0] if hasattr(self, "client_address") else "127.0.0.1"
            advisory_data = dispatch_advisory_service.generate_advisory(
                corridor_id=corridor_id,
                controller_id=controller_id,
                ip_address=client_ip
            )
            self._set_headers(200)
            self.wfile.write(json.dumps(advisory_data).encode("utf-8"))
            return

        if path == "/api/v1/dispatch/advisory/acknowledge":
            auth_user = self._get_auth_user()
            if auth_user and not auth_service.has_permission(auth_user, "ACKNOWLEDGE_DISPATCH_ADVISORY"):
                self._set_headers(403)
                self.wfile.write(json.dumps({
                    "status": "ERROR",
                    "error": f"Access Denied: Officer '{auth_user.get('name')}' (Role: {auth_user.get('role')}) lacks permission 'ACKNOWLEDGE_DISPATCH_ADVISORY'."
                }).encode("utf-8"))
                return

            advisory_id = json_body.get("advisory_id", "")
            controller_id = auth_user.get("user_id") if auth_user else json_body.get("controller_id", "CHIEF_DISPATCHER_01")
            notes = json_body.get("notes", "")
            client_ip = self.client_address[0] if hasattr(self, "client_address") else "127.0.0.1"
            if not advisory_id:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "advisory_id is required"}).encode("utf-8"))
                return
            ack_res = dispatch_advisory_service.acknowledge_advisory(
                advisory_id=advisory_id,
                controller_id=controller_id,
                notes=notes,
                ip_address=client_ip
            )
            self._set_headers(200)
            self.wfile.write(json.dumps(ack_res).encode("utf-8"))
            return

        if path == "/api/v1/dispatch/advisory/apply":
            auth_user = self._get_auth_user()
            if auth_user and not auth_service.has_permission(auth_user, "APPLY_DISPATCH_RECOMMENDATION"):
                self._set_headers(403)
                self.wfile.write(json.dumps({
                    "status": "ERROR",
                    "error": f"Access Denied: Officer '{auth_user.get('name')}' (Role: {auth_user.get('role')}) lacks permission 'APPLY_DISPATCH_RECOMMENDATION'. Only Operations Controllers and Administrators can apply live dispatch recommendations."
                }).encode("utf-8"))
                return

            advisory_id = json_body.get("advisory_id", "")
            action_type = json_body.get("action_type", "GENERAL_ADVISORY")
            action_payload = json_body.get("action_payload", {})
            controller_id = auth_user.get("user_id") if auth_user else json_body.get("controller_id", "CHIEF_DISPATCHER_01")
            notes = json_body.get("notes", "")
            client_ip = self.client_address[0] if hasattr(self, "client_address") else "127.0.0.1"
            if not advisory_id:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "advisory_id is required"}).encode("utf-8"))
                return
            try:
                apply_res = dispatch_advisory_service.apply_recommendation(
                    advisory_id=advisory_id,
                    action_type=action_type,
                    action_payload=action_payload,
                    controller_id=controller_id,
                    notes=notes,
                    ip_address=client_ip
                )
                self._set_headers(200)
                self.wfile.write(json.dumps(apply_res).encode("utf-8"))
            except ValueError as ve:
                self._set_headers(400)
                self.wfile.write(json.dumps({"status": "ERROR", "error": str(ve), "message": str(ve)}).encode("utf-8"))
            except Exception as e:
                self._set_headers(500)
                self.wfile.write(json.dumps({"status": "ERROR", "error": str(e), "message": str(e)}).encode("utf-8"))
            return

        # 2. Prioritization Engine POST Endpoints
        if path == "/api/v1/prioritization/evaluate":
            trains = repo.get_all_trains()
            all_reqs = repo.get_all_requests()
            if "requests" in json_body and isinstance(json_body["requests"], list):
                results = PrioritizationService.evaluate_batch(
                    json_body["requests"],
                    train_schedules=trains,
                    all_requests=all_reqs
                )
                self._set_headers(200)
                self.wfile.write(json.dumps({
                    "status": "SUCCESS",
                    "evaluated_count": len(results),
                    "results": results
                }).encode("utf-8"))
                return
            else:
                req_data = json_body.get("request", json_body)
                result = PrioritizationService.evaluate_request(
                    req_data,
                    train_schedules=trains,
                    all_requests=all_reqs
                )
                self._set_headers(200)
                self.wfile.write(json.dumps({
                    "status": "SUCCESS",
                    "evaluation": result
                }).encode("utf-8"))
                return

        if path == "/api/v1/prioritization/recalculate":
            requests = repo.get_all_requests()
            trains = repo.get_all_trains()
            if not requests:
                self._set_headers(200)
                self.wfile.write(json.dumps({
                    "status": "EMPTY",
                    "updated_count": 0,
                    "message": "No maintenance requests available to recalculate."
                }).encode("utf-8"))
                return

            evaluated = PrioritizationService.evaluate_batch(requests, train_schedules=trains)
            updated_count = 0
            for item in evaluated:
                req_id = item.get("id") or item.get("request_id")
                if req_id is not None:
                    # Update in SQLite
                    repo.update_request_prioritization(
                        request_id=req_id,
                        criticality_score=item["criticality_score"],
                        urgency_score=item["urgency_score"],
                        impact_score=item["impact_score"],
                        priority_score=item["priority_score"],
                        priority_level=item["priority_level"],
                        safety_override=item["safety_override"],
                        override_reason=item["override_reason"],
                        scoring_method=item["model_used"],
                        metadata={"explanation": item["explanation"]}
                    )
                    updated_count += 1

            self._set_headers(200)
            self.wfile.write(json.dumps({
                "status": "SUCCESS",
                "total_requests": len(requests),
                "updated_count": updated_count,
                "evaluations": evaluated
            }).encode("utf-8"))
            return

        # 3. Single item ingestions
        if path == "/api/v1/ingest/tms":
            try:
                res = import_service.ingest_single_tms(json_body)
                self._set_headers(201)
                self.wfile.write(json.dumps(res).encode("utf-8"))
            except Exception as e:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
            return

        if path == "/api/v1/ingest/smms":
            try:
                res = import_service.ingest_single_smms(json_body)
                self._set_headers(201)
                self.wfile.write(json.dumps(res).encode("utf-8"))
            except Exception as e:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
            return

        if path == "/api/v1/ingest/tdms":
            try:
                res = import_service.ingest_single_tdms(json_body)
                self._set_headers(201)
                self.wfile.write(json.dumps(res).encode("utf-8"))
            except Exception as e:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
            return

        if path == "/api/v1/ingest/coa":
            try:
                res = import_service.ingest_single_coa(json_body)
                self._set_headers(201)
                self.wfile.write(json.dumps(res).encode("utf-8"))
            except Exception as e:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
            return

        # 3. Generate Optimized Plan (with Safety Guardrails)
        if path == "/api/v1/optimize/generate-plan":
            requests = repo.get_all_requests()
            trains = repo.get_all_trains()
            assets = repo.get_all_assets()
            if not requests:
                self._set_headers(200)
                self.wfile.write(json.dumps({
                    "status": "NO_REQUESTS",
                    "optimized_blocks": [],
                    "saved_block_hours": 0.0,
                    "total_blocks_created": 0
                }).encode("utf-8"))
                return

            solve_result = OptimizationService.optimize_schedule(requests, trains, assets=assets)
            if solve_result.get("status") == "NO_SAFE_PLAN" or not solve_result.get("success", True):
                self._set_headers(200)
                self.wfile.write(json.dumps(solve_result).encode("utf-8"))
                return

            blocks = solve_result.get("optimized_blocks", [])
            repo.save_optimized_blocks(blocks)
            self._set_headers(200)
            self.wfile.write(json.dumps(solve_result).encode("utf-8"))
            return

        # 4. Safety Guardrail Evaluation
        if path == "/api/v1/safety/evaluate":
            trains = repo.get_all_trains()
            all_reqs = repo.get_all_requests()
            if isinstance(json_body, list):
                eval_res = SafetyGuardrailService.evaluate_batch_safety(
                    json_body, all_requests=all_reqs, train_schedules=trains
                )
            else:
                eval_res = SafetyGuardrailService.evaluate_request_safety(
                    json_body, all_requests=all_reqs, train_schedules=trains
                )
            self._set_headers(200)
            self.wfile.write(json.dumps({"status": "SUCCESS", "evaluation": eval_res}).encode("utf-8"))
            return

        # 5. Safety Guardrail Bundle Compatibility Check
        if path == "/api/v1/safety/check-compatibility":
            req_a = json_body.get("request_a", {})
            req_b = json_body.get("request_b", {})
            asset_a = json_body.get("asset_a")
            asset_b = json_body.get("asset_b")
            compat = SafetyGuardrailService.check_bundle_compatibility(
                req_a, req_b, asset_a=asset_a, asset_b=asset_b
            )
            self._set_headers(200)
            self.wfile.write(json.dumps({"status": "SUCCESS", "compatibility": compat}).encode("utf-8"))
            return

        # 6. Safety Guardrail Plan Validator
        if path == "/api/v1/safety/validate-plan":
            blocks = json_body.get("blocks", repo.get_all_blocks())
            requests = json_body.get("requests", repo.get_all_requests())
            trains = json_body.get("train_schedules", repo.get_all_trains())
            assets = repo.get_all_assets()
            val_report = SafetyGuardrailService.validate_optimized_plan(
                blocks, requests, trains, assets=assets
            )
            self._set_headers(200)
            self.wfile.write(json.dumps({"status": "SUCCESS", "validation_report": val_report}).encode("utf-8"))
            return

        # Step 5 - Post-Optimization Operational Validator (6-point validation)
        if path == "/api/v1/optimize/validate-plan":
            blocks = json_body.get("blocks", repo.get_all_blocks())
            requests = json_body.get("requests", repo.get_all_requests())
            trains = json_body.get("train_schedules", repo.get_all_trains())
            assets = repo.get_all_assets()
            val_report = OperationalValidatorService.validate_plan(
                blocks, requests, trains, assets=assets
            )
            self._set_headers(200)
            self.wfile.write(json.dumps({"status": "SUCCESS", "validation_report": val_report}).encode("utf-8"))
            return

        # Step 5 - Tactical & Rolling Horizon Planning
        if path == "/api/v1/optimize/tactical-plan":
            horizon_days = int(json_body.get("horizon_days", 7))
            requests = json_body.get("requests", repo.get_all_requests())
            trains = json_body.get("train_schedules", repo.get_all_trains())
            assets = repo.get_all_assets()
            prev_blocks = json_body.get("previous_plan")
            plan_res = TacticalPlanningService.generate_tactical_plan(
                requests=requests,
                train_schedules=trains,
                assets=assets,
                horizon_days=horizon_days,
                previous_plan=prev_blocks
            )
            self._set_headers(200)
            self.wfile.write(json.dumps(plan_res).encode("utf-8"))
            return

        # Step 5 - What-If Traffic & Disruption Simulation
        if path == "/api/v1/optimize/what-if-simulation":
            multiplier = float(json_body.get("traffic_multiplier", 1.40))
            added_freight = int(json_body.get("added_freight_count", 6))
            delay_mins = int(json_body.get("delay_minutes_injection", 0))
            corridor_id = json_body.get("corridor_id", "MAS-TRL-05")
            requests = json_body.get("requests", repo.get_all_requests())
            trains = json_body.get("train_schedules", repo.get_all_trains())
            assets = repo.get_all_assets()
            sim_res = WhatIfSimulationService.simulate_traffic_surge(
                base_requests=requests,
                base_trains=trains,
                assets=assets,
                traffic_multiplier=multiplier,
                added_freight_count=added_freight,
                delay_minutes_injection=delay_mins,
                corridor_id=corridor_id
            )
            self._set_headers(200)
            self.wfile.write(json.dumps(sim_res).encode("utf-8"))
            return

        # Step 5 - Run All Scenarios (POST)
        if path in ["/api/v1/optimize/step5-scenarios/run-all", "/api/v1/optimize/step5/scenarios/run-all"]:
            scenarios = Step5ScenarioRunner.run_all_step5_scenarios()
            self._set_headers(200)
            self.wfile.write(json.dumps(scenarios).encode("utf-8"))
            return

        # 7. Safety Manual Controller Override
        if path == "/api/v1/safety/manual-override":
            auth_user = self._get_auth_user()
            if auth_user:
                if not auth_service.has_permission(auth_user, "MANUAL_SAFETY_OVERRIDE"):
                    self._set_headers(403)
                    self.wfile.write(json.dumps({
                        "status": "ERROR",
                        "error": f"Access Denied: Officer '{auth_user.get('name')}' (Role: {auth_user.get('role')}) lacks clearance 'MANUAL_SAFETY_OVERRIDE'. Only Administrators can execute emergency safety overrides."
                    }).encode("utf-8"))
                    return

            controller_id = auth_user.get("user_id") if auth_user else json_body.get("controller_id", "CHIEF_CONTROLLER_01")
            target_type = json_body.get("target_type", "BLOCK")
            target_id = str(json_body.get("target_id", "1"))
            original_status = json_body.get("original_status", "PENDING")
            override_action = json_body.get("override_action", "APPROVE_DESPITE_WARNING")
            override_reason = json_body.get("override_reason", "Authorized by Section Safety Controller")
            risk_assessment = json_body.get("risk_assessment", "Speed restriction 30km/h imposed during adjacent window")

            log_id = repo.save_safety_audit_log(
                controller_id=controller_id,
                target_type=target_type,
                target_id=target_id,
                original_status=original_status,
                override_action=override_action,
                override_reason=override_reason,
                risk_assessment=risk_assessment,
                ip_address=self.client_address[0] if hasattr(self, "client_address") else "127.0.0.1",
                signature=f"DIGITAL_SIG_{controller_id}_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"
            )

            # If target was a block, update block status
            if target_type == "BLOCK":
                repo.update_block_approval(int(target_id), approve=True)

            self._set_headers(200)
            self.wfile.write(json.dumps({
                "status": "OVERRIDE_RECORDED",
                "audit_log_id": log_id,
                "message": f"Manual controller override successfully recorded for {target_type} #{target_id}."
            }).encode("utf-8"))
            return

        # 8. Emergency Replan with Guardrails
        if path == "/api/v1/optimize/emergency-replan":
            auth_user = self._get_auth_user()
            if auth_user and not auth_service.has_permission(auth_user, "EMERGENCY_REPLAN"):
                self._set_headers(403)
                self.wfile.write(json.dumps({
                    "status": "ERROR",
                    "error": f"Access Denied: Officer '{auth_user.get('name')}' (Role: {auth_user.get('role')}) lacks permission 'EMERGENCY_REPLAN'. Only Operations Controllers and Administrators can trigger corridor emergency replans."
                }).encode("utf-8"))
                return

            asset_id = json_body.get("asset_id", "TRK-01")
            duration = int(json_body.get("duration_minutes", 60))
            defect_type = json_body.get("defect_type", "RAIL_FRACTURE")
            corridor_id = json_body.get("corridor_id", "MAS-TRL-05")

            emergency_req = {
                "id": 9999,
                "department_code": json_body.get("department_code", "TMS"),
                "source_system": json_body.get("department_code", "TMS"),
                "asset_id": asset_id,
                "defect_type": defect_type,
                "work_type": "EMERGENCY_REPAIR",
                "defect_severity": 5,
                "requested_start_time": datetime.datetime.now().isoformat(),
                "duration_minutes": duration,
                "corridor_id": corridor_id
            }

            blocks = repo.get_all_blocks()
            requests = repo.get_all_requests()
            trains = repo.get_all_trains()
            assets = repo.get_all_assets()

            preempt_res = SafetyGuardrailService.preempt_and_replan_emergency(
                emergency_req, blocks, requests, trains, assets=assets
            )

            if preempt_res.get("success"):
                repo.save_optimized_blocks(preempt_res["revised_blocks"])

            self._set_headers(200)
            self.wfile.write(json.dumps(preempt_res).encode("utf-8"))
            return

        # Step 6 - ML Inference Endpoint (Single or Batch)
        if path == "/api/v1/ml/predict":
            if "requests" in json_body and isinstance(json_body["requests"], list):
                batch_res = MLDecisionService.predict_batch_risk(json_body["requests"])
                self._set_headers(200)
                self.wfile.write(json.dumps({"status": "SUCCESS", "predictions": batch_res}).encode("utf-8"))
                return
            else:
                req_obj = json_body.get("request", json_body)
                pred_res = MLDecisionService.predict_request_risk(req_obj)
                self._set_headers(200)
                self.wfile.write(json.dumps({"status": "SUCCESS", "prediction": pred_res}).encode("utf-8"))
                return

        # Step 6 - Retrain ML Model
        if path in ["/api/v1/ml/train", "/api/v1/ml/retrain"]:
            n_est = int(json_body.get("n_estimators", 35))
            max_d = int(json_body.get("max_depth", 6))
            train_res = MLDecisionService.retrain_model(n_estimators=n_est, max_depth=max_d)
            self._set_headers(200)
            self.wfile.write(json.dumps({"status": "SUCCESS", "training_results": train_res}).encode("utf-8"))
            return

        # Step 6 - Run All ML Scenarios (POST)
        if path in ["/api/v1/ml/scenarios/run-all", "/api/v1/ml/step6-scenarios/run-all"]:
            scenarios = Step6ScenarioRunner.run_all_step6_scenarios()
            self._set_headers(200)
            self.wfile.write(json.dumps(scenarios).encode("utf-8"))
            return

        # Step 6 - Baseline Comparison (POST)
        if path == "/api/v1/ml/baseline-comparison":
            requests = json_body.get("requests", repo.get_all_requests())
            trains = json_body.get("train_schedules", repo.get_all_trains())
            assets = repo.get_all_assets()
            comp = BaselineComparisonService.compare_workload(requests, train_schedules=trains, assets=assets)
            self._set_headers(200)
            self.wfile.write(json.dumps(comp).encode("utf-8"))
            return

        # 9. Approve Block
        if path == "/api/v1/optimize/approve-block":
            auth_user = self._get_auth_user()
            approve = bool(json_body.get("approve", True))
            perm_needed = "APPROVE_PLAN" if approve else "REJECT_PLAN"
            if auth_user and not auth_service.has_permission(auth_user, perm_needed):
                self._set_headers(403)
                self.wfile.write(json.dumps({
                    "status": "ERROR",
                    "error": f"Access Denied: Officer '{auth_user.get('name')}' (Role: {auth_user.get('role')}) lacks permission '{perm_needed}'. Only Operations Controllers and Administrators can approve or reject scheduled block plans."
                }).encode("utf-8"))
                return

            block_id = int(json_body.get("block_id", 0))
            approve = bool(json_body.get("approve", True))
            success = repo.update_block_approval(block_id, approve)
            if not success:
                self._set_headers(404)
                self.wfile.write(json.dumps({"error": f"Block {block_id} not found"}).encode("utf-8"))
                return
            res = {
                "status": "SUCCESS",
                "block_id": block_id,
                "approval_status": "APPROVED" if approve else "REJECTED"
            }
            self._set_headers(200)
            self.wfile.write(json.dumps(res).encode("utf-8"))
            return

        # 6. AI Insights
        if path == "/api/v1/insights/analyze":
            corridor_id = json_body.get("corridor_id", "MAS-TRL-05")
            requests = repo.get_all_requests()
            blocks = repo.get_all_blocks()
            crit_count = sum(1 for r in requests if r.get("defect_severity", 1) >= 4)
            total_saved = sum(b.get("saved_block_hours", 0.0) for b in blocks)
            res = {
                "corridor_id": corridor_id,
                "critical_alerts": crit_count,
                "recommendation": (
                    f"Identified {crit_count} high-severity maintenance issues along corridor {corridor_id}. "
                    f"Optimal multi-department bundling yielded {len(blocks)} consolidated windows, "
                    f"recovering {total_saved:.1f} block-hours while safeguarding passenger traffic punctuality."
                ),
                "generated_at": datetime.datetime.now().isoformat()
            }
            self._set_headers(200)
            self.wfile.write(json.dumps(res).encode("utf-8"))
            return

        # -------------------------------------------------------------
        # STEP 7 - End-to-End System Validation & Demo Mode POST Routes
        # -------------------------------------------------------------
        # Run 19-stage Full E2E Pipeline Integration Test
        if path == "/api/v1/validation/run-e2e":
            e2e_res = Step7ValidationService.run_full_e2e_integration_test()
            self._set_headers(200)
            self.wfile.write(json.dumps(e2e_res).encode("utf-8"))
            return

        # Load Realistic SIH Demo Day Scenario
        if path == "/api/v1/demo/load-scenario":
            persist = bool(json_body.get("persist", True))
            demo_res = Step7ValidationService.load_demo_day_scenario(persist=persist)
            self._set_headers(200)
            self.wfile.write(json.dumps(demo_res).encode("utf-8"))
            return

        # Safe Demo Data Reset
        if path == "/api/v1/demo/reset":
            reset_res = Step7ValidationService.reset_demo_data()
            self._set_headers(200)
            self.wfile.write(json.dumps(reset_res).encode("utf-8"))
            return

        # Emergency Replanning Validation Test
        if path == "/api/v1/validation/emergency-replan":
            emg_res = Step7ValidationService.test_emergency_replanning()
            self._set_headers(200)
            self.wfile.write(json.dumps(emg_res).encode("utf-8"))
            return

        # What-If Simulation Validation Test
        if path == "/api/v1/validation/what-if":
            what_if_res = Step7ValidationService.test_what_if_simulations()
            self._set_headers(200)
            self.wfile.write(json.dumps(what_if_res).encode("utf-8"))
            return

        # Performance Benchmarks Execution
        if path == "/api/v1/validation/benchmarks":
            bench_res = Step7ValidationService.run_performance_benchmarks()
            self._set_headers(200)
            self.wfile.write(json.dumps(bench_res).encode("utf-8"))
            return

        # Fail-Safe & Error Handling Test
        if path == "/api/v1/validation/fail-safes":
            err_res = Step7ValidationService.test_error_handling_and_fail_safes()
            self._set_headers(200)
            self.wfile.write(json.dumps(err_res).encode("utf-8"))
            return

        # Regression Suite (Steps 1 through 6)
        if path == "/api/v1/validation/regression-suite":
            reg_res = Step7ValidationService.run_regression_suite()
            self._set_headers(200)
            self.wfile.write(json.dumps(reg_res).encode("utf-8"))
            return

        self._set_headers(404)
        self.wfile.write(json.dumps({"error": f"Endpoint POST {path} not found"}).encode("utf-8"))

    # -------------------------------------------------------------
    # DELETE Endpoints
    # -------------------------------------------------------------
    def do_DELETE(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/v1/data/imports/"):
            batch_id = path.replace("/api/v1/data/imports/", "").strip()
            success = repo.delete_import_batch(batch_id)
            if not success:
                self._set_headers(404)
                self.wfile.write(json.dumps({"error": f"Batch {batch_id} not found"}).encode("utf-8"))
                return
            self._set_headers(200)
            self.wfile.write(json.dumps({"status": "SUCCESS", "message": f"Deleted batch {batch_id}"}).encode("utf-8"))
            return

        if path.startswith("/api/v1/optimize/delete-request/"):
            auth_user = self._get_auth_user()
            if auth_user and not auth_service.has_permission(auth_user, "DELETE_REQUEST"):
                self._set_headers(403)
                self.wfile.write(json.dumps({
                    "status": "ERROR",
                    "error": f"Access Denied: Officer '{auth_user.get('name')}' (Role: {auth_user.get('role')}) lacks permission 'DELETE_REQUEST'. Only Administrators can delete maintenance requests."
                }).encode("utf-8"))
                return

            try:
                req_id = int(path.replace("/api/v1/optimize/delete-request/", "").strip())
                success = repo.delete_request(req_id)
                if not success:
                    self._set_headers(404)
                    self.wfile.write(json.dumps({"error": f"Request {req_id} not found"}).encode("utf-8"))
                    return
                self._set_headers(200)
                self.wfile.write(json.dumps({"status": "SUCCESS", "message": f"Deleted request {req_id}"}).encode("utf-8"))
                return
            except Exception as e:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
                return

        self._set_headers(404)
        self.wfile.write(json.dumps({"error": f"Endpoint DELETE {path} not found"}).encode("utf-8"))


class ReusableThreadingServer(ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True


def run_server(port=8000, host="0.0.0.0"):
    server_address = (host, port)
    
    for attempt in range(1, 6):
        try:
            httpd = ReusableThreadingServer(server_address, RailSyncAPIHandler)
            print(f"[RailSync] Authoritative Python Backend listening on http://{host}:{port}")
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                pass
            finally:
                httpd.server_close()
                print("[RailSync] Python backend stopped.")
            return
        except OSError as e:
            if e.errno == 98 and attempt < 5:
                print(f"[RailSync] Port {port} in use (attempt {attempt}/5). Retrying in 1s...")
                time.sleep(1)
            else:
                raise e


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="RailSync Backend Server")
    parser.add_argument("--port", type=int, default=8000, help="Port to listen on (default: 8000)")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host to listen on (default: 0.0.0.0)")
    args = parser.parse_args()
    run_server(port=args.port, host=args.host)
