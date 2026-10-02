// Cart & Orders Microservice: Complete Order Lifecycle & State Machine
import { CONFIG } from "../../config.js";
import { postgresDB } from "../../storage/postgres-db.js";
import { inventoryService } from "../inventory/index.js";
import { pricingService } from "../pricing/index.js";
import { dispatchService } from "../dispatch/index.js";
import { objectStore } from "../../storage/object-store.js";
import { kafka } from "../../event-bus/kafka-simulator.js";

export class CartOrdersService {
  constructor() {
    this.postgresDB = postgresDB;
  }

  // 1. Create and Place Order
  createOrder({ customerId, storeId, items, deliveryAddress, paymentMethod, promoCode }) {
    // Validate pricing
    const pricing = pricingService.calculateOrderTotal({ items, promoCode });

    // Reserve stock with distributed lock
    const stockRes = inventoryService.reserveStock(storeId, items);
    if (!stockRes.success) {
      return { success: false, error: stockRes.reason || "Failed to reserve stock" };
    }

    const customer = postgresDB.getUserById(customerId) || {
      name: "Valued Customer",
      phone: "+91 98765 43210"
    };

    // Create DB Order record
    const order = postgresDB.createOrder({
      customerId,
      customerName: customer.name,
      customerPhone: customer.phone,
      storeId,
      items,
      deliveryAddress,
      paymentMethod,
      paymentStatus: paymentMethod === "COD" ? "PENDING_COD" : "PAID",
      status: CONFIG.ORDER_STATUS.PAID,
      subtotal: pricing.subtotal,
      deliveryFee: pricing.deliveryFee,
      surgeFee: pricing.surgeFee,
      handlingFee: pricing.handlingFee,
      discount: pricing.discount,
      promoApplied: pricing.promoApplied,
      total: pricing.total,
      timeline: [
        {
          status: CONFIG.ORDER_STATUS.CREATED,
          timestamp: new Date().toISOString(),
          note: "Order initialized by customer"
        },
        {
          status: CONFIG.ORDER_STATUS.PAID,
          timestamp: new Date().toISOString(),
          note: `Payment authorized via ${paymentMethod}`
        }
      ]
    });

    // Publish to Kafka: order.placed
    kafka.publish(CONFIG.KAFKA_TOPICS.ORDER_PLACED, order.id, order);

    return { success: true, order };
  }

  // 2. Order State Machine Transitions
  transitionOrder(orderId, newStatus, meta = {}) {
    const order = postgresDB.getOrderById(orderId);
    if (!order) return { success: false, error: "Order not found" };

    const validTransitions = {
      [CONFIG.ORDER_STATUS.CREATED]: [CONFIG.ORDER_STATUS.PAID, CONFIG.ORDER_STATUS.CANCELLED],
      [CONFIG.ORDER_STATUS.PAID]: [CONFIG.ORDER_STATUS.STORE_ACCEPTED, CONFIG.ORDER_STATUS.PICKING, CONFIG.ORDER_STATUS.CANCELLED],
      [CONFIG.ORDER_STATUS.STORE_ACCEPTED]: [CONFIG.ORDER_STATUS.PICKING, CONFIG.ORDER_STATUS.CANCELLED],
      [CONFIG.ORDER_STATUS.PICKING]: [CONFIG.ORDER_STATUS.PACKED],
      [CONFIG.ORDER_STATUS.PACKED]: [CONFIG.ORDER_STATUS.RIDER_ASSIGNED, CONFIG.ORDER_STATUS.RIDER_ARRIVED_STORE, CONFIG.ORDER_STATUS.OUT_FOR_DELIVERY],
      [CONFIG.ORDER_STATUS.RIDER_ASSIGNED]: [CONFIG.ORDER_STATUS.RIDER_ARRIVED_STORE, CONFIG.ORDER_STATUS.RIDER_PICKED_UP],
      [CONFIG.ORDER_STATUS.RIDER_ARRIVED_STORE]: [CONFIG.ORDER_STATUS.RIDER_PICKED_UP],
      [CONFIG.ORDER_STATUS.RIDER_PICKED_UP]: [CONFIG.ORDER_STATUS.OUT_FOR_DELIVERY],
      [CONFIG.ORDER_STATUS.OUT_FOR_DELIVERY]: [CONFIG.ORDER_STATUS.DELIVERED],
      [CONFIG.ORDER_STATUS.DELIVERED]: [],
      [CONFIG.ORDER_STATUS.CANCELLED]: []
    };

    // Transition validation
    const allowed = validTransitions[order.status] || [];
    if (!allowed.includes(newStatus)) {
      // Soft transition if admin overrides
      console.warn(`Unusual state transition from ${order.status} to ${newStatus}`);
    }

    // Append timeline record
    const timelineEntry = {
      status: newStatus,
      timestamp: new Date().toISOString(),
      note: meta.note || `Transitioned to ${newStatus}`
    };

    const extraData = {
      timeline: [...(order.timeline || []), timelineEntry]
    };

    // Specific side-effects per state
    if (newStatus === CONFIG.ORDER_STATUS.PACKED) {
      // Deduct permanent stock
      inventoryService.commitStockDeduction(order.storeId, order.items);
      kafka.publish(CONFIG.KAFKA_TOPICS.ORDER_PACKED, order.id, order);

      // Auto-trigger rider dispatch
      const dispatch = dispatchService.assignRider(order);
      extraData.riderId = dispatch.riderId;
      extraData.riderName = dispatch.riderName;
      extraData.riderPhone = dispatch.riderPhone;
      extraData.etaMinutes = dispatch.etaMinutes;
    }

    if (newStatus === CONFIG.ORDER_STATUS.OUT_FOR_DELIVERY) {
      kafka.publish(CONFIG.KAFKA_TOPICS.OUT_FOR_DELIVERY, order.id, {
        orderId: order.id,
        riderId: order.riderId
      });
    }

    if (newStatus === CONFIG.ORDER_STATUS.DELIVERED) {
      extraData.deliveredAt = new Date().toISOString();
      extraData.paymentStatus = "COMPLETED";

      // Free rider
      if (order.riderId) {
        postgresDB.updateRider(order.riderId, {
          status: "AVAILABLE",
          activeOrderId: null,
          earningsToday: (postgresDB.getRiderById(order.riderId)?.earningsToday || 500) + 65
        });
      }

      // Generate invoice in Object Store
      const invoice = objectStore.generateInvoice(order);
      extraData.invoiceUrl = invoice.url;

      kafka.publish(CONFIG.KAFKA_TOPICS.ORDER_DELIVERED, order.id, order);
    }

    const updated = postgresDB.updateOrderStatus(orderId, newStatus, extraData);
    return { success: true, order: updated };
  }

  getOrder(orderId) {
    return postgresDB.getOrderById(orderId);
  }

  getAllOrders() {
    return postgresDB.getAllOrders();
  }
}

export const cartOrdersService = new CartOrdersService();
