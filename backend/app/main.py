"""
GarbaCholi.Express - FastAPI Main Application & Unified Event Mesh
Exposes Antigravity Agent endpoints, cryptographic state transition signing, and real-time WebSocket broker.
"""
import asyncio
import json
import logging
from typing import Optional, List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import httpx

from backend.app.core.config import settings
from backend.app.core.hash_verifier import state_integrity_agent
from backend.app.schemas.agent import (
    DispatchRequest,
    DispatchDecision,
    SurgeRequest,
    SurgeDecision,
    WarehouseRouteRequest,
    WarehouseRouteDecision,
    EventMeshBroadcast
)
from backend.app.schemas.order import (
    OrderStateTransitionRequest,
    OrderStateTransitionResponse,
    ChainVerificationResponse
)
from backend.app.agents.fleet_dispatcher import fleet_dispatcher_agent
from backend.app.agents.surge_optimizer import surge_optimizer_agent
from backend.app.agents.warehouse_routing_agent import warehouse_routing_agent
from backend.app.websocket_hub import websocket_hub

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("FastAPIMain")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="High-concurrency Antigravity agentic engine and real-time synchronizer for GarbaCholi.Express."
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------
# 1. System Health & Topology Status
# -------------------------------------------------------------
@app.get("/api/v1/health")
async def health_check():
    return {
        "status": "HEALTHY",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "timestamp_ms": int(asyncio.get_event_loop().time() * 1000)
    }

@app.get("/api/v1/topology")
async def get_topology_status():
    return {
        "gateway": {
            "status": "ONLINE",
            "protocol": "HTTP/2 + WebSocket Event Mesh",
            "port": settings.PORT
        },
        "dark_stores": [s.model_dump() for s in settings.DARK_STORES],
        "festive_venues": settings.FESTIVE_VENUES,
        "agents": {
            "fleet_dispatcher": {"status": "ACTIVE", "model": "Haversine Multi-Criteria Rerouting"},
            "surge_optimizer": {"status": "ACTIVE", "model": "Algorithmic Moving-Average Dampener"},
            "warehouse_routing": {"status": "ACTIVE", "model": "Pod-Weight Ergonomic Sequencing"},
            "state_integrity": {"status": "ACTIVE", "model": "SHA-256 Cryptographic Chain Ledger"}
        },
        "event_mesh": websocket_hub.get_stats()
    }

# -------------------------------------------------------------
# 2. Antigravity Agent: Fleet Dispatcher
# -------------------------------------------------------------
@app.post("/api/v1/agents/dispatch", response_model=DispatchDecision)
async def dispatch_rider(req: DispatchRequest):
    decision = fleet_dispatcher_agent.evaluate_dispatch(req)

    # Broadcast event to RIDER, ADMIN, and AGENTS channels
    event_payload = {
        "type": "AGENT_DECISION",
        "agent": "FleetDispatcherAgent",
        "action": "RIDER_ASSIGNED",
        "channel": "RIDER",
        "decision": decision.model_dump()
    }
    await websocket_hub.broadcast_to_channel("RIDER", event_payload)
    await websocket_hub.broadcast_to_channel("ADMIN", event_payload)

    # Forward to Node.js Kafka Simulator if accessible
    asyncio.create_task(_forward_to_node_bus("dispatch.rider_assigned", decision.model_dump()))

    return decision

# -------------------------------------------------------------
# 3. Antigravity Agent: Dynamic Surge Optimizer
# -------------------------------------------------------------
@app.post("/api/v1/agents/surge", response_model=SurgeDecision)
async def calculate_surge(req: SurgeRequest):
    decision = surge_optimizer_agent.compute_surge(req)

    event_payload = {
        "type": "AGENT_DECISION",
        "agent": "SurgeOptimizerAgent",
        "action": "SURGE_MULTIPLIER_UPDATED",
        "channel": "ALL",
        "decision": decision.model_dump()
    }
    await websocket_hub.broadcast_to_channel("ALL", event_payload)

    # Forward to Node.js pricing service
    asyncio.create_task(_forward_to_node_pricing(decision.surge_multiplier))

    return decision

# -------------------------------------------------------------
# 4. Antigravity Agent: Warehouse Route Optimizer
# -------------------------------------------------------------
@app.post("/api/v1/agents/warehouse-route", response_model=WarehouseRouteDecision)
async def get_warehouse_route(req: WarehouseRouteRequest):
    decision = warehouse_routing_agent.compute_pick_route(req)

    event_payload = {
        "type": "AGENT_DECISION",
        "agent": "WarehouseRoutingAgent",
        "action": "PICK_PATH_GENERATED",
        "channel": "DARKSTORE",
        "decision": decision.model_dump()
    }
    await websocket_hub.broadcast_to_channel("DARKSTORE", event_payload)

    return decision

