"""
RailSync Authoritative Backend HTTP Server.
Built with Python 3 standard library (http.server) with zero external dependency requirement.
Supports REST JSON endpoints, multi-part dataset uploads, SSE telemetry, and CORS.
"""

import os
import sys
import json
import re
import io
import time
import argparse
import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

from backend.database import init_db
from backend.repository import RailSyncRepository
from backend.ai_engine import AIRailSyncPrioritizationEngine
from backend.optimizer import CPOrToolsBlockOptimizer
from backend.pipeline.service import PipelineImportService

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
                "critical_defects_count": sum(1 for r in requests if r.get("defect_severity", 1) >= 4)
            }
            self._set_headers(200)
            self.wfile.write(json.dumps(res).encode("utf-8"))
            return

        # Corridor State
        if path == "/api/v1/dashboard/corridor-state":
            res = {
                "assets": repo.get_all_assets(),
                "train_schedules": repo.get_all_trains(),
                "maintenance_requests": repo.get_all_requests(),
                "optimized_blocks": repo.get_all_blocks()
            }
            self._set_headers(200)
            self.wfile.write(json.dumps(res).encode("utf-8"))
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

        # 2. Single item ingestions
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

        # 3. Generate Optimized Plan
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

            optimizer = CPOrToolsBlockOptimizer(requests, trains, assets=assets)
            blocks = optimizer.solve()
            repo.save_optimized_blocks(blocks)
            res = {
                "status": "OPTIMAL_SCHEDULE_GENERATED",
                "saved_block_hours": round(sum(b.get("saved_block_hours", 0.0) for b in blocks), 2),
                "total_blocks_created": len(blocks),
                "optimized_blocks": blocks
            }
            self._set_headers(200)
            self.wfile.write(json.dumps(res).encode("utf-8"))
            return

        # 4. Emergency Replan
        if path == "/api/v1/optimize/emergency-replan":
            asset_id = json_body.get("asset_id", "TRK-01")
            duration = int(json_body.get("duration_minutes", 60))
            notes = json_body.get("notes", "Urgent track fracture")
            
            emergency_dict = {
                "track_code": asset_id,
                "defect_id": f"EMG-{datetime.datetime.now().strftime('%H%M%S')}",
                "severity_rank": 5,
                "reported_at": datetime.datetime.now().isoformat(),
                "required_repair_duration": max(30, duration),
                "proposed_date": datetime.datetime.now().isoformat(),
                "inspector_notes": f"EMERGENCY REPAIR: {notes}",
                "corridor_id": "NDLS-HWH-01",
                "work_type": "EMERGENCY_REPAIR"
            }
            import_service.import_dataset("TMS", [emergency_dict], filename="emergency_trigger.json")

            requests = repo.get_all_requests()
            trains = repo.get_all_trains()
            assets = repo.get_all_assets()
            optimizer = CPOrToolsBlockOptimizer(requests, trains, assets=assets)
            blocks = optimizer.solve()
            repo.save_optimized_blocks(blocks)

            res = {
                "status": "EMERGENCY_REPLAN_COMPLETED",
                "emergency_asset": asset_id,
                "optimized_blocks": blocks
            }
            self._set_headers(200)
            self.wfile.write(json.dumps(res).encode("utf-8"))
            return

        # 5. Approve Block
        if path == "/api/v1/optimize/approve-block":
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
            corridor_id = json_body.get("corridor_id", "NDLS-HWH-01")
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


def run_server(port=8000, host="0.0.0.0"):
    server_address = (host, port)
    httpd = HTTPServer(server_address, RailSyncAPIHandler)
    print(f"[RailSync] Authoritative Python Backend listening on http://{host}:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()
        print("[RailSync] Python backend stopped.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="RailSync Backend Server")
    parser.add_argument("--port", type=int, default=8000, help="Port to listen on (default: 8000)")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host to listen on (default: 0.0.0.0)")
    args = parser.parse_args()
    run_server(port=args.port, host=args.host)
