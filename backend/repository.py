"""
RailSync Repository Layer: Zero-Dependency SQLite Implementation.
Handles all database queries, ACID transactions, duplicate detection, and entity mapping.
"""

import json
import datetime
from typing import List, Dict, Any, Optional
from backend.database import get_connection
from backend.pipeline.validator import CanonicalMaintenanceRequest, CanonicalTrainSchedule


class RailSyncRepository:
    def __init__(self):
        pass

    # -------------------------------------------------------------
    # Corridor Assets
    # -------------------------------------------------------------
    def get_all_assets(self) -> List[Dict[str, Any]]:
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM corridor_assets ORDER BY id ASC;")
            rows = cursor.fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()

    def get_or_create_asset(
        self,
        asset_id: str,
        asset_type: str,
        line_section: str,
        start_km: float,
        end_km: float
    ) -> Dict[str, Any]:
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM corridor_assets WHERE asset_id = ?;", (asset_id,))
            row = cursor.fetchone()
            if row:
                return dict(row)

            cursor.execute("""
            INSERT INTO corridor_assets (asset_id, name, asset_type, line_section, start_km, end_km, speed_limit_kmh, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);
            """, (asset_id, f"{asset_type} Segment {asset_id}", asset_type, line_section, start_km, end_km, 120, "OPERATIONAL"))
            conn.commit()
            
            cursor.execute("SELECT * FROM corridor_assets WHERE asset_id = ?;", (asset_id,))
            return dict(cursor.fetchone())
        finally:
            conn.close()

    # -------------------------------------------------------------
    # Maintenance Requests & Duplicate Detection
    # -------------------------------------------------------------
    def is_duplicate_request(self, req: CanonicalMaintenanceRequest) -> bool:
        conn = get_connection()
        try:
            cursor = conn.cursor()
            # 1. Exact raw source reference match
            if req.raw_source_reference:
                cursor.execute("""
                SELECT id FROM maintenance_requests 
                WHERE source_system = ? AND raw_source_reference = ?;
                """, (req.source_system, req.raw_source_reference))
                if cursor.fetchone():
                    return True

            # 2. Composite match: source_system + asset_id + defect_type + close time window (6 hours)
            t_start = (req.preferred_start - datetime.timedelta(hours=6)).isoformat()
            t_end = (req.preferred_start + datetime.timedelta(hours=6)).isoformat()

            cursor.execute("""
            SELECT id FROM maintenance_requests
            WHERE source_system = ? AND asset_id = ? AND defect_type = ?
            AND requested_start_time >= ? AND requested_start_time <= ?;
            """, (req.source_system, req.asset_id, req.defect_type, t_start, t_end))
            return cursor.fetchone() is not None
        finally:
            conn.close()

    def insert_maintenance_request(self, req: CanonicalMaintenanceRequest) -> int:
        self.get_or_create_asset(
            asset_id=req.asset_id,
            asset_type=req.asset_type,
            line_section=req.corridor_id,
            start_km=req.location_start_km,
            end_km=req.location_end_km
        )

        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO maintenance_requests (
                request_code, source_system, department_id, department_code, asset_id, asset_type,
                corridor_id, section_id, location_start_km, location_end_km, work_type, defect_type,
                requested_start_time, duration_minutes, defect_severity, urgency_level, status, notes,
                crew_required, machines_required, raw_source_reference, import_batch_id, imported_at,
                due_date, preferred_end, criticality_score, urgency_score, impact_score, priority_score,
                priority_level, safety_override, override_reason, scoring_method, scored_at, metadata_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                req.request_id,
                req.source_system,
                req.department_id,
                req.department_code,
                req.asset_id,
                req.asset_type,
                req.corridor_id,
                req.section_id,
                req.location_start_km,
                req.location_end_km,
                req.work_type,
                req.defect_type,
                req.preferred_start.isoformat(),
                req.estimated_duration_minutes,
                req.severity,
                round(req.priority_score / 100.0, 4) if req.priority_score > 1.0 else round(req.priority_score, 4),
                req.status,
                req.notes or req.description,
                req.crew_required,
                req.machines_required,
                req.raw_source_reference,
                req.import_batch_id,
                (req.imported_at or datetime.datetime.now()).isoformat(),
                req.due_date.isoformat() if req.due_date else None,
                req.preferred_end.isoformat() if req.preferred_end else None,
                round(req.criticality_score, 2),
                round(req.urgency_score, 2),
                round(req.impact_score, 2),
                round(req.priority_score, 2),
                req.priority_level,
                1 if getattr(req, "safety_override", False) else 0,
                getattr(req, "override_reason", None),
                getattr(req, "scoring_method", "deterministic_hybrid"),
                getattr(req, "scored_at", datetime.datetime.now().isoformat()),
                json.dumps(req.metadata)
            ))
            conn.commit()
            return cursor.lastrowid
        finally:
            conn.close()

    def update_request_prioritization(
        self,
        request_id: int,
        criticality_score: float,
        urgency_score: float,
        impact_score: float,
        priority_score: float,
        priority_level: str,
        safety_override: bool,
        override_reason: Optional[str] = None,
        scoring_method: str = "deterministic_hybrid",
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        conn = get_connection()
        try:
            cursor = conn.cursor()
            metadata_str = json.dumps(metadata) if metadata else None
            now_iso = datetime.datetime.now().isoformat()
            cursor.execute("""
            UPDATE maintenance_requests
            SET criticality_score = ?,
                urgency_score = ?,
                impact_score = ?,
                priority_score = ?,
                urgency_level = ?,
                priority_level = ?,
                safety_override = ?,
                override_reason = ?,
                scoring_method = ?,
                scored_at = ?,
                metadata_json = COALESCE(?, metadata_json)
            WHERE id = ?;
            """, (
                criticality_score,
                urgency_score,
                impact_score,
                priority_score,
                round(priority_score / 100.0, 4),
                priority_level,
                1 if safety_override else 0,
                override_reason,
                scoring_method,
                now_iso,
                metadata_str,
                request_id
            ))
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()

    def get_all_requests(self) -> List[Dict[str, Any]]:
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM maintenance_requests ORDER BY urgency_level DESC, id DESC;")
            rows = cursor.fetchall()
            results = []
            for r in rows:
                item = dict(r)
                if item.get("metadata_json"):
                    try:
                        item["metadata"] = json.loads(item["metadata_json"])
                    except Exception:
                        item["metadata"] = {}
                else:
                    item["metadata"] = {}
                results.append(item)
            return results
        finally:
            conn.close()

    def delete_request(self, request_id: int) -> bool:
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM maintenance_requests WHERE id = ?;", (request_id,))
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()

    def update_request_status(self, request_id: int, status: str) -> bool:
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("UPDATE maintenance_requests SET status = ? WHERE id = ?;", (status, request_id))
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()

    # -------------------------------------------------------------
    # Train Schedules & Duplicate Detection
    # -------------------------------------------------------------
    def is_duplicate_train(self, train: CanonicalTrainSchedule) -> bool:
        conn = get_connection()
        try:
            cursor = conn.cursor()
            t_start = (train.arrival_window_start - datetime.timedelta(hours=2)).isoformat()
            t_end = (train.arrival_window_start + datetime.timedelta(hours=2)).isoformat()

            cursor.execute("""
            SELECT id FROM train_schedules
            WHERE train_number = ? AND corridor_id = ?
            AND arrival_window_start >= ? AND arrival_window_start <= ?;
            """, (train.train_number, train.corridor_id, t_start, t_end))
            return cursor.fetchone() is not None
        finally:
            conn.close()

    def insert_train_schedule(self, train: CanonicalTrainSchedule) -> int:
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO train_schedules (
                train_number, name, priority_class, corridor_id, section_id,
                arrival_window_start, departure_window_end, delay_minutes, status,
                traffic_density_rank, import_batch_id, imported_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                train.train_number,
                train.name,
                train.priority_class,
                train.corridor_id,
                train.section_id or train.corridor_id,
                train.arrival_window_start.isoformat(),
                train.departure_window_end.isoformat(),
                train.delay_minutes,
                train.status,
                train.traffic_density_rank,
                train.import_batch_id,
                (train.imported_at or datetime.datetime.now()).isoformat()
            ))
            conn.commit()
            return cursor.lastrowid
        finally:
            conn.close()

    def get_all_trains(self) -> List[Dict[str, Any]]:
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM train_schedules ORDER BY arrival_window_start ASC;")
            rows = cursor.fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()

    # -------------------------------------------------------------
    # Import Batches & Lineage
    # -------------------------------------------------------------
    def create_import_batch(
        self,
        batch_id: str,
        source_system: str,
        filename: str,
        total_records: int,
        imported_records: int,
        duplicate_records: int,
        invalid_records: int,
        status: str = "SUCCESS"
    ) -> Dict[str, Any]:
        conn = get_connection()
        try:
            cursor = conn.cursor()
            now_iso = datetime.datetime.now().isoformat()
            cursor.execute("""
            INSERT INTO import_batches (
                batch_id, source_system, filename, total_records, imported_records,
                duplicate_records, invalid_records, imported_at, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (batch_id, source_system, filename, total_records, imported_records, duplicate_records, invalid_records, now_iso, status))
            conn.commit()
            return {
                "batch_id": batch_id,
                "source_system": source_system,
                "filename": filename,
                "total_records": total_records,
                "imported_records": imported_records,
                "duplicate_records": duplicate_records,
                "invalid_records": invalid_records,
                "imported_at": now_iso,
                "status": status
            }
        finally:
            conn.close()

    def update_import_batch_counts(
        self,
        batch_id: str,
        imported_records: int,
        duplicate_records: int,
        invalid_records: int,
        status: str = "SUCCESS"
    ) -> bool:
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE import_batches 
            SET imported_records = ?, duplicate_records = ?, invalid_records = ?, status = ?
            WHERE batch_id = ?;
            """, (imported_records, duplicate_records, invalid_records, status, batch_id))
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()

    def get_all_import_batches(self) -> List[Dict[str, Any]]:
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM import_batches ORDER BY imported_at DESC;")
            rows = cursor.fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()

    def get_import_batch(self, batch_id: str) -> Optional[Dict[str, Any]]:
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM import_batches WHERE batch_id = ?;", (batch_id,))
            row = cursor.fetchone()
            if not row:
                return None
            
            cursor.execute("SELECT COUNT(*) FROM maintenance_requests WHERE import_batch_id = ?;", (batch_id,))
            req_count = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM train_schedules WHERE import_batch_id = ?;", (batch_id,))
            train_count = cursor.fetchone()[0]

            res = dict(row)
            res["linked_requests_count"] = req_count
            res["linked_trains_count"] = train_count
            return res
        finally:
            conn.close()

    def delete_import_batch(self, batch_id: str) -> bool:
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM maintenance_requests WHERE import_batch_id = ?;", (batch_id,))
            cursor.execute("DELETE FROM train_schedules WHERE import_batch_id = ?;", (batch_id,))
            cursor.execute("DELETE FROM import_batches WHERE batch_id = ?;", (batch_id,))
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()

    # -------------------------------------------------------------
    # Optimized Blocks
    # -------------------------------------------------------------
    def save_optimized_blocks(self, blocks: List[Dict[str, Any]]) -> None:
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM optimized_blocks;")

            for b in blocks:
                s_start = b.get("scheduled_start")
                if isinstance(s_start, datetime.datetime):
                    s_start = s_start.isoformat()
                s_end = b.get("scheduled_end")
                if isinstance(s_end, datetime.datetime):
                    s_end = s_end.isoformat()

                bundled_json = json.dumps(b.get("bundled_request_ids", []))
                depts_json = json.dumps(b.get("bundled_departments", []))
                violations_json = json.dumps(b.get("safety_violations", [])) if isinstance(b.get("safety_violations"), list) else (b.get("safety_violations") or "")

                cursor.execute("""
                INSERT INTO optimized_blocks (
                    id, corridor_id, bundled_request_ids, scheduled_start, scheduled_end,
                    allocated_safety_buffer, controller_approval_status, saved_block_hours,
                    bundled_departments, urgency_score, safety_validation_status, safety_violations
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """, (
                    b.get("id"),
                    b.get("corridor_id", "MAS-TRL-05"),
                    bundled_json,
                    s_start,
                    s_end,
                    b.get("allocated_safety_buffer", 15),
                    b.get("controller_approval_status", "PENDING"),
                    b.get("saved_block_hours", 0.0),
                    depts_json,
                    b.get("urgency_score", 0.5),
                    b.get("safety_validation_status", "SAFE"),
                    violations_json
                ))

                # Update bundled status for maintenance requests
                for req_id in b.get("bundled_request_ids", []):
                    cursor.execute("""
                    UPDATE maintenance_requests SET status = 'BUNDLED' WHERE id = ?;
                    """, (req_id,))

            conn.commit()
        finally:
            conn.close()

    def get_all_blocks(self) -> List[Dict[str, Any]]:
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM optimized_blocks ORDER BY id ASC;")
            rows = cursor.fetchall()
            results = []
            for r in rows:
                item = dict(r)
                try:
                    item["bundled_request_ids"] = json.loads(item["bundled_request_ids"])
                except Exception:
                    item["bundled_request_ids"] = []
                try:
                    item["bundled_departments"] = json.loads(item["bundled_departments"])
                except Exception:
                    item["bundled_departments"] = []
                try:
                    if item.get("safety_violations") and item["safety_violations"].startswith("["):
                        item["safety_violations"] = json.loads(item["safety_violations"])
                except Exception:
                    pass
                results.append(item)
            return results
        finally:
            conn.close()

    def update_block_approval(self, block_id: int, approve: bool) -> bool:
        conn = get_connection()
        try:
            cursor = conn.cursor()
            new_status = "APPROVED" if approve else "REJECTED"
            cursor.execute("""
            UPDATE optimized_blocks SET controller_approval_status = ? WHERE id = ?;
            """, (new_status, block_id))
            if cursor.rowcount == 0:
                return False

            cursor.execute("SELECT bundled_request_ids FROM optimized_blocks WHERE id = ?;", (block_id,))
            row = cursor.fetchone()
            if row:
                try:
                    req_ids = json.loads(row[0])
                    for r_id in req_ids:
                        cursor.execute("""
                        UPDATE maintenance_requests SET status = ? WHERE id = ?;
                        """, (new_status, r_id))
                except Exception:
                    pass

            conn.commit()
            return True
        finally:
            conn.close()

    # -------------------------------------------------------------
    # Safety Guardrails & Audit Logging
    # -------------------------------------------------------------
    def save_safety_audit_log(
        self,
        controller_id: str,
        target_type: str,
        target_id: str,
        original_status: str,
        override_action: str,
        override_reason: str,
        risk_assessment: Optional[str] = None,
        ip_address: Optional[str] = None,
        signature: Optional[str] = None
    ) -> int:
        conn = get_connection()
        try:
            cursor = conn.cursor()
            now_iso = datetime.datetime.now().isoformat()
            cursor.execute("""
            INSERT INTO safety_audit_logs (
                timestamp, controller_id, target_type, target_id, original_status,
                override_action, override_reason, risk_assessment, ip_address, signature
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                now_iso, controller_id, target_type, str(target_id), original_status,
                override_action, override_reason, risk_assessment, ip_address, signature
            ))
            conn.commit()
            return cursor.lastrowid
        finally:
            conn.close()

    def get_safety_audit_logs(self, limit: int = 50) -> List[Dict[str, Any]]:
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT * FROM safety_audit_logs ORDER BY id DESC LIMIT ?;
            """, (limit,))
            rows = cursor.fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()

    def update_request_safety_guardrails(
        self,
        request_id: int,
        safety_classification: str,
        effective_deadline: Optional[str] = None,
        isolation_requirements: Optional[List[str]] = None,
        safety_validation_status: str = "SAFE"
    ) -> bool:
        conn = get_connection()
        try:
            cursor = conn.cursor()
            iso_str = json.dumps(isolation_requirements or [])
            cursor.execute("""
            UPDATE maintenance_requests SET
                safety_classification = ?,
                effective_deadline = ?,
                isolation_requirements = ?,
                safety_validation_status = ?
            WHERE id = ?;
            """, (safety_classification, effective_deadline, iso_str, safety_validation_status, request_id))
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()
