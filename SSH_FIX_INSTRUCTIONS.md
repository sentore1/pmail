# 🔧 Fix "Failed to Fetch" - Step by Step

## Problem Identified
Your production API needs to be tested at `https://mail.pryro.com/api/health`.

This means:
- ❌ The server is not running, OR
- ❌ Nginx is not configured to proxy `/api` requests

---

## 🚀 Solution: Run These Commands on SSH

### Step 1: Upload the fix script

**On your local machine (PowerShell):**

```powershell
# Upload the fix script to server
scp fix-production.sh root@vmi3109658:/root/

# Upload the diagnostic script too
scp quick-server-check.sh root@vmi3109658:/root/
```

---

### Step 2: Connect to your server

```powershell
ssh root@vmi3109658
```

---

### Step 3: Run the fix script

```bash
# Make it executable
chmod +x /root/fix-production.sh

# Run it
bash /root/fix-production.sh
```

This script will:
1. ✅ Find your pmail server directory
2. ✅ Install dependencies
3. ✅ Generate Prisma client
4. ✅ Stop any old server instances
5. ✅ Start the server with PM2
6. ✅ Test the server locally

---

### Step 4: Check if server is running

```bash
# Check PM2 status
pm2 status

# Test health endpoint locally
curl http://localhost:5000/api/health

# Should return: {"status":"ok","message":"Pmail server is running"}

# View logs
pm2 logs pmail-server --lines 30
```

---

### Step 5: Configure Nginx (if needed)

**Check if Nginx is configured:**

```bash
cat /etc/nginx/sites-available/default | grep -A 10 "/api"
```

**If you don't see an `/api` location block, add it:**

```bash
nano /etc/nginx/sites-available/default
```

**Add this inside the `server` block (before the PHP location block):**

```nginx
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
```

**Save and exit:**
- Press `Ctrl + X`
- Press `Y`
- Press `Enter`

**Test and reload Nginx:**

```bash
# Test configuration
nginx -t

# If OK, reload
systemctl reload nginx

# Or restart if needed
systemctl restart nginx
```

---

### Step 6: Test the public API

```bash
# Test from server
curl https://mail.pryro.com/api/health

# Should return: {"status":"ok","message":"Pmail server is running"}
```

---

### Step 7: Check on your local machine

**On your local machine (PowerShell):**

```powershell
# Test the API
Invoke-RestMethod -Uri "https://login.pryro.com/api/health" -Method Get

# Or use browser
# Visit: https://mail.pryro.com/api/health
```

**Expected response:**
```json
{
  "status": "ok",
  "message": "Pmail server is running"
}
```

---

## 🎯 If Server Directory Doesn't Exist

If the script says "Cannot find pmail/server directory", clone the repo:

```bash
# Clone to /var/www
cd /var/www
git clone https://github.com/sentore1/pmail.git

# Navigate to server
cd pmail/server

# Create .env file (copy from local or create new)
nano .env
```

**Minimal .env for testing:**

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-here-change-this"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV="production"
CLIENT_URL="https://mail.pryro.com"
```

**Then run:**

```bash
npm install
npx prisma generate
npx prisma migrate deploy
node prisma/seed-admin.js
pm2 start src/index.js --name pmail-server
pm2 save
```

---

## 🔍 Troubleshooting Commands

```bash
# Check if anything is on port 5000
netstat -tlnp | grep :5000

# Check PM2 processes
pm2 list

# View real-time logs
pm2 logs pmail-server

# View only errors
pm2 logs pmail-server --err

# Restart server
pm2 restart pmail-server

# Stop server
pm2 stop pmail-server

# Delete and recreate
pm2 delete pmail-server
pm2 start src/index.js --name pmail-server
```

---

## ✅ Success Checklist

After fixing, verify:

- [ ] `pm2 status` shows pmail-server as "online"
- [ ] `curl http://localhost:5000/api/health` returns JSON
- [ ] `curl https://mail.pryro.com/api/health` returns JSON
- [ ] Browser can access `https://login.pryro.com/api/health`
- [ ] Account creation works on frontend

---

## 🎉 After Everything Works

**On your local machine, rebuild the frontend:**

```powershell
cd e:\pmail

# The .env already points to production now
# (we fixed it earlier)

# Rebuild
npm run build

# The dist folder will now use the production API
```

---

## 📞 Still Need Help?

Run the diagnostic script on the server:

```bash
bash /root/quick-server-check.sh
```

This will show you exactly what's wrong.

---

**Created:** November 28, 2026  
**Your Server:** root@vmi3109658 (login.pryro.com)
