# 🗄️ Database Deployment Guide

## ⚠️ CRITICAL: What Should NOT Be Deployed

### ❌ NEVER Deploy These Files:
```
server/prisma/dev.db           ← Your local SQLite database
server/prisma/dev.db-journal   ← SQLite journal file
server/.env                     ← Your environment variables with secrets
```

**Why?**
- `dev.db` contains your local test data (not production data)
- `.env` contains sensitive API keys, passwords, and secrets
- These files are in `.gitignore` and should NEVER be committed to Git

### ✅ DO Deploy These Files:
```
server/prisma/schema.prisma    ← Database schema (structure only)
server/prisma/migrations/      ← Migration files (version control)
server/prisma/seed-admin.js    ← Admin seed script
```

---

## 📋 Pre-Deployment Checklist

### 1. Test Database Connection Locally

```bash
cd server
node test-db-connection.js
```

**Expected Output:**
```
✅ Test 1: Database Connection
   ✓ Successfully connected to database

✅ Test 2: User Table
   ✓ Total users in database: X

✅ All tests passed!
```

### 2. Verify .gitignore

Ensure these lines are in `server/.gitignore`:
```
# Database files (local only)
prisma/*.db
prisma/*.db-journal
prisma/dev.db
prisma/dev.db-journal

# Environment variables
.env
.env.local
```

### 3. Check Git Status

```bash
git status
```

**You should NOT see:**
- ❌ `prisma/dev.db`
- ❌ `prisma/dev.db-journal`
- ❌ `.env`

**You SHOULD see:**
- ✅ `prisma/schema.prisma` (if modified)
- ✅ `prisma/migrations/` (if new migrations)

---

## 🚀 Production Deployment Steps

### Step 1: Set Up Production Database

**Option A: PostgreSQL (Recommended for Production)**

1. Get a PostgreSQL database:
   - **Neon**: https://neon.tech (Free tier available)
   - **Supabase**: https://supabase.com (Free tier)
   - **Railway**: https://railway.app
   - **AWS RDS**: For enterprise

2. Update production `.env`:
   ```env
   # Change from SQLite to PostgreSQL
   DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"
   ```

3. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"  // Change from "sqlite"
     url      = env("DATABASE_URL")
   }
   ```

**Option B: Keep SQLite (Small Projects Only)**

1. Production `.env`:
   ```env
   DATABASE_URL="file:/var/app/data/production.db"
   ```

2. Ensure the data directory is persistent and backed up

### Step 2: Deploy Database Schema

On your production server:

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma Client
npm run prisma:generate

# 3. Run migrations (creates tables)
npx prisma migrate deploy

# 4. Create admin user
node prisma/seed-admin.js
```

### Step 3: Verify Production Database

```bash
# Test connection
node test-db-connection.js

# Check database
npx prisma studio
```

---

## 🔐 Environment Variables for Production

Create a **NEW** `.env` file on your production server:

```env
# ════════════════════════════════════════════
# PRODUCTION .env (DO NOT COPY FROM LOCAL!)
# ════════════════════════════════════════════

# Database - Use PostgreSQL in production
DATABASE_URL="postgresql://user:password@host:5432/database"

# JWT - Generate new secret!
JWT_SECRET="GENERATE-STRONG-SECRET-HERE"
JWT_EXPIRES_IN="7d"

# Server
PORT=5000
NODE_ENV="production"

# CORS - Your production domain
CLIENT_URL="https://yourdomain.com"

# Google OAuth
GOOGLE_CLIENT_ID="your-production-google-id"
GOOGLE_CLIENT_SECRET="your-production-google-secret"
GOOGLE_REDIRECT_URI="https://yourdomain.com/api/google/callback"
GOOGLE_GMAIL_REDIRECT_URI="https://yourdomain.com/api/google/gmail-callback"

# Stripe (Production keys)
STRIPE_SECRET_KEY="sk_live_YOUR_LIVE_KEY"
STRIPE_PUBLISHABLE_KEY="pk_live_YOUR_LIVE_KEY"
STRIPE_WEBHOOK_SECRET="whsec_YOUR_WEBHOOK_SECRET"
TRANSACTION_FEE_PERCENTAGE=5

# MTN MoMo (Production)
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
ADMIN_SECRET="GENERATE-STRONG-SECRET-HERE"

# Webhook
WEBHOOK_SECRET="GENERATE-STRONG-SECRET-HERE"
WEBHOOK_PORT=9000
DEPLOY_BRANCH="main"
```

**Generate Strong Secrets:**
```bash
# On Linux/Mac:
openssl rand -hex 32

# On Windows (PowerShell):
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

---

## 🔄 Database Migration Workflow

### When You Make Schema Changes:

1. **Locally:** Create migration
   ```bash
   npm run prisma:migrate
   # Name it descriptively: "add_user_field" etc.
   ```

2. **Commit to Git:**
   ```bash
   git add prisma/schema.prisma
   git add prisma/migrations/
   git commit -m "Add new database field"
   git push
   ```

3. **On Production:** Apply migration
   ```bash
   git pull
   npx prisma migrate deploy
   npm run prisma:generate
   # Restart server
   pm2 restart pmail-server
   ```

---

## 🛡️ Security Best Practices

### ✅ DO:
- Use PostgreSQL or MySQL in production (not SQLite)
- Keep database backups automated
- Use connection pooling for PostgreSQL
- Rotate secrets regularly
- Use environment variables for all secrets
- Keep `.env` files in `.gitignore`
- Use different API keys for dev/prod

### ❌ DON'T:
- Commit `.env` files to Git
- Commit database files (`*.db`) to Git
- Use development credentials in production
- Share production credentials in Slack/email
- Use SQLite for high-traffic production apps

---

## 📊 Monitoring

### Check Database Health:

```bash
# Connection test
node test-db-connection.js

# View database in browser
npx prisma studio

# Check database size (SQLite)
du -h prisma/*.db

# Check database size (PostgreSQL)
# Run in psql:
SELECT pg_size_pretty(pg_database_size('your_database_name'));
```

### Regular Maintenance:

```bash
# Backup database (PostgreSQL)
pg_dump database_url > backup-$(date +%Y%m%d).sql

# Backup database (SQLite)
cp prisma/production.db backups/production-$(date +%Y%m%d).db
```

---

## 🆘 Troubleshooting

### "Cannot find module '@prisma/client'"
```bash
npm run prisma:generate
```

### "Database does not exist"
```bash
npx prisma migrate deploy
```

### "Connection refused"
Check:
1. Database server is running
2. `DATABASE_URL` is correct
3. Firewall allows connection
4. Database credentials are valid

### "Migration failed"
```bash
# Reset database (⚠️ DELETES ALL DATA)
npx prisma migrate reset

# Or manually fix:
npx prisma db push --skip-generate
```

---

## 📚 Additional Resources

- **Prisma Docs**: https://www.prisma.io/docs
- **PostgreSQL Setup**: https://www.prisma.io/docs/guides/database/deploy-postgres
- **Production Checklist**: https://www.prisma.io/docs/guides/deployment/deployment-guides

---

**Last Updated:** November 28, 2026
