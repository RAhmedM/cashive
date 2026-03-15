#!/bin/bash
# cashive.gg — Deployment Script
# Usage: ssh root@your-server "cd /root/cashive && bash scripts/deploy.sh"
# Or locally: bash scripts/deploy.sh

set -euo pipefail

APP_DIR="/root/cashive"
cd "$APP_DIR"

echo "========================================"
echo " cashive.gg — Deploy"
echo " $(date)"
echo "========================================"

# 1. Pull latest code
echo ""
echo "[1/7] Pulling latest code..."
git pull origin main

# 2. Install dependencies
echo ""
echo "[2/7] Installing dependencies..."
npm ci --production=false

# 3. Generate Prisma client
echo ""
echo "[3/7] Generating Prisma client..."
npx prisma generate

# 4. Run database migrations
echo ""
echo "[4/7] Running database migrations..."
npx prisma migrate deploy

# 5. Build Next.js
echo ""
echo "[5/7] Building Next.js..."
npm run build

# 6. Register cron job schedules
echo ""
echo "[6/7] Registering worker schedules..."
npm run worker:schedule

# 7. Restart PM2 processes
echo ""
echo "[7/7] Restarting PM2 processes..."
pm2 restart ecosystem.config.js
pm2 save

echo ""
echo "========================================"
echo " Deploy complete!"
echo " $(date)"
echo "========================================"
echo ""
echo "Verify:"
echo "  pm2 status"
echo "  pm2 logs --lines 10"
echo "  curl -s https://cashive.gg/api/health | jq"
echo ""
