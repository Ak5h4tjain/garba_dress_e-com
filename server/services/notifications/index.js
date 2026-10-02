// Notifications Microservice: Push, SMS, Email Dispatch & Real-Time Alerts
import { kafka } from "../../event-bus/kafka-simulator.js";
import { CONFIG } from "../../config.js";

export class NotificationsService {
  constructor() {
    this.notificationHistory = [];
    this.setupKafkaListeners();
  }

  setupKafkaListeners() {
    // Listen to Kafka topics and send appropriate customer/rider/store notifications
    kafka.subscribe(CONFIG.KAFKA_TOPICS.ORDER_PLACED, (event) => {
      this.send({
        channel: "PUSH",
        recipient: event.payload.customerId,
        title: "Order Placed Successfully! ⚡",
        message: `Your order #${event.payload.orderNumber} is confirmed and sent to dark store for fast packing.`,
        orderId: event.payload.id
      });
    });

    kafka.subscribe(CONFIG.KAFKA_TOPICS.ORDER_PACKED, (event) => {
      this.send({
        channel: "SMS",
        recipient: event.payload.customerPhone || "Customer",
        title: "Order Packed & Ready 📦",
        message: `Items for order #${event.payload.orderNumber} are packed in sealed hygienic tamper-proof bag.`,
        orderId: event.payload.id
      });
    });

    kafka.subscribe(CONFIG.KAFKA_TOPICS.RIDER_ASSIGNED, (event) => {
      this.send({
        channel: "PUSH",
        recipient: event.payload.customerId,
        title: "Delivery Partner Assigned 🚴",
        message: `${event.payload.riderName} is assigned to deliver your order in ~${event.payload.etaMinutes} mins.`,
        orderId: event.payload.orderId
      });
    });

    kafka.subscribe(CONFIG.KAFKA_TOPICS.ORDER_DELIVERED, (event) => {
      this.send({
        channel: "EMAIL",
        recipient: event.payload.customerEmail || "Customer",
        title: "Delivered in Minutes! 🎉",
        message: `Your order #${event.payload.orderNumber} has been delivered. Enjoy your fresh groceries!`,
        orderId: event.payload.id
      });
    });
  }

  send({ channel = "PUSH", recipient, title, message, orderId = null }) {
    const notification = {
      id: "notif_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 6),
      channel, // PUSH, SMS, EMAIL
      recipient,
      title,
      message,
      orderId,
      sentAt: new Date().toISOString(),
      read: false
    };

    this.notificationHistory.unshift(notification);
    if (this.notificationHistory.length > 50) this.notificationHistory.pop();

    // Broadcast through Kafka
    kafka.publish(CONFIG.KAFKA_TOPICS.NOTIFICATION_SEND, recipient, notification);

    return notification;
  }

  getNotifications(recipient = null) {
    if (recipient) {
      return this.notificationHistory.filter(n => n.recipient === recipient);
    }
    return this.notificationHistory;
  }
}

export const notificationsService = new NotificationsService();
