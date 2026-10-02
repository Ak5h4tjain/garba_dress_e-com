// ==============================================================
// GarbaCholi.Express - Central Client API, Auth & WebSocket Bridge
// Shared across all applications for glitch-free synchronization
// ==============================================================

const API_BASE = window.location.protocol.startsWith('http') 
  ? window.location.origin 
  : 'http://localhost:4000';

const FASTAPI_BASE = 'http://localhost:8000';

const WS_URL = window.location.protocol.startsWith('http')
  ? (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + (window.location.port ? `${window.location.hostname}:4000` : `${window.location.host}`)
  : 'ws://localhost:4000';

// Default Demo Accounts
const DEMO_ACCOUNTS = {
  CUSTOMER: {
    id: "usr_priya_01",
    name: "Priya Patel",
    email: "priya.patel@gmail.com",
    role: "CUSTOMER",
    phone: "+91 98250 12345",
    avatar: "👩🏽",
    deliveryAddress: "Flat 402, Shivam Residency, Navrangpura, Ahmedabad",
    permissions: ['BROWSE_CATALOG', 'MANAGE_CART', 'PLACE_ORDER', 'TRACK_DELIVERY']
  },
  RIDER: {
    id: "rider_vikram_01",
    name: "Vikram Singh",
    email: "rider.vikram@garbacholi.express",
    role: "RIDER",
    phone: "+91 98980 54321",
    avatar: "🛵",
    vehicleNumber: "KA 01 EK 4921",
    batteryPercent: 88,
    permissions: ['VIEW_ASSIGNMENTS', 'ACCEPT_ORDER', 'UPDATE_GPS', 'VERIFY_OTP']
  },
  DARK_STORE: {
    id: "staff_rahul_01",
    name: "Rahul Joshi",
    email: "picker.rahul@garbacholi.express",
    role: "DARK_STORE",
    phone: "+91 97240 67890",
    avatar: "🏬",
    stationId: "Station #H-02",
    storeId: "store_ahm_01",
    storeName: "AMD-01 Navrangpura Hub",
    permissions: ['VIEW_PICK_QUEUE', 'SCAN_BARCODE', 'OPTIMIZE_ROUTE', 'CONFIRM_PACK']
  },
  ADMIN: {
    id: "admin_vikrant_01",
    name: "Vikrant Sharma",
    email: "admin.ops@garbacholi.express",
    role: "ADMIN",
    phone: "+91 99090 99999",
    avatar: "🛡️",
    title: "Chief Operations Director",
    permissions: ['ALL', 'FULL_OPS', 'FLEET_DISPATCH', 'SURGE_PRICING', 'AUDIT_LEDGER']
  }
};

// -------------------------------------------------------------
// Auth State Management
// -------------------------------------------------------------
function getAuthUser() {
  try {
    const stored = localStorage.getItem('auth_user');
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  // Default to Customer
  const defaultCust = DEMO_ACCOUNTS.CUSTOMER;
  localStorage.setItem('auth_user', JSON.stringify(defaultCust));
  return defaultCust;
}

function setAuthUser(user) {
  localStorage.setItem('auth_user', JSON.stringify(user));
  window.dispatchEvent(new CustomEvent('auth_changed', { detail: user }));
}

function switchDemoUser(role) {
  const account = DEMO_ACCOUNTS[role.toUpperCase()];
  if (account) {
    setAuthUser(account);
    showToast(`Switched persona to ${account.name} (${account.role})`, 'success');
    return account;
  }
}

// -------------------------------------------------------------
// Toast Notifications System
// -------------------------------------------------------------
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚡'
  };

  toast.innerHTML = `
    <span style="font-size: 1.15rem">${icons[type] || '🔔'}</span>
    <span style="flex: 1">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

// -------------------------------------------------------------
// Currency Formatter
// -------------------------------------------------------------
function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

// -------------------------------------------------------------
// Resilient WebSocket Client with Auto-Reconnect
// -------------------------------------------------------------
class EventMeshClient {
  constructor() {
    this.ws = null;
    this.listeners = new Set();
    this.connected = false;
    this.reconnectTimer = null;
    this.init();
  }

  init() {
    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        this.connected = true;
        this.updateMeshUI(true);
        console.log("📡 Connected to Event Mesh WebSocket:", WS_URL);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.notifyListeners(data);
        } catch (e) {
          console.warn("WS Parse Error", e);
        }
      };

      this.ws.onclose = () => {
        this.connected = false;
        this.updateMeshUI(false);
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.connected = false;
        this.updateMeshUI(false);
      };
    } catch (e) {
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.init();
    }, 3000);
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(data) {
    this.listeners.forEach((cb) => {
      try { cb(data); } catch (e) { console.error(e); }
    });
  }

  updateMeshUI(isConnected) {
    const dot = document.getElementById('nav-mesh-dot');
    const label = document.getElementById('nav-mesh-label');
    if (dot && label) {
      if (isConnected) {
        dot.className = 'mesh-dot connected';
        label.innerText = 'Live Mesh';
      } else {
        dot.className = 'mesh-dot';
        label.innerText = 'Mesh Syncing';
      }
    }
  }
}

const eventMesh = new EventMeshClient();

// -------------------------------------------------------------
// Shared Navigation Bar Component
// -------------------------------------------------------------
function renderNavbar(activePage = 'customer') {
  const user = getAuthUser();
  const navPlaceholder = document.getElementById('navbar-mount');
  if (!navPlaceholder) return;

  navPlaceholder.innerHTML = `
    <nav class="navbar">
      <div class="nav-container">
        <!-- Brand -->
        <a href="index.html" class="brand-wrapper">
          <div class="brand-logo-icon">✨</div>
          <div class="brand-text">
            <h1 style="display: flex; align-items: center; margin: 0; line-height: 1;"><span class="y" style="background: var(--festive-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 1.6rem; letter-spacing: -0.01em;">Ghera</span></h1>
            <span class="brand-badge">⚡ 13 MINS</span>
          </div>
        </a>

        <!-- Portal Links -->
        <div class="nav-links">
          <a href="index.html" class="nav-link ${activePage === 'customer' ? 'active' : ''}">
            🛍️ Storefront
          </a>
          <a href="rider.html" class="nav-link ${activePage === 'rider' ? 'active' : ''}">
            🛵 Delivery Partner
          </a>
          <a href="darkstore.html" class="nav-link ${activePage === 'darkstore' ? 'active' : ''}">
            🏬 Dark Store Hub
          </a>
          <a href="admin.html" class="nav-link ${activePage === 'admin' ? 'active' : ''}">
            🛡️ Command Center
          </a>
          <a href="topology.html" class="nav-link ${activePage === 'topology' ? 'active' : ''}">
            📡 Topology Mesh
          </a>
          <a href="auth.html" class="nav-link ${activePage === 'auth' ? 'active' : ''}">
            🔑 Auth & RBAC
          </a>
        </div>

        <!-- Right Indicators & Persona -->
        <div class="nav-actions">
          <div class="store-selector-pill" title="Serving Hub">
            <span>📍</span>
            <span id="nav-active-hub">AMD-01 Navrangpura</span>
          </div>

          <div class="surge-pill" id="nav-surge-pill" title="Dynamic Pricing Engine">
            <span>⚡</span>
            <span id="nav-surge-text">1.0x Normal</span>
          </div>

          <div class="mesh-indicator" title="Kafka WebSocket Mesh State">
            <div id="nav-mesh-dot" class="mesh-dot ${eventMesh.connected ? 'connected' : ''}"></div>
            <span id="nav-mesh-label">${eventMesh.connected ? 'Live Mesh' : 'Mesh Syncing'}</span>
          </div>

          <!-- Persona Badge with Dropdown -->
          <div class="persona-badge" id="nav-persona-btn" onclick="togglePersonaDropdown()" title="Switch Persona / Role">
            <div class="persona-avatar">${user.avatar || '👤'}</div>
            <span class="persona-name">${user.name.split(' ')[0]}</span>
            <span class="persona-role">${user.role}</span>
          </div>

          ${activePage === 'customer' ? `
            <button class="cart-btn" id="open-cart-btn" onclick="toggleCartDrawer()">
              <span>🛍️</span>
              <span>Bag</span>
              <span class="cart-counter" id="cart-counter-badge">0</span>
            </button>
          ` : ''}
        </div>
      </div>
    </nav>

    <!-- Persona Switcher Dropdown Modal -->
    <div id="persona-dropdown-modal" class="modal-overlay" onclick="closePersonaDropdown(event)">
      <div class="modal-content" style="max-width: 440px;" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h3 class="modal-title">Switch Active Persona</h3>
          <button class="modal-close" onclick="closePersonaDropdown()">×</button>
        </div>
        <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 1.25rem;">
          Select any of the 4 full-system personas to test RBAC, order flow, dispatch and administrative capabilities:
        </p>
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          ${Object.values(DEMO_ACCOUNTS).map(acc => `
            <div onclick="selectPersona('${acc.role}')" style="
              display: flex; align-items: center; justify-content: space-between;
              padding: 0.85rem 1rem; border-radius: var(--radius-sm);
              background: ${user.role === acc.role ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.04)'};
              border: 1px solid ${user.role === acc.role ? 'var(--festive-gold)' : 'var(--border-subtle)'};
              cursor: pointer; transition: 0.2s ease;
            ">
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <span style="font-size: 1.4rem;">${acc.avatar}</span>
                <div>
                  <div style="font-weight: 700; color: #fff;">${acc.name}</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">${acc.email}</div>
                </div>
              </div>
              <span class="badge ${acc.role === 'ADMIN' ? 'badge-rose' : (acc.role === 'RIDER' ? 'badge-cyan' : (acc.role === 'DARK_STORE' ? 'badge-purple' : 'badge-gold'))}">
                ${acc.role}
              </span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // Fetch current surge status
  fetch(`${API_BASE}/api/pricing/rules`)
    .then(r => r.json())
    .then(data => {
      if (data && data.surgeMultiplier) {
        updateSurgeUI(data.surgeMultiplier);
      }
    }).catch(() => {});
}

function updateSurgeUI(multiplier) {
  const pill = document.getElementById('nav-surge-pill');
  const text = document.getElementById('nav-surge-text');
  if (pill && text) {
    text.innerText = `${multiplier}x Surge`;
    if (multiplier > 1.0) {
      pill.className = 'surge-pill high';
    } else {
      pill.className = 'surge-pill';
      text.innerText = '1.0x Normal';
    }
  }
}

function togglePersonaDropdown() {
  const modal = document.getElementById('persona-dropdown-modal');
  if (modal) modal.classList.toggle('active');
}

function closePersonaDropdown(e) {
  const modal = document.getElementById('persona-dropdown-modal');
  if (modal) modal.classList.remove('active');
}

function selectPersona(role) {
  switchDemoUser(role);
  closePersonaDropdown();
  setTimeout(() => window.location.reload(), 200);
}

// Listen to WebSocket events globally to update surge or notifications
eventMesh.subscribe((msg) => {
  if (msg.type === 'KAFKA_EVENT' && msg.event) {
    const { topic, payload } = msg.event;
    if (topic === 'pricing.surge.updated' && payload && payload.multiplier) {
      updateSurgeUI(payload.multiplier);
      showToast(`⚡ Surge Pricing updated to ${payload.multiplier}x`, 'warning');
    }
  } else if (msg.type === 'AGENT_DECISION' && msg.action === 'SURGE_MULTIPLIER_UPDATED') {
    if (msg.decision && msg.decision.surge_multiplier) {
      updateSurgeUI(msg.decision.surge_multiplier);
    }
  }
});

// Export to window
window.API_BASE = API_BASE;
window.FASTAPI_BASE = FASTAPI_BASE;
window.WS_URL = WS_URL;
window.DEMO_ACCOUNTS = DEMO_ACCOUNTS;
window.getAuthUser = getAuthUser;
window.setAuthUser = setAuthUser;
window.switchDemoUser = switchDemoUser;
window.showToast = showToast;
window.formatINR = formatINR;
window.eventMesh = eventMesh;
window.renderNavbar = renderNavbar;
