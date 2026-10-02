# GarbaCholi.Express — AWS Isolated Multi-App Hosting Architecture

This document details the production-grade deployment of the **GarbaCholi.Express** quick-commerce ecosystem on **Amazon Web Services (AWS)** using independent client frontends, isolated security boundaries, and a scalable containerized backend.

---

## 1. Architectural Topology Overview

```
                                  [ CUSTOMER TRAFFIC ]
                                            │
                                            ▼
                           ┌───────────────────────────────────┐
                           │ AWS CloudFront CDN (Global Edge)  │
                           │  - shop.garbacholi.express        │
                           └─────────────────┬─────────────────┘
                                             │
                                             ▼
                             ┌───────────────────────────────┐
                             │ Amazon S3 Bucket: Customer App│
                             │  (index.html, assets/*)       │
                             └───────────────────────────────┘

        [ RIDER PARTNERS ]                          [ DARK STORE PICKERS ]              [ CORPORATE ADMINS ]
                │                                             │                                   │
                ▼                                             ▼                                   ▼
 ┌─────────────────────────────┐               ┌─────────────────────────────┐     ┌─────────────────────────────┐
 │ AWS CloudFront (Mobile CDN) │               │ AWS CloudFront + AWS WAF    │     │ AWS CloudFront + AWS SSO    │
 │ - rider.garbacholi.express  │               │ - warehouse.garbacholi.exp  │     │ - admin.garbacholi.express  │
 └──────────────┬──────────────┘               └──────────────┬──────────────┘     └──────────────┬──────────────┘
                │                                             │                                   │
                ▼                                             ▼                                   ▼
 ┌─────────────────────────────┐               ┌─────────────────────────────┐     ┌─────────────────────────────┐
 │ Amazon S3: Rider Partner App│               │ Amazon S3: Dark Store App   │     │ Amazon S3: Admin Panel App  │
 │ (rider.html -> index.html)  │               │ (darkstore.html->index.html)│     │ (admin.html -> index.html)  │
 └──────────────┬──────────────┘               └──────────────┬──────────────┘     └──────────────┬──────────────┘
                │                                             │                                   │
                └───────────────────────────────┬─────────────┴───────────────────────────────────┘
                                                │
                                                ▼  HTTPS REST / WSS WebSockets
                                   ┌─────────────────────────┐
                                   │ AWS API Gateway / ALB   │
                                   │ (api.garbacholi.express)│
                                   └────────────┬────────────┘
                                                │
                     ┌──────────────────────────┴──────────────────────────┐
                     │                                                     │
                     ▼                                                     ▼
      ┌───────────────────────────────┐                     ┌───────────────────────────────┐
      │ Amazon ECS (Fargate Cluster)  │                     │ Amazon ECS (Fargate Cluster)  │
      │ FastAPI Microservices (:8000) │                     │ Node.js Gateway & Bus (:4000) │
      │ - Agentic Dispatcher          │                     │ - Kafka Event Producer/Cons   │
      │ - Dynamic Surge Engine        │                     │ - Order Lifecycle State Mach  │
      │ - SHA-256 Audit Blockchain    │                     │ - WebSocket Fan-out Broadcast │
      └──────────────┬────────────────┘                     └──────────────┬────────────────┘
                     │                                                     │
                     └──────────────────────────┬──────────────────────────┘
                                                │
               ┌────────────────────────────────┼────────────────────────────────┐
               │                                │                                │
               ▼                                ▼                                ▼
┌─────────────────────────────┐  ┌─────────────────────────────┐  ┌─────────────────────────────┐
│ Amazon MSK                  │  │ Amazon ElastiCache (Redis)  │  │ Amazon Aurora (PostgreSQL)  │
│ (Managed Apache Kafka)      │  │ - Fast Geohash GPS Cache    │  │ - Transactional Orders & SQL│
│ - Events, Dispatches, Payout│  │ - Active Rider Telemetry    │  │ - Inventory Ledger Tables   │
└─────────────────────────────┘  └─────────────────────────────┘  └─────────────────────────────┘
```

---

## 2. Standalone Frontend Applications

Each frontend is compiled from source as an isolated, standalone single-page application (SPA). Delivery riders never have access to admin panels, and shoppers never see warehouse picking consoles.

