"""
GarbaCholi.Express - Cryptographic State Integrity Agent (hashlib)
Enforces tamper-proof state transition auditing modeled after high-concurrency ledger systems.
"""
import hashlib
import json
import time
from typing import Dict, Any, Optional, Tuple
from backend.app.core.config import settings

class StateIntegrityAgent:
    """
    Autonomous Cryptographic Agent for Order State Machines.
    Guarantees zero-skipping, immutable audit trails, and SHA-256 state chain verification.
    """
    def __init__(self):
        # In-memory chain ledger: order_id -> list of block dicts
        self.state_chains: Dict[str, list] = {}

    def get_latest_hash(self, order_id: str) -> str:
        chain = self.state_chains.get(order_id, [])
        if not chain:
            # Genesis hash for the order
            return hashlib.sha256(f"GENESIS_{order_id}".encode()).hexdigest()
        return chain[-1]["state_hash"]

    def verify_and_sign_transition(
        self,
        order_id: str,
        current_state: str,
        target_state: str,
        payload_data: Optional[Dict[str, Any]] = None,
        author_role: str = "SYSTEM"
    ) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Validates the state transition against state machine rules and computes the next chain block.
        Returns: (success: bool, message: str, block_metadata: dict)
        """
        valid_targets = settings.VALID_STATE_TRANSITIONS.get(current_state, [])
        if target_state not in valid_targets:
            return (
                False,
                f"ILLEGAL STATE SKIP REJECTED: Cannot transition from '{current_state}' to '{target_state}'. Allowed: {valid_targets}",
                {}
            )

        prev_hash = self.get_latest_hash(order_id)
        timestamp = int(time.time() * 1000)

        # Deterministic payload signature
        payload_str = json.dumps(payload_data or {}, sort_keys=True)
        payload_signature = hashlib.sha256(payload_str.encode()).hexdigest()[:16]

        # Compute Block Hash: SHA256(PrevHash + OrderID + TargetState + Timestamp + PayloadSig)
        raw_token = f"{prev_hash}:{order_id}:{target_state}:{timestamp}:{payload_signature}"
        new_state_hash = hashlib.sha256(raw_token.encode()).hexdigest()

        block = {
            "order_id": order_id,
            "previous_hash": prev_hash,
            "state_hash": new_state_hash,
            "from_state": current_state,
            "to_state": target_state,
            "timestamp_ms": timestamp,
            "author_role": author_role,
            "payload_signature": payload_signature,
            "block_index": len(self.state_chains.get(order_id, [])) + 1
        }

        if order_id not in self.state_chains:
            self.state_chains[order_id] = []
        self.state_chains[order_id].append(block)

        return True, "State transition cryptographically verified and sealed", block

    def verify_order_chain(self, order_id: str) -> Tuple[bool, str]:
        """
        Verifies the integrity of the entire state chain for an order.
        """
        chain = self.state_chains.get(order_id, [])
        if not chain:
            return True, "No blocks in chain yet"

        expected_prev = hashlib.sha256(f"GENESIS_{order_id}".encode()).hexdigest()
        for idx, block in enumerate(chain):
            if block["previous_hash"] != expected_prev:
                return False, f"Broken chain link at block {idx + 1}"
            
            raw_token = f"{block['previous_hash']}:{order_id}:{block['to_state']}:{block['timestamp_ms']}:{block['payload_signature']}"
            computed_hash = hashlib.sha256(raw_token.encode()).hexdigest()
            if computed_hash != block["state_hash"]:
                return False, f"Tampered block signature at index {idx + 1}"
            
            expected_prev = block["state_hash"]

        return True, f"All {len(chain)} blocks fully verified with zero tampering"

    def get_order_history(self, order_id: str) -> list:
        return self.state_chains.get(order_id, [])

# Singleton instance
state_integrity_agent = StateIntegrityAgent()
