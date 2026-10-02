"""
GarbaCholi.Express - Order Transition Schemas (Pydantic v2)
"""
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field

class OrderStateTransitionRequest(BaseModel):
    order_id: str
    current_status: str
    target_status: str
    author_role: str = Field(default="SYSTEM", description="CUSTOMER, RIDER, DARKSTORE_PACKER, ADMIN, AGENT")
    metadata: Optional[Dict[str, Any]] = None

class OrderStateTransitionResponse(BaseModel):
    success: bool
    order_id: str
    from_status: str
    to_status: str
    state_hash: Optional[str] = None
    previous_hash: Optional[str] = None
    block_index: Optional[int] = None
    timestamp_ms: Optional[int] = None
    message: str

class ChainVerificationResponse(BaseModel):
    order_id: str
    is_valid: bool
    blocks_count: int
    chain: List[Dict[str, Any]]
    verification_message: str
