#!/bin/bash
set -euo pipefail

REPO_DIR="/home/pryro.com/mail.pryro.com/app"
cd "$REPO_DIR"

log() { echo "[deploy] $(date '+%Y-%m-%d %H:%M:%S') $*"; }

log "Starting deployment in $REPO_DIR"

log "Fetching latest code from origin/main"
git fetch origin main
git reset --hard origin/main

log "Installing frontend dependencies"
rm -rf node_modules
NODE_ENV=development npm install --no-audit --no-fund

log "Building frontend"
NODE_ENV=production ./node_modules/.bin/vite build

log "Installing backend dependencies"
cd server
NODE_ENV=production npm install --no-audit --no-fund --omit=dev

log "Running Prisma migrations"
npx prisma migrate deploy
npx prisma generate

log "Restarting backend"
pm2 restart pmail-backend || pm2 start src/index.js --name pmail-backend

log "Deployment complete"
