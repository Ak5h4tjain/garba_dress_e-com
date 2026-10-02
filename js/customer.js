// ==============================================================
// GarbaCholi.Express - ZIPT Fast-Fashion Logic & Real Backend Bridge
// ==============================================================

const $ = s => document.querySelector(s);

let products = [];
let categories = ["All"];
let activeCat = "All";
let cart = [];
let selectedIndex = null;
let appliedPromo = "";
let trackingAnim = null;
let activeOrderId = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  loadCart();
  loadProductsFromBackend();
  initTheme();
  initCursor();
  initMarquee();
  initWebSocket();
});

// -------------------------------------------------------------
// 1. Backend Data Fetching
// -------------------------------------------------------------
async function loadProductsFromBackend() {
  try {
    const res = await fetch(`${API_BASE}/api/catalog/products`);
    if (res.ok) {
      const data = await res.json();
      products = data.map((p, idx) => ({
        id: p.id,
        name: p.name,
        category: p.category || "Chaniya Choli",
        price: p.price || 3499,
        mrp: p.mrp || p.price * 1.5,
        imageUrl: p.imageUrl || "/garba_black_mirror.jpg",
        flare: p.flare || "10.5m Full Circle Gher",
        fabric: p.fabric || "Pure Cotton with Convex Glass Mirrors",
        sizes: p.sizes || ["S (36)", "M (38)", "L (40)", "XL (42)"],
        etaMins: 6 + (idx * 2) % 6,
        lowStock: idx % 3 === 0
      }));
    } else {
      useFallbackCatalog();
    }
  } catch (err) {
    useFallbackCatalog();
  }

  // Extract unique categories
  const catSet = new Set(products.map(p => p.category));
  categories = ["All", ...Array.from(catSet)];

  renderRail();
  renderGrid();
}

function useFallbackCatalog() {
  products = [
    {
      id: "prod_garba_gamthi_01",
      name: "Royal Kutchhi Gamthi Real Mirror Work Choli",
      category: "Chaniya Choli",
      price: 3499,
      mrp: 5999,
      imageUrl: "/garba_black_mirror.jpg",
      flare: "10.5m Full Circle Gher",
      fabric: "Pure Khadi Cotton with Real Convex Glass Mirrors",
      sizes: ["S", "M", "L", "XL"],
      etaMins: 8,
      lowStock: true
    },
    {
      id: "prod_garba_peacock_02",
      name: "Festive Kalidar Twirl Chaniya Choli in Peacock Blue",
      category: "Chaniya Choli",
      price: 3899,
      mrp: 6499,
      imageUrl: "/garba_choli_hero.jpg",
      flare: "12m Super-Flared Gher",
      fabric: "Pure Cotton with Foil Mirror & Brass Ghungroo",
      sizes: ["S", "M", "L", "XL"],
      etaMins: 10,
      lowStock: false
    },
    {
      id: "prod_dandiya_wooden_09",
      name: "Handcrafted Wooden Dandiya with Brass Ghungroo",
      category: "Dandiya Sticks",
      price: 399,
      mrp: 799,
      imageUrl: "/garba_dandiya_jewelry.jpg",
      flare: "Artisan Hardwood",
      fabric: "Silk Thread Wrap with Acoustic Bells",
      sizes: ["Standard Pair"],
      etaMins: 7,
      lowStock: false
    },
    {
      id: "prod_jewel_oxidized_06",
      name: "Royal Kutchhi Oxidized Silver Choker & Jhumkas",
      category: "Traditional Jewelry",
      price: 1299,
      mrp: 2499,
      imageUrl: "/garba_dandiya_jewelry.jpg",
      flare: "German Silver",
      fabric: "Anti-tarnish Coin Latkans",
      sizes: ["Free Size"],
      etaMins: 9,
      lowStock: true
    }
  ];
}

// -------------------------------------------------------------
// 2. Category Rail & Grid Rendering
// -------------------------------------------------------------
function renderRail() {
  const rail = $("#rail");
  if (!rail) return;
  rail.innerHTML = categories.map(c => `
    <button class="chip ${c === activeCat ? 'active' : ''}" data-c="${c}" aria-pressed="${c === activeCat}">
      ${c}
    </button>
  `).join("");
}

$("#rail")?.addEventListener("click", e => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  activeCat = chip.dataset.c;
  renderRail();
  renderGrid();
});

