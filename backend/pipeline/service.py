"""
RailSync Data Pipeline: Core Orchestration Service.
Coordinates file ingestion, format detection (CSV/JSON), transformation,
duplicate detection, AI scoring, batch metadata, and database transactions.
"""

import os
import io
import csv
import json
import uuid
import datetime
from typing import List, Dict, Any, Union, Optional, Tuple
from backend.pipeline.adapters import (
    TMSAdapter,
    SMMSAdapter,
    TDMSAdapter,
    COAAdapter,
)
from backend.pipeline.validator import (
    CanonicalMaintenanceRequest,
    CanonicalTrainSchedule,
    RowValidationError,
)
from backend.services.prioritization_service import PrioritizationService


class PipelineImportService:
    def __init__(
        self,
        repo: Optional[Any] = None,
        ai_engine: Optional[Any] = None
    ):
        if repo is None:
            from backend.repository import RailSyncRepository
            self.repo = RailSyncRepository()
        else:
            self.repo = repo

    def _parse_payload_records(self, raw_input: Union[bytes, str, list, dict]) -> Tuple[List[Dict[str, Any]], Optional[str]]:
        """
        Extracts a list of record dictionaries from bytes/strings (CSV/JSON) or native python structures.
        """
        if isinstance(raw_input, list):
            return [r for r in raw_input if isinstance(r, dict)], "JSON_LIST"
        if isinstance(raw_input, dict):
            # If wrapped in a top-level key like {"records": [...]} or {"data": [...]}
            for k in ["records", "data", "items", "rows", "payload"]:
                if k in raw_input and isinstance(raw_input[k], list):
                    return [r for r in raw_input[k] if isinstance(r, dict)], "JSON_OBJECT"
            return [raw_input], "JSON_SINGLE"

        text_data = raw_input.decode("utf-8", errors="replace") if isinstance(raw_input, bytes) else str(raw_input)
        text_data = text_data.strip()

        if not text_data:
            return [], "EMPTY"

        # Try JSON first
        if text_data.startswith("[") or text_data.startswith("{"):
            try:
                parsed = json.loads(text_data)
                if isinstance(parsed, list):
                    return [r for r in parsed if isinstance(r, dict)], "JSON"
                elif isinstance(parsed, dict):
                    for k in ["records", "data", "items", "rows", "payload"]:
                        if k in parsed and isinstance(parsed[k], list):
                            return [r for r in parsed[k] if isinstance(r, dict)], "JSON"
                    return [parsed], "JSON"
            except Exception:
                pass

        # Try CSV parsing (filtering out comment lines starting with #)
        try:
            lines = [l for l in text_data.splitlines() if l.strip() and not l.strip().startswith("#")]
            if not lines:
                return [], "EMPTY_CSV"
            
            reader = csv.DictReader(io.StringIO("\n".join(lines)))
            records = []
            for row in reader:
                cleaned_row = {k.strip(): v.strip() for k, v in row.items() if k is not None and v is not None}
                if cleaned_row:
                    records.append(cleaned_row)
            return records, "CSV"
        except Exception as e:
            return [], f"PARSE_ERROR: {str(e)}"

    def import_dataset(
        self,
        source_system: str,
        payload_data: Union[bytes, str, list, dict],
        filename: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Orchestrates full dataset batch ingestion for a given source system (TMS, SMMS, TDMS, COA).
        """
        source = source_system.upper().strip()
        batch_id = f"BATCH-{source}-{uuid.uuid4().hex[:8].upper()}"
        filename = filename or f"{source.lower()}_dataset.csv"

        records, format_detected = self._parse_payload_records(payload_data)

        total_records = len(records)
        imported_count = 0
        duplicate_count = 0
        invalid_count = 0
        validation_errors: List[Dict[str, Any]] = []
        imported_ids: List[int] = []

        # 1. Create Import Batch Record Upfront to satisfy Foreign Key constraints
        self.repo.create_import_batch(
            batch_id=batch_id,
            source_system=source,
            filename=filename,
            total_records=total_records,
            imported_records=0,
            duplicate_records=0,
            invalid_records=0,
            status="PROCESSING"
        )

        if total_records == 0:
            self.repo.update_import_batch_counts(
                batch_id=batch_id,
                imported_records=0,
                duplicate_records=0,
                invalid_records=0,
                status="EMPTY"
            )
            return {
                "batch_id": batch_id,
                "source_system": source,
                "filename": filename,
                "format_detected": format_detected,
                "total_records": 0,
                "imported_records": 0,
                "duplicate_records": 0,
                "invalid_records": 0,
                "validation_errors": [],
                "imported_ids": []
            }

        for idx, raw_item in enumerate(records, start=1):
            if source == "TMS":
                canonical, err = TMSAdapter.transform_record(idx, raw_item, batch_id=batch_id)
            elif source == "SMMS":
                canonical, err = SMMSAdapter.transform_record(idx, raw_item, batch_id=batch_id)
            elif source == "TDMS":
                canonical, err = TDMSAdapter.transform_record(idx, raw_item, batch_id=batch_id)
            elif source == "COA":
                canonical, err = COAAdapter.transform_record(idx, raw_item, batch_id=batch_id)
            else:
                err = RowValidationError(row=idx, field="source_system", message=f"Unsupported source system: {source}")
                canonical = None

            if err or not canonical:
                invalid_count += 1
                if err:
                    validation_errors.append(err.dict())
                continue

            # Process Maintenance Request (TMS, SMMS, TDMS)
            if isinstance(canonical, CanonicalMaintenanceRequest):
                if self.repo.is_duplicate_request(canonical):
                    duplicate_count += 1
                    continue

                trains = self.repo.get_all_trains()
                all_reqs = self.repo.get_all_requests()

                # Run Authoritative Explainable Prioritization Service
                eval_res = PrioritizationService.evaluate_request(
                    canonical.to_dict(),
                    train_schedules=trains,
                    all_requests=all_reqs
                )
                canonical.criticality_score = eval_res["criticality_score"]
                canonical.urgency_score = eval_res["urgency_score"]
                canonical.impact_score = eval_res["impact_score"]
                canonical.priority_score = eval_res["priority_score"]
                canonical.urgency_level = round(eval_res["priority_score"] / 100.0, 4)
                canonical.priority_level = eval_res["priority_level"]
                canonical.safety_override = eval_res["safety_override"]
                canonical.override_reason = eval_res["override_reason"]
                canonical.scoring_method = eval_res["model_used"]
                canonical.scored_at = eval_res["scored_at"]
                canonical.metadata["explanation"] = eval_res["explanation"]

                inserted_id = self.repo.insert_maintenance_request(canonical)
                imported_ids.append(inserted_id)
                imported_count += 1

            # Process Train Schedule (COA)
            elif isinstance(canonical, CanonicalTrainSchedule):
                if self.repo.is_duplicate_train(canonical):
                    duplicate_count += 1
                    continue

                inserted_id = self.repo.insert_train_schedule(canonical)
                imported_ids.append(inserted_id)
                imported_count += 1

        # Record Batch Lineage
        self.repo.update_import_batch_counts(
            batch_id=batch_id,
            imported_records=imported_count,
            duplicate_records=duplicate_count,
            invalid_records=invalid_count,
            status="SUCCESS" if imported_count > 0 else ("DUPLICATES_ONLY" if duplicate_count > 0 else "FAILED")
        )

        return {
            "batch_id": batch_id,
            "source_system": source,
            "filename": filename,
            "format_detected": format_detected,
            "total_records": total_records,
            "imported_records": imported_count,
            "duplicate_records": duplicate_count,
            "invalid_records": invalid_count,
            "validation_errors": validation_errors[:20], # Truncate error preview to top 20
            "imported_ids": imported_ids[:50]
        }

    def ingest_single_tms(self, payload_dict: Dict[str, Any]) -> Dict[str, Any]:
        canonical, err = TMSAdapter.transform_record(1, payload_dict)
        if err or not canonical:
            raise ValueError(f"TMS Validation Error: {err.message if err else 'Unknown'}")
        
        trains = self.repo.get_all_trains()
        all_reqs = self.repo.get_all_requests()
        eval_res = PrioritizationService.evaluate_request(canonical.to_dict(), train_schedules=trains, all_requests=all_reqs)
        
        canonical.criticality_score = eval_res["criticality_score"]
        canonical.urgency_score = eval_res["urgency_score"]
        canonical.impact_score = eval_res["impact_score"]
        canonical.priority_score = eval_res["priority_score"]
        canonical.urgency_level = round(eval_res["priority_score"] / 100.0, 4)
        canonical.priority_level = eval_res["priority_level"]
        canonical.safety_override = eval_res["safety_override"]
        canonical.override_reason = eval_res["override_reason"]
        canonical.scoring_method = eval_res["model_used"]
        canonical.scored_at = eval_res["scored_at"]
        canonical.metadata["explanation"] = eval_res["explanation"]

        inserted_id = self.repo.insert_maintenance_request(canonical)
        return {
            "status": "SUCCESS",
            "request_id": inserted_id,
            "priority_score": eval_res["priority_score"],
            "priority_level": eval_res["priority_level"],
            "criticality_score": eval_res["criticality_score"],
            "urgency_score": eval_res["urgency_score"],
            "impact_score": eval_res["impact_score"],
            "safety_override": eval_res["safety_override"],
            "explanation": eval_res["explanation"],
            "asset_id": canonical.asset_id,
            "corridor_id": canonical.corridor_id
        }

    def ingest_single_smms(self, payload_dict: Dict[str, Any]) -> Dict[str, Any]:
        canonical, err = SMMSAdapter.transform_record(1, payload_dict)
        if err or not canonical:
            raise ValueError(f"SMMS Validation Error: {err.message if err else 'Unknown'}")
        
        trains = self.repo.get_all_trains()
        all_reqs = self.repo.get_all_requests()
        eval_res = PrioritizationService.evaluate_request(canonical.to_dict(), train_schedules=trains, all_requests=all_reqs)

        canonical.criticality_score = eval_res["criticality_score"]
        canonical.urgency_score = eval_res["urgency_score"]
        canonical.impact_score = eval_res["impact_score"]
        canonical.priority_score = eval_res["priority_score"]
        canonical.urgency_level = round(eval_res["priority_score"] / 100.0, 4)
        canonical.priority_level = eval_res["priority_level"]
        canonical.safety_override = eval_res["safety_override"]
        canonical.override_reason = eval_res["override_reason"]
        canonical.scoring_method = eval_res["model_used"]
        canonical.scored_at = eval_res["scored_at"]
        canonical.metadata["explanation"] = eval_res["explanation"]

        inserted_id = self.repo.insert_maintenance_request(canonical)
        return {
            "status": "SUCCESS",
            "request_id": inserted_id,
            "priority_score": eval_res["priority_score"],
            "priority_level": eval_res["priority_level"],
            "criticality_score": eval_res["criticality_score"],
            "urgency_score": eval_res["urgency_score"],
            "impact_score": eval_res["impact_score"],
            "safety_override": eval_res["safety_override"],
            "explanation": eval_res["explanation"],
            "asset_id": canonical.asset_id,
            "corridor_id": canonical.corridor_id
        }

    def ingest_single_tdms(self, payload_dict: Dict[str, Any]) -> Dict[str, Any]:
        canonical, err = TDMSAdapter.transform_record(1, payload_dict)
        if err or not canonical:
            raise ValueError(f"TDMS Validation Error: {err.message if err else 'Unknown'}")
        
        trains = self.repo.get_all_trains()
        all_reqs = self.repo.get_all_requests()
        eval_res = PrioritizationService.evaluate_request(canonical.to_dict(), train_schedules=trains, all_requests=all_reqs)

        canonical.criticality_score = eval_res["criticality_score"]
        canonical.urgency_score = eval_res["urgency_score"]
        canonical.impact_score = eval_res["impact_score"]
        canonical.priority_score = eval_res["priority_score"]
        canonical.urgency_level = round(eval_res["priority_score"] / 100.0, 4)
        canonical.priority_level = eval_res["priority_level"]
        canonical.safety_override = eval_res["safety_override"]
        canonical.override_reason = eval_res["override_reason"]
        canonical.scoring_method = eval_res["model_used"]
        canonical.scored_at = eval_res["scored_at"]
        canonical.metadata["explanation"] = eval_res["explanation"]

        inserted_id = self.repo.insert_maintenance_request(canonical)
        return {
            "status": "SUCCESS",
            "request_id": inserted_id,
            "priority_score": eval_res["priority_score"],
            "priority_level": eval_res["priority_level"],
            "criticality_score": eval_res["criticality_score"],
            "urgency_score": eval_res["urgency_score"],
            "impact_score": eval_res["impact_score"],
            "safety_override": eval_res["safety_override"],
            "explanation": eval_res["explanation"],
            "asset_id": canonical.asset_id,
            "corridor_id": canonical.corridor_id
        }

    def ingest_single_coa(self, payload_dict: Dict[str, Any]) -> Dict[str, Any]:
        canonical, err = COAAdapter.transform_record(1, payload_dict)
        if err or not canonical:
            raise ValueError(f"COA Validation Error: {err.message if err else 'Unknown'}")

        inserted_id = self.repo.insert_train_schedule(canonical)
        return {
            "status": "SUCCESS",
            "train_id": inserted_id,
            "train_number": canonical.train_number,
            "corridor_id": canonical.corridor_id
        }
