#!/bin/bash
#
# Deploy script run by the GitHub webhook listener (webhook.js).
# Assumes the repo is cloned at the directory this script's parent-of-parent is,
# i.e. this file lives at <repo-root>/server/scripts/deploy.sh
#
# Manual usage: bash server/scripts/deploy.sh

set -euo pipefail

REPO_DIR="/home/pryro.com/mail.pryro.com/app"
cd "$REPO_DIR"

log() { echo "[deploy] $(date '+%Y-%m-%d %H:%M:%S') $*"; }

log "Starting deployment in $REPO_DIR"

# --- Pull latest code ---
log "Fetching latest code from origin/main"
git fetch origin main
git reset --hard origin/main

# --- Frontend build ---
log "Installing frontend dependencies"
npm install --no-audit --no-fund

log "Building frontend"
./node_modules/.bin/vite build

# --- Backend ---
log "Installing backend dependencies"
cd server
npm install --no-audit --no-fund

log "Running Prisma migrations"
npx prisma migrate deploy
npx prisma generate

# --- Restart services under pm2 ---
log "Restarting backend"
pm2 restart pmail-backend || pm2 start src/index.js --name pmail-backend

# Webhook listener itself: only restart if changed, otherwise we'd kill
# the process running this script. pm2 restart is safe for it because
# this script runs as a child process of the listener, but to be safe
# we just reload it.
if pm2 describe pmail-webhook > /dev/null 2>&1; then
  log "Reloading webhook listener (code may have changed)"
  pm2 restart pmail-webhook --update-env || true
fi

log "Deployment complete"
