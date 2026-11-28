# 🚀 Deploy Pmail to Production Server

**Server:** `root@vmi3109658` (login.pryro.com)

---

## 📍 Current Situation

You have a **Laravel app** at `/home/login.pryro.com/public_html/`  
The **Pmail Node.js backend** needs to be deployed separately.

---

## 🎯 Deployment Steps

### Step 1: Connect to Your Server

```bash
ssh root@vmi3109658
```

---

### Step 2: Choose Deployment Location

```bash
# Go to a good location for the app
cd /var/www

# Or if you prefer /home
cd /home
```

---

### Step 3: Clone Your Repository

```bash
# Clone the pmail repository
git clone https://github.com/sentore1/pmail.git

# Navigate to the server directory
cd pmail/server

# Check what's there
ls -la
```

---

### Step 4: Install Dependencies

```bash
# Make sure Node.js is installed (v18+ recommended)
node --version
npm --version

# If Node is not installed:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs

# Install project dependencies
npm install
```

---

### Step 5: Set Up Environment Variables

```bash
# Create .env file
nano .env
```

**Paste this and update with your production values:**

```env
# Database - PostgreSQL recommended for production
DATABASE_URL="postgresql://user:password@host:5432/database"
# Or SQLite for testing:
# DATABASE_URL="file:./production.db"

# JWT Secret - Generate a strong secret!
JWT_SECRET="YOUR-STRONG-SECRET-HERE"
JWT_EXPIRES_IN="7d"

# Server
PORT=5000
NODE_ENV="production"

# CORS - Your production domain
CLIENT_URL="https://login.pryro.com"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="https://login.pryro.com/api/google/callback"
GOOGLE_GMAIL_REDIRECT_URI="https://login.pryro.com/api/google/gmail-callback"

# Stripe
STRIPE_SECRET_KEY="sk_live_your-live-key"
STRIPE_PUBLISHABLE_KEY="pk_live_your-live-key"
STRIPE_WEBHOOK_SECRET="whsec_your-webhook-secret"
TRANSACTION_FEE_PERCENTAGE=5

# MTN MoMo - Production
MOMO_BASE_URL="https://proxy.momoapi.mtn.com"
MOMO_ENVIRONMENT="production"
MOMO_SUBSCRIPTION_KEY="your-production-key"
MOMO_USER_ID="your-production-user-id"
MOMO_USER_SECRET="your-production-secret"
MOMO_CURRENCY="EUR"
MOMO_CALLBACK_URL="https://login.pryro.com/api/wallet/momo/webhook"

# Mailcow
MAILCOW_API_URL="https://mail.pryro.com"
MAILCOW_API_KEY="your-api-key"
MAIL_DOMAIN="pryro.com"
MAILCOW_SMTP_HOST="mail.pryro.com"
MAILCOW_SMTP_PORT=587
MAILCOW_SMTP_SECURE=false
MAILCOW_SMTP_USER="noreply@pryro.com"
MAILCOW_SMTP_PASS="your-password"
MAILCOW_QUOTA_MB=1024

# Admin
ADMIN_SECRET="your-strong-admin-secret"

# Webhook
WEBHOOK_SECRET="your-webhook-secret"
WEBHOOK_PORT=9000
DEPLOY_BRANCH="main"
```

**Generate secrets:**
```bash
openssl rand -hex 32
```

Save with: `Ctrl + X`, `Y`, `Enter`

---

### Step 6: Set Up Database

#### Option A: PostgreSQL (Recommended)

1. **Get PostgreSQL database:**
   - Neon.tech: https://neon.tech (Free tier)
   - Or install locally: `apt install postgresql`

2. **Update `prisma/schema.prisma`:**
   ```bash
   nano prisma/schema.prisma
   ```
   
   Change line 7:
   ```prisma
   provider = "postgresql"  # Change from "sqlite"
   ```

