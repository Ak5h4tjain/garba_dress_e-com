"""
GarbaCholi.Express - SurgeOptimizerAgent
Antigravity micro-agent for dynamic pricing and festive venue surge equilibrium.
"""
from datetime import datetime
from typing import Dict, Any
from backend.app.schemas.agent import SurgeRequest, SurgeDecision
from backend.app.core.config import settings

class SurgeOptimizerAgent:
    """
    Autonomous Dynamic Pricing Engine.
    Prevents price whipsawing through moving dampeners while balancing supply-demand during peak Navratri nights.
    """
    def __init__(self):
        self.current_multipliers: Dict[str, float] = {
            s.id: 1.0 for s in settings.DARK_STORES
        }

    def compute_surge(self, req: SurgeRequest) -> SurgeDecision:
        # Baseline
        base_multiplier = 1.0

        # Concurrency weight
        concurrency_weight = min(req.concurrent_checkouts * 0.04, 0.8)

        # Peak festive hours (8 PM to 2 AM is peak Garba time)
        hour = req.hour_of_day
        if 20 <= hour <= 23 or 0 <= hour <= 2:
            time_weight = 0.4
        elif 17 <= hour < 20:
            time_weight = 0.2
        else:
            time_weight = 0.0

        # Weather factor
        weather_weight = 0.3 if req.weather_condition.upper() in ["RAIN", "STORM"] else 0.0

        # Venue weight
        venue_weight = 0.2 if req.venue_name else 0.1

        raw_multiplier = base_multiplier + concurrency_weight + time_weight + weather_weight + venue_weight

        # Dampening against previous state to prevent wild oscillations
        prev = self.current_multipliers.get(req.store_id, 1.0)
        damped_multiplier = (0.7 * raw_multiplier) + (0.3 * prev)
        final_multiplier = round(max(1.0, min(3.0, damped_multiplier)), 2)

        self.current_multipliers[req.store_id] = final_multiplier

        # Classification
        if final_multiplier >= 2.2:
            tier = "HIGH_FESTIVE_PEAK"
            rationale = "Extreme Navratri crowd surge near venue ground. Fleet expedited with high priority bonus."
        elif final_multiplier >= 1.4:
            tier = "FESTIVE_SURGE"
            rationale = "Elevated Garba evening demand. Dynamic buffer applied to secure rider availability."
        else:
            tier = "STANDARD"
            rationale = "Equilibrium pricing. Standard 10-minute dark store fulfillment active."

        venue_display = req.venue_name or "Navratri Ground Area"

        return SurgeDecision(
            store_id=req.store_id,
            venue_name=venue_display,
            surge_multiplier=final_multiplier,
            tier=tier,
            rationale=rationale,
            calculated_at=datetime.utcnow().isoformat()
        )

surge_optimizer_agent = SurgeOptimizerAgent()
