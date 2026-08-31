"""
RailSync Database Layer: High-performance SQLite Engine.
Built with standard library sqlite3 for zero external dependency runtime reliability.
Supports WAL journal mode, ACID transactions, and thread-safe operations.
"""

import os
import sqlite3
import datetime
from typing import Optional

DB_DIR = os.path.dirname(os.path.abspath(__file__))
SQLITE_DB_PATH = os.path.join(DB_DIR, "railsync.db")

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(SQLITE_DB_PATH, timeout=20.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn

def init_db():
    """
    Creates all relational tables and seeds baseline assets & departments.
    """
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Departments Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        code TEXT UNIQUE NOT NULL
    );
    """)

    # 2. Corridor Assets Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS corridor_assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        asset_type TEXT NOT NULL,
        line_section TEXT NOT NULL,
        start_km REAL NOT NULL,
        end_km REAL NOT NULL,
        speed_limit_kmh INTEGER DEFAULT 110,
        status TEXT DEFAULT 'OPERATIONAL'
    );
    """)

    # 3. Import Batches Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS import_batches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id TEXT UNIQUE NOT NULL,
        source_system TEXT NOT NULL,
        filename TEXT,
        total_records INTEGER DEFAULT 0,
        imported_records INTEGER DEFAULT 0,
        duplicate_records INTEGER DEFAULT 0,
        invalid_records INTEGER DEFAULT 0,
        imported_at TEXT NOT NULL,
        status TEXT DEFAULT 'SUCCESS'
    );
    """)

    # 4. Maintenance Requests Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS maintenance_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_code TEXT,
        source_system TEXT NOT NULL DEFAULT 'TMS',
        department_id INTEGER NOT NULL DEFAULT 1,
        department_code TEXT NOT NULL DEFAULT 'TMS',
        asset_id TEXT NOT NULL,
        asset_type TEXT DEFAULT 'TRACK',
        corridor_id TEXT DEFAULT 'NDLS-HWH-01',
        section_id TEXT DEFAULT 'NDLS-HWH-01',
        location_start_km REAL DEFAULT 0.0,
        location_end_km REAL DEFAULT 5.0,
        work_type TEXT DEFAULT 'MAINTENANCE',
        defect_type TEXT DEFAULT 'DEFECT',
        requested_start_time TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        defect_severity INTEGER NOT NULL DEFAULT 3,
        urgency_level REAL DEFAULT 0.5,
        status TEXT NOT NULL DEFAULT 'PENDING',
        notes TEXT,
        crew_required INTEGER DEFAULT 4,
        machines_required TEXT,
        raw_source_reference TEXT,
        import_batch_id TEXT,
        imported_at TEXT,
        due_date TEXT,
        preferred_end TEXT,
        criticality_score REAL DEFAULT 0.5,
        urgency_score REAL DEFAULT 0.5,
        impact_score REAL DEFAULT 0.5,
        priority_score REAL DEFAULT 0.5,
        priority_level TEXT DEFAULT 'MEDIUM',
        safety_override INTEGER DEFAULT 0,
        override_reason TEXT,
        scoring_method TEXT DEFAULT 'deterministic_hybrid',
        scored_at TEXT,
        metadata_json TEXT,
        FOREIGN KEY (import_batch_id) REFERENCES import_batches(batch_id) ON DELETE CASCADE
    );
    """)

    # Ensure schema migrations for new columns
    cursor.execute("PRAGMA table_info(maintenance_requests);")
    columns = [row[1] for row in cursor.fetchall()]
    if "safety_override" not in columns:
        cursor.execute("ALTER TABLE maintenance_requests ADD COLUMN safety_override INTEGER DEFAULT 0;")
    if "override_reason" not in columns:
        cursor.execute("ALTER TABLE maintenance_requests ADD COLUMN override_reason TEXT;")
    if "scoring_method" not in columns:
        cursor.execute("ALTER TABLE maintenance_requests ADD COLUMN scoring_method TEXT DEFAULT 'deterministic_hybrid';")
    if "scored_at" not in columns:
        cursor.execute("ALTER TABLE maintenance_requests ADD COLUMN scored_at TEXT;")

    # 5. Train Schedules Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS train_schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        train_number TEXT NOT NULL,
        name TEXT NOT NULL,
        priority_class TEXT NOT NULL DEFAULT 'EXPRESS',
        corridor_id TEXT NOT NULL,
        section_id TEXT,
        arrival_window_start TEXT NOT NULL,
        departure_window_end TEXT NOT NULL,
        delay_minutes INTEGER DEFAULT 0,
        status TEXT DEFAULT 'RUNNING',
        traffic_density_rank INTEGER DEFAULT 3,
        import_batch_id TEXT,
        imported_at TEXT,
        FOREIGN KEY (import_batch_id) REFERENCES import_batches(batch_id) ON DELETE CASCADE
    );
    """)

    # 6. Optimized Blocks Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS optimized_blocks (
        id INTEGER PRIMARY KEY,
        corridor_id TEXT NOT NULL,
        bundled_request_ids TEXT NOT NULL,
        scheduled_start TEXT NOT NULL,
        scheduled_end TEXT NOT NULL,
        allocated_safety_buffer INTEGER DEFAULT 15,
        controller_approval_status TEXT DEFAULT 'PENDING',
        saved_block_hours REAL DEFAULT 0.0,
        bundled_departments TEXT,
        urgency_score REAL DEFAULT 0.5
    );
    """)

    # Seed Baseline Departments if empty
    cursor.execute("SELECT COUNT(*) FROM departments;")
    if cursor.fetchone()[0] == 0:
        cursor.executemany("""
        INSERT INTO departments (id, name, code) VALUES (?, ?, ?);
        """, [
            (1, "Track Management System", "TMS"),
            (2, "Signal & Telecommunication", "SMMS"),
            (3, "Traction Distribution (OHE)", "TDMS"),
            (4, "Control Office Application", "COA"),
        ])

    # Seed Baseline Assets if empty
    cursor.execute("SELECT COUNT(*) FROM corridor_assets;")
    if cursor.fetchone()[0] == 0:
        cursor.executemany("""
        INSERT INTO corridor_assets (id, asset_id, name, asset_type, line_section, start_km, end_km, speed_limit_kmh, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, [
            (1, "TRK-01", "Track Segment UP-1", "TRACK", "NDLS-HWH-01", 0.0, 15.0, 130, "OPERATIONAL"),
            (2, "TRK-02", "Track Segment DN-2", "TRACK", "NDLS-HWH-01", 15.0, 30.0, 110, "OPERATIONAL"),
            (3, "SIG-44", "Signal Post Block 12", "SIGNAL", "NDLS-HWH-01", 8.5, 8.6, 130, "OPERATIONAL"),
            (4, "OHE-09", "Catenary Tension Mast 5", "OHE", "NDLS-HWH-01", 22.4, 24.1, 110, "OPERATIONAL"),
            (5, "TRK-03", "Track Segment CNB-Loop", "TRACK", "NDLS-CNB-07", 310.0, 325.0, 120, "OPERATIONAL"),
            (6, "SIG-88", "Interlocking Point 102A", "SIGNAL", "NDLS-CNB-07", 312.4, 312.6, 120, "OPERATIONAL"),
            (7, "OHE-22", "Substation Feeder Mast 8", "OHE", "NDLS-CNB-07", 311.0, 315.0, 120, "OPERATIONAL"),
            (8, "TRK-04", "Track Segment MGS-Trunk", "TRACK", "CNB-MGS-01", 448.0, 460.0, 120, "OPERATIONAL"),
            (9, "SIG-92", "Axle Counter Zone 4", "SIGNAL", "CNB-MGS-01", 450.0, 452.0, 120, "OPERATIONAL"),
            (10, "OHE-35", "Traction Portal 14", "OHE", "CNB-MGS-01", 450.0, 455.0, 120, "OPERATIONAL"),
        ])

    # Seed Baseline Train Schedules if empty
    cursor.execute("SELECT COUNT(*) FROM train_schedules;")
    if cursor.fetchone()[0] == 0:
        now = datetime.datetime.now()
        cursor.executemany("""
        INSERT INTO train_schedules (id, train_number, name, priority_class, corridor_id, section_id, arrival_window_start, departure_window_end, delay_minutes, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, [
            (1, "12301", "Howrah Rajdhani Express", "RAJDHANI", "NDLS-HWH-01", "NDLS-HWH-01", (now + datetime.timedelta(hours=2)).isoformat(), (now + datetime.timedelta(hours=3, minutes=30)).isoformat(), 0, "RUNNING"),
            (2, "12260", "Sealdah Duronto Express", "EXPRESS", "NDLS-HWH-01", "NDLS-HWH-01", (now + datetime.timedelta(hours=4)).isoformat(), (now + datetime.timedelta(hours=5, minutes=15)).isoformat(), 0, "RUNNING"),
            (3, "FRT-991", "Coal Rake Special", "FREIGHT", "NDLS-HWH-01", "NDLS-HWH-01", (now + datetime.timedelta(hours=6)).isoformat(), (now + datetime.timedelta(hours=8)).isoformat(), 30, "DELAYED +30m")
        ])

    conn.commit()
    conn.close()
    print("[DB] Initialized SQLite schema & seeded baseline railway assets.")

# Fallback Base class for compatibility if any code references Base
class Base:
    metadata = None

def get_db():
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()
