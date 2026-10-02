// Inventory Microservice: Stock per Store, Reserve/Deduct, Distributed Locks, Replenishment
import { CONFIG } from "../../config.js";
import { redisStore } from "../../storage/redis-store.js";
import { kafka } from "../../event-bus/kafka-simulator.js";
import { elasticsearch } from "../../storage/elasticsearch.js";

export class InventoryService {
  constructor() {
    this.storeStocks = new Map(); // storeId -> Map(productId -> { stock, reserved, aisle, bin, reorderLevel })
    this.seedInventory();
  }

  seedInventory() {
    const products = elasticsearch.getAllProducts();
    const aisles = [
      "Aisle 1 (Heavy Mirror Chaniya Choli)",
      "Aisle 2 (Kalidar Flared Lehengas)",
      "Aisle 3 (Bandhani & Silk Dupattas)",
      "Aisle 4 (Ghungroo & LED Dandiya)",
      "Aisle 5 (Oxidized Silver Jewelry)",
      "Aisle 6 (Men's Kediyu & Kids)"
    ];
    
    CONFIG.DARK_STORES.forEach(store => {
      const stockMap = new Map();
      products.forEach((p, idx) => {
        const aisle = aisles[idx % aisles.length];
        const bin = `RACK-${String.fromCharCode(65 + (idx % 6))}${((idx % 8) + 1)}`;
        
        stockMap.set(p.id, {
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          stock: 15 + Math.floor(Math.random() * 20),
          reserved: 0,
          aisle,
          bin,
          reorderLevel: 5,
          updatedAt: new Date().toISOString()
        });
      });
      this.storeStocks.set(store.id, stockMap);
    });
  }

  getStoreInventory(storeId) {
    const stockMap = this.storeStocks.get(storeId);
    if (!stockMap) return [];
    return Array.from(stockMap.values());
  }

  getProductStock(storeId, productId) {
    const stockMap = this.storeStocks.get(storeId);
    if (!stockMap) return null;
    return stockMap.get(productId) || null;
  }

  // Reserve items during checkout using distributed lock
  reserveStock(storeId, items) {
    const stockMap = this.storeStocks.get(storeId);
    if (!stockMap) {
      return { success: false, reason: "STORE_NOT_FOUND" };
    }

    const acquiredLocks = [];

    try {
      // 1. Acquire Redis distributed lock for all requested products
      for (const item of items) {
        const lock = redisStore.acquireStockLock(storeId, item.productId, item.quantity);
        if (!lock.success) {
          throw new Error(`Failed to acquire lock for product: ${item.productId}`);
        }
        acquiredLocks.push(lock);

        // 2. Validate current available stock
        const record = stockMap.get(item.productId);
        if (!record || (record.stock - record.reserved) < item.quantity) {
          throw new Error(`Insufficient stock for item: ${item.name || item.productId}`);
        }
      }

      // 3. Increment reservations
      for (const item of items) {
        const record = stockMap.get(item.productId);
        record.reserved += item.quantity;
        record.updatedAt = new Date().toISOString();

        // Publish Kafka event
        kafka.publish(CONFIG.KAFKA_TOPICS.STOCK_UPDATED, record.productId, {
          storeId,
          productId: record.productId,
          availableStock: record.stock - record.reserved,
          action: "RESERVED",
          quantity: item.quantity
        });
      }

      return { success: true };
    } catch (err) {
      return { success: false, reason: err.message };
    } finally {
      // Release locks
      for (const lk of acquiredLocks) {
        redisStore.releaseStockLock(lk.lockKey, lk.lockToken);
      }
    }
  }

  // Commit stock deduction when order is packed/paid
  commitStockDeduction(storeId, items) {
    const stockMap = this.storeStocks.get(storeId);
    if (!stockMap) return false;

    for (const item of items) {
      const record = stockMap.get(item.productId);
      if (record) {
        record.stock = Math.max(0, record.stock - item.quantity);
        record.reserved = Math.max(0, record.reserved - item.quantity);
        record.updatedAt = new Date().toISOString();

        kafka.publish(CONFIG.KAFKA_TOPICS.STOCK_UPDATED, record.productId, {
          storeId,
          productId: record.productId,
          stock: record.stock,
          action: "DEDUCTED",
          quantity: item.quantity
        });
      }
    }
    return true;
  }

  // Replenish / Update stock (Dark Store App / Admin)
  updateStock(storeId, productId, newStock) {
    const stockMap = this.storeStocks.get(storeId);
    if (!stockMap) return null;
    const record = stockMap.get(productId);
    if (!record) return null;

    record.stock = Number(newStock);
    record.updatedAt = new Date().toISOString();

    kafka.publish(CONFIG.KAFKA_TOPICS.STOCK_UPDATED, productId, {
      storeId,
      productId,
      stock: record.stock,
      action: "REPLENISHED"
    });

    return record;
  }
}

export const inventoryService = new InventoryService();
