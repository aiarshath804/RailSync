"""
RailSync Data Pipeline: Source-Specific Adapters.
Dedicated transformers for TMS, SMMS, TDMS, and COA with zero third-party dependencies.
Handles field aliases, missing values, data cleaning, and canonical mapping.
"""

import datetime
from typing import Dict, Any, Tuple, Optional
from backend.pipeline.normalizer import (
    SeverityNormalizer,
    LocationNormalizer,
    DateTimeNormalizer,
    StringSanitizer,
)
from backend.pipeline.validator import (
    CanonicalMaintenanceRequest,
    CanonicalTrainSchedule,
    RowValidationError,
)


class BaseAdapter:
    @staticmethod
    def get_field_any(d: Dict[str, Any], keys: list, default=None):
        for k in keys:
            if k in d and d[k] is not None and str(d[k]).strip() != "":
                return d[k]
        return default


class TMSAdapter(BaseAdapter):
    """
    Transforms Track Management System (TMS) raw records:
    - Rail defects, weld fractures, track geometry, sleeper renewals, fastening issues.
    """
    @classmethod
    def transform_record(cls, row_idx: int, raw: Dict[str, Any], batch_id: Optional[str] = None) -> Tuple[Optional[CanonicalMaintenanceRequest], Optional[RowValidationError]]:
        track_code = cls.get_field_any(raw, ["track_code", "trackCode", "trackId", "asset_id", "assetId", "track_id", "TrackCode", "asset"])
        defect_id = cls.get_field_any(raw, ["defect_id", "defectId", "defect_code", "DefectId", "raw_source_reference", "id", "ticket_id"])
        
        if not track_code:
            return None, RowValidationError(row=row_idx, field="track_code", message="Missing required track code or asset ID", rejected_value=str(raw))
        
        track_code = StringSanitizer.sanitize(track_code).upper()
        defect_id = StringSanitizer.sanitize(defect_id or f"TMS-DEF-{row_idx:04d}")

        # Location & Corridor
        corridor_raw = cls.get_field_any(raw, ["corridor_id", "corridor", "line_section", "section", "corridorId"])
        corridor = LocationNormalizer.normalize_corridor(corridor_raw)

        loc_raw = cls.get_field_any(raw, ["location", "km_range", "km", "location_km"])
        s_km_raw = cls.get_field_any(raw, ["start_km", "location_start_km", "startKm", "from_km"])
        e_km_raw = cls.get_field_any(raw, ["end_km", "location_end_km", "endKm", "to_km"])
        start_km, end_km = LocationNormalizer.normalize_location_km(loc_raw, s_km_raw, e_km_raw)

        # Severity
        sev_raw = cls.get_field_any(raw, ["severity_rank", "severityRank", "severity", "Severity", "criticality", "rank"])
        severity = SeverityNormalizer.normalize_severity(sev_raw)

        # Duration
        dur_raw = cls.get_field_any(raw, ["required_repair_duration", "requiredRepairDuration", "duration_minutes", "duration", "durationMinutes", "est_duration"])
        try:
            duration = int(float(str(dur_raw or 60)))
            if duration < 15:
                duration = 15
        except (ValueError, TypeError):
            return None, RowValidationError(row=row_idx, field="required_repair_duration", message="Duration must be a valid positive integer", rejected_value=str(dur_raw))

        # Dates
        reported_raw = cls.get_field_any(raw, ["reported_at", "reportedAt", "detected_at", "report_date"])
        proposed_raw = cls.get_field_any(raw, ["proposed_date", "proposedDate", "requested_start_time", "target_date", "preferred_start"])
        
        reported_at = DateTimeNormalizer.normalize_datetime(reported_raw, default_offset_hours=0.0)
        preferred_start = DateTimeNormalizer.normalize_datetime(proposed_raw, default_offset_hours=2.0)
        due_date = preferred_start + datetime.timedelta(days=7 if severity < 4 else (1 if severity == 5 else 3))

        work_type = cls.get_field_any(raw, ["work_type", "workType", "defect_type", "defectType", "type"], "TRACK_REPAIR")
        notes = cls.get_field_any(raw, ["inspector_notes", "inspectorNotes", "description", "remarks", "notes"], "Routine track maintenance required")
        notes_sanitized = StringSanitizer.sanitize(notes)
        
        crew_raw = cls.get_field_any(raw, ["crew_required", "crew", "gang_size"], 6)
        try:
            crew = max(2, int(float(str(crew_raw))))
        except Exception:
            crew = 6

        machines = cls.get_field_any(raw, ["machines_required", "machinery", "equipment", "track_machine"], "UNIMAT / TAMPER")

        req = CanonicalMaintenanceRequest(
            request_id=f"REQ-TMS-{row_idx:04d}",
            source_system="TMS",
            department="TMS",
            department_id=1,
            department_code="TMS",
            asset_id=track_code,
            asset_type="TRACK",
            corridor_id=corridor,
            section_id=corridor,
            location_start_km=start_km,
            location_end_km=end_km,
            work_type=StringSanitizer.sanitize(work_type).upper(),
            defect_type=StringSanitizer.sanitize(defect_id),
            description=f"{defect_id}: {notes_sanitized}",
            severity=severity,
            reported_at=reported_at,
            due_date=due_date,
            estimated_duration_minutes=duration,
            preferred_start=preferred_start,
            preferred_end=preferred_start + datetime.timedelta(minutes=duration),
            crew_required=crew,
            machines_required=machines,
            status="PENDING",
            raw_source_reference=defect_id,
            import_batch_id=batch_id,
            imported_at=datetime.datetime.now(),
            notes=notes_sanitized,
            metadata={"origin": "TMS", "raw_track_code": track_code, "defect_id": defect_id}
        )
        val_err = req.validate(row_idx)
        if val_err:
            return None, val_err
        return req, None


