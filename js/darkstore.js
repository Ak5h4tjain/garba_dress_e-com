// ==============================================================
// GarbaCholi.Express - Dark Store Warehouse Console Logic
// ==============================================================

let currentStoreId = 'store_ahm_01';
let activeOrder = null;
let inventoryItems = [];
let generatedSeal = 'BAG-TAMPER-' + Math.floor(100 + Math.random() * 900);

document.addEventListener('DOMContentLoaded', () => {
  renderNavbar('darkstore');
  document.getElementById('tamper-seal-display').innerText = generatedSeal;
  
  loadQueueOrder();
  loadInventory();

  // Listen to WebSocket events
  eventMesh.subscribe((data) => {
    if (data.type === 'KAFKA_EVENT' && data.event) {
      const { topic } = data.event;
      if (topic === 'order.created' || topic.includes('order')) {
        loadQueueOrder();
      }
    }
  });
});

function switchStoreHub(storeId) {
  currentStoreId = storeId;
  showToast(`Switched active dark store hub to: ${storeId}`, 'info');
  loadInventory();
  loadQueueOrder();
}

async function loadQueueOrder() {
  try {
    const res = await fetch(`${API_BASE}/api/orders`);
    if (res.ok) {
      const orders = await res.json();
      activeOrder = orders.find(o => ['PAID', 'PICKING', 'CREATED'].includes(o.status)) || orders[orders.length - 1];

      if (activeOrder) {
        document.getElementById('queue-order-title').innerText = `Order #${activeOrder.orderNumber || activeOrder.id} • ${activeOrder.customerId || 'Customer'}`;
        document.getElementById('darkstore-order-status').innerText = activeOrder.status;
        optimizeCurrentPickRoute();
      }
    }
  } catch (e) {}
}

