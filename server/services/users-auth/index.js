// Users & Auth Microservice: Profiles, Saved Addresses, Multi-Role Authentication & RBAC
import { postgresDB } from "../../storage/postgres-db.js";

export const ROLE_PERMISSIONS = {
  CUSTOMER: [
    'BROWSE_CATALOG',
    'MANAGE_CART',
    'PLACE_ORDER',
    'TRACK_DELIVERY',
    'WRITE_REVIEW'
  ],
  RIDER: [
    'VIEW_ASSIGNMENTS',
    'ACCEPT_ORDER',
    'UPDATE_GPS',
    'VERIFY_OTP',
    'CLAIM_PAYOUT'
  ],
  DARK_STORE: [
    'VIEW_PICK_QUEUE',
    'SCAN_BARCODE',
    'OPTIMIZE_ROUTE',
    'CONFIRM_PACK',
    'RESTOCK_INVENTORY'
  ],
  ADMIN: [
    'ALL',
    'FULL_OPS',
    'FLEET_DISPATCH',
    'SURGE_PRICING',
    'AUDIT_LEDGER',
    'SYSTEM_TOPOLOGY',
    'USER_MANAGEMENT',
    'SWITCH_PORTALS'
  ]
};

export const DEMO_USERS = {
  CUSTOMER: {
    id: "usr_priya_01",
    name: "Priya Patel",
    email: "priya.patel@gmail.com",
    role: "CUSTOMER",
    phone: "+91 98250 12345",
    avatar: "👩🏽",
    addresses: [
      {
        id: "addr_01",
        label: "Home (10-Min Fast Drop)",
        street: "B-402, Samrudhi Elegance, Near Vastrapur Lake",
        area: "Vastrapur",
        city: "Ahmedabad",
        state: "Gujarat",
        pincode: "380015",
        isDefault: true
      }
    ],
    deliveryAddress: "B-402, Samrudhi Elegance, Near Vastrapur Lake, Ahmedabad",
    permissions: ROLE_PERMISSIONS.CUSTOMER
  },
  RIDER: {
    id: "rider_vikram_01",
    name: "Vikram Singh",
    email: "rider.vikram@garbacholi.express",
    role: "RIDER",
    phone: "+91 98980 54321",
    avatar: "🛵",
    vehicleNumber: "KA 01 EK 4921",
    batteryPercent: 88,
    rating: 4.9,
    permissions: ROLE_PERMISSIONS.RIDER
  },
  DARK_STORE: {
    id: "staff_rahul_01",
    name: "Rahul Joshi",
    email: "picker.rahul@garbacholi.express",
    role: "DARK_STORE",
    phone: "+91 97240 67890",
    avatar: "🏬",
    stationId: "Station #H-02",
    storeId: "store_amd_01",
    storeName: "AMD-01 Navrangpura Hub",
    permissions: ROLE_PERMISSIONS.DARK_STORE
  },
  ADMIN: {
    id: "admin_vikrant_01",
    name: "Vikrant Sharma",
    email: "admin.ops@garbacholi.express",
    role: "ADMIN",
    phone: "+91 99090 99999",
    avatar: "🛡️",
    title: "Chief Operations Director",
    iamRole: "arn:aws:iam::123456789012:role/OpsExecutive",
    permissions: ROLE_PERMISSIONS.ADMIN
  }
};

export class UsersAuthService {
  constructor() {
    this.postgresDB = postgresDB;
  }

  login({ email, password, role = "CUSTOMER" }) {
    const normalizedRole = role.toUpperCase();
    const demoUser = DEMO_USERS[normalizedRole] || DEMO_USERS.CUSTOMER;

    const token = `jwt_${normalizedRole.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return {
      success: true,
      token,
      user: {
        ...demoUser,
        email: email || demoUser.email
      }
    };
  }

  authenticate(role = "CUSTOMER", userId = null) {
    if (userId) {
      const user = this.postgresDB.getUserById(userId);
      if (user) {
        return {
          token: `jwt_${user.id}_${Date.now()}`,
          user: {
            ...user,
            role: "CUSTOMER",
            permissions: ROLE_PERMISSIONS.CUSTOMER
          }
        };
      }
    }

    const normalizedRole = (role || "CUSTOMER").toUpperCase();
    const user = DEMO_USERS[normalizedRole] || DEMO_USERS.CUSTOMER;
    return {
      token: `jwt_${normalizedRole.toLowerCase()}_${Date.now()}`,
      user
    };
  }

  verifyToken(token) {
    if (!token) return { valid: false, error: "No token provided" };
    for (const [r, u] of Object.entries(DEMO_USERS)) {
      if (token.includes(r.toLowerCase())) {
        return { valid: true, user: u };
      }
    }
    return { valid: true, user: DEMO_USERS.CUSTOMER };
  }

  getUser(id) {
    return this.postgresDB.getUserById(id) || DEMO_USERS.CUSTOMER;
  }

  addAddress(userId, address) {
    const user = this.postgresDB.getUserById(userId);
    if (!user) return null;

    const newAddr = {
      id: "addr_" + Date.now().toString(36),
      isDefault: user.addresses.length === 0,
      ...address
    };
    user.addresses.push(newAddr);
    this.postgresDB.upsertUser(user);
    return newAddr;
  }

  getAllUsers() {
    return this.postgresDB.getAllUsers();
  }

  getDemoAccounts() {
    return DEMO_USERS;
  }
}

export const usersAuthService = new UsersAuthService();
