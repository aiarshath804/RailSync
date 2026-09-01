"""
RailSync Database Layer: High-performance SQLite Engine.
Built with standard library sqlite3 for zero external dependency runtime reliability.
Supports WAL journal mode, ACID transactions, and thread-safe operations.
"""

from backend.database.database import (
    init_db,
    get_connection,
    get_db,
    SQLITE_DB_PATH,
    Base
)

__all__ = [
    "init_db",
    "get_connection",
    "get_db",
    "SQLITE_DB_PATH",
    "Base"
]