3. **Apply migrations:**
   ```bash
   npm run prisma:generate
   npx prisma migrate deploy
   node prisma/seed-admin.js
   ```

#### Option B: SQLite (Quick test)

```bash
# Just apply migrations
npm run prisma:generate
npx prisma migrate deploy
node prisma/seed-admin.js
```

---

### Step 7: Test Database Connection

```bash
node test-db-connection.js
```

**Expected output:**
```
✅ Test 1: Database Connection
   ✓ Successfully connected to database

✅ All tests passed!
```

---

### Step 8: Start the Server with PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start the server
pm2 start src/index.js --name pmail-server

# Save PM2 configuration
pm2 save

# Set PM2 to auto-start on server reboot
pm2 startup
# Run the command it outputs

# Check status
pm2 status

# View logs
pm2 logs pmail-server
```

---

### Step 9: Configure Nginx (Reverse Proxy)

```bash
# Create nginx configuration
nano /etc/nginx/sites-available/pmail-api
```

**Paste this:**

```nginx
server {
    listen 80;
    server_name login.pryro.com;  # or api.pryro.com

    # Pmail API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Keep existing Laravel routes
    location / {
        root /home/login.pryro.com/public_html/public;
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        root /home/login.pryro.com/public_html/public;
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

**Enable and restart Nginx:**

```bash
# Test configuration
nginx -t

# Reload nginx
systemctl reload nginx

# Or if the site isn't enabled yet:
ln -s /etc/nginx/sites-available/pmail-api /etc/nginx/sites-enabled/
systemctl restart nginx
```

---

### Step 10: Test Everything

```bash
# Test server health
curl http://localhost:5000/api/health

# Should return:
# {"status":"ok","message":"Pmail server is running"}

# Test from outside
curl https://login.pryro.com/api/health

# Check PM2 status
pm2 status

# View logs
pm2 logs pmail-server --lines 50
```

---

## 🔄 Updating After Changes

```bash
# Navigate to app
cd /var/www/pmail/server

# Pull latest code
git pull origin main

# Install any new dependencies
npm install

# Apply any new migrations
npx prisma migrate deploy

# Restart server
pm2 restart pmail-server

# Check logs
pm2 logs pmail-server --lines 20
```

---

## 🔥 Troubleshooting

### "Port 5000 already in use"

```bash
# Find what's using it
lsof -i :5000

# Kill the process
kill -9 PID

# Or change the port in .env
nano .env
# Change PORT=5000 to PORT=5001
```

### "Cannot find module '@prisma/client'"

```bash
npm run prisma:generate
pm2 restart pmail-server
```

### "Database connection failed"

```bash
# Check DATABASE_URL
cat .env | grep DATABASE_URL

# Test Prisma
npx prisma db push
```

### Check logs for errors

```bash
pm2 logs pmail-server --lines 100
```

---

## 🛡️ Security Checklist

- [ ] Strong JWT_SECRET generated
- [ ] Strong ADMIN_SECRET generated
- [ ] .env file has proper permissions: `chmod 600 .env`
- [ ] Firewall configured to block port 5000 (only nginx should access it)
- [ ] SSL certificate installed (use certbot)
- [ ] Production API keys (not test/sandbox keys)
- [ ] Database backups configured

---

## 📊 Monitoring

```bash
# PM2 dashboard
pm2 monit

# Server logs
pm2 logs pmail-server

# Check disk space
df -h

# Check memory
free -m

# Check database size
du -sh prisma/*.db
```

---

## 🆘 Quick Reference Commands

```bash
# Start server
pm2 start src/index.js --name pmail-server

# Restart server
pm2 restart pmail-server

# Stop server
pm2 stop pmail-server

# View logs
pm2 logs pmail-server

# View status
pm2 status

# Delete from PM2
pm2 delete pmail-server

# Update code
git pull && npm install && npx prisma migrate deploy && pm2 restart pmail-server
```

---

**Last Updated:** November 28, 2026
