"""
GarbaCholi.Express - Agent Request & Decision Schemas (Pydantic v2)
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

# ----------------- Dispatch Agent Schemas -----------------
class DispatchRequest(BaseModel):
    order_id: str
    store_id: str
    customer_lat: float
    customer_lng: float
    package_weight_kg: float = 2.5
    is_fragile_mirrorwork: bool = True
    priority: str = "URGENT_10MIN"

class DispatchDecision(BaseModel):
    order_id: str
    assigned_rider_id: str
    rider_name: str
    vehicle_type: str
    distance_km: float
    battery_percent: int
    estimated_eta_mins: float
    dispatch_timestamp: int
    rationale: str

# ----------------- Surge Optimizer Schemas -----------------
class SurgeRequest(BaseModel):
    store_id: str
    venue_name: Optional[str] = None
    concurrent_checkouts: int = Field(default=12, ge=0)
    weather_condition: str = "CLEAR"
    hour_of_day: int = Field(default=21, ge=0, le=23)

class SurgeDecision(BaseModel):
    store_id: str
    venue_name: str
    surge_multiplier: float
    tier: str
    rationale: str
    calculated_at: str

# ----------------- Warehouse Route Schemas -----------------
class PickItem(BaseModel):
    sku: str
    name: str
    category: str
    quantity: int = 1

class WarehouseRouteRequest(BaseModel):
    order_id: str
    store_id: str = "store_ahm_01"
    items: List[PickItem]

class RouteStep(BaseModel):
    step_number: int
    rack_id: str
    bin_code: str
    sku: str
    name: str
    action: str
    est_duration_sec: int

class WarehouseRouteDecision(BaseModel):
    order_id: str
    store_id: str
    total_steps: int
    estimated_pick_time_sec: int
    within_target_sla: bool
    path: List[RouteStep]
    optimization_strategy: str

# ----------------- WebSocket Event Frame Schemas -----------------
class EventMeshBroadcast(BaseModel):
    channel: str = Field(default="ALL", description="Target channel: ALL, CUSTOMER, RIDER, DARKSTORE, ADMIN, AGENTS")
    event_type: str
    payload: Dict[str, Any]
    source: str = "FASTAPI_ANTIGRAVITY"
