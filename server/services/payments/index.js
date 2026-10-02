// Payments Microservice: UPI, Cards, COD, Verification, Webhooks
import { kafka } from "../../event-bus/kafka-simulator.js";
import { CONFIG } from "../../config.js";

export class PaymentsService {
  constructor() {
    this.transactions = new Map();
  }

  initiatePayment({ orderId, amount, method, customerDetails }) {
    const txnId = "txn_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 6);
    
    let paymentPayload = {
      txnId,
      orderId,
      amount,
      method, // "UPI", "CARD", "COD"
      status: "INITIATED",
      createdAt: new Date().toISOString()
    };

    if (method === "UPI") {
      paymentPayload.upiDetails = {
        vpa: "quickcomm@upi",
        qrString: `upi://pay?pa=quickcomm@icici&pn=QuickCommerce&am=${amount}&tr=${txnId}&cu=INR`,
        expiresInSeconds: 300
      };
    } else if (method === "CARD") {
      paymentPayload.cardDetails = {
        gatewayUrl: "https://mock-gateway.bank/secure-3d",
        maskedCard: "•••• 4242"
      };
    } else if (method === "COD") {
      paymentPayload.status = "SUCCESS_COD";
    }

    this.transactions.set(txnId, paymentPayload);
    return paymentPayload;
  }

  confirmPayment({ txnId, status = "SUCCESS" }) {
    const txn = this.transactions.get(txnId);
    if (!txn) return { success: false, reason: "TRANSACTION_NOT_FOUND" };

    txn.status = status;
    txn.completedAt = new Date().toISOString();

    if (status === "SUCCESS") {
      kafka.publish(CONFIG.KAFKA_TOPICS.ORDER_PAID, txn.orderId, {
        orderId: txn.orderId,
        txnId: txn.txnId,
        amount: txn.amount,
        method: txn.method
      });
    }

    return { success: true, transaction: txn };
  }

  getTransaction(txnId) {
    return this.transactions.get(txnId) || null;
  }
}

export const paymentsService = new PaymentsService();
