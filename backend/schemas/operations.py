from typing import Generic, TypeVar, Optional, Any
from pydantic import BaseModel

T = TypeVar("T")

class APIResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = "Operation successful"
    data: Optional[T] = None
    detail: Optional[Any] = None

class AIInsightResponse(BaseModel):
    analysis: str
    recommends: list[str] = []
    source: str = "gemini"  # "gemini" | "computed_audit_fallback"
