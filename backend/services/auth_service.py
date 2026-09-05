"""
RailSync Enterprise Role-Based Access Control (RBAC) & Authentication Service.
Handles zero-dependency cryptographic password hashing, user session tokens,
authoritative role-permission mapping, and demo account seeding.
"""

import os
import hashlib
import secrets
import datetime
import logging
from typing import Dict, Any, List, Optional
from backend.database import get_connection

logger = logging.getLogger("rail_sync_auth")

# Authoritative Centralized Role-Based Permissions
ROLE_PERMISSIONS: Dict[str, List[str]] = {
    "ADMINISTRATOR": [
        "VIEW_DASHBOARD",
        "VIEW_CORRIDOR",
        "VIEW_ALL_REQUESTS",
        "CREATE_REQUEST",
        "EDIT_OWN_DEPARTMENT_REQUEST",
        "DELETE_REQUEST",
        "VIEW_PRIORITIZATION",
        "RECALCULATE_PRIORITIES",
        "GENERATE_PLAN",
        "APPROVE_PLAN",
        "REJECT_PLAN",
        "EMERGENCY_REPLAN",
        "VIEW_SAFETY",
        "RUN_SAFETY_SCENARIOS",
        "MANUAL_SAFETY_OVERRIDE",
        "VIEW_AUDIT_LOGS",
        "VIEW_ML_INTELLIGENCE",
        "RUN_ML_PREDICTION",
        "VIEW_ML_MODEL_DIAGNOSTICS",
        "VIEW_SCHEDULES",
        "MODIFY_SCHEDULE",
        "RUN_SIMULATION",
        "VIEW_LIVE_OPERATIONS",
        "CONTROL_LIVE_DATA",
        "VIEW_DISPATCH_ADVISORY",
        "ACKNOWLEDGE_DISPATCH_ADVISORY",
        "APPLY_DISPATCH_RECOMMENDATION",
        "VIEW_ANALYTICS",
        "MANAGE_DATA_PIPELINE",
        "INGEST_TMS_DATA",
        "INGEST_SMMS_DATA",
        "INGEST_TDMS_DATA",
        "INGEST_COA_DATA",
        "MANAGE_SETTINGS",
        "MANAGE_USERS",
    ],
    "ENGINEERING": [
        "VIEW_DASHBOARD",
        "VIEW_CORRIDOR",
        "CREATE_REQUEST",
        "EDIT_OWN_DEPARTMENT_REQUEST",
        "VIEW_PRIORITIZATION",
        "GENERATE_PLAN",
        "VIEW_SAFETY",
        "VIEW_SCHEDULES",
        "RUN_SIMULATION",
        "VIEW_ANALYTICS",
        "INGEST_TMS_DATA",
    ],
    "TRACTION": [
        "VIEW_DASHBOARD",
        "VIEW_CORRIDOR",
        "CREATE_REQUEST",
        "EDIT_OWN_DEPARTMENT_REQUEST",
        "VIEW_PRIORITIZATION",
        "GENERATE_PLAN",
        "VIEW_SAFETY",
        "VIEW_SCHEDULES",
        "RUN_SIMULATION",
        "VIEW_ANALYTICS",
        "INGEST_TDMS_DATA",
    ],
    "SIGNAL_TELECOM": [
        "VIEW_DASHBOARD",
        "VIEW_CORRIDOR",
        "CREATE_REQUEST",
        "EDIT_OWN_DEPARTMENT_REQUEST",
        "VIEW_PRIORITIZATION",
        "GENERATE_PLAN",
        "VIEW_SAFETY",
        "VIEW_SCHEDULES",
        "RUN_SIMULATION",
        "VIEW_ANALYTICS",
        "INGEST_SMMS_DATA",
    ],
    "OPERATIONS_CONTROLLER": [
        "VIEW_DASHBOARD",
        "VIEW_CORRIDOR",
        "VIEW_ALL_REQUESTS",
        "VIEW_PRIORITIZATION",
        "APPROVE_PLAN",
        "REJECT_PLAN",
        "EMERGENCY_REPLAN",
        "VIEW_SAFETY",
        "VIEW_AUDIT_LOGS",
        "VIEW_ML_INTELLIGENCE",
        "RUN_ML_PREDICTION",
        "VIEW_SCHEDULES",
        "MODIFY_SCHEDULE",
        "VIEW_LIVE_OPERATIONS",
        "CONTROL_LIVE_DATA",
        "VIEW_DISPATCH_ADVISORY",
        "ACKNOWLEDGE_DISPATCH_ADVISORY",
        "APPLY_DISPATCH_RECOMMENDATION",
        "VIEW_ANALYTICS",
    ],
}