class SMMSAdapter(BaseAdapter):
    """
    Transforms Signal Maintenance Management System (SMMS) raw records:
    - Signal post bulbs, point machine motors, interlocking, track circuits, axle counters.
    """
    @classmethod
    def transform_record(cls, row_idx: int, raw: Dict[str, Any], batch_id: Optional[str] = None) -> Tuple[Optional[CanonicalMaintenanceRequest], Optional[RowValidationError]]:
        signal_id = cls.get_field_any(raw, ["signal_post_id", "signalPostId", "signal_id", "asset_id", "assetId", "gear_id", "point_id"])
        if not signal_id:
            return None, RowValidationError(row=row_idx, field="signal_post_id", message="Missing signal post ID or asset ID", rejected_value=str(raw))

        signal_id = StringSanitizer.sanitize(signal_id).upper()
        fault_type = cls.get_field_any(raw, ["fault_type", "faultType", "defect_type", "defectType", "failure_mode", "description"], "SIGNAL_CIRCUIT_FAULT")
        
        # Location & Corridor
        corridor_raw = cls.get_field_any(raw, ["corridor_id", "corridor", "line_section", "section", "corridorId"])
        corridor = LocationNormalizer.normalize_corridor(corridor_raw)

        loc_raw = cls.get_field_any(raw, ["location", "km_range", "km"])
        s_km_raw = cls.get_field_any(raw, ["start_km", "location_start_km", "startKm"])
        e_km_raw = cls.get_field_any(raw, ["end_km", "location_end_km", "endKm"])
        start_km, end_km = LocationNormalizer.normalize_location_km(loc_raw, s_km_raw, e_km_raw)

        # Severity
        crit_flag = cls.get_field_any(raw, ["criticality_flag", "criticalityFlag", "criticality", "severity", "severity_rank"])
        severity = SeverityNormalizer.normalize_severity(crit_flag)

        # Duration
        repair_time = cls.get_field_any(raw, ["repair_time_est", "repairTimeEst", "duration_minutes", "duration", "durationMinutes"], 45)
        try:
            duration = int(float(str(repair_time)))
            if duration < 15:
                duration = 15
        except (ValueError, TypeError):
            return None, RowValidationError(row=row_idx, field="repair_time_est", message="Repair time must be a valid integer", rejected_value=str(repair_time))

        # Dates & Active hours
        target_raw = cls.get_field_any(raw, ["target_window_start", "targetWindowStart", "preferred_start", "reported_at"])
        preferred_start = DateTimeNormalizer.normalize_datetime(target_raw, default_offset_hours=1.5)
        
        hours_active = cls.get_field_any(raw, ["hours_since_detection", "hoursSinceDetection", "hours_active"], 2.0)
        try:
            hrs = float(hours_active)
        except Exception:
            hrs = 2.0

        defect_ref = cls.get_field_any(raw, ["defect_id", "ticket_id", "fault_id", "raw_source_reference"], f"SMMS-FLT-{row_idx:04d}")
        notes = f"Signal Fault: {fault_type}. Active for {hrs:.1f} hrs."
        
        req = CanonicalMaintenanceRequest(
            request_id=f"REQ-SMMS-{row_idx:04d}",
            source_system="SMMS",
            department="SMMS",
            department_id=2,
            department_code="SMMS",
            asset_id=signal_id,
            asset_type="SIGNAL",
            corridor_id=corridor,
            section_id=corridor,
            location_start_km=start_km,
            location_end_km=end_km,
            work_type=StringSanitizer.sanitize(fault_type).upper(),
            defect_type=StringSanitizer.sanitize(defect_ref),
            description=notes,
            severity=severity,
            reported_at=preferred_start - datetime.timedelta(hours=hrs),
            due_date=preferred_start + datetime.timedelta(days=2 if severity >= 4 else 5),
            estimated_duration_minutes=duration,
            preferred_start=preferred_start,
            preferred_end=preferred_start + datetime.timedelta(minutes=duration),
            crew_required=4,
            machines_required="SIGNAL_TEST_VAN",
            status="PENDING",
            raw_source_reference=defect_ref,
            import_batch_id=batch_id,
            imported_at=datetime.datetime.now(),
            notes=notes,
            metadata={"origin": "SMMS", "hours_since_detection": hrs, "fault_type": fault_type}
        )
        val_err = req.validate(row_idx)
        if val_err:
            return None, val_err
        return req, None


