// PostgreSQL Simulation: ACID Relational Database
// Handles orders, users, riders, addresses, and transactional ledgers

class PostgresDB {
  constructor() {
    this.users = new Map();
    this.orders = new Map();
    this.riders = new Map();
    this.ledger = [];
    this.seedInitialData();
  }

  seedInitialData() {
    // Seed Customers
    const customer = {
      id: "usr_priya_01",
      name: "Priya Sharma",
      phone: "+91 98765 43210",
      email: "priya.sharma@example.com",
      role: "CUSTOMER",
      addresses: [
        {
          id: "addr_01",
          label: "Home",
          street: "Flat 402, Lotus Orchid, 5th Main, 12th Cross",
          area: "Indiranagar",
          city: "Bengaluru",
          pincode: "560038",
          coordinates: { lat: 12.9745, lng: 77.6478 },
          isDefault: true
        },
        {
          id: "addr_02",
          label: "Work",
          street: "7th Floor, Tech Park, Outer Ring Road",
          area: "Koramangala",
          city: "Bengaluru",
          pincode: "560034",
          coordinates: { lat: 12.9360, lng: 77.6290 },
          isDefault: false
        }
      ],
      createdAt: new Date().toISOString()
    };
    this.users.set(customer.id, customer);

    // Seed Riders
    const initialRiders = [
      {
        id: "rider_vikram_01",
        name: "Vikram Singh",
        phone: "+91 91234 56789",
        vehicleType: "Electric Scooter",
        vehicleNumber: "KA 01 EK 4921",
        status: "AVAILABLE", // AVAILABLE, BUSY, OFFLINE
        currentStoreId: "store_blr_01",
        coordinates: { lat: 12.9712, lng: 77.6405 },
        rating: 4.9,
        batteryPercent: 88,
        totalDeliveries: 342,
        activeOrderId: null,
        earningsToday: 680
      },
      {
        id: "rider_rahul_02",
        name: "Rahul Verma",
        phone: "+91 98111 22334",
        vehicleType: "Motorcycle",
        vehicleNumber: "KA 03 HM 8820",
        status: "AVAILABLE",
        currentStoreId: "store_blr_02",
        coordinates: { lat: 12.9348, lng: 77.6258 },
        rating: 4.8,
        batteryPercent: 94,
        totalDeliveries: 512,
        activeOrderId: null,
        earningsToday: 920
      },
      {
        id: "rider_anand_03",
        name: "Anand Kumar",
        phone: "+91 99000 11223",
        vehicleType: "EV Moped",
        vehicleNumber: "KA 05 ER 3109",
        status: "AVAILABLE",
        currentStoreId: "store_blr_03",
        coordinates: { lat: 12.9125, lng: 77.6440 },
        rating: 4.95,
        batteryPercent: 76,
        totalDeliveries: 289,
        activeOrderId: null,
        earningsToday: 540
      }
    ];

    initialRiders.forEach(r => this.riders.set(r.id, r));
  }

  // User Operations
  getUserById(id) {
    return this.users.get(id) || null;
  }

  getAllUsers() {
    return Array.from(this.users.values());
  }

  upsertUser(user) {
    this.users.set(user.id, user);
    return user;
  }

  // Rider Operations
  getRiderById(id) {
    return this.riders.get(id) || null;
  }

  getAllRiders() {
    return Array.from(this.riders.values());
  }

  updateRider(id, updates) {
    const rider = this.riders.get(id);
    if (!rider) return null;
    const updated = { ...rider, ...updates };
    this.riders.set(id, updated);
    return updated;
  }

  findAvailableRiderForStore(storeId) {
    return Array.from(this.riders.values()).find(
      r => r.currentStoreId === storeId && r.status === "AVAILABLE"
    ) || Array.from(this.riders.values()).find(r => r.status === "AVAILABLE");
  }

  // Order Operations
  createOrder(orderData) {
    const id = "ord_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 6);
    const orderNumber = "QC-" + Math.floor(100000 + Math.random() * 900000);
    const otp = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit delivery verification OTP

    const order = {
      id,
      orderNumber,
      otp,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...orderData
    };

    this.orders.set(id, order);

    // Record ledger entry
    this.ledger.push({
      id: "led_" + Date.now(),
      orderId: id,
      amount: order.total,
      type: "CREDIT_ORDER",
      timestamp: new Date().toISOString()
    });

    return order;
  }

  getOrderById(id) {
    return this.orders.get(id) || null;
  }

  getOrder(id) {
    return this.getOrderById(id);
  }

  getOrderByNumber(num) {
    return Array.from(this.orders.values()).find(o => o.orderNumber === num) || null;
  }

  getAllOrders() {
    return Array.from(this.orders.values()).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }

  getOrdersByStore(storeId) {
    return this.getAllOrders().filter(o => o.storeId === storeId);
  }

  getOrdersByCustomer(customerId) {
    return this.getAllOrders().filter(o => o.customerId === customerId);
  }

  getOrdersByRider(riderId) {
    return this.getAllOrders().filter(o => o.riderId === riderId);
  }

  updateOrderStatus(orderId, newStatus, extraData = {}) {
    const order = this.orders.get(orderId);
    if (!order) return null;

    order.status = newStatus;
    order.updatedAt = new Date().toISOString();
    Object.assign(order, extraData);

    this.orders.set(orderId, order);
    return order;
  }

  getLedger() {
    return [...this.ledger];
  }
}

export const postgresDB = new PostgresDB();
