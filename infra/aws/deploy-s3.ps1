# ==============================================================
# GarbaCholi.Express - Multi-App S3 Deployment Script (PowerShell)
# Deploys independent frontend bundles to isolated S3 buckets
# ==============================================================

Write-Host "🚀 [1/3] Compiling all isolated frontend bundles via Vite..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed! Aborting deployment." -ForegroundColor Red
    exit 1
}

Write-Host "📦 [2/3] Deploying to AWS S3 Buckets..." -ForegroundColor Cyan

# 1. Customer Storefront
Write-Host "-> Deploying Customer App to s3://shop.garbacholi.express..." -ForegroundColor Green
aws s3 sync dist/ s3://shop.garbacholi.express --exclude "*" --include "index.html" --include "assets/*" --include "storage/*" --delete

# 2. Delivery Rider Partner Portal (Uploads rider.html as root index.html)
Write-Host "-> Deploying Rider App to s3://rider.garbacholi.express..." -ForegroundColor Green
aws s3 cp dist/rider.html s3://rider.garbacholi.express/index.html
aws s3 sync dist/assets s3://rider.garbacholi.express/assets --delete

# 3. Dark Store Warehouse Portal (Uploads darkstore.html as root index.html)
Write-Host "-> Deploying Dark Store Warehouse App to s3://warehouse.garbacholi.express..." -ForegroundColor Green
aws s3 cp dist/darkstore.html s3://warehouse.garbacholi.express/index.html
aws s3 sync dist/assets s3://warehouse.garbacholi.express/assets --delete

# 4. Admin Command Center (Uploads admin.html as root index.html)
Write-Host "-> Deploying Admin Command Center to s3://admin.garbacholi.express..." -ForegroundColor Green
aws s3 cp dist/admin.html s3://admin.garbacholi.express/index.html
aws s3 sync dist/assets s3://admin.garbacholi.express/assets --delete

Write-Host "✨ [3/3] Deployment complete! Invalidate CloudFront distributions when ready." -ForegroundColor Cyan
