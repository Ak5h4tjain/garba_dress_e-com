// Object Store Simulation (S3 / MinIO / GCS)
// Handles product images, digital delivery invoices, and receipt assets

class ObjectStore {
  constructor() {
    this.buckets = {
      "product-images": new Map(),
      "invoices": new Map(),
      "delivery-proofs": new Map()
    };
  }

  putObject(bucket, key, data, contentType = "application/json") {
    if (!this.buckets[bucket]) {
      this.buckets[bucket] = new Map();
    }
    const meta = {
      bucket,
      key,
      sizeBytes: typeof data === "string" ? data.length : JSON.stringify(data).length,
      contentType,
      uploadedAt: new Date().toISOString(),
      etag: "etag_" + Math.random().toString(36).substring(2, 10),
      url: `/storage/${bucket}/${key}`,
      data
    };
    this.buckets[bucket].set(key, meta);
    return meta;
  }

  getObject(bucket, key) {
    if (!this.buckets[bucket]) return null;
    return this.buckets[bucket].get(key) || null;
  }

  generateInvoice(order) {
    const invoiceNumber = `INV-${order.orderNumber}`;
    const invoiceData = {
      invoiceNumber,
      orderNumber: order.orderNumber,
      orderId: order.id,
      date: order.createdAt,
      customer: order.customerName,
      deliveryAddress: order.address,
      items: order.items,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      surgeFee: order.surgeFee,
      discount: order.discount,
      totalAmount: order.total,
      paymentMethod: order.paymentMethod,
      taxBreakdown: {
        cgst: (order.subtotal * 0.025).toFixed(2),
        sgst: (order.subtotal * 0.025).toFixed(2)
      },
      digitalSignature: "SIGN_VERIFIED_QUICKCOMM_SYSTEM_ROOT"
    };

    return this.putObject("invoices", `${order.id}.json`, invoiceData, "application/json");
  }

  listObjects(bucket) {
    if (!this.buckets[bucket]) return [];
    return Array.from(this.buckets[bucket].values());
  }
}

export const objectStore = new ObjectStore();