function renderGrid() {
  const grid = $("#grid");
  if (!grid) return;

  const filtered = products
    .map((p, idx) => ({ p, idx }))
    .filter(o => activeCat === "All" || o.p.category === activeCat);

  grid.innerHTML = filtered.map(({ p, idx }, k) => `
    <article class="card" style="animation-delay: ${k * 60}ms">
      <div class="img" data-idx="${idx}" data-cur="View">
        <img src="${p.imageUrl}" alt="${p.name}" loading="lazy" onerror="this.src='/garba_black_mirror.jpg'" />
        <span class="badge">⚡ ${p.etaMins} min drop</span>
        <button class="add" data-idx="${idx}" aria-label="Add ${p.name}">+</button>
      </div>
      <div class="meta">
        <div>
          <h3>${p.name}</h3>
          <small>${p.flare || p.category}</small>
        </div>
        <span>₹${p.price}</span>
      </div>
    </article>
  `).join("");
}

// -------------------------------------------------------------
// 3. Size Selector Bottom Sheet
// -------------------------------------------------------------
$("#grid")?.addEventListener("click", e => {
  const img = e.target.closest(".img");
  const addBtn = e.target.closest(".add");
  if (addBtn) {
    e.stopPropagation();
    openSheet(+addBtn.dataset.idx);
  } else if (img) {
    openSheet(+img.dataset.idx);
  }
});

function openSheet(idx) {
  selectedIndex = idx;
  const p = products[idx];
  if (!p) return;

  $("#shn").textContent = p.name;
  const sizes = p.sizes || ["S", "M", "L", "XL"];

  $("#szs").innerHTML = sizes.map((s, k) => {
    const isLow = p.lowStock && k === sizes.length - 1;
    return `
      <button class="sz" data-size="${s}">
        ${s}
        ${isLow ? "<u></u>" : ""}
      </button>
    `;
  }).join("");

  $("#sh")?.classList.add("on");
  $("#sc")?.classList.add("on");
}

$("#szs")?.addEventListener("click", e => {
  const btn = e.target.closest(".sz");
  if (!btn || btn.disabled) return;

  const size = btn.dataset.size;
  const existing = cart.find(x => x.idx === selectedIndex && x.size === size);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ idx: selectedIndex, size, qty: 1 });
  }

  saveCart();
  closeAll();
  renderCart();
  bumpBag();

  showToast(`Added ${products[selectedIndex].name} (${size}) to your bag!`, 'success');
  setTimeout(() => {
    $("#dr")?.classList.add("on");
    $("#sc")?.classList.add("on");
  }, 220);
});

function closeAll() {
  $("#sh")?.classList.remove("on");
  $("#dr")?.classList.remove("on");
  $("#sc")?.classList.remove("on");
}

$("#sc")?.addEventListener("click", closeAll);
$("#dx")?.addEventListener("click", closeAll);
$("#cb")?.addEventListener("click", () => {
  renderCart();
  $("#dr")?.classList.add("on");
  $("#sc")?.classList.add("on");
});

function bumpBag() {
  const cb = $("#cb");
  if (cb) {
    cb.animate([
      { transform: "scale(1)" },
      { transform: "scale(1.22)" },
      { transform: "scale(1)" }
    ], { duration: 380, easing: "cubic-bezier(.3,1.6,.5,1)" });
  }
}

// -------------------------------------------------------------
// 4. Shopping Bag Drawer & Pricing Calculation
// -------------------------------------------------------------
function saveCart() {
  try {
    localStorage.setItem("zipt-cart", JSON.stringify(cart));
  } catch (e) {}
}

function loadCart() {
  try {
    cart = JSON.parse(localStorage.getItem("zipt-cart") || "[]");
  } catch (e) { cart = []; }
}

