# 🚀 Production Server Setup Guide

**You're currently on your production server at:** `root@vmi3109658`

---

## 📍 Step 1: Find Your Application

Let's locate where your application is deployed:

```bash
# Check common deployment locations
ls -la /var/www/
ls -la /home/
ls -la /opt/
ls -la ~/

# Or search for your app
find / -name "package.json" -path "*/server/*" 2>/dev/null | head -5
```

**Common locations:**
- `/var/www/pmail/`
- `/home/pmail/`
- `/opt/pmail/`
- `/root/pmail/`

---

## 📍 Step 2: Navigate to Your App

Once you find it, go there:

```bash
# Example (adjust based on where you found it):
cd /var/www/pmail/server

# Or if it's directly in a pmail directory:
cd /path/to/pmail/server
```

---

## 🔍 Step 3: Check Current Status

```bash
# See what files exist
ls -la

# Check if Git is set up
git status

# Check if node_modules exist
ls node_modules/ | wc -l
```

---

## 📥 Step 4: Deploy Your Code

### Option A: If Git is already set up

```bash
# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Apply database migrations
npx prisma migrate deploy

# Test database connection
node test-db-connection.js
```

### Option B: If Git is NOT set up yet

```bash
# Navigate to parent directory
cd /var/www  # or wherever you want to deploy

# Clone your repository
git clone YOUR_GITHUB_REPO_URL pmail

# Go to server directory
cd pmail/server

# Install dependencies
npm install

# Set up environment variables
nano .env
# (Copy production variables - see Step 5)

# Generate Prisma client
npm run prisma:generate

# Apply database migrations
npx prisma migrate deploy

# Create admin user
node prisma/seed-admin.js

# Test connection
node test-db-connection.js
```

---

## 🔐 Step 5: Create Production .env File

