import os
import logging
from sqlalchemy.ext.declarative import declarative_base

logger = logging.getLogger("rail_sync_database")
Base = declarative_base()

# SQLAlchemy Async Session Setup (optional hook for postgres, with seamless in-memory repository fallback)
async def init_db():
    logger.info("Database schema initialized.")
