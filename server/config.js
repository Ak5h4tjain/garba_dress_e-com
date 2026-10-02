// System Configuration & Garba Hub Data
export const CONFIG = {
  PORT: process.env.PORT || 4000,
  WS_PORT: process.env.WS_PORT || 4001,
  
  // Regional Garba & Festive Wear Fulfillment Hubs
  DARK_STORES: [
    {
      id: "store_ahm_01",
      name: "Ahmedabad Heritage Garba Hub",
      code: "GARBA-AHM-01",
      address: "Law Garden Traditional Market, Ellisbridge, Ahmedabad",
      coordinates: { lat: 23.0225, lng: 72.5714 },
      coverageRadiusKm: 6.0,
      avgPickTimeSec: 90,
      activeStatus: "OPERATIONAL"
    },
    {
      id: "store_vad_02",
      name: "Vadodara United Garba Depot",
      code: "GARBA-VAD-02",
      address: "Near Navlakhi Ground, Rajmahal Rd, Vadodara",
      coordinates: { lat: 22.3072, lng: 73.1812 },
      coverageRadiusKm: 5.5,
      avgPickTimeSec: 85,
      activeStatus: "OPERATIONAL"
    },
    {
      id: "store_sur_03",
      name: "Surat Zari & Silk Fashion Pod",
      code: "GARBA-SUR-03",
      address: "Textile Market Ring Road, Surat",
      coordinates: { lat: 21.1702, lng: 72.8311 },
      coverageRadiusKm: 7.0,
      avgPickTimeSec: 95,
      activeStatus: "OPERATIONAL"
    },
    {
      id: "store_blr_04",
      name: "Bengaluru Metro Garba Pod",
      code: "GARBA-BLR-04",
      address: "100 Feet Rd, Indiranagar, Bengaluru",
      coordinates: { lat: 12.9719, lng: 77.6412 },
      coverageRadiusKm: 4.5,
      avgPickTimeSec: 110,
      activeStatus: "OPERATIONAL"
    }
  ],

  // System Roles
  ROLES: {
    CUSTOMER: "CUSTOMER",
    RIDER: "RIDER",
    STORE_STAFF: "STORE_STAFF",
    ADMIN: "ADMIN"
  },

  // Order State Machine Transitions
  ORDER_STATUS: {
    CREATED: "CREATED",
    PAID: "PAID",
    STORE_ACCEPTED: "STORE_ACCEPTED",
    PICKING: "PICKING",
    PACKED: "PACKED",
    RIDER_ASSIGNED: "RIDER_ASSIGNED",
    RIDER_ARRIVED_STORE: "RIDER_ARRIVED_STORE",
    RIDER_PICKED_UP: "RIDER_PICKED_UP",
    OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
    DELIVERED: "DELIVERED",
    CANCELLED: "CANCELLED"
  },

  // Kafka Topics
  KAFKA_TOPICS: {
    ORDER_PLACED: "order.placed",
    STOCK_UPDATED: "stock.updated",
    ORDER_PAID: "order.paid",
    ORDER_ASSIGNED_STORE: "order.assigned_store",
    ORDER_PICKING_STARTED: "order.picking_started",
    ORDER_PACKED: "order.packed",
    RIDER_ASSIGNED: "rider.assigned",
    RIDER_GPS_PING: "rider.gps_ping",
    ORDER_PICKED_UP: "order.picked_up",
    OUT_FOR_DELIVERY: "order.out_for_delivery",
    ORDER_DELIVERED: "order.delivered",
    NOTIFICATION_SEND: "notification.send"
  }
};