Create a NEW `.env` file on the server (DON'T copy from local!):

```bash
nano .env
```

Paste this and fill in your production values:

```env
# ════════════════════════════════════════════
# PRODUCTION ENVIRONMENT VARIABLES
# ════════════════════════════════════════════

# Database - Use PostgreSQL for production
DATABASE_URL="postgresql://user:password@host:5432/database"
# Or if using SQLite (not recommended for production):
# DATABASE_URL="file:/var/app/data/production.db"

# JWT - CHANGE THIS!
JWT_SECRET="GENERATE-A-STRONG-SECRET-HERE"
JWT_EXPIRES_IN="7d"

# Server
PORT=5000
NODE_ENV="production"

# CORS - Your production domain
CLIENT_URL="https://yourdomain.com"

# Google OAuth - Production credentials
GOOGLE_CLIENT_ID="your-production-google-id"
GOOGLE_CLIENT_SECRET="your-production-google-secret"
GOOGLE_REDIRECT_URI="https://yourdomain.com/api/google/callback"
GOOGLE_GMAIL_REDIRECT_URI="https://yourdomain.com/api/google/gmail-callback"

# Stripe - Production keys (NOT test keys!)
STRIPE_SECRET_KEY="sk_live_YOUR_LIVE_KEY"
STRIPE_PUBLISHABLE_KEY="pk_live_YOUR_LIVE_KEY"
STRIPE_WEBHOOK_SECRET="whsec_YOUR_WEBHOOK_SECRET"
TRANSACTION_FEE_PERCENTAGE=5

# MTN MoMo - Production
MOMO_BASE_URL="https://proxy.momoapi.mtn.com"
MOMO_ENVIRONMENT="production"
MOMO_SUBSCRIPTION_KEY="your-production-subscription-key"
MOMO_USER_ID="your-production-user-id"
MOMO_USER_SECRET="your-production-user-secret"
MOMO_CURRENCY="EUR"
MOMO_CALLBACK_URL="https://yourdomain.com/api/wallet/momo/webhook"

# Mailcow
MAILCOW_API_URL="https://mail.pryro.com"
MAILCOW_API_KEY="your-production-api-key"
MAIL_DOMAIN="pryro.com"
MAILCOW_SMTP_HOST="mail.pryro.com"
MAILCOW_SMTP_PORT=587
MAILCOW_SMTP_SECURE=false
MAILCOW_SMTP_USER="noreply@pryro.com"
MAILCOW_SMTP_PASS="your-production-password"
MAILCOW_QUOTA_MB=1024

# Admin
ADMIN_SECRET="GENERATE-A-STRONG-SECRET-HERE"

# Webhook
WEBHOOK_SECRET="GENERATE-A-STRONG-SECRET-HERE"
WEBHOOK_PORT=9000
DEPLOY_BRANCH="main"

# Inbound SMTP (optional)
INBOUND_SMTP_PORT=
```

**Generate secrets:**
```bash
openssl rand -hex 32
```

Save with: `Ctrl + X`, then `Y`, then `Enter`

---

## 📊 Step 6: Set Up Database

### Option A: PostgreSQL (Recommended)

1. **Get PostgreSQL database:**
   - Neon: https://neon.tech (easiest, free tier)
   - Supabase: https://supabase.com (free tier)
   - Railway: https://railway.app
   - Local PostgreSQL: `apt install postgresql`

2. **Update schema:**
   ```bash
   nano prisma/schema.prisma
   ```
   
   Change:
   ```prisma
   datasource db {
     provider = "postgresql"  // Change from "sqlite"
     url      = env("DATABASE_URL")
   }
   ```

3. **Apply to database:**
   ```bash
   npm run prisma:generate
   npx prisma migrate deploy
   node prisma/seed-admin.js
   ```

### Option B: SQLite (Simple, but limited)

```bash
# Create data directory
mkdir -p /var/app/data

# Update .env
# DATABASE_URL="file:/var/app/data/production.db"

# Apply migrations
npx prisma migrate deploy
node prisma/seed-admin.js
```

---

## 🔄 Step 7: Start the Server

### Option A: Using PM2 (Recommended)

```bash
# Install PM2 globally (if not installed)
npm install -g pm2

# Start server
pm2 start src/index.js --name pmail-server

# Save PM2 config
pm2 save

# Auto-start on reboot
pm2 startup

# Check status
pm2 status

# View logs
pm2 logs pmail-server
```

### Option B: Using systemd

```bash
# Create service file
nano /etc/systemd/system/pmail.service
```

Paste:
```ini
[Unit]
Description=Pmail Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/pmail/server
ExecStart=/usr/bin/node src/index.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Then:
```bash
systemctl enable pmail
systemctl start pmail
systemctl status pmail
```

---

## 🧪 Step 8: Test Everything

```bash
# Test database connection
node test-db-connection.js

# Test server health
curl http://localhost:5000/api/health

# Check server logs
pm2 logs pmail-server
# or
journalctl -u pmail -f
```

---

## 🌐 Step 9: Set Up Nginx (If using)

```bash
nano /etc/nginx/sites-available/pmail
```

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location / {
        root /var/www/pmail/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

Enable and restart:
```bash
ln -s /etc/nginx/sites-available/pmail /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

---

## 🔒 Step 10: Set Up SSL (HTTPS)

```bash
# Install Certbot
apt install certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d yourdomain.com

# Auto-renewal (already set up)
certbot renew --dry-run
```

---

## 🔥 Troubleshooting

### "Cannot find module"
```bash
npm install
npm run prisma:generate
```

### "Port already in use"
```bash
# Find what's using port 5000
lsof -i :5000
# Kill it if needed
kill -9 PID
```

### "Database connection failed"
```bash
# Check DATABASE_URL in .env
cat .env | grep DATABASE_URL

# Test connection
npx prisma db push
```

### Check server logs
```bash
pm2 logs pmail-server --lines 100
```

---

## 📋 Quick Reference

```bash
# Navigate to app
cd /var/www/pmail/server

# Update code
git pull && npm install && npx prisma migrate deploy && pm2 restart pmail-server

# View logs
pm2 logs pmail-server

# Restart server
pm2 restart pmail-server

# Test database
node test-db-connection.js

# View database
npx prisma studio
```

---

## 🆘 Still Lost?

**Run this command to find your app:**
```bash
find / -name "package.json" -type f 2>/dev/null | grep -E "(pmail|pryro)" | head -10
```

Then navigate to the directory that contains your server code!

---

**Last Updated:** November 28, 2026
