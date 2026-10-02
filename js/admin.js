// ==============================================================
// GarbaCholi.Express - Admin HQ Command Center Logic & RBAC Gate
// ==============================================================

let adminOrders = [];
let adminCatalog = [];
let adminApiKeys = [];

document.addEventListener('DOMContentLoaded', () => {
  renderNavbar('admin');

  // RBAC Access Control Check
  const user = getAuthUser();
  if (!user || user.role !== 'ADMIN') {
    document.getElementById('admin-access-gate').style.display = 'block';
    document.getElementById('admin-terminal-content').style.display = 'none';
    document.getElementById('gate-current-role').innerText = user ? user.role : 'GUEST';
    return;
  }

  document.getElementById('admin-access-gate').style.display = 'none';
  document.getElementById('admin-terminal-content').style.display = 'block';

  // Initialize Admin Data
  loadTopologyMetrics();
  loadAdminOrders();
  loadAdminCatalog();
  loadAdminApiKeys();

  // Listen to WebSocket events
  eventMesh.subscribe((data) => {
    if (data.type === 'KAFKA_EVENT') {
      loadTopologyMetrics();
    }
  });
});

function elevateToAdmin() {
  switchDemoUser('ADMIN');
  window.location.reload();
}

async function loadTopologyMetrics() {
  try {
    const res = await fetch(`${API_BASE}/api/topology/status`);
    if (res.ok) {
      const data = await res.json();
      document.getElementById('metric-orders-count').innerText = data.storage?.postgres?.ordersCount || 8;
      document.getElementById('metric-clients-count').innerText = data.eventBus?.connectedClients || 4;
      document.getElementById('metric-surge-val').innerText = `${data.services?.pricing?.surgeMultiplier || 1.0}x`;
    }
  } catch (e) {}
}

function switchAdminTab(tabName, btn) {
  document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.admin-tab-pane').forEach(p => p.style.display = 'none');

  if (btn) btn.classList.add('active');
  const targetPane = document.getElementById(`tab-content-${tabName}`);
  if (targetPane) targetPane.style.display = 'block';
}

// -------------------------------------------------------------
// Live Orders & Manual Override
// -------------------------------------------------------------
async function loadAdminOrders() {
  try {
    const res = await fetch(`${API_BASE}/api/orders`);
    if (res.ok) {
      adminOrders = await res.json();
      renderOrdersTable();
    }
  } catch (e) {}
}

function renderOrdersTable() {
  const tbody = document.getElementById('admin-orders-table');
  if (!tbody) return;

  if (adminOrders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem;">No orders found.</td></tr>`;
    return;
  }

  tbody.innerHTML = adminOrders.map(order => `
    <tr style="border-bottom: 1px solid var(--border-subtle)">
      <td style="padding: 0.75rem; font-weight: 700; color: #fff;">#${order.orderNumber || order.id}</td>
      <td style="padding: 0.75rem; color: var(--text-secondary);">${order.customerId || 'Priya Patel'}</td>
      <td style="padding: 0.75rem; font-weight: 700; color: var(--festive-amber);">${formatINR(order.total)}</td>
      <td style="padding: 0.75rem;">
        <span class="badge ${order.status === 'DELIVERED' ? 'badge-emerald' : 'badge-gold'}">${order.status}</span>
      </td>
      <td style="padding: 0.75rem; color: var(--text-muted);">${order.etaMins || 8}m</td>
      <td style="padding: 0.75rem; text-align: right;">
        <select class="form-select" style="padding: 0.25rem 0.5rem; font-size: 0.78rem;" onchange="overrideOrderStatus('${order.id}', this.value)">
          <option value="">Override Status...</option>
          <option value="CREATED">CREATED</option>
          <option value="PAID">PAID</option>
          <option value="PICKING">PICKING</option>
          <option value="PACKED">PACKED</option>
          <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
          <option value="DELIVERED">DELIVERED</option>
        </select>
      </td>
    </tr>
  `).join('');
}

async function overrideOrderStatus(orderId, newStatus) {
  if (!newStatus) return;
  try {
    const res = await fetch(`${API_BASE}/api/admin/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, note: "Admin Command Center Manual Override" })
    });

    if (res.ok) {
      showToast(`Admin state override: Order #${orderId} ➔ ${newStatus}`, 'success');
      loadAdminOrders();
    }
  } catch (e) {
    showToast('Failed to override order state', 'error');
  }
}

// -------------------------------------------------------------
// Dynamic Surge Pricing Multiplier Controller
// -------------------------------------------------------------
function setPresetSurge(val) {
  document.getElementById('surge-range-slider').value = val;
  document.getElementById('surge-preview-val').innerText = `${val}x`;
  broadcastSurgeMultiplier();
}

