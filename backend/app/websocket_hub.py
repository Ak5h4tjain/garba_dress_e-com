"""
GarbaCholi.Express - Unified WebSocket Event Broker & Hub
Handles channel-based pub/sub real-time synchronization across Customer, Rider, Dark Store, and Admin clients.
"""
import asyncio
import json
import logging
from typing import Dict, Set, List, Any
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger("WebSocketEventBroker")

class WebSocketHub:
    """
    Central Asynchronous Real-Time Event Broker.
    Maintains subscriber channels and broadcasts events across connected clients.
    """
    def __init__(self):
        # Channel -> Set of active WebSockets
        self.channels: Dict[str, Set[WebSocket]] = {
            "ALL": set(),
            "CUSTOMER": set(),
            "RIDER": set(),
            "DARKSTORE": set(),
            "ADMIN": set(),
            "AGENTS": set()
        }
        # WebSocket -> Set of subscribed channels
        self.client_subscriptions: Dict[WebSocket, Set[str]] = {}
        # Message history cache (ring buffer)
        self.recent_events: List[Dict[str, Any]] = []

    async def connect(self, websocket: WebSocket, channels: List[str]):
        await websocket.accept()
        self.client_subscriptions[websocket] = set()

        # Default subscribe to ALL
        target_channels = set(channels) if channels else {"ALL"}
        target_channels.add("ALL")

        for ch in target_channels:
            if ch.upper() in self.channels:
                self.channels[ch.upper()].add(websocket)
                self.client_subscriptions[websocket].add(ch.upper())

        # Send handshake confirmation
        handshake = {
            "type": "MESH_CONNECTED",
            "source": "FASTAPI_ANTIGRAVITY_BROKER",
            "subscribed_channels": list(self.client_subscriptions[websocket]),
            "timestamp": int(asyncio.get_event_loop().time() * 1000),
            "status": "SYNCHRONIZED"
        }
        await websocket.send_text(json.dumps(handshake))
        logger.info(f"Client connected to channels: {self.client_subscriptions[websocket]}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.client_subscriptions:
            for ch in self.client_subscriptions[websocket]:
                if ch in self.channels and websocket in self.channels[ch]:
                    self.channels[ch].remove(websocket)
            del self.client_subscriptions[websocket]
            logger.info("Client disconnected from WebSocket mesh")

    async def broadcast_to_channel(self, channel: str, message: Dict[str, Any]):
        """
        Broadcasts message to all clients subscribed to `channel` (or ALL).
        """
        ch_upper = channel.upper()
        targets = set()

        if ch_upper in self.channels:
            targets.update(self.channels[ch_upper])
        if "ALL" in self.channels:
            targets.update(self.channels["ALL"])

        # Cache event in ring buffer
        self.recent_events.append(message)
        if len(self.recent_events) > 100:
            self.recent_events.pop(0)

        payload_str = json.dumps(message)
        dead_clients = []

        for ws in targets:
            try:
                await ws.send_text(payload_str)
            except Exception:
                dead_clients.append(ws)

        for ws in dead_clients:
            self.disconnect(ws)

        # Mirror event into Node.js gateway (port 4000) so dual-connected clients stay in sync
        try:
            import httpx
            async with httpx.AsyncClient(timeout=0.8) as client:
                await client.post("http://localhost:4000/api/events/broadcast-mesh", json=message)
        except Exception:
            pass  # Non-blocking if Node gateway is temporarily offline or processing

    async def broadcast_all(self, message: Dict[str, Any]):
        await self.broadcast_to_channel("ALL", message)

    def get_stats(self) -> Dict[str, Any]:
        return {
            "total_connected_clients": len(self.client_subscriptions),
            "channel_subscribers": {ch: len(subscribers) for ch, subscribers in self.channels.items()},
            "cached_events_count": len(self.recent_events)
        }

websocket_hub = WebSocketHub()
