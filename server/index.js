// Quick Commerce Central Server & Microservices Engine
import express from "express";
import cors from "cors";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";

import { CONFIG } from "./config.js";
import { apiGateway } from "./services/gateway/index.js";
import { catalogService } from "./services/catalog/index.js";
import { inventoryService } from "./services/inventory/index.js";
import { cartOrdersService } from "./services/cart-orders/index.js";
import { pricingService } from "./services/pricing/index.js";
import { paymentsService } from "./services/payments/index.js";
import { dispatchService } from "./services/dispatch/index.js";
import { notificationsService } from "./services/notifications/index.js";
import { usersAuthService } from "./services/users-auth/index.js";
import { apiKeyService } from "./services/api-keys/index.js";

import { kafka } from "./event-bus/kafka-simulator.js";
import { postgresDB } from "./storage/postgres-db.js";
import { redisStore } from "./storage/redis-store.js";
import { elasticsearch } from "./storage/elasticsearch.js";
import { objectStore } from "./storage/object-store.js";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());
app.use(express.static(rootDir));

// Apply Gateway Middlewares
app.use((req, res, next) => apiGateway.cdnMiddleware(req, res, next));
app.use((req, res, next) => apiGateway.rateLimiterMiddleware(req, res, next));

// API Key Validation Middleware for Decoupled App Systems
app.use((req, res, next) => {
  const apiKey = req.headers["x-api-key"] || req.query.apiKey;
  if (apiKey) {
    const validation = apiKeyService.validateKey(apiKey);
    if (validation.valid) {
      req.apiKey = validation.keyRecord;
    }
  }
  next();
});

// ==========================================
// WEBSOCKET HUB & KAFKA BRIDGE
// ==========================================
const connectedClients = new Set();

wss.on("connection", (ws) => {
  connectedClients.add(ws);

  // Send initial handshake state
  ws.send(JSON.stringify({
    type: "SYSTEM_CONNECTED",
    payload: {
      message: "Connected to Quick Commerce Event Mesh & WebSocket Hub",
      stores: CONFIG.DARK_STORES,
      timestamp: new Date().toISOString()
    }
  }));

  ws.on("close", () => {
    connectedClients.delete(ws);
  });
});

// Broadcast any Kafka event to all connected apps in real-time & forward to FastAPI Event Mesh!
kafka.onAnyMessage((eventRecord) => {
  const messageStr = JSON.stringify({
    type: "KAFKA_EVENT",
    event: eventRecord
  });

  connectedClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });

  // Forward to FastAPI Antigravity Broker
  fetch("http://localhost:8000/api/v1/events/broadcast", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      channel: "ALL",
      event_type: "KAFKA_EVENT",
      payload: eventRecord,
      source: "NODE_GATEWAY"
    })
  }).catch(() => {});
});

// Automated GPS Simulation Ticker for Active Dispatches
setInterval(() => {
  const activeDispatches = dispatchService.getAllActiveDispatches();
  activeDispatches.forEach(dispatch => {
    const order = postgresDB.getOrderById(dispatch.orderId);
    if (order && order.status === CONFIG.ORDER_STATUS.OUT_FOR_DELIVERY && dispatch.progressPct < 1.0) {
      dispatchService.updateTelemetry(dispatch.orderId, 0.08);
    }
  });
}, 3000);

// ==========================================
// REST API ROUTES
// ==========================================

// 1. Gateway Status & Architecture Topology State
app.get("/api/topology/status", (req, res) => {
  res.json({
    gateway: apiGateway.getMetrics(),
    darkStores: CONFIG.DARK_STORES,
    services: {
      catalog: { status: "HEALTHY", itemsCount: elasticsearch.getAllProducts().length },
      inventory: { status: "HEALTHY", storesCount: CONFIG.DARK_STORES.length },
      cartOrders: { status: "HEALTHY", activeOrdersCount: postgresDB.getAllOrders().length },
      pricing: { status: "HEALTHY", surgeMultiplier: pricingService.surgeMultiplier },
      payments: { status: "HEALTHY", activeMethods: ["UPI", "CARD", "COD"] },
      dispatch: { status: "HEALTHY", activeDispatches: dispatchService.getAllActiveDispatches().length },
      notifications: { status: "HEALTHY", sentCount: notificationsService.getNotifications().length },
      usersAuth: { status: "HEALTHY", usersCount: postgresDB.getAllUsers().length }
    },
    eventBus: {
      topics: kafka.getTopicsSummary(),
      totalEvents: kafka.messageLog.length,
      connectedClients: connectedClients.size
    },
    storage: {
      postgres: { tables: ["users", "orders", "riders", "ledger"], ordersCount: postgresDB.getAllOrders().length },
      redis: redisStore.getStats(),
      elasticsearch: { indexedProducts: elasticsearch.getAllProducts().length },
      objectStore: {
        buckets: ["product-images", "invoices", "delivery-proofs"],
        invoicesCount: objectStore.listObjects("invoices").length
      }
    }
  });
});