| Application | Target Audience | AWS Hosting Strategy | Security / Access Layer | Built File |
| :--- | :--- | :--- | :--- | :--- |
| **Customer App** | Festive Shoppers & Event Attendees | S3 (`shop.garbacholi.express`) + CloudFront | Public Global Edge, Geo-IP DNS routing | `dist/index.html` |
| **Rider Partner App** | Delivery Fleet Drivers | S3 (`rider.garbacholi.express`) + CloudFront | Mobile-optimized PWA, Driver JWT Auth | `dist/rider.html` |
| **Dark Store App** | Warehouse Pickers & Packers | S3 (`warehouse.garbacholi.express`) + CloudFront | AWS WAF IP Whitelisting (Warehouse VPN) | `dist/darkstore.html` |
| **Admin Command Center** | Operations Leadership & Fleet Ops | S3 (`admin.garbacholi.express`) + CloudFront | AWS Verified Access (SSO / IAM Identity Center)| `dist/admin.html` |
| **Architecture Topology** | System Architects & Auditors | S3 (`topology.garbacholi.express`) | Developer VPN / Internal VPC only | `dist/topology.html` |

---

## 3. How to Build & Deploy to AWS S3

### Step 1: Compile all Standalone Bundles
Run the multi-page Vite build command:
```bash
npm run build
```
This generates:
- `dist/index.html` (Customer Storefront)
- `dist/rider.html` (Delivery Partner App)
- `dist/darkstore.html` (Dark Store Warehouse App)
- `dist/admin.html` (Admin Command Center)
- `dist/topology.html` (Distributed Architecture Viewer)
- `dist/assets/*` (Optimized JS, CSS, and asset bundles)

### Step 2: Deploy to Distinct S3 Buckets

#### Option A: Dedicated S3 Buckets per Application (Recommended for Enterprise Isolation)
```bash
# 1. Customer Frontend
aws s3 sync dist/ s3://shop.garbacholi.express --exclude "*" --include "index.html" --include "assets/*" --include "storage/*"
aws cloudfront create-invalidation --distribution-id $CF_CUSTOMER_ID --paths "/*"

# 2. Delivery Partner Frontend (Upload rider.html as root index.html)
aws s3 cp dist/rider.html s3://rider.garbacholi.express/index.html
aws s3 sync dist/assets s3://rider.garbacholi.express/assets
aws cloudfront create-invalidation --distribution-id $CF_RIDER_ID --paths "/*"

# 3. Dark Store Warehouse Frontend
aws s3 cp dist/darkstore.html s3://warehouse.garbacholi.express/index.html
aws s3 sync dist/assets s3://warehouse.garbacholi.express/assets
aws cloudfront create-invalidation --distribution-id $CF_DARKSTORE_ID --paths "/*"

# 4. Admin Command Center Frontend (Restricted via AWS SSO)
aws s3 cp dist/admin.html s3://admin.garbacholi.express/index.html
aws s3 sync dist/assets s3://admin.garbacholi.express/assets
aws cloudfront create-invalidation --distribution-id $CF_ADMIN_ID --paths "/*"
```

#### Option B: Single Multi-Page S3 Bucket with CloudFront Path Routing
If using a single domain with path prefixes:
- `https://garbacholi.express/` -> serves `dist/index.html`
- `https://garbacholi.express/rider.html` (or rewrite `/rider` -> `/rider.html`)
- `https://garbacholi.express/darkstore.html` (or rewrite `/darkstore` -> `/darkstore.html`)
- `https://garbacholi.express/admin.html` (or rewrite `/admin` -> `/admin.html`)

---

## 4. Backend Deployment on AWS ECS Fargate

The microservices run as containerized Docker tasks in an Amazon ECS cluster:

1. **FastAPI Antigravity Core Service (`backend/Dockerfile`):**
   - Port `8000`
   - Handles Antigravity Agentic Dispatch, Surge Pricing, and SHA-256 Audit Verification.
   - Connected to AWS ElastiCache (Redis) and Aurora PostgreSQL.

2. **Node.js Gateway & Kafka Simulation (`server/Dockerfile`):**
   - Port `4000`
   - Handles REST API routing, Kafka Producer/Consumer subscriptions, and WebSocket event mesh fan-out.

---

## 5. Security & Isolation Best Practices

1. **Rider App Isolation:**
   - Riders can only authenticate with driver phone numbers and active fleet licenses.
   - APIs reject rider requests attempting to read warehouse shelf stock or corporate margin figures.
2. **Dark Store Warehouse Isolation:**
   - Protected by **AWS WAF** with IP restriction rules matching warehouse commercial internet connections.
   - Pickers only see order items and bin locations.
3. **Admin Panel Isolation:**
   - Behind **AWS Verified Access (AVA)** integrated with Okta / Google Workspace / AWS IAM Identity Center.
   - Requires Multi-Factor Authentication (MFA) to access surge multipliers and payout triggers.
4. **Customer App Edge Defense:**
   - CloudFront with AWS Shield Standard DDoS protection.
   - CloudFront cache behaviors configured for `/assets/*` with immutable 1-year cache headers (`Cache-Control: public, max-age=31536000, immutable`).
