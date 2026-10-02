import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.hash_verifier import state_integrity_agent
from backend.app.agents.fleet_dispatcher import fleet_dispatcher_agent
from backend.app.agents.surge_optimizer import surge_optimizer_agent
from backend.app.agents.warehouse_routing_agent import warehouse_routing_agent
from backend.app.schemas.agent import (
    DispatchRequest,
    SurgeRequest,
    WarehouseRouteRequest,
    PickItem
)

client = TestClient(app)

def test_health_check():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "HEALTHY"
    assert "timestamp_ms" in data

def test_topology():
    response = client.get("/api/v1/topology")
    assert response.status_code == 200
    data = response.json()
    assert len(data["dark_stores"]) >= 4
    assert "agents" in data
    assert "event_mesh" in data

def test_fleet_dispatcher_agent():
    req = DispatchRequest(
        order_id="ord_test_001",
        store_id="store_ahm_01",
        customer_lat=23.0500,
        customer_lng=72.5600,
        package_weight_kg=3.2,
        is_fragile_mirrorwork=True
    )
    decision = fleet_dispatcher_agent.evaluate_dispatch(req)
    assert decision.order_id == "ord_test_001"
    assert decision.assigned_rider_id is not None
    assert decision.distance_km > 0
    assert decision.estimated_eta_mins > 0
    assert "Antigravity Dispatch matched" in decision.rationale

def test_surge_optimizer_agent():
    req = SurgeRequest(
        store_id="store_ahm_01",
        venue_name="GMDC Garba Ground, Ahmedabad",
        concurrent_checkouts=35,
        weather_condition="CLEAR",
        hour_of_day=22
    )
    decision = surge_optimizer_agent.compute_surge(req)
    assert decision.store_id == "store_ahm_01"
    assert 1.0 <= decision.surge_multiplier <= 3.0
    assert decision.tier in ["STANDARD", "FESTIVE_SURGE", "HIGH_FESTIVE_PEAK"]

def test_warehouse_routing_agent():
    items = [
        PickItem(sku="SKU-CHOLI-BLK-101", name="Kutchhi Black Mirrorwork Chaniya Choli", category="Chaniya Choli", quantity=1),
        PickItem(sku="SKU-DUP-RED-202", name="Bandhani Silk Dupatta", category="Dupatta", quantity=1),
        PickItem(sku="SKU-DAN-WDN-303", name="Carved Wooden Ghungroo Dandiya Pair", category="Dandiya", quantity=2),
        PickItem(sku="SKU-JWL-OXD-404", name="Tribal Oxidized Choker Set", category="Jewelry", quantity=1)
    ]
    req = WarehouseRouteRequest(order_id="ord_pick_001", store_id="store_ahm_01", items=items)
    decision = warehouse_routing_agent.compute_pick_route(req)
    assert decision.order_id == "ord_pick_001"
    assert decision.total_steps == 4
    assert len(decision.path) == 4
    # Ensure ergonomic order: Choli (POD-A) -> Dupatta (POD-B) -> Dandiya (POD-C) -> Jewelry (POD-D)
    assert "A-RACK" in decision.path[0].rack_id
    assert "B-RACK" in decision.path[1].rack_id
    assert "C-RACK" in decision.path[2].rack_id
    assert "D-RACK" in decision.path[3].rack_id
    assert decision.estimated_pick_time_sec <= 90

def test_state_integrity_cryptographic_chain():
    order_id = "ord_chain_test_999"

    # Step 1: Genesis -> PAID (valid)
    ok, msg, block1 = state_integrity_agent.verify_and_sign_transition(
        order_id=order_id,
        current_state="CREATED",
        target_state="PAID",
        author_role="CUSTOMER"
    )
    assert ok is True
    assert block1["from_state"] == "CREATED"
    assert block1["to_state"] == "PAID"
    assert block1["state_hash"] is not None

    # Step 2: Illegal Skip Attempt: PAID -> OUT_FOR_DELIVERY (Must be rejected!)
    illegal_ok, illegal_msg, _ = state_integrity_agent.verify_and_sign_transition(
        order_id=order_id,
        current_state="PAID",
        target_state="OUT_FOR_DELIVERY",
        author_role="ROGUE_ACTOR"
    )
    assert illegal_ok is False
    assert "ILLEGAL STATE SKIP REJECTED" in illegal_msg

    # Step 3: Legal Step: PAID -> PICKING
    ok2, _, block2 = state_integrity_agent.verify_and_sign_transition(
        order_id=order_id,
        current_state="PAID",
        target_state="PICKING",
        author_role="DARKSTORE_PACKER"
    )
    assert ok2 is True
    assert block2["previous_hash"] == block1["state_hash"]

    # Step 4: Verify entire chain
    is_valid, report = state_integrity_agent.verify_order_chain(order_id)
    assert is_valid is True
    assert "zero tampering" in report

def test_api_sign_transition_endpoint():
    req_payload = {
        "order_id": "ord_api_test_555",
        "current_status": "CREATED",
        "target_status": "PAID",
        "author_role": "CUSTOMER",
        "metadata": {"amount": 5499, "currency": "INR"}
    }
    res = client.post("/api/v1/orders/sign-transition", json=req_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["state_hash"] is not None
    assert data["block_index"] == 1

if __name__ == "__main__":
    test_health_check()
    test_topology()
    test_fleet_dispatcher_agent()
    test_surge_optimizer_agent()
    test_warehouse_routing_agent()
    test_state_integrity_cryptographic_chain()
    test_api_sign_transition_endpoint()
    print("=== ALL ANTIGRAVITY AGENT AND REAL-TIME SYNC TESTS PASSED! ===")