function renderCart() {
  const totalCount = cart.reduce((a, x) => a + x.qty, 0);
  $("#cn").textContent = totalCount;

  const list = $("#ci");
  if (!list) return;

  if (cart.length === 0) {
    list.innerHTML = `<p style="color:var(--mute); padding: 24px 0;">Your bag is empty. Tap + on any piece to try it at your door.</p>`;
    $("#tot").textContent = "₹0";
    $("#pay").disabled = true;
    return;
  }

  list.innerHTML = cart.map((x, k) => {
    const p = products[x.idx];
    if (!p) return "";
    return `
      <div class="row">
        <div class="thumb">
          <img src="${p.imageUrl}" alt="${p.name}" onerror="this.src='/garba_black_mirror.jpg'" />
        </div>
        <div style="flex: 1">
          <div style="font-weight: 500; font-size: 14px;">${p.name}</div>
          <small style="color:var(--mute)">Size ${x.size} · ₹${p.price}</small>
        </div>
        <button class="ib" data-k="${k}" data-d="-1">−</button>
        <span style="font-weight: 600; min-width: 16px; text-align: center;">${x.qty}</span>
        <button class="ib" data-k="${k}" data-d="1">+</button>
      </div>
    `;
  }).join("");

  const rawSubtotal = cart.reduce((a, x) => a + (x.qty * (products[x.idx]?.price || 0)), 0);
  const discount = appliedPromo === "GARBA15" ? Math.round(rawSubtotal * 0.15) : 0;
  const finalTotal = Math.max(0, rawSubtotal - discount);

  $("#promo-val").textContent = discount > 0 ? `-₹${discount}` : "₹0";
  $("#tot").textContent = `₹${finalTotal}`;
  $("#pay").disabled = false;
}

$("#ci")?.addEventListener("click", e => {
  const b = e.target.closest("[data-k]");
  if (!b) return;
  const k = +b.dataset.k;
  const d = +b.dataset.d;
  cart[k].qty += d;
  if (cart[k].qty <= 0) cart.splice(k, 1);
  saveCart();
  renderCart();
});

$("#try")?.addEventListener("click", e => {
  const cur = e.currentTarget.getAttribute("aria-pressed") === "true";
  e.currentTarget.setAttribute("aria-pressed", !cur);
  showToast(!cur ? "Try-at-door enabled: 15 mins trial with courier waiting!" : "Standard rapid handover selected", "info");
});

function applyPromo() {
  const val = ($("#promo-input")?.value || "").trim().toUpperCase();
  if (val === "GARBA15") {
    appliedPromo = "GARBA15";
    showToast("🎉 Festive 15% discount applied!", "success");
    renderCart();
  } else {
    showToast("Invalid promo. Try GARBA15", "error");
  }
}

// -------------------------------------------------------------
// 5. Checkout & Real-Time Backend Integration
// -------------------------------------------------------------
$("#pay")?.addEventListener("click", async () => {
  if (cart.length === 0) return;

  const btn = $("#pay");
  btn.disabled = true;
  btn.textContent = "Dispatching 10-Min Courier...";

  const user = getAuthUser();
  const cartItems = cart.map(x => ({
    productId: products[x.idx]?.id || "prod_garba_gamthi_01",
    name: `${products[x.idx]?.name} (Size ${x.size})`,
    price: products[x.idx]?.price || 3499,
    quantity: x.qty
  }));

  try {
    // 1. Create order on Node.js Gateway
    const orderRes = await fetch(`${API_BASE}/api/orders/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: user.id || "usr_priya_01",
        storeId: "store_ahm_01",
        items: cartItems,
        deliveryAddress: "Flat 402, Shivam Residency, Navrangpura, Ahmedabad",
        paymentMethod: "UPI",
        promoCode: appliedPromo
      })
    });

    if (!orderRes.ok) {
      throw new Error("Order creation failed");
    }

    const order = await orderRes.json();
    activeOrderId = order.id;

    // 2. Sign Genesis block on FastAPI Antigravity Engine
    try {
      const sealRes = await fetch(`${FASTAPI_BASE}/api/v1/orders/sign-transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: order.id,
          current_status: "CREATED",
          target_status: "PAID",
          author_role: "CUSTOMER",
          metadata: { total: order.total }
        })
      });
      if (sealRes.ok) {
        const seal = await sealRes.json();
        $("#hash-seal").textContent = `Block #${seal.block_index} (${seal.state_hash.substring(0, 12)}...)`;
      }
    } catch (e) {}

    // Reset cart and start live tracking animation
    cart = [];
    saveCart();
    renderCart();
    closeAll();

    startOrderTracking(order);
    showToast(`Order #${order.orderNumber || order.id} placed! Courier on the way.`, "success");

  } catch (err) {
    showToast(`Checkout failed: ${err.message}`, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Pay with UPI & Launch Courier (10m)";
  }
});