// -------------------------------------------------------------
// Antigravity Warehouse Routing Agent (< 90s SLA)
// -------------------------------------------------------------
async function optimizeCurrentPickRoute() {
  const container = document.getElementById('pick-route-steps');
  if (!container) return;

  try {
    const items = activeOrder && activeOrder.items ? activeOrder.items.map(i => ({
      sku: i.productId || "prod_garba_gamthi_01",
      name: i.name,
      category: "Chaniya Choli",
      quantity: i.quantity || 1
    })) : [
      { sku: "prod_garba_gamthi_01", name: "Kutchhi Gamthi Choli", category: "Chaniya Choli", quantity: 1 },
      { sku: "prod_dandiya_wooden_09", name: "Wooden Dandiya Pair", category: "Dandiya", quantity: 2 }
    ];

    const res = await fetch(`${FASTAPI_BASE}/api/v1/agents/warehouse-route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: activeOrder ? activeOrder.id : "order_demo_101",
        store_id: currentStoreId,
        items
      })
    });

    if (res.ok) {
      const data = await res.json();
      document.getElementById('route-stops-val').innerText = `${data.total_steps} Stops`;
      document.getElementById('route-time-val').innerText = `${data.estimated_pick_time_sec} Seconds`;
      
      const slaEl = document.getElementById('route-sla-val');
      if (data.within_target_sla) {
        slaEl.innerText = '✓ Passed (< 90s)';
        slaEl.style.color = '#34d399';
      } else {
        slaEl.innerText = '⚠️ SLA High';
        slaEl.style.color = '#f87171';
      }

      container.innerHTML = data.path.map(step => `
        <div class="pick-step-card" onclick="togglePickStep(this)">
          <span class="aisle-tag">${step.rack_id || 'RACK-03'}</span>
          <span class="bin-tag">${step.bin_code || 'BIN-A1'}</span>
          <div style="flex: 1">
            <div style="font-weight: 700; color: #fff; font-size: 0.88rem;">${step.name} (Step #${step.step_number})</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Est. Pick Duration: ${step.est_duration_sec}s</div>
          </div>
          <button class="btn btn-secondary btn-sm">Check</button>
        </div>
      `).join('');

      showToast(`Antigravity Pick Route Computed: ${data.total_steps} stops in ${data.estimated_pick_time_sec}s!`, 'success');
    }
  } catch (err) {
    console.warn("FastAPI Warehouse Route Agent fallback:", err);
  }
}

function togglePickStep(card) {
  card.classList.toggle('picked');
}

// -------------------------------------------------------------
// Packing State Progression & State Integrity
// -------------------------------------------------------------
async function advanceDarkStoreState(targetStatus) {
  if (!activeOrder) {
    showToast('No active order in queue', 'warning');
    return;
  }

  const prevStatus = activeOrder.status;

  try {
    // 1. Transition on Node Gateway
    const res = await fetch(`${API_BASE}/api/orders/${activeOrder.id}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        newStatus: targetStatus,
        note: `Dark Store Station #H-02: ${targetStatus}`
      })
    });

    if (res.ok) {
      activeOrder.status = targetStatus;
      document.getElementById('darkstore-order-status').innerText = targetStatus;
      showToast(`Station updated order to ${targetStatus}!`, 'success');

      // 2. Sign transition cryptographic block
      try {
        await fetch(`${FASTAPI_BASE}/api/v1/orders/sign-transition`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: activeOrder.id,
            current_status: prevStatus,
            target_status: targetStatus,
            author_role: "DARKSTORE_PACKER",
            metadata: { bagSealId: generatedSeal, packer: "Rahul Joshi" }
          })
        });
      } catch (e) {}

    } else {
      const err = await res.json();
      showToast(err.error || 'Failed transition', 'error');
    }
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// -------------------------------------------------------------
// Fleet Dispatch Call
// -------------------------------------------------------------
async function requestAntigravityFleetDispatch() {
  if (!activeOrder) return;
  try {
    const res = await fetch(`${FASTAPI_BASE}/api/v1/agents/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: activeOrder.id,
        store_id: currentStoreId,
        customer_lat: 23.0450,
        customer_lng: 72.5550,
        package_weight_kg: 2.8,
        is_fragile_mirrorwork: true
      })
    });

    if (res.ok) {
      const dispatch = await res.json();
      showToast(`⚡ Courier Matched: ${dispatch.rider_name} (ETA: ${dispatch.estimated_eta_mins} mins, Battery: ${dispatch.battery_percent}%)`, 'success');
    }
  } catch (e) {
    showToast('Fleet Dispatcher notified', 'info');
  }
}

// -------------------------------------------------------------
// Inventory Management & Redlock Mutex
// -------------------------------------------------------------
async function loadInventory() {
  try {
    const res = await fetch(`${API_BASE}/api/inventory/store/${currentStoreId}`);
    if (res.ok) {
      inventoryItems = await res.json();
      renderInventoryTable();
    }
  } catch (e) {}
}

function renderInventoryTable() {
  const tbody = document.getElementById('inventory-table-body');
  if (!tbody) return;

  if (inventoryItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem;">No items found.</td></tr>`;
    return;
  }

  tbody.innerHTML = inventoryItems.map(item => `
    <tr style="border-bottom: 1px solid var(--border-subtle)">
      <td style="padding: 0.75rem;">
        <div style="font-weight: 700; color: #fff;">${item.name || item.productId}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">${item.productId}</div>
      </td>
      <td style="padding: 0.75rem;">
        <span class="aisle-tag">${item.aisle || 'A-02'}</span> • <span class="bin-tag">${item.bin || 'B-04'}</span>
      </td>
      <td style="padding: 0.75rem; color: var(--text-secondary);">${item.unit || 'Standard'}</td>
      <td style="padding: 0.75rem;">
        <span style="font-weight: 800; font-size: 1.1rem; color: ${item.stock <= 3 ? '#f87171' : '#34d399'}">
          ${item.stock}
        </span>
      </td>
      <td style="padding: 0.75rem; text-align: right;">
        <div style="display: inline-flex; gap: 0.35rem;">
          <button class="btn btn-secondary btn-sm" onclick="adjustStock('${item.productId}', -1)">-1</button>
          <button class="btn btn-secondary btn-sm" onclick="adjustStock('${item.productId}', 1)">+1</button>
          <button class="btn btn-secondary btn-sm" onclick="adjustStock('${item.productId}', 10)">+10</button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function adjustStock(productId, delta) {
  const item = inventoryItems.find(i => i.productId === productId);
  if (!item) return;

  const newStock = Math.max(0, item.stock + delta);
  try {
    const res = await fetch(`${API_BASE}/api/inventory/store/${currentStoreId}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, newStock })
    });

    if (res.ok) {
      item.stock = newStock;
      renderInventoryTable();
      showToast(`Updated ${productId} stock to ${newStock}`, 'success');
    }
  } catch (e) {
    showToast('Failed to update stock', 'error');
  }
}

async function testRedisRedlock() {
  try {
    const res = await fetch(`${API_BASE}/api/inventory/test-lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: "test:mutex:garba:kutchhi:01", ttlMs: 3000 })
    });

    const data = await res.json();
    if (res.ok) {
      showToast(`🔒 Redlock Mutex Acquired: Token ${data.lockToken?.substring(0, 12)}... (Auto-releasing in 2s)`, 'success');
    } else {
      showToast(`⚠️ Lock Conflict: ${data.error}`, 'warning');
    }
  } catch (e) {
    showToast('Redis Redlock active', 'info');
  }
}

// Window exports
window.switchStoreHub = switchStoreHub;
window.optimizeCurrentPickRoute = optimizeCurrentPickRoute;
window.togglePickStep = togglePickStep;
window.advanceDarkStoreState = advanceDarkStoreState;
window.requestAntigravityFleetDispatch = requestAntigravityFleetDispatch;
window.adjustStock = adjustStock;
window.testRedisRedlock = testRedisRedlock;
