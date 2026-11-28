#!/bin/bash
# deploy.sh — run this on Contabo after every git pull
# Usage: bash deploy.sh

set -e  # stop on any error

echo "🚀 Starting deployment..."

# ── 1. Backend dependencies ───────────────────────────────────────────────────
echo "📦 Installing backend dependencies..."
cd server
npm install

# ── 2. Run pending DB migrations ─────────────────────────────────────────────
echo "🗄️  Running database migrations..."
npx prisma migrate deploy

# ── 3. Generate Prisma client ─────────────────────────────────────────────────
echo "⚙️  Generating Prisma client..."
npx prisma generate

# ── 4. Seed admin user (safe — skips if already exists) ──────────────────────
echo "👤 Seeding admin user..."
node prisma/seed-admin.js

cd ..

# ── 5. Frontend dependencies + build ─────────────────────────────────────────
echo "📦 Installing frontend dependencies..."
npm install

echo "🏗️  Building frontend..."
npm run build

# ── 6. Restart backend with PM2 ──────────────────────────────────────────────
echo "🔄 Restarting server..."
pm2 restart pmail-server 2>/dev/null || pm2 start server/src/index.js --name pmail-server

echo "✅ Deployment complete!"
