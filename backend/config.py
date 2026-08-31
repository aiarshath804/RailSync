import os
from typing import List
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "RailSync AI Gateway"
    VERSION: str = "4.2.0"
    API_V1_STR: str = "/api/v1"
    
    # Port Configuration
    FASTAPI_PORT: int = int(os.getenv("FASTAPI_PORT", "8000"))
    FASTAPI_HOST: str = os.getenv("FASTAPI_HOST", "0.0.0.0")
    
    # External API Keys & Database URLs
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql+asyncpg://railsync_user:railsync_secure_password@localhost:5432/railsync"
    )
    
    # CORS
    CORS_ORIGINS: List[str] = ["*"]
    
    # Store file fallback
    STORE_FILE_PATH: str = os.getenv("STORE_FILE_PATH", "rail_sync_store.json")

settings = Settings()