// 2. Catalog Service Endpoints
app.get("/api/catalog/products", (req, res) => {
  const { query, category, minPrice, maxPrice, sortBy } = req.query;
  const products = catalogService.getProducts({
    query: query || "",
    category: category || "",
    minPrice: minPrice ? Number(minPrice) : 0,
    maxPrice: maxPrice ? Number(maxPrice) : 999999,
    sortBy: sortBy || "relevance"
  });
  res.json(products);
});

app.get("/api/catalog/categories", (req, res) => {
  res.json(catalogService.getCategories());
});

app.get("/api/catalog/products/:id", (req, res) => {
  const product = catalogService.getProductById(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
});

// 3. Inventory Service Endpoints
app.get("/api/inventory/store/:storeId", (req, res) => {
  const items = inventoryService.getStoreInventory(req.params.storeId);
  res.json(items);
});

app.post("/api/inventory/store/:storeId/update", (req, res) => {
  const { productId, newStock } = req.body;
  const updated = inventoryService.updateStock(req.params.storeId, productId, newStock);
  if (!updated) return res.status(400).json({ error: "Could not update stock" });
  res.json(updated);
});

// 4. Pricing Service Endpoints
app.get("/api/pricing/rules", (req, res) => {
  res.json(pricingService.getPricingRules());
});

app.post("/api/pricing/calculate", (req, res) => {
  const { items, promoCode } = req.body;
  const calculation = pricingService.calculateOrderTotal({ items, promoCode });
  res.json(calculation);
});

app.post("/api/pricing/surge", (req, res) => {
  const { multiplier } = req.body;
  const newSurge = pricingService.setSurgeMultiplier(multiplier);
  res.json({ surgeMultiplier: newSurge });
});

// 5. Cart & Orders Service Endpoints
app.post("/api/orders/create", (req, res) => {
  const { customerId, storeId, items, deliveryAddress, paymentMethod, promoCode } = req.body;
  const result = cartOrdersService.createOrder({
    customerId: customerId || "usr_priya_01",
    storeId: storeId || "store_blr_01",
    items,
    deliveryAddress,
    paymentMethod: paymentMethod || "UPI",
    promoCode
  });

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.status(201).json(result.order);
});

app.get("/api/orders", (req, res) => {
  const { customerId, storeId, riderId } = req.query;
  if (customerId) return res.json(postgresDB.getOrdersByCustomer(customerId));
  if (storeId) return res.json(postgresDB.getOrdersByStore(storeId));
  if (riderId) return res.json(postgresDB.getOrdersByRider(riderId));
  res.json(cartOrdersService.getAllOrders());
});

app.get("/api/orders/:id", (req, res) => {
  const order = cartOrdersService.getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json(order);
});

app.post("/api/orders/:id/transition", (req, res) => {
  const { newStatus, note } = req.body;
  const result = cartOrdersService.transitionOrder(req.params.id, newStatus, { note });
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.json(result.order);
});

// 6. Payments Service Endpoints
app.post("/api/payments/initiate", (req, res) => {
  const { orderId, amount, method, customerDetails } = req.body;
  const payment = paymentsService.initiatePayment({ orderId, amount, method, customerDetails });
  res.json(payment);
});

app.post("/api/payments/confirm", (req, res) => {
  const { txnId, status } = req.body;
  const result = paymentsService.confirmPayment({ txnId, status });
  res.json(result);
});

// 7. Dispatch & Rider Service Endpoints
app.get("/api/dispatch/riders", (req, res) => {
  res.json(postgresDB.getAllRiders());
});

app.get("/api/dispatch/order/:orderId", (req, res) => {
  const dispatch = dispatchService.getDispatchByOrder(req.params.orderId);
  res.json(dispatch || { message: "No active dispatch yet" });
});

app.post("/api/dispatch/order/:orderId/telemetry", (req, res) => {
  const { progressStep } = req.body;
  const updated = dispatchService.updateTelemetry(req.params.orderId, progressStep || 0.2);
  res.json(updated);
});

app.post("/api/dispatch/rider/:riderId/status", (req, res) => {
  const { status, batteryPercent } = req.body;
  const updated = postgresDB.updateRider(req.params.riderId, { status, batteryPercent });
  res.json(updated);
});

// 8. Notifications Service Endpoints
app.get("/api/notifications", (req, res) => {
  const { recipient } = req.query;
  res.json(notificationsService.getNotifications(recipient));
});

// 9. Users & Authentication / Authorization Endpoints
app.post("/api/auth/login", (req, res) => {
  const { email, password, role } = req.body;
  const result = usersAuthService.login({ email, password, role });
  res.json(result);
});

app.post("/api/auth/verify", (req, res) => {
  const token = req.headers["authorization"]?.replace("Bearer ", "") || req.body.token;
  const result = usersAuthService.verifyToken(token);
  res.json(result);
});

app.post("/api/auth/logout", (req, res) => {
  res.json({ success: true, message: "Logged out successfully" });
});

app.get("/api/auth/demo-accounts", (req, res) => {
  res.json(usersAuthService.getDemoAccounts());
});

app.get("/api/users/me", (req, res) => {
  const role = req.headers["x-user-role"] || "CUSTOMER";
  const auth = usersAuthService.authenticate(role);
  res.json(auth);
});

app.get("/api/users", (req, res) => {
  res.json(usersAuthService.getAllUsers());
});

// ==============================================================
// 11. ADMIN APP DATA MANIPULATION & API KEY MANAGEMENT SUITE
// ==============================================================

// A. API Key Management
app.get("/api/admin/api-keys", (req, res) => {
  res.json({
    success: true,
    keys: apiKeyService.getAllKeys()
  });
});

app.post("/api/admin/api-keys/generate", (req, res) => {
  const { clientType, name, scopes, description } = req.body;
  const newKey = apiKeyService.generateKey({ clientType, name, scopes, description });
  kafka.publish("admin.apikey.generated", newKey.id, newKey);
  res.json({ success: true, key: newKey });
});

app.post("/api/admin/api-keys/:id/revoke", (req, res) => {
  const result = apiKeyService.revokeKey(req.params.id);
  if (result.success) {
    kafka.publish("admin.apikey.revoked", req.params.id, result.key);
  }
  res.json(result);
});

app.post("/api/admin/api-keys/verify", (req, res) => {
  const { apiKey, requiredScope } = req.body;
  const result = apiKeyService.validateKey(apiKey, requiredScope);
  res.json(result);
});

// B. Catalog Product Manipulation (CRUD)
app.post("/api/admin/products", (req, res) => {
  const created = catalogService.createProduct(req.body);
  kafka.publish("catalog.product.created", created.id, created);
  res.json({ success: true, product: created });
});

app.put("/api/admin/products/:id", (req, res) => {
  const updated = catalogService.updateProduct(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: "Product not found" });
  kafka.publish("catalog.product.updated", updated.id, updated);
  res.json({ success: true, product: updated });
});