# 5 Authoritative Demo User Profiles for Indian Railways Prototype Demonstration
DEMO_ACCOUNTS = [
    {
        "user_id": "USR-ADMIN-01",
        "email": "admin@railsync.gov.in",
        "password": "Admin@RailSync2026",
        "name": "Shri R. Subramanian",
        "role": "ADMINISTRATOR",
        "department": "ALL",
        "department_name": "Ministry / Railway Board Executive Console",
        "designation": "Chief Executive Director (IT & Operations)",
        "console_id": "SEC-ADMIN-01",
        "avatar_init": "RS",
        "badge_level": "Tier 1 Apex Administrator",
        "shift": "24/7 Operations Oversight",
        "color": "amber",
        "description": "Full system control, safety overrides with audit, user administration, ML intelligence diagnostics, cross-department scheduling & CP-SAT optimization.",
    },
    {
        "user_id": "USR-ENG-02",
        "email": "track.engg@railsync.gov.in",
        "password": "Track@RailSync2026",
        "name": "Er. K. Natarajan",
        "role": "ENGINEERING",
        "department": "TMS",
        "department_name": "Civil Engineering & Track Management (TMS)",
        "designation": "Sr. Divisional Engineer (Track / Civil)",
        "console_id": "MAS-TRK-02",
        "avatar_init": "KN",
        "badge_level": "Sr. Track Maintenance Authority",
        "shift": "Shift A (06:00 - 14:00)",
        "color": "emerald",
        "description": "Track maintenance defects, ultrasonic rail testing records, TMS data ingestion, What-If simulation, and proposed maintenance window requests.",
    },
    {
        "user_id": "USR-TRD-03",
        "email": "traction.ohe@railsync.gov.in",
        "password": "Traction@RailSync2026",
        "name": "Er. S. Venkataraman",
        "role": "TRACTION",
        "department": "TDMS",
        "department_name": "Traction Distribution & 25kV OHE (TDMS)",
        "designation": "Sr. Divisional Electrical Engineer (TRD)",
        "console_id": "MAS-TRD-03",
        "avatar_init": "SV",
        "badge_level": "Sr. Traction Power Specialist",
        "shift": "Shift B (14:00 - 22:00)",
        "color": "cyan",
        "description": "25kV AC catenary maintenance, substation feeder power blocks, TDMS data ingestion, and electrical isolation safety guardrail compliance.",
    },
    {
        "user_id": "USR-SNT-04",
        "email": "signal.telecom@railsync.gov.in",
        "password": "Signal@RailSync2026",
        "name": "Er. M. Soundararajan",
        "role": "SIGNAL_TELECOM",
        "department": "SMMS",
        "department_name": "Signal & Telecommunication Engineering (SMMS)",
        "designation": "Sr. Divisional Signal & Telecom Engineer",
        "console_id": "MAS-SNT-04",
        "avatar_init": "MS",
        "badge_level": "Sr. Interlocking Safety Engineer",
        "shift": "Shift A (06:00 - 14:00)",
        "color": "indigo",
        "description": "Point machine maintenance, track circuit telemetry, route relay interlocking, SMMS ingestion, and signal conflict validation.",
    },
    {
        "user_id": "USR-OPS-05",
        "email": "ops.controller@railsync.gov.in",
        "password": "Ops@RailSync2026",
        "name": "P. Vijayaraghavan",
        "role": "OPERATIONS_CONTROLLER",
        "department": "OPERATIONS",
        "department_name": "Central Traffic Control (Control Office)",
        "designation": "Chief Controller (Central Traffic Control / MAS)",
        "console_id": "MAS-SR-01",
        "avatar_init": "PV",
        "badge_level": "Tier 1 Master Dispatcher",
        "shift": "Shift B (14:00 - 22:00)",
        "color": "rose",
        "description": "Real-time corridor train movement, Live Operations, final block approval/rejection, emergency replanning, and Dispatch Advisory application.",
    },
]


