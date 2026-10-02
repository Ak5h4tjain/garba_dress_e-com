// API Key Management Microservice
// Manages API keys, scopes, client types, and access validation for decoupled systems

export const CLIENT_TYPES = {
  CUSTOMER: "CUSTOMER_APP",
  RIDER: "RIDER_APP",
  WAREHOUSE: "WAREHOUSE_APP",
  ADMIN: "ADMIN_APP"
};

export const DEFAULT_API_KEYS = {
  CUSTOMER: {
    id: "key_cust_prod_01",
    apiKey: "gcb_live_cust_7f9a2b1c4e6d",
    clientType: CLIENT_TYPES.CUSTOMER,
    name: "Customer Web & Mobile Client",
    description: "Public client key for catalog browsing, cart operations, orders, and courier tracking",
    scopes: ["catalog:read", "cart:write", "orders:create", "orders:read_own", "pricing:quote", "auth:customer"],
    status: "ACTIVE",
    rateLimit: 120, // req/min
    createdAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
    totalCalls: 1420
  },
  RIDER: {
    id: "key_rider_prod_02",
    apiKey: "gcb_live_rider_8e3c1a9f5d2b",
    clientType: CLIENT_TYPES.RIDER,
    name: "Delivery Fleet Partner Terminal",
    description: "Driver terminal key for real-time dispatch, GPS telemetry, and OTP delivery verification",
    scopes: ["dispatch:read", "dispatch:accept", "dispatch:telemetry", "orders:update_delivery", "payout:read", "auth:rider"],
    status: "ACTIVE",
    rateLimit: 300,
    createdAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
    totalCalls: 860
  },
  WAREHOUSE: {
    id: "key_wh_prod_03",
    apiKey: "gcb_live_wh_3d5b7a1f9e2c",
    clientType: CLIENT_TYPES.WAREHOUSE,
    name: "Dark Store Warehouse Fulfillment Station",
    description: "Warehouse terminal key for pick queue, barcode scanning, packing SLA, and store inventory",
    scopes: ["warehouse:pick_queue", "warehouse:scan", "warehouse:pack", "inventory:read", "inventory:update", "auth:warehouse"],
    status: "ACTIVE",
    rateLimit: 300,
    createdAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
    totalCalls: 540
  },
  ADMIN: {
    id: "key_admin_master_00",
    apiKey: "gcb_live_admin_master_0a1b2c3d4e5f",
    clientType: CLIENT_TYPES.ADMIN,
    name: "Operations Control Tower Root Master Key",
    description: "Master administrative key with unconstrained root access to all apps and data manipulation",
    scopes: ["*"], // Root access
    status: "ACTIVE",
    rateLimit: 1000,
    createdAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
    totalCalls: 310
  }
};

class ApiKeyService {
  constructor() {
    this.keys = new Map();
    // Seed initial keys
    Object.values(DEFAULT_API_KEYS).forEach(k => {
      this.keys.set(k.apiKey, { ...k });
    });
  }

  getAllKeys() {
    return Array.from(this.keys.values());
  }

  getKeyByValue(apiKey) {
    if (!apiKey) return null;
    return this.keys.get(apiKey) || null;
  }

  getKeyById(id) {
    for (const key of this.keys.values()) {
      if (key.id === id) return key;
    }
    return null;
  }

  generateKey({ clientType, name, scopes, description }) {
    const randomHex = Math.random().toString(16).substring(2, 14);
    const prefix = clientType === CLIENT_TYPES.CUSTOMER ? "cust"
      : clientType === CLIENT_TYPES.RIDER ? "rider"
      : clientType === CLIENT_TYPES.WAREHOUSE ? "wh"
      : "admin";

    const apiKey = `gcb_live_${prefix}_${randomHex}`;
    const id = `key_${prefix}_${Date.now().toString(36)}`;

    const newKey = {
      id,
      apiKey,
      clientType: clientType || CLIENT_TYPES.CUSTOMER,
      name: name || `New ${prefix.toUpperCase()} Client Key`,
      description: description || `Client access key generated on ${new Date().toLocaleDateString()}`,
      scopes: scopes || (clientType === CLIENT_TYPES.ADMIN ? ["*"] : ["catalog:read"]),
      status: "ACTIVE",
      rateLimit: clientType === CLIENT_TYPES.ADMIN ? 1000 : 200,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      totalCalls: 0
    };

    this.keys.set(apiKey, newKey);
    return newKey;
  }

  revokeKey(keyId) {
    const key = this.getKeyById(keyId);
    if (!key) return { success: false, error: "API Key not found" };

    key.status = "REVOKED";
    key.revokedAt = new Date().toISOString();
    return { success: true, key };
  }

  validateKey(apiKey, requiredScope = null) {
    if (!apiKey) {
      return { valid: false, error: "Missing API Key header (x-api-key)" };
    }

    const keyRecord = this.keys.get(apiKey);
    if (!keyRecord) {
      return { valid: false, error: "Invalid API Key" };
    }

    if (keyRecord.status !== "ACTIVE") {
      return { valid: false, error: `API Key is ${keyRecord.status}` };
    }

    // Check scope if specified
    if (requiredScope) {
      const hasScope = keyRecord.scopes.includes("*") || keyRecord.scopes.includes(requiredScope);
      if (!hasScope) {
        return {
          valid: false,
          error: `API Key lacks required scope: ${requiredScope}`,
          keyRecord
        };
      }
    }

    // Record usage
    keyRecord.lastUsedAt = new Date().toISOString();
    keyRecord.totalCalls += 1;

    return { valid: true, keyRecord };
  }
}

export const apiKeyService = new ApiKeyService();
