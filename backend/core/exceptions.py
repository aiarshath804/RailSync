from typing import Any, Optional
from fastapi import HTTPException, status
from pydantic import BaseModel

class APIErrorResponse(BaseModel):
    success: bool = False
    message: str
    detail: Optional[Any] = None

class RailSyncException(HTTPException):
    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        detail: Optional[Any] = None
    ):
        super().__init__(status_code=status_code, detail=message)
        self.message = message
        self.technical_detail = detail

class EntityNotFoundException(RailSyncException):
    def __init__(self, entity_name: str, entity_id: Any):
        super().__init__(
            message=f"{entity_name} with identifier '{entity_id}' was not found.",
            status_code=status.HTTP_404_NOT_FOUND
        )

class ValidationException(RailSyncException):
    def __init__(self, message: str, detail: Optional[Any] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail
        )

class OptimizationException(RailSyncException):
    def __init__(self, message: str, detail: Optional[Any] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail
        )