def _hash_password(password: str, salt: str) -> str:
    """Generates PBKDF2-HMAC-SHA256 hex digest."""
    return hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100000
    ).hex()


class AuthService:
    def __init__(self):
        self._ensure_schema_and_seed()

    def _ensure_schema_and_seed(self):
        """Ensures users and sessions tables exist and seeds the 5 demo accounts."""
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                password_salt TEXT NOT NULL,
                name TEXT NOT NULL,
                role TEXT NOT NULL,
                department TEXT NOT NULL,
                department_name TEXT,
                designation TEXT NOT NULL,
                console_id TEXT NOT NULL,
                avatar_init TEXT NOT NULL,
                badge_level TEXT NOT NULL,
                shift TEXT,
                is_active INTEGER DEFAULT 1,
                created_at TEXT NOT NULL
            );
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_sessions (
                session_token TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                ip_address TEXT,
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
            );
            """)

            # Seed demo users if not present
            for account in DEMO_ACCOUNTS:
                cursor.execute("SELECT user_id FROM users WHERE user_id = ? OR email = ?;", (account["user_id"], account["email"].lower()))
                row = cursor.fetchone()
                salt = secrets.token_hex(16)
                p_hash = _hash_password(account["password"], salt)
                now_str = datetime.datetime.now().isoformat()

                if not row:
                    cursor.execute("""
                    INSERT INTO users (
                        user_id, email, password_hash, password_salt, name, role,
                        department, department_name, designation, console_id,
                        avatar_init, badge_level, shift, is_active, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?);
                    """, (
                        account["user_id"],
                        account["email"].lower(),
                        p_hash,
                        salt,
                        account["name"],
                        account["role"],
                        account["department"],
                        account["department_name"],
                        account["designation"],
                        account["console_id"],
                        account["avatar_init"],
                        account["badge_level"],
                        account["shift"],
                        now_str
                    ))
                else:
                    # Update password hash and metadata to keep credentials authoritative
                    cursor.execute("""
                    UPDATE users SET
                        password_hash = ?,
                        password_salt = ?,
                        name = ?,
                        role = ?,
                        department = ?,
                        department_name = ?,
                        designation = ?,
                        console_id = ?,
                        avatar_init = ?,
                        badge_level = ?,
                        shift = ?
                    WHERE email = ?;
                    """, (
                        p_hash,
                        salt,
                        account["name"],
                        account["role"],
                        account["department"],
                        account["department_name"],
                        account["designation"],
                        account["console_id"],
                        account["avatar_init"],
                        account["badge_level"],
                        account["shift"],
                        account["email"].lower()
                    ))

            conn.commit()
        except Exception as e:
            logger.error(f"[AuthService] Error initializing schema/seed: {e}")
        finally:
            conn.close()

    def get_demo_accounts(self) -> List[Dict[str, Any]]:
        """Returns demo accounts for the login UI autofill."""
        return [
            {
                "role": acc["role"],
                "role_label": acc["role"].replace("_", " ").title(),
                "name": acc["name"],
                "email": acc["email"],
                "password": acc["password"],
                "department": acc["department"],
                "department_name": acc["department_name"],
                "designation": acc["designation"],
                "badge_level": acc["badge_level"],
                "console_id": acc["console_id"],
                "avatar_init": acc["avatar_init"],
                "color": acc["color"],
                "description": acc["description"],
            }
            for acc in DEMO_ACCOUNTS
        ]

    def authenticate(self, email: str, password: str, ip_address: str = "127.0.0.1") -> Optional[Dict[str, Any]]:
        """Validates credentials, creates a new session, and returns user profile + token."""
        if not email or not password:
            return None

        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE email = ? AND is_active = 1;", (email.strip().lower(),))
            user_row = cursor.fetchone()
            if not user_row:
                return None

            user_dict = dict(user_row)
            computed_hash = _hash_password(password, user_dict["password_salt"])
            if computed_hash != user_dict["password_hash"]:
                return None

            # Create session
            session_token = f"RS-SESS-{secrets.token_hex(24)}"
            now = datetime.datetime.now()
            expires_at = (now + datetime.timedelta(days=7)).isoformat()

            cursor.execute("""
            INSERT INTO user_sessions (session_token, user_id, created_at, expires_at, ip_address)
            VALUES (?, ?, ?, ?, ?);
            """, (session_token, user_dict["user_id"], now.isoformat(), expires_at, ip_address))
            conn.commit()

            role = user_dict["role"]
            permissions = ROLE_PERMISSIONS.get(role, [])

            return {
                "session_token": session_token,
                "user": {
                    "user_id": user_dict["user_id"],
                    "email": user_dict["email"],
                    "name": user_dict["name"],
                    "role": role,
                    "department": user_dict["department"],
                    "department_name": user_dict.get("department_name") or user_dict["department"],
                    "designation": user_dict["designation"],
                    "console_id": user_dict["console_id"],
                    "avatar_init": user_dict["avatar_init"],
                    "badge_level": user_dict["badge_level"],
                    "shift": user_dict.get("shift"),
                    "permissions": permissions,
                },
                "expires_at": expires_at
            }
        finally:
            conn.close()

    def get_user_from_token(self, session_token: str) -> Optional[Dict[str, Any]]:
        """Resolves authenticated user from active session token."""
        if not session_token:
            return None

        clean_token = session_token.replace("Bearer ", "").strip()
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT s.expires_at, u.*
            FROM user_sessions s
            JOIN users u ON s.user_id = u.user_id
            WHERE s.session_token = ? AND u.is_active = 1;
            """, (clean_token,))
            row = cursor.fetchone()
            if not row:
                return None

            user_dict = dict(row)
            expires_at = datetime.datetime.fromisoformat(user_dict["expires_at"])
            if datetime.datetime.now() > expires_at:
                # Expired session -> clean up
                cursor.execute("DELETE FROM user_sessions WHERE session_token = ?;", (clean_token,))
                conn.commit()
                return None

            role = user_dict["role"]
            permissions = ROLE_PERMISSIONS.get(role, [])

            return {
                "user_id": user_dict["user_id"],
                "email": user_dict["email"],
                "name": user_dict["name"],
                "role": role,
                "department": user_dict["department"],
                "department_name": user_dict.get("department_name") or user_dict["department"],
                "designation": user_dict["designation"],
                "console_id": user_dict["console_id"],
                "avatar_init": user_dict["avatar_init"],
                "badge_level": user_dict["badge_level"],
                "shift": user_dict.get("shift"),
                "permissions": permissions,
            }
        finally:
            conn.close()

    def logout(self, session_token: str) -> bool:
        """Invalidates user session token."""
        if not session_token:
            return True
        clean_token = session_token.replace("Bearer ", "").strip()
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM user_sessions WHERE session_token = ?;", (clean_token,))
            conn.commit()
            return True
        finally:
            conn.close()

    def get_all_users(self) -> List[Dict[str, Any]]:
        """Returns list of all active users (for Administrator User Management)."""
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT user_id, email, name, role, department, department_name, designation, console_id, avatar_init, badge_level, shift, is_active, created_at FROM users ORDER BY id ASC;")
            rows = cursor.fetchall()
            return [
                {
                    **dict(r),
                    "permissions": ROLE_PERMISSIONS.get(r["role"], [])
                }
                for r in rows
            ]
        finally:
            conn.close()

    @staticmethod
    def has_permission(user: Optional[Dict[str, Any]], permission: str) -> bool:
        """Central check: checks if user has permission."""
        if not user:
            return False
        role = user.get("role")
        if role == "ADMINISTRATOR":
            return True
        permissions = user.get("permissions") or ROLE_PERMISSIONS.get(role, [])
        return permission in permissions

    @staticmethod
    def can_access_department(user: Optional[Dict[str, Any]], dept_code: str) -> bool:
        """Checks if user can access / modify data for a specific department."""
        if not user:
            return False
        role = user.get("role")
        if role in ["ADMINISTRATOR", "OPERATIONS_CONTROLLER"]:
            return True
        user_dept = user.get("department", "").upper()
        target_dept = dept_code.upper()
        if user_dept == target_dept:
            return True
        # Map department aliases
        dept_aliases = {
            "ENGINEERING": "TMS",
            "TRACTION": "TDMS",
            "SIGNAL_TELECOM": "SMMS",
        }
        return dept_aliases.get(role) == target_dept


auth_service = AuthService()
