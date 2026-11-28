# 🔍 Debugging "Failed to Fetch" Error

This guide will help you troubleshoot the "Failed to fetch" error when creating accounts on the online version.

---

## 🎯 Quick Diagnosis

### Option 1: Check from Local Machine (Windows)

Run this PowerShell script from your local machine:

```powershell
.\check-production.ps1
```

This will:
- ✅ Test if the API is responding
- ✅ Test the registration endpoint
- ✅ Check your local `.env` configuration
- ✅ Show you SSH commands to check the server

---

### Option 2: Check on Server via SSH

#### Step 1: Upload the diagnostic script

```powershell
# From your local machine (PowerShell)
scp quick-server-check.sh root@vmi3109658:/root/
```

#### Step 2: Connect to server

```powershell
ssh root@vmi3109658
```

#### Step 3: Run the diagnostic

```bash
cd /root
chmod +x quick-server-check.sh
./quick-server-check.sh
```

---

## 🔧 Common Causes & Fixes

### 1. **Server Not Running**

**Check:**
```bash
pm2 status
```

**Fix:**
```bash
pm2 restart pmail-server
# Or if not found:
cd /var/www/pmail/server
pm2 start src/index.js --name pmail-server
```

---

### 2. **Port 5000 Not Accessible**

**Check:**
```bash
netstat -tlnp | grep :5000
curl http://localhost:5000/api/health
```

**Fix:**
```bash
# Check if something else is using port 5000
lsof -i :5000

# Restart the server
pm2 restart pmail-server
```

---

### 3. **Nginx Not Configured**

**Check:**
```bash
curl https://login.pryro.com/api/health
```

**Fix:**
```bash
# Check nginx config
cat /etc/nginx/sites-enabled/default | grep -A 10 "location /api"

# If not configured, add this to your nginx config:
# location /api {
#     proxy_pass http://localhost:5000;
#     proxy_http_version 1.1;
#     proxy_set_header Upgrade $http_upgrade;
#     proxy_set_header Connection 'upgrade';
#     proxy_set_header Host $host;
#     proxy_cache_bypass $http_upgrade;
# }

# Then restart nginx:
systemctl restart nginx
```

---

### 4. **CORS Issues**

**Check:**
```bash
cd /var/www/pmail/server
cat .env | grep CLIENT_URL
```

**Fix:**
```bash
# Edit .env
nano .env

# Make sure CLIENT_URL matches your frontend domain:
CLIENT_URL="https://login.pryro.com"

# Restart server
pm2 restart pmail-server
```

---

### 5. **Database Connection Issues**

**Check:**
```bash
cd /var/www/pmail/server
npx prisma db push
```

**Fix:**
```bash
# Check DATABASE_URL in .env
cat .env | grep DATABASE_URL

# Test Prisma connection
npx prisma studio
# (Press Ctrl+C to exit)

# If database is missing, run migrations:
npx prisma migrate deploy
node prisma/seed-admin.js
```

---

### 6. **Frontend .env Points to Wrong URL**

**Your local `.env` should point to production:**

```env
VITE_API_URL=https://login.pryro.com/api
```

**NOT:**
```env
VITE_API_URL=http://localhost:5000/api
```

After changing, rebuild the frontend:
```bash
npm run build
```

---

## 📊 View Real-Time Logs

```bash
# SSH into server
ssh root@vmi3109658

# View logs in real-time
pm2 logs pmail-server

# View only errors
pm2 logs pmail-server --err

# View last 100 lines
pm2 logs pmail-server --lines 100 --nostream
```

---

## 🧪 Test Registration Manually

### From Server:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "Test1234",
    "name": "Test User",
    "username": "testuser"
  }'
```

### From Browser Console:

```javascript
fetch('https://login.pryro.com/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@test.com',
    password: 'Test1234',
    name: 'Test User',
    username: 'testuser'
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

---

## 🔄 Complete Server Restart

If nothing else works, do a complete restart:

```bash
# SSH into server
ssh root@vmi3109658

# Navigate to app
cd /var/www/pmail/server

# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Apply migrations
npx prisma migrate deploy

# Restart with PM2
pm2 restart pmail-server

# Check status
pm2 status

# View logs
pm2 logs pmail-server --lines 50
```

---

## 🆘 Still Not Working?

### Check Browser Console

1. Open your browser's Developer Tools (F12)
2. Go to **Console** tab
3. Try to create an account
4. Look for error messages

### Common Browser Errors:

- **CORS Error**: Server needs `CLIENT_URL` configured
- **404 Not Found**: Nginx not configured or wrong API_URL
- **500 Internal Server Error**: Check server logs with `pm2 logs`
- **ERR_CONNECTION_REFUSED**: Server not running
- **Mixed Content Error**: Frontend using HTTPS but API using HTTP

---

## 📝 Checklist

Before creating an account, verify:

- [ ] Server is running (`pm2 status`)
- [ ] API health endpoint works (`curl https://login.pryro.com/api/health`)
- [ ] Nginx is configured to proxy `/api` to port 5000
- [ ] `.env` has correct `CLIENT_URL` on server
- [ ] `.env` has correct `VITE_API_URL` on frontend
- [ ] Database is connected and migrations are applied
- [ ] Firewall allows port 5000 (or nginx proxy)
- [ ] SSL certificate is valid (if using HTTPS)

---

**Created:** November 28, 2026
**Server:** root@vmi3109658 (login.pryro.com)