app.delete("/api/admin/products/:id", (req, res) => {
  const deleted = catalogService.deleteProduct(req.params.id);
  kafka.publish("catalog.product.deleted", req.params.id, { id: req.params.id });
  res.json({ success: true, deleted, id: req.params.id });
});

// C. Live Order Manipulation & Override
app.put("/api/admin/orders/:id", (req, res) => {
  const order = cartOrdersService.getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });

  const { status, riderId, riderName, etaMins, note, priority } = req.body;
  if (status && status !== order.status) {
    cartOrdersService.transitionOrder(order.id, status, { note: note || "Admin manual state override" });
  }
  if (riderId) order.riderId = riderId;
  if (riderName) order.riderName = riderName;
  if (etaMins !== undefined) order.etaMins = etaMins;
  if (priority !== undefined) order.priority = priority;

  postgresDB.upsertOrder(order);
  kafka.publish("order.manipulated.admin", order.id, { order, overrides: req.body });
  res.json({ success: true, order });
});

// D. Store Inventory Manipulation
app.put("/api/admin/inventory/:storeId/:productId", (req, res) => {
  const { stock, quantity, delta, aisle, bin } = req.body;
  const currentItem = inventoryService.getProductStock(req.params.storeId, req.params.productId);
  let newQty = stock !== undefined ? Number(stock) : (quantity !== undefined ? Number(quantity) : undefined);
  if (newQty === undefined && currentItem && delta !== undefined) {
    newQty = Math.max(0, currentItem.stock + Number(delta));
  }
  if (newQty === undefined) newQty = currentItem ? currentItem.stock : 10;

  const updated = inventoryService.updateStock(req.params.storeId, req.params.productId, newQty);
  if (updated && aisle) updated.aisle = aisle;
  if (updated && bin) updated.bin = bin;

  kafka.publish("inventory.manipulated.admin", `${req.params.storeId}:${req.params.productId}`, {
    storeId: req.params.storeId,
    productId: req.params.productId,
    item: updated || { stock: newQty }
  });

  res.json({ success: true, storeId: req.params.storeId, productId: req.params.productId, item: updated || { stock: newQty } });
});