class TDMSAdapter(BaseAdapter):
    """
    Transforms Traction Distribution / OHE Management System (TDMS) raw records:
    - Catenary wire tension loss, contact wire wear, isolator testing, neutral section repair.
    """
    @classmethod
    def transform_record(cls, row_idx: int, raw: Dict[str, Any], batch_id: Optional[str] = None) -> Tuple[Optional[CanonicalMaintenanceRequest], Optional[RowValidationError]]:
        section_id = cls.get_field_any(raw, ["section_id", "sectionId", "asset_id", "assetId", "mast_id", "ohe_mast", "element_id"])
        if not section_id:
            return None, RowValidationError(row=row_idx, field="section_id", message="Missing OHE section or asset ID", rejected_value=str(raw))

        section_id = StringSanitizer.sanitize(section_id).upper()
        defect_type = cls.get_field_any(raw, ["ohe_defect_type", "oheDefectType", "defect_type", "defectType", "work_type"], "CATENARY_TENSION_ADJUSTMENT")
        
        # Location & Corridor
        corridor_raw = cls.get_field_any(raw, ["corridor_id", "corridor", "line_section", "section", "corridorId"])
        corridor = LocationNormalizer.normalize_corridor(corridor_raw)

        loc_raw = cls.get_field_any(raw, ["location", "km_range", "km"])
        s_km_raw = cls.get_field_any(raw, ["start_km", "location_start_km", "startKm"])
        e_km_raw = cls.get_field_any(raw, ["end_km", "location_end_km", "endKm"])
        start_km, end_km = LocationNormalizer.normalize_location_km(loc_raw, s_km_raw, e_km_raw)

        # Severity from tension drop or explicit rank
        tension_raw = cls.get_field_any(raw, ["tension_drop_percentage", "tensionDropPercentage", "tension_drop", "tensionDrop"])
        if tension_raw is not None:
            severity = SeverityNormalizer.normalize_tdms_tension_drop(tension_raw)
        else:
            sev_raw = cls.get_field_any(raw, ["severity", "severity_rank", "criticality"], 3)
            severity = SeverityNormalizer.normalize_severity(sev_raw)

        # Duration
        dur_raw = cls.get_field_any(raw, ["duration_needed", "durationNeeded", "duration_minutes", "duration", "durationMinutes"], 90)
        try:
            duration = int(float(str(dur_raw)))
            if duration < 15:
                duration = 15
        except (ValueError, TypeError):
            return None, RowValidationError(row=row_idx, field="duration_needed", message="Duration needed must be a valid positive integer", rejected_value=str(dur_raw))

        # Dates
        start_raw = cls.get_field_any(raw, ["earliest_allowed_start", "earliestAllowedStart", "preferred_start", "proposed_date"])
        preferred_start = DateTimeNormalizer.normalize_datetime(start_raw, default_offset_hours=3.0)

        defect_ref = cls.get_field_any(raw, ["defect_id", "ticket_id", "raw_source_reference"], f"TDMS-OHE-{row_idx:04d}")
        notes = f"OHE Maintenance: {defect_type}. Tension Drop: {tension_raw or 'N/A'}"
        
        req = CanonicalMaintenanceRequest(
            request_id=f"REQ-TDMS-{row_idx:04d}",
            source_system="TDMS",
            department="TDMS",
            department_id=3,
            department_code="TDMS",
            asset_id=section_id,
            asset_type="OHE",
            corridor_id=corridor,
            section_id=corridor,
            location_start_km=start_km,
            location_end_km=end_km,
            work_type=StringSanitizer.sanitize(defect_type).upper(),
            defect_type=StringSanitizer.sanitize(defect_ref),
            description=notes,
            severity=severity,
            reported_at=preferred_start - datetime.timedelta(hours=4),
            due_date=preferred_start + datetime.timedelta(days=3 if severity >= 4 else 7),
            estimated_duration_minutes=duration,
            preferred_start=preferred_start,
            preferred_end=preferred_start + datetime.timedelta(minutes=duration),
            crew_required=5,
            machines_required="TOWER_WAGON_OHE",
            status="PENDING",
            raw_source_reference=defect_ref,
            import_batch_id=batch_id,
            imported_at=datetime.datetime.now(),
            notes=notes,
            metadata={"origin": "TDMS", "tension_drop": str(tension_raw), "defect_type": defect_type}
        )
        val_err = req.validate(row_idx)
        if val_err:
            return None, val_err
        return req, None