async function broadcastSurgeMultiplier() {
  const mult = parseFloat(document.getElementById('surge-range-slider')?.value || 1.0);
  try {
    const res = await fetch(`${API_BASE}/api/pricing/surge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ multiplier: mult })
    });

    if (res.ok) {
      showToast(`⚡ Surge Pricing updated to ${mult}x across all dark stores & storefronts!`, 'success');
      loadTopologyMetrics();
    }
  } catch (e) {
    showToast('Failed to broadcast surge', 'error');
  }
}

// -------------------------------------------------------------
// Catalog Product CRUD
// -------------------------------------------------------------
async function loadAdminCatalog() {
  try {
    const res = await fetch(`${API_BASE}/api/catalog/products`);
    if (res.ok) {
      adminCatalog = await res.json();
      renderCatalogTable();
    }
  } catch (e) {}
}

function renderCatalogTable() {
  const tbody = document.getElementById('admin-catalog-table');
  if (!tbody) return;

  tbody.innerHTML = adminCatalog.map(p => `
    <tr style="border-bottom: 1px solid var(--border-subtle)">
      <td style="padding: 0.75rem; font-weight: 700; color: #fff;">${p.name}</td>
      <td style="padding: 0.75rem; color: var(--text-secondary);">${p.category || 'Chaniya Choli'}</td>
      <td style="padding: 0.75rem; font-weight: 700; color: var(--festive-amber);">${formatINR(p.price)}</td>
      <td style="padding: 0.75rem; color: var(--festive-cyan);">${p.rentalPrice ? formatINR(p.rentalPrice) + '/day' : 'N/A'}</td>
      <td style="padding: 0.75rem; text-align: right;">
        <button class="btn btn-secondary btn-sm" style="color: #f87171" onclick="deleteProduct('${p.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

function openNewProductModal() {
  document.getElementById('new-product-modal')?.classList.add('active');
}
function closeNewProductModal() {
  document.getElementById('new-product-modal')?.classList.remove('active');
}

async function createProductSubmit() {
  const name = document.getElementById('prod-name-input')?.value;
  const category = document.getElementById('prod-cat-select')?.value;
  const flare = document.getElementById('prod-flare-input')?.value;
  const price = Number(document.getElementById('prod-price-input')?.value || 3499);
  const rentalPrice = Number(document.getElementById('prod-rent-input')?.value || 799);
  const imageUrl = document.getElementById('prod-img-input')?.value || '/garba_black_mirror.jpg';

  if (!name) {
    showToast('Product name is required', 'warning');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/admin/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, category, flare, price, rentalPrice, imageUrl, mrp: price * 1.5 })
    });

    if (res.ok) {
      showToast(`Created ${name} in catalog!`, 'success');
      closeNewProductModal();
      loadAdminCatalog();
    }
  } catch (e) {
    showToast('Failed to create product', 'error');
  }
}

async function deleteProduct(productId) {
  if (!confirm('Are you sure you want to remove this product from the catalog?')) return;
  try {
    const res = await fetch(`${API_BASE}/api/admin/products/${productId}`, { method: 'DELETE' });
    if (res.ok) {
      showToast(`Removed product from catalog`, 'info');
      loadAdminCatalog();
    }
  } catch (e) {}
}

// -------------------------------------------------------------
// API Key Management Suite
// -------------------------------------------------------------
async function loadAdminApiKeys() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/api-keys`);
    if (res.ok) {
      const data = await res.json();
      adminApiKeys = data.keys || [];
      renderApiKeysTable();
    }
  } catch (e) {}
}

function renderApiKeysTable() {
  const tbody = document.getElementById('admin-keys-table');
  if (!tbody) return;

  if (adminApiKeys.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem;">No API Keys issued yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = adminApiKeys.map(k => `
    <tr style="border-bottom: 1px solid var(--border-subtle)">
      <td style="padding: 0.75rem; font-weight: 700; color: #fff;">${k.name}</td>
      <td style="padding: 0.75rem;"><span class="badge badge-purple">${k.clientType}</span></td>
      <td style="padding: 0.75rem; font-family: monospace; font-size: 0.78rem; color: var(--festive-gold);">${k.key}</td>
      <td style="padding: 0.75rem; font-size: 0.75rem; color: var(--text-muted);">${(k.scopes || []).join(', ')}</td>
      <td style="padding: 0.75rem;">
        <span class="badge ${k.active ? 'badge-emerald' : 'badge-rose'}">${k.active ? 'ACTIVE' : 'REVOKED'}</span>
      </td>
      <td style="padding: 0.75rem; text-align: right;">
        ${k.active ? `<button class="btn btn-secondary btn-sm" style="color: #f87171" onclick="revokeApiKey('${k.id}')">Revoke</button>` : '—'}
      </td>
    </tr>
  `).join('');
}

function openNewApiKeyModal() {
  document.getElementById('new-apikey-modal')?.classList.add('active');
}
function closeNewApiKeyModal() {
  document.getElementById('new-apikey-modal')?.classList.remove('active');
}

async function generateApiKeySubmit() {
  const name = document.getElementById('key-name-input')?.value;
  const clientType = document.getElementById('key-type-select')?.value;

  if (!name) {
    showToast('Name is required', 'warning');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/admin/api-keys/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, clientType, scopes: ["read:catalog", "write:orders"] })
    });

    if (res.ok) {
      showToast(`Generated API Key for ${name}`, 'success');
      closeNewApiKeyModal();
      loadAdminApiKeys();
    }
  } catch (e) {
    showToast('Failed to generate key', 'error');
  }
}

async function revokeApiKey(keyId) {
  try {
    const res = await fetch(`${API_BASE}/api/admin/api-keys/${keyId}/revoke`, { method: 'POST' });
    if (res.ok) {
      showToast(`API Key revoked`, 'info');
      loadAdminApiKeys();
    }
  } catch (e) {}
}

// Window exports
window.elevateToAdmin = elevateToAdmin;
window.switchAdminTab = switchAdminTab;
window.loadAdminOrders = loadAdminOrders;
window.overrideOrderStatus = overrideOrderStatus;
window.setPresetSurge = setPresetSurge;
window.broadcastSurgeMultiplier = broadcastSurgeMultiplier;
window.openNewProductModal = openNewProductModal;
window.closeNewProductModal = closeNewProductModal;
window.createProductSubmit = createProductSubmit;
window.deleteProduct = deleteProduct;
window.openNewApiKeyModal = openNewApiKeyModal;
window.closeNewApiKeyModal = closeNewApiKeyModal;
window.generateApiKeySubmit = generateApiKeySubmit;
window.revokeApiKey = revokeApiKey;
