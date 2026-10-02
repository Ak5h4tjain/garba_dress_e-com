// Redis Simulation: In-Memory Key-Value, Distributed Locks, and Geospatial Cache
class RedisStore {
  constructor() {
    this.store = new Map();
    this.locks = new Map(); // key -> { owner, expiresAt }
    this.geoStore = new Map(); // riderId -> { lat, lng, lastSeen, heading }
    this.hitCount = 0;
    this.missCount = 0;
  }

  // Key-Value Cache
  set(key, value, ttlSeconds = 300) {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
    return "OK";
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) {
      this.missCount++;
      return null;
    }
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.missCount++;
      return null;
    }
    this.hitCount++;
    return entry.value;
  }

  del(key) {
    return this.store.delete(key);
  }

  // Distributed Stock Locks (Redis Redlock simulation)
  // Ensures two customers cannot simultaneously acquire the last stock item
  acquireStockLock(storeId, productId, requestedQty, ttlMs = 15000) {
    const lockKey = `stock_lock:${storeId}:${productId}`;
    const now = Date.now();
    const existing = this.locks.get(lockKey);

    if (existing && existing.expiresAt > now) {
      return { success: false, reason: "STOCK_LOCK_CONTENTION" };
    }

    const lockToken = "lock_" + Math.random().toString(36).substring(2, 9);
    this.locks.set(lockKey, {
      owner: lockToken,
      storeId,
      productId,
      requestedQty,
      expiresAt: now + ttlMs
    });

    return { success: true, lockToken, lockKey };
  }

  acquireLock(key, ttlMs = 5000) {
    const now = Date.now();
    const existing = this.locks.get(key);
    if (existing && existing.expiresAt > now) {
      return null;
    }
    const token = "lock_" + Math.random().toString(36).substring(2, 9);
    this.locks.set(key, { owner: token, expiresAt: now + ttlMs });
    return token;
  }

  releaseLock(key, token) {
    const existing = this.locks.get(key);
    if (existing && existing.owner === token) {
      this.locks.delete(key);
      return true;
    }
    return false;
  }

  releaseStockLock(lockKey, lockToken) {
    const existing = this.locks.get(lockKey);
    if (existing && existing.owner === lockToken) {
      this.locks.delete(lockKey);
      return true;
    }
    return false;
  }

  // Geospatial Tracking (Rider GPS positions)
  updateRiderLocation(riderId, lat, lng, heading = 0) {
    const data = {
      lat,
      lng,
      heading,
      lastSeen: new Date().toISOString()
    };
    this.geoStore.set(riderId, data);
    this.set(`rider_pos:${riderId}`, data, 60);
    return data;
  }

  getRiderLocation(riderId) {
    return this.geoStore.get(riderId) || null;
  }

  getAllActiveRiderLocations() {
    const locations = {};
    for (const [id, data] of this.geoStore.entries()) {
      locations[id] = data;
    }
    return locations;
  }

  getStats() {
    return {
      keysCount: this.store.size,
      activeLocks: this.locks.size,
      activeTrackedRiders: this.geoStore.size,
      hits: this.hitCount,
      misses: this.missCount
    };
  }

  getAllKeys() {
    return Array.from(this.store.keys());
  }
}

export const redisStore = new RedisStore();