// E. Rider Fleet Telemetry & Driver Status Manipulation
app.put("/api/admin/riders/:id", (req, res) => {
  const updated = postgresDB.updateRider(req.params.id, req.body);
  kafka.publish("rider.manipulated.admin", req.params.id, updated);
  res.json({ success: true, rider: updated });
});

// F. Dark Store Configuration & Dynamic Surge Manipulation
app.put("/api/admin/stores/:id", (req, res) => {
  const { surgeMultiplier, active, name } = req.body;
  const store = CONFIG.DARK_STORES.find(s => s.id === req.params.id);
  if (store) {
    if (surgeMultiplier !== undefined) store.surgeMultiplier = Number(surgeMultiplier);
    if (active !== undefined) store.active = active;
    if (name) store.name = name;
  }
  kafka.publish("store.settings.updated", req.params.id, store || req.body);
  res.json({ success: true, store });
});

// 10. Kafka Event Bus Logs & Replay Endpoints
app.get("/api/kafka/events", (req, res) => {
  const { limit, topic } = req.query;
  res.json(kafka.getMessageLog(limit ? Number(limit) : 50, topic));
});

app.post("/api/kafka/events", (req, res) => {
  const { topic, key, payload } = req.body;
  const event = kafka.publish(topic || "system.test", key, payload || {});
  res.json({ success: true, event });
});

app.post("/api/events/broadcast-mesh", (req, res) => {
  const messageStr = JSON.stringify(req.body);
  connectedClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
  res.json({ success: true, clientCount: connectedClients.size });
});

app.get("/api/kafka/topics", (req, res) => {
  res.json(kafka.getTopicsSummary());
});

// Redis Redlock Mutex Test Endpoint
app.post("/api/inventory/test-lock", (req, res) => {
  const { key, ttlMs } = req.body;
  const lockKey = key || "test:mutex:garba:choli:101";
  const lockToken = redisStore.acquireLock(lockKey, ttlMs || 4000);
  if (lockToken) {
    setTimeout(() => redisStore.releaseLock(lockKey, lockToken), 2000);
    return res.json({
      success: true,
      lockKey,
      lockToken,
      ttlMs: ttlMs || 4000,
      message: "Redlock distributed mutex acquired! Auto-releasing in 2s..."
    });
  }
  res.status(409).json({ success: false, error: "Resource currently locked by another worker" });
});

// 11. Storage Invoices and Data Viewer
app.get("/api/storage/invoices", (req, res) => {
  res.json(objectStore.listObjects("invoices"));
});

app.get("/api/storage/invoices/:key", (req, res) => {
  const obj = objectStore.getObject("invoices", req.params.key);
  if (!obj) return res.status(404).json({ error: "Invoice not found" });
  res.json(obj.data);
});

const PORT = CONFIG.PORT;
server.listen(PORT, () => {
  console.log(`⚡ Quick Commerce Central Gateway & Microservices running on port ${PORT}`);
  console.log(`📡 WebSocket Event Mesh listening on ws://localhost:${PORT}`);
});
