#!/usr/bin/env bash
# ==============================================================
# GarbaCholi.Express - Multi-App S3 Deployment Script
# Deploys independent frontend bundles to isolated S3 buckets
# ==============================================================
set -e

echo "🚀 [1/3] Compiling all isolated frontend bundles via Vite..."
npm run build

echo "📦 [2/3] Deploying to AWS S3 Buckets..."

# 1. Customer Storefront
echo "-> Deploying Customer App to s3://shop.garbacholi.express..."
aws s3 sync dist/ s3://shop.garbacholi.express \
  --exclude "*" \
  --include "index.html" \
  --include "assets/*" \
  --include "storage/*" \
  --delete

# 2. Delivery Rider Partner Portal (Uploads rider.html as root index.html)
echo "-> Deploying Rider App to s3://rider.garbacholi.express..."
aws s3 cp dist/rider.html s3://rider.garbacholi.express/index.html
aws s3 sync dist/assets s3://rider.garbacholi.express/assets --delete

# 3. Dark Store Warehouse Portal (Uploads darkstore.html as root index.html)
echo "-> Deploying Dark Store Warehouse App to s3://warehouse.garbacholi.express..."
aws s3 cp dist/darkstore.html s3://warehouse.garbacholi.express/index.html
aws s3 sync dist/assets s3://warehouse.garbacholi.express/assets --delete

# 4. Admin Command Center (Uploads admin.html as root index.html)
echo "-> Deploying Admin Command Center to s3://admin.garbacholi.express..."
aws s3 cp dist/admin.html s3://admin.garbacholi.express/index.html
aws s3 sync dist/assets s3://admin.garbacholi.express/assets --delete

echo "✨ [3/3] Deployment complete! Invalidate CloudFront distributions when ready."
