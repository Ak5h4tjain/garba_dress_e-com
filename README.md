# garba_dress_e-com

### Ghera — Festive Clothes in 13 Minutes
A distributed festive quick-commerce ecosystem with high-aesthetic frontend (Ghera), real-time order lifecycle, warehouse routing (<90s SLA), multi-criteria fleet dispatch, and SHA-256 cryptographic audit ledger.

---

## 🎨 Visual Color Grading (Faithful to Reference Diagram)

| Architectural Tier | Component | Hex Color / Palette | Visual Role |
| :--- | :--- | :--- | :--- |
| **Canvas** | Canvas Background | `#111216` / `#181920` | Obsidian / Slate background |
| **Client Apps** | Customer, Rider, Dark Store, Admin | `#2a2b30` / `#3e414c` | Charcoal slate cards with subtle borders |
| **API Gateway** | CDN, Load Balancer, API Gateway | `#32353f` / `#4d5262` | Graphite steel banner with rate limit telemetry |
| **Microservices** | Catalog, Inventory, Cart, Pricing, Payments, Dispatch, Notifications, Auth | `#063933` / `#0a4c44` / `#00e5a3` | Deep Forest Emerald / Dark Teal with Mint accents |
| **Event Bus** | Kafka (`order.placed`, `stock.updated`, `rider.assigned`) | `#383174` / `#5a4fb3` / `#a78bfa` | Deep Royal Violet with Lavender glowing borders |
| **Storage Layer** | PostgreSQL, Redis, Elasticsearch, Object store | `#262356` / `#4a4497` / `#a5b4fc` | Deep Twilight Violet with Indigo accents |

---

## 🏗️ System Architecture & Services Breakdown

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Customer app]      [Rider app]       [Dark store app]     [Admin panel]   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│            CDN, load balancer, API gateway (auth, rate limit)               │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────┬───────────────────┼───────────────────┬──────────────────┐
│  [Catalog]       │  [Inventory]      │  [Cart and orders]│  [Pricing]       │
│  Products/search │  Stock per store  │  State machine    │  Offers & surge  │
├──────────────────┼───────────────────┼───────────────────┼──────────────────┤
│  [Payments]      │  [Dispatch]       │  [Notifications]  │  [Users and auth]│
│  UPI/Cards/COD   │  Rider ETA/GPS    │  Push/SMS/Email   │  Profiles & RBAC │
└──────────────────┴───────────────────┼───────────────────┴──────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│     Event bus (Kafka): order.placed, stock.updated, rider.assigned          │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────┬───────────────────┼───────────────────┬──────────────────┐
│  [PostgreSQL]    │  [Redis]          │  [Elasticsearch]  │  [Object store]  │
│  Orders & users  │  Cache & locks    │  Product search   │  Images/Invoices │
└──────────────────┴───────────────────┴───────────────────┴──────────────────┘
```

### 1. Client Applications (Frontend)
- **Customer App**: 10-minute grocery & festive wear store (Garba dupattas, dandiya sticks, daily essentials), Elasticsearch live search, dynamic cart breakdown, address switcher, mock UPI/Card/COD checkout, and live order tracking with simulated GPS.
- **Rider App**: Partner online/offline toggle, dispatch request incoming alert, order pickup from dark store, barcode verify, live GPS route telemetry simulator, and 4-digit customer OTP verification.
- **Dark Store App**: Real-time warehouse fulfillment queue, item picking checklist mapped to Aisles and Bins, tamper-evident bag seal handover to dispatch, and store-level stock replenishment.
- **Admin Panel**: Operations control tower, KPI metrics (GMV, delivery speed, fleet utilization), live order state machine ledger, Kafka event commit log inspector with JSON payload schema viewer, and dynamic surge pricing controls.
- **Interactive Architecture Topology View**: Live visual clone of the architecture diagram with real-time status pulses, request counters, and direct role navigation.
- **Multi-App Live Sync Mode**: Split-screen view allowing Customer, Dark Store, and Rider apps to be viewed and tested side-by-side simultaneously.

### 2. Distributed Microservices & Gateway (Backend)
- **API Gateway**: CDN edge cache header injection, token-bucket rate limiter (300 req/min), and RBAC authentication guards.
- **Catalog Microservice**: Full-text product search, category taxonomy, and real-time inventory enrichment.
- **Inventory Microservice**: Multi-store stock management across Dark Stores (`DS-101`, `DS-102`, `DS-103`), Redis distributed lock (Redlock simulation) during checkout, and Kafka `stock.updated` broadcast.
- **Cart & Orders Microservice**: Complete 11-step Order State Machine (`CREATED -> PAID -> STORE_ACCEPTED -> PICKING -> PACKED -> RIDER_ASSIGNED -> RIDER_ARRIVED_STORE -> RIDER_PICKED_UP -> OUT_FOR_DELIVERY -> DELIVERED`).
- **Pricing Microservice**: Dynamic surge pricing engine (rain multipliers, midnight surge), promo code validator (`FESTIVE50`, `QUICK10`, `FREEDELIVERY`), and free delivery threshold.
- **Payments Microservice**: Mock UPI QR/VPA generator, Credit/Debit card 3D-secure simulator, Cash on delivery, and instant webhook confirmations.
- **Dispatch Microservice**: Nearest available rider matching algorithm based on Haversine distance, ETA calculator, and simulated GPS route progression.
- **Notifications Microservice**: Push, SMS, and Email alert dispatching with Kafka consumers.
- **Users & Auth Microservice**: Profile management, saved addresses, and JWT session simulations.

### 3. Event Bus & Storage Layers
- **Kafka Event Bus**: Partitioned commit log, topic subscriptions (`order.placed`, `stock.updated`, `rider.assigned`, `order.packed`, `order.delivered`), offset tracking, and live WebSocket bridge to all frontends.
- **PostgreSQL**: Relational ACID storage for orders, customers, delivery partners, and transaction ledgers.
- **Redis**: In-memory cache, distributed stock locks (`stock_lock:store_blr_01:*`), and geospatial rider coordinates.
- **Elasticsearch**: Inverted-index full-text search with fuzzy scoring and category aggregations.
- **Object Store**: S3-compatible bucket simulation for product images and generated PDF/JSON delivery invoices.

---

## 🚀 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Run both Backend Microservices (Port 4000) and Frontend (Port 5173)
npm run dev

# Or run independently:
npm run server    # Backend Microservices + WebSocket Hub on http://localhost:4000
npm run client    # Vite React Frontend on http://localhost:5173
```