class COAAdapter(BaseAdapter):
    """
    Transforms Control Office Application (COA) raw timetable & traffic records:
    - Train ID, train name, priority class, corridor, arrival/departure schedules, delays.
    """
    @classmethod
    def transform_record(cls, row_idx: int, raw: Dict[str, Any], batch_id: Optional[str] = None) -> Tuple[Optional[CanonicalTrainSchedule], Optional[RowValidationError]]:
        train_no = cls.get_field_any(raw, ["train_no", "trainNo", "train_number", "trainNumber", "train_id", "trainId", "TrainNo"])
        if not train_no:
            return None, RowValidationError(row=row_idx, field="train_no", message="Missing train number or ID", rejected_value=str(raw))

        train_no = StringSanitizer.sanitize(train_no).upper()
        train_name = cls.get_field_any(raw, ["train_name", "trainName", "name", "TrainName"], f"Train {train_no}")
        train_name = StringSanitizer.sanitize(train_name)

        priority_raw = cls.get_field_any(raw, ["priority", "priority_class", "priorityClass", "train_type", "type"], "EXPRESS")
        priority = StringSanitizer.sanitize(priority_raw).upper()
        if "RAJDHANI" in priority or "VANDE" in priority or "SHATABDI" in priority:
            priority = "RAJDHANI"
        elif "FREIGHT" in priority or "GOODS" in priority:
            priority = "FREIGHT"
        else:
            priority = "EXPRESS"

        corridor_raw = cls.get_field_any(raw, ["corridor_id", "corridorId", "corridor", "line_section", "section"], "MAS-TRL-05")
        corridor = LocationNormalizer.normalize_corridor(corridor_raw)

        # Dates
        arr_raw = cls.get_field_any(raw, ["scheduled_arrival", "scheduledArrival", "arrival_window_start", "arrival_time", "arrival"])
        dep_raw = cls.get_field_any(raw, ["scheduled_departure", "scheduledDeparture", "departure_window_end", "departure_time", "departure"])

        arr_time = DateTimeNormalizer.normalize_datetime(arr_raw, default_offset_hours=2.0)
        dep_time = DateTimeNormalizer.normalize_datetime(dep_raw, default_offset_hours=3.5)

        if dep_time <= arr_time:
            dep_time = arr_time + datetime.timedelta(minutes=90)

        delay_raw = cls.get_field_any(raw, ["delay_minutes", "delayMinutes", "delay", "late_minutes"], 0)
        try:
            delay = max(0, int(float(str(delay_raw))))
        except Exception:
            delay = 0

        status = "RUNNING" if delay <= 0 else f"DELAYED +{delay}m"

        schedule = CanonicalTrainSchedule(
            train_number=train_no,
            name=train_name,
            priority_class=priority,
            corridor_id=corridor,
            section_id=corridor,
            arrival_window_start=arr_time,
            departure_window_end=dep_time,
            delay_minutes=delay,
            status=status,
            traffic_density_rank=4 if priority == "RAJDHANI" else (3 if priority == "EXPRESS" else 2),
            import_batch_id=batch_id,
            imported_at=datetime.datetime.now()
        )
        val_err = schedule.validate(row_idx)
        if val_err:
            return None, val_err
        return schedule, None
