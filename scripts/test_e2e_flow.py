"""
GarbaCholi.Express - End-to-End Multi-App Lifecycle & Antigravity Synchronizer Test
Simulates: Customer -> Dark Store -> Dispatcher -> Rider -> Delivery Verification
"""
import urllib.request
import json
import time

def post(url, data):
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def get(url):
    with urllib.request.urlopen(url) as resp:
        return json.loads(resp.read().decode("utf-8"))

def run_e2e_simulation():
    print("=== STARTING FULL GARBACHOLI.EXPRESS END-TO-END FLOW ===")

    # Step 1: Customer creates order
    print("\n[Step 1] Customer App: Placing Garba Choli order...")
    cart_items = [
        {
            "cartKey": "prod_garba_gamthi_01_Standard_BUY",
            "productId": "prod_garba_gamthi_01",
            "name": "Kutchhi Gamthi Hand-Embroidered Chaniya Choli",
            "price": 5499,
            "quantity": 1
        },
        {
            "cartKey": "prod_dandiya_wooden_09_Standard_BUY",
            "productId": "prod_dandiya_wooden_09",
            "name": "Handcrafted Wooden Dandiya Sticks with Brass Ghungroo",
            "price": 399,
            "quantity": 2
        }
    ]
    order_res = post("http://localhost:4000/api/orders/create", {
        "customerId": "usr_priya_01",
        "storeId": "store_ahm_01",
        "items": cart_items,
        "deliveryAddress": "Flat 402, Shivam Residency, Navrangpura, Ahmedabad",
        "paymentMethod": "UPI",
        "promoCode": "GARBA15"
    })
    order_id = order_res["id"]
    print(f"-> Order Created: #{order_res.get('orderNumber', order_id)} (Status: {order_res['status']}, Total: Rs.{order_res['total']})")

    # Step 2: Sign Genesis Block in StateIntegrityAgent
    print("\n[Step 2] StateIntegrityAgent: Signing Genesis -> PAID cryptographic block...")
    sign1 = post("http://localhost:8000/api/v1/orders/sign-transition", {
        "order_id": order_id,
        "current_status": "CREATED",
        "target_status": "PAID",
        "author_role": "CUSTOMER",
        "metadata": {"total": order_res["total"]}
    })
    print(f"-> Cryptographic Seal 1: Block #{sign1['block_index']}, Hash: {sign1['state_hash'][:16]}...")

    # Step 3: Dark Store App picks order and runs WarehouseRoutingAgent
    print("\n[Step 3] Dark Store App: Requesting Antigravity Warehouse Routing (< 90s SLA)...")
    route_res = post("http://localhost:8000/api/v1/agents/warehouse-route", {
        "order_id": order_id,
        "store_id": "store_ahm_01",
        "items": [
            {"sku": "prod_garba_gamthi_01", "name": "Kutchhi Gamthi Choli", "category": "Chaniya Choli", "quantity": 1},
            {"sku": "prod_garba_dandiya_05", "name": "Ghungroo Dandiya", "category": "Dandiya", "quantity": 2}
        ]
    })
    print(f"-> Route Optimized: {route_res['total_steps']} steps, Est. Pick Duration: {route_res['estimated_pick_time_sec']}s (90s SLA: {route_res['within_target_sla']})")
    for st in route_res["path"]:
        print(f"   * Step {st['step_number']}: {st['rack_id']} ({st['bin_code']}) - {st['name']} [{st['est_duration_sec']}s]")

    # Transition to PICKING
    sign2 = post("http://localhost:8000/api/v1/orders/sign-transition", {
        "order_id": order_id,
        "current_status": "PAID",
        "target_status": "PICKING",
        "author_role": "DARKSTORE_PACKER",
        "metadata": {"picker": "Aisle Packer A4"}
    })
    print(f"-> Cryptographic Seal 2: Block #{sign2['block_index']} (PAID -> PICKING), Hash: {sign2['state_hash'][:16]}...")

    # Transition to PACKED
    sign3 = post("http://localhost:8000/api/v1/orders/sign-transition", {
        "order_id": order_id,
        "current_status": "PICKING",
        "target_status": "PACKED",
        "author_role": "DARKSTORE_PACKER",
        "metadata": {"bagSealId": "BAG-TAMPER-778"}
    })
    print(f"-> Cryptographic Seal 3: Block #{sign3['block_index']} (PICKING -> PACKED), Hash: {sign3['state_hash'][:16]}...")

    # Step 4: Antigravity Fleet Dispatcher matches rider
    print("\n[Step 4] Antigravity FleetDispatcherAgent: Evaluating multi-criteria dispatch...")
    dispatch_res = post("http://localhost:8000/api/v1/agents/dispatch", {
        "order_id": order_id,
        "store_id": "store_ahm_01",
        "customer_lat": 23.0450,
        "customer_lng": 72.5550,
        "package_weight_kg": 2.8,
        "is_fragile_mirrorwork": True
    })
    print(f"-> Matched Courier: {dispatch_res['rider_name']} ({dispatch_res['distance_km']}km, Battery: {dispatch_res['battery_percent']}%, ETA: {dispatch_res['estimated_eta_mins']} mins)")

    # Transition: PACKED -> RIDER_ARRIVED_STORE -> RIDER_PICKED_UP -> OUT_FOR_DELIVERY
    print("\n[Step 5] Rider App: Progressing delivery lifecycle...")
    sign4 = post("http://localhost:8000/api/v1/orders/sign-transition", {
        "order_id": order_id,
        "current_status": "PACKED",
        "target_status": "RIDER_ARRIVED_STORE",
        "author_role": "RIDER"
    })
    sign5 = post("http://localhost:8000/api/v1/orders/sign-transition", {
        "order_id": order_id,
        "current_status": "RIDER_ARRIVED_STORE",
        "target_status": "RIDER_PICKED_UP",
        "author_role": "RIDER"
    })
    sign6 = post("http://localhost:8000/api/v1/orders/sign-transition", {
        "order_id": order_id,
        "current_status": "RIDER_PICKED_UP",
        "target_status": "OUT_FOR_DELIVERY",
        "author_role": "RIDER"
    })
    print(f"-> Order now OUT_FOR_DELIVERY! Sealed with Block #{sign6['block_index']}")

    # Step 6: Customer verification with OTP and final delivery
    print("\n[Step 6] Customer Handover: Verifying 4-digit OTP...")
    sign7 = post("http://localhost:8000/api/v1/orders/sign-transition", {
        "order_id": order_id,
        "current_status": "OUT_FOR_DELIVERY",
        "target_status": "DELIVERED",
        "author_role": "RIDER",
        "metadata": {"otpVerified": True}
    })
    print(f"-> Final Delivery Block #{sign7['block_index']}: DELIVERED! Hash: {sign7['state_hash'][:16]}...")

    # Step 7: Cryptographic Chain Audit
    print("\n[Step 7] StateIntegrityAgent: Auditing complete SHA-256 state chain...")
    audit = get(f"http://localhost:8000/api/v1/orders/verify-chain/{order_id}")
    print(f"-> Chain Verification Result: {audit['verification_message']}")
    print(f"-> Total Blocks Minted: {audit['blocks_count']}")
    assert audit["is_valid"] is True
    assert audit["blocks_count"] == 7
    print("\n=== FULL END-TO-END FLOW VALIDATED WITH ZERO ERRORS! ===")

if __name__ == "__main__":
    run_e2e_simulation()
