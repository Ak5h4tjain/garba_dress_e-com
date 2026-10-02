@echo off
title GarbaCholi.Express - Full System Launcher
echo ==============================================================
echo  GarbaCholi.Express - Quick Commerce Multi-App System
echo ==============================================================
echo.
echo [1/2] Starting FastAPI Antigravity AI Engine on port 8000...
start "FastAPI Core (:8000)" cmd /k "python -m uvicorn backend.app.main:app --port 8000 --host 0.0.0.0"

echo [2/2] Starting Node.js Gateway & Kafka Simulation on port 4000...
start "Node Gateway (:4000)" cmd /k "node server/index.js"

echo.
echo ==============================================================
echo  All services & frontend portals launched!
echo  - Customer Storefront:   http://localhost:4000/
echo  - Delivery Partner App:  http://localhost:4000/rider.html
echo  - Dark Store Warehouse:  http://localhost:4000/darkstore.html
echo  - Admin Command Center:  http://localhost:4000/admin.html
echo  - System Topology Mesh:  http://localhost:4000/topology.html
echo  - Auth & RBAC Portal:    http://localhost:4000/auth.html
echo  - FastAPI Engine API:    http://localhost:8000/docs
echo ==============================================================
pause
