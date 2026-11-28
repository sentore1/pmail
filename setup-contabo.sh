#!/bin/bash
# setup-contabo.sh — run ONCE on a fresh Contabo VPS
# Usage: bash setup-contabo.sh

set -e

echo "🖥️  Setting up Contabo VPS for Pmail..."

# ── 1. System updates ─────────────────────────────────────────────────────────
apt update && apt upgrade -y

# ── 2. Install Node.js 20 ─────────────────────────────────────────────────────
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# ── 3. Install PostgreSQL ─────────────────────────────────────────────────────
apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# ── 4. Create database and user ───────────────────────────────────────────────
echo "🗄️  Creating PostgreSQL database..."
sudo -u postgres psql <<EOF
CREATE DATABASE pmail_db;
CREATE USER pmailuser WITH ENCRYPTED PASSWORD 'changeme123';
GRANT ALL PRIVILEGES ON DATABASE pmail_db TO pmailuser;
ALTER DATABASE pmail_db OWNER TO pmailuser;
EOF

echo "✅ Database created: pmail_db"
echo "   User: pmailuser / changeme123"
echo "   ⚠️  Change the password above and update server/.env DATABASE_URL"

# ── 5. Install PM2 ────────────────────────────────────────────────────────────
npm install -g pm2
pm2 startup systemd -u root --hp /root

# ── 6. Install Nginx ──────────────────────────────────────────────────────────
apt install -y nginx

echo ""
echo "✅ Setup complete! Next steps:"
echo ""
echo "1. Update server/.env:"
echo "   DATABASE_URL=\"postgresql://pmailuser:changeme123@localhost:5432/pmail_db\""
echo ""
echo "2. Clone your repo and run:"
echo "   bash deploy.sh"
echo ""
echo "3. Set up Nginx to proxy:"
echo "   /api  → localhost:5000"
echo "   /     → /path/to/pmail/dist"
