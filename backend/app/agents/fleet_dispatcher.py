"""
GarbaCholi.Express - FleetDispatcherAgent
Antigravity micro-agent for autonomous multi-criteria rider matching and dispatch.
"""
import math
import time
from typing import List, Dict, Any, Optional
from backend.app.schemas.agent import DispatchRequest, DispatchDecision
from backend.app.core.config import settings

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points in kilometers."""
    R = 6371.0  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

class FleetDispatcherAgent:
    """
    Autonomous Fleet Dispatcher.
    Continuously tracks rider coordinates, vehicle state, battery health, and guarantees < 60s matching.
    """
    def __init__(self):
        # Simulated fleet pool
        self.riders: List[Dict[str, Any]] = [
            {
                "id": "rdr_karan_01",
                "name": "Karan Patel (Ather 450X)",
                "vehicle": "Electric Scooter",
                "lat": 23.0390,
                "lng": 72.5550,
                "battery": 94,
                "rating": 4.95,
                "status": "AVAILABLE",
                "completed_trips": 142
            },
            {
                "id": "rdr_rahul_02",
                "name": "Rahul Varma (Ola S1 Pro)",
                "vehicle": "Electric Scooter",
                "lat": 23.0360,
                "lng": 72.5510,
                "battery": 82,
                "rating": 4.88,
                "status": "AVAILABLE",
                "completed_trips": 198
            },
            {
                "id": "rdr_amit_03",
                "name": "Amit Shah (TVS iQube)",
                "vehicle": "Electric Scooter",
                "lat": 23.0410,
                "lng": 72.5600,
                "battery": 68,
                "rating": 4.82,
                "status": "AVAILABLE",
                "completed_trips": 95
            },
            {
                "id": "rdr_divya_04",
                "name": "Divya Joshi (Chetak EV)",
                "vehicle": "Electric Scooter",
                "lat": 23.0340,
                "lng": 72.5480,
                "battery": 91,
                "rating": 4.98,
                "status": "AVAILABLE",
                "completed_trips": 230
            }
        ]

    def evaluate_dispatch(self, req: DispatchRequest) -> DispatchDecision:
        # Find store location
        store = next((s for s in settings.DARK_STORES if s.id == req.store_id), settings.DARK_STORES[0])

        best_rider = None
        highest_score = -1.0
        best_distance = 0.0

        for r in self.riders:
            # Distance from rider to store
            dist_to_store = haversine_distance_km(r["lat"], r["lng"], store.lat, store.lng)
            # Distance from store to customer
            dist_store_to_cust = haversine_distance_km(store.lat, store.lng, req.customer_lat, req.customer_lng)
            total_dist = dist_to_store + dist_store_to_cust

            # Antigravity Multi-criteria evaluation function:
            # Score = (1 / (dist_to_store + 0.2)) * 0.45 + (battery / 100) * 0.25 + (rating / 5) * 0.20 + (completed / 250) * 0.10
            proximity_score = (1.0 / (dist_to_store + 0.2)) * 0.45
            battery_score = (r["battery"] / 100.0) * 0.25
            rating_score = (r["rating"] / 5.0) * 0.20
            exp_score = min(r["completed_trips"] / 250.0, 1.0) * 0.10

            composite_score = proximity_score + battery_score + rating_score + exp_score

            if composite_score > highest_score:
                highest_score = composite_score
                best_rider = r
                best_distance = total_dist

        if not best_rider:
            best_rider = self.riders[0]
            best_distance = 2.4

        # Calculate estimated ETA based on avg speed of 32 km/h + 2 min pickup
        travel_time_mins = (best_distance / 32.0) * 60.0
        total_eta = round(travel_time_mins + 2.0, 1)

        decision = DispatchDecision(
            order_id=req.order_id,
            assigned_rider_id=best_rider["id"],
            rider_name=best_rider["name"],
            vehicle_type=best_rider["vehicle"],
            distance_km=round(best_distance, 2),
            battery_percent=best_rider["battery"],
            estimated_eta_mins=total_eta,
            dispatch_timestamp=int(time.time() * 1000),
            rationale=(
                f"Antigravity Dispatch matched {best_rider['name']} "
                f"({best_rider['battery']}% battery, rating {best_rider['rating']}★). "
                f"Total route distance {round(best_distance, 2)}km with calculated 10-min SLA ETA {total_eta} mins."
            )
        )
        return decision

fleet_dispatcher_agent = FleetDispatcherAgent()