# -------------------------------------------------------------
# 5. Cryptographic State Transition Integrity Agent
# -------------------------------------------------------------
@app.post("/api/v1/orders/sign-transition", response_model=OrderStateTransitionResponse)
async def sign_state_transition(req: OrderStateTransitionRequest):
    success, message, block = state_integrity_agent.verify_and_sign_transition(
        order_id=req.order_id,
        current_state=req.current_status,
        target_state=req.target_status,
        payload_data=req.metadata,
        author_role=req.author_role
    )

    if not success:
        logger.warning(f"State transition rejected for {req.order_id}: {message}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)

    # Broadcast cryptographically verified transition
    event_payload = {
        "type": "STATE_SIGNATURE_VERIFIED",
        "channel": "ALL",
        "order_id": req.order_id,
        "from_status": req.current_status,
        "to_status": req.target_status,
        "block": block
    }
    await websocket_hub.broadcast_all(event_payload)

    # Notify Node.js state machine if needed
    asyncio.create_task(_forward_to_node_order_transition(req.order_id, req.target_status))

    return OrderStateTransitionResponse(
        success=True,
        order_id=req.order_id,
        from_status=req.current_status,
        to_status=req.target_status,
        state_hash=block.get("state_hash"),
        previous_hash=block.get("previous_hash"),
        block_index=block.get("block_index"),
        timestamp_ms=block.get("timestamp_ms"),
        message=message
    )

@app.get("/api/v1/orders/verify-chain/{order_id}", response_model=ChainVerificationResponse)
async def verify_order_chain(order_id: str):
    is_valid, msg = state_integrity_agent.verify_order_chain(order_id)
    history = state_integrity_agent.get_order_history(order_id)
    return ChainVerificationResponse(
        order_id=order_id,
        is_valid=is_valid,
        blocks_count=len(history),
        chain=history,
        verification_message=msg
    )

# -------------------------------------------------------------
# 6. Event Mesh Ingestion & Broadcast (HTTP to WS Bridge)
# -------------------------------------------------------------
@app.post("/api/v1/events/broadcast")
async def broadcast_event(broadcast: EventMeshBroadcast):
    await websocket_hub.broadcast_to_channel(
        broadcast.channel,
        {
            "type": broadcast.event_type,
            "channel": broadcast.channel,
            "source": broadcast.source,
            "payload": broadcast.payload
        }
    )
    return {"status": "BROADCASTED", "target_channel": broadcast.channel}

# -------------------------------------------------------------
# 7. WebSocket Synchronizer Route
# -------------------------------------------------------------
@app.websocket("/ws/mesh")
async def websocket_mesh_endpoint(
    websocket: WebSocket,
    channels: Optional[str] = Query("ALL", description="Comma-separated channels")
):
    channel_list = [c.strip() for c in channels.split(",") if c.strip()]
    await websocket_hub.connect(websocket, channel_list)

    try:
        while True:
            raw_text = await websocket.receive_text()
            try:
                data = json.loads(raw_text)
                msg_type = data.get("type", "PING")

                if msg_type == "PING":
                    await websocket.send_text(json.dumps({"type": "PONG", "timestamp": int(asyncio.get_event_loop().time() * 1000)}))
                elif msg_type == "BROADCAST":
                    target_ch = data.get("channel", "ALL")
                    await websocket_hub.broadcast_to_channel(target_ch, data)
                elif msg_type == "RIDER_GPS":
                    # Instant rider coordinate telemetry sync
                    await websocket_hub.broadcast_to_channel("CUSTOMER", {
                        "type": "RIDER_GPS_UPDATE",
                        "order_id": data.get("order_id"),
                        "coordinates": data.get("coordinates"),
                        "eta_minutes": data.get("eta_minutes")
                    })
                    await websocket_hub.broadcast_to_channel("ADMIN", {
                        "type": "RIDER_GPS_UPDATE",
                        "order_id": data.get("order_id"),
                        "coordinates": data.get("coordinates")
                    })
            except Exception as parse_err:
                logger.error(f"Error handling incoming WS message: {parse_err}")
    except WebSocketDisconnect:
        websocket_hub.disconnect(websocket)
    except Exception as err:
        logger.error(f"WebSocket unexpected error: {err}")
        websocket_hub.disconnect(websocket)

# -------------------------------------------------------------
# Helper Internal Forwarders to Node.js Gateway
# -------------------------------------------------------------
async def _forward_to_node_bus(topic: str, payload: dict):
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            await client.post(
                f"{settings.NODE_GATEWAY_URL}/api/kafka/events",
                json={"topic": topic, "key": payload.get("order_id", "sys"), "payload": payload}
            )
    except Exception as e:
        logger.debug(f"Node.js forward ignored (gateway offline or fast-track): {e}")

async def _forward_to_node_pricing(multiplier: float):
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            await client.post(
                f"{settings.NODE_GATEWAY_URL}/api/pricing/surge",
                json={"multiplier": multiplier}
            )
    except Exception as e:
        logger.debug(f"Node pricing forward ignored: {e}")

async def _forward_to_node_order_transition(order_id: str, new_status: str):
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            await client.post(
                f"{settings.NODE_GATEWAY_URL}/api/orders/{order_id}/transition",
                json={"newStatus": new_status, "note": "Cryptographically verified via Antigravity FastAPI Agent"}
            )
    except Exception as e:
        logger.debug(f"Node order forward ignored: {e}")
