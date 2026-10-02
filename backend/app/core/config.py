"""
GarbaCholi.Express - Core Configuration
"""
from typing import List, Dict, Any
from pydantic import BaseModel

class DarkStoreLocation(BaseModel):
    id: str
    name: str
    city: str
    lat: float
    lng: float
    address: str
    active_riders: int = 5
    avg_pick_time_sec: int = 75

class Settings:
    PROJECT_NAME: str = "GarbaCholi.Express Antigravity Agent Core"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    NODE_GATEWAY_URL: str = "http://localhost:4000"
    NODE_WS_URL: str = "ws://localhost:4000"

    # Supported Event Mesh Channels
    CHANNELS: List[str] = ["ALL", "CUSTOMER", "RIDER", "DARKSTORE", "ADMIN", "AGENTS"]

    # Dark Store Hubs
    DARK_STORES: List[DarkStoreLocation] = [
        DarkStoreLocation(
            id="store_ahm_01",
            name="Navrangpura Dark Store #01",
            city="Ahmedabad",
            lat=23.0373,
            lng=72.5532,
            address="Near GMDC Ground, Navrangpura, Ahmedabad",
            active_riders=8,
            avg_pick_time_sec=65
        ),
        DarkStoreLocation(
            id="store_vad_01",
            name="Alkapuri Dark Store #02",
            city="Vadodara",
            lat=22.3106,
            lng=73.1812,
            address="Near United Way Garba, Alkapuri, Vadodara",
            active_riders=6,
            avg_pick_time_sec=70
        ),
        DarkStoreLocation(
            id="store_sur_01",
            name="Athwa Lines Dark Store #03",
            city="Surat",
            lat=21.1702,
            lng=72.8311,
            address="Ring Road, Athwa Lines, Surat",
            active_riders=7,
            avg_pick_time_sec=68
        ),
        DarkStoreLocation(
            id="store_blr_01",
            name="Indiranagar Dark Store #04",
            city="Bengaluru",
            lat=12.9784,
            lng=77.6408,
            address="100 Feet Rd, Indiranagar, Bengaluru",
            active_riders=10,
            avg_pick_time_sec=80
        )
    ]

    # Authentic Navratri Festive Venues for Surge Calculation
    FESTIVE_VENUES: List[Dict[str, Any]] = [
        {"name": "GMDC Garba Ground, Ahmedabad", "lat": 23.0450, "lng": 72.5410, "surge_weight": 1.6},
        {"name": "United Way Garba, Vadodara", "lat": 22.3250, "lng": 73.1750, "surge_weight": 1.7},
        {"name": "Law Garden Night Bazaar, Ahmedabad", "lat": 23.0230, "lng": 72.5570, "surge_weight": 1.4},
        {"name": "Indoor Stadium Garba Mahotsav, Surat", "lat": 21.1820, "lng": 72.8020, "surge_weight": 1.5}
    ]

    # Order State Machine Allowed Transitions
    VALID_STATE_TRANSITIONS: Dict[str, List[str]] = {
        "CREATED": ["PAID", "CANCELLED"],
        "PAID": ["STORE_ACCEPTED", "PICKING", "CANCELLED"],
        "STORE_ACCEPTED": ["PICKING", "CANCELLED"],
        "PICKING": ["PACKED", "CANCELLED"],
        "PACKED": ["RIDER_ASSIGNED", "RIDER_ARRIVED_STORE", "RIDER_PICKED_UP", "OUT_FOR_DELIVERY"],
        "RIDER_ASSIGNED": ["RIDER_ARRIVED_STORE", "RIDER_PICKED_UP", "CANCELLED"],
        "RIDER_ARRIVED_STORE": ["RIDER_PICKED_UP"],
        "RIDER_PICKED_UP": ["OUT_FOR_DELIVERY"],
        "OUT_FOR_DELIVERY": ["DELIVERED", "FAILED"],
        "DELIVERED": [],
        "CANCELLED": []
    }

settings = Settings()