// -------------------------------------------------------------
// 6. Live SVG Order Tracking Overlay
// -------------------------------------------------------------
function startOrderTracking(order) {
  const tk = $("#tk");
  if (!tk) return;
  tk.classList.add("on");

  $("#otp-display").textContent = order.deliveryOtp || "4821";

  const path = $("#rt");
  const len = path.getTotalLength();
  const rd = $("#rd");
  const t0 = performance.now();
  const dur = 60000; // 60s demo cycle

  ["s0", "s1", "s2", "s3"].forEach((s, k) => $(`#${s}`).classList.toggle("on", k === 0));

  cancelAnimationFrame(trackingAnim);

  function animateTracker(now) {
    const t = Math.min((now - t0) / dur, 1);
    const left = Math.ceil(600 * (1 - t)); // 10 min countdown in demo speed
    
    $("#tc").textContent = `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;

    const stage = t < 0.25 ? 0 : (t < 0.55 ? 1 : (t < 0.9 ? 2 : 3));
    ["s0", "s1", "s2", "s3"].forEach((s, k) => $(`#${s}`).classList.toggle("on", k <= stage));

    $("#ts").textContent = [
      "Packing your order at AMD-01 Hub",
      "Courier Vikram picked up sealed bag",
      "Ather 450X en route to Shivam Residency",
      "Delivered! Try it at your door."
    ][stage];

    const mv = Math.max(0, (t - 0.1) / 0.9);
    const pt = path.getPointAtLength(len * mv);
    rd.setAttribute("cx", pt.x);
    rd.setAttribute("cy", pt.y);

    if (t < 1) {
      trackingAnim = requestAnimationFrame(animateTracker);
    }
  }

  trackingAnim = requestAnimationFrame(animateTracker);
}

$("#tx")?.addEventListener("click", () => {
  cancelAnimationFrame(trackingAnim);
  $("#tk")?.classList.remove("on");
});

// -------------------------------------------------------------
// 7. WebSocket Event Mesh Listener
// -------------------------------------------------------------
function initWebSocket() {
  eventMesh.subscribe((data) => {
    if (data.type === "KAFKA_EVENT" && data.event) {
      const { topic, payload } = data.event;
      if (activeOrderId && (payload.orderId === activeOrderId || (payload.order && payload.order.id === activeOrderId))) {
        const order = payload.order || payload;
        if (order.status) {
          showToast(`Live update: Order is now ${order.status}`, "info");
        }
      }
    }
  });
}

// -------------------------------------------------------------
// 8. Marquee, Theme & Fluid Magnetic Cursor
// -------------------------------------------------------------
function initMarquee() {
  const mq = $("#mq");
  if (mq) {
    mq.textContent = ("⚡ 10 min to Ahmedabad · 1,200+ real mirrors · Try at door · Free returns · SHA-256 state seal · ").repeat(8);
  }
}

function initTheme() {
  const th = $("#th");
  if (!th) return;
  th.onclick = () => {
    const doc = document.documentElement;
    const isDark = doc.dataset.theme !== "light";
    doc.dataset.theme = isDark ? "light" : "dark";
    th.textContent = isDark ? "Dark" : "Light";
  };
}

function initCursor() {
  const cur = $("#cur");
  if (!cur) return;

  let cx = 0, cy = 0, tx = 0, ty = 0;

  window.addEventListener("pointermove", e => {
    tx = e.clientX;
    ty = e.clientY;

    const img = e.target.closest(".img");
    const add = e.target.closest(".add");

    if (img) {
      cur.classList.add("big");
      cur.textContent = add ? "Add" : "View";
    } else {
      cur.classList.remove("big");
      cur.textContent = "";
    }

    // Magnetic pull for add button
    document.querySelectorAll(".add").forEach(b => {
      const r = b.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      b.style.transform = Math.hypot(dx, dy) < 85 
        ? `translate(${dx * 0.22}px, ${dy * 0.22}px) scale(1.12)` 
        : "";
    });
  });

  function renderCursor() {
    cx += (tx - cx) * 0.22;
    cy += (ty - cy) * 0.22;
    cur.style.transform = `translate(${cx}px, ${cy}px)`;
    requestAnimationFrame(renderCursor);
  }
  renderCursor();
}

// Countdown in Hero Section
let s = 600;
setInterval(() => {
  s = s <= 0 ? 600 : s - 1;
  const clk = $("#clk");
  if (clk) {
    clk.textContent = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }
}, 1000);

// Exports
window.openSheet = openSheet;
window.applyPromo = applyPromo;
