# 🔴 Problem Summary: "Failed to Fetch" on Account Creation

## 📋 Issue Identified

When trying to create an account on the online version at `login.pryro.com`, users get:
```
Failed to fetch
```

## 🔍 Root Cause

After testing, we found **TWO issues**:

### Issue 1: Local .env Configuration ✅ **FIXED**
- **Problem:** Your local `.env` was pointing to `http://localhost:5000/api`
- **Fix Applied:** Changed to `https://login.pryro.com/api`
- **Status:** ✅ Fixed locally

### Issue 2: Production API Not Responding ⚠️ **NEEDS FIX ON SERVER**
- **Problem:** `https://login.pryro.com/api/health` returns **404 Not Found**
- **Likely Cause:** 
  - Server not running on production, OR
  - Nginx not configured to proxy `/api` requests to port 5000
- **Status:** ⚠️ Requires SSH access to fix

---

## 🚀 Solution Steps

### What We Fixed (Already Done ✅)

1. **Updated password requirement**: 12 chars → 7 chars
   - File: `src/components/OnboardingFlow.jsx`
   
2. **Fixed local .env**: Now points to production API
   - File: `.env`
   - Change: `VITE_API_URL=https://login.pryro.com/api`

### What You Need to Do on Server (Via SSH)

**You need to:**
1. Upload fix scripts to server
2. Run the fix script to start the backend
3. Configure Nginx to proxy `/api` requests
4. Verify the API is accessible

---

## 📂 Files Created to Help You

| File | Purpose |
|------|---------|
| `fix-production.sh` | Automated script to fix server (run on SSH) |
| `quick-server-check.sh` | Diagnostic script (run on SSH) |
| `check-production.ps1` | Test production from local machine |
| `SSH_FIX_INSTRUCTIONS.md` | Detailed step-by-step SSH guide |
| `QUICK_SSH_COMMANDS.txt` | Quick command reference |
| `DEBUG_FAILED_TO_FETCH.md` | Complete troubleshooting guide |

---

## ⚡ Quick Start (Do This Now)

### 1. Upload Scripts to Server

**Open PowerShell in `e:\pmail` and run:**

```powershell
scp fix-production.sh root@vmi3109658:/root/
scp quick-server-check.sh root@vmi3109658:/root/
```

### 2. Connect and Fix

```powershell
ssh root@vmi3109658
```

**Once connected:**

```bash
chmod +x /root/fix-production.sh
bash /root/fix-production.sh
```

### 3. Verify

```bash
# Check server status
pm2 status

# Test locally
curl http://localhost:5000/api/health

# Test publicly
curl https://login.pryro.com/api/health
```

If the public test fails but local test works, you need to configure Nginx.

---

## 🔧 Nginx Configuration (If Needed)

**Edit Nginx config:**

```bash
nano /etc/nginx/sites-available/default
```

**Add this inside the `server` block:**

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

**Save and reload:**

```bash
nginx -t
systemctl reload nginx
```

---

## ✅ Success Indicators

You'll know it's working when:

1. ✅ `pm2 status` shows `pmail-server` as **online**
2. ✅ `curl http://localhost:5000/api/health` returns JSON
3. ✅ `curl https://login.pryro.com/api/health` returns JSON
4. ✅ Browser can access `https://login.pryro.com/api/health`
5. ✅ Account creation works in the frontend

---

## 📱 Test from Browser

After fixing the server, test in your browser console:

```javascript
fetch('https://login.pryro.com/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'Test123',
    name: 'Test User',
    username: 'testuser'
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

---

## 🆘 If You Get Stuck

1. **Run diagnostic script:**
   ```bash
   bash /root/quick-server-check.sh
   ```

2. **Check logs:**
   ```bash
   pm2 logs pmail-server --lines 50
   ```

3. **Verify port 5000:**
   ```bash
   netstat -tlnp | grep :5000
   ```

4. **Check .env on server:**
   ```bash
   cd /var/www/pmail/server
   cat .env | grep -E "PORT|CLIENT_URL|DATABASE"
   ```

---

## 📞 Common Error Solutions

| Error | Solution |
|-------|----------|
| `pm2: command not found` | `npm install -g pm2` |
| `Cannot find pmail/server` | Clone repo: `git clone https://github.com/sentore1/pmail.git /var/www/pmail` |
| Port 5000 already in use | `lsof -i :5000` then `kill -9 PID` |
| Nginx syntax error | Check brackets and semicolons in config |
| Database error | Run `npx prisma migrate deploy` |

---

## 🎯 Next Steps After Fix

1. **Rebuild frontend** (if needed):
   ```powershell
   cd e:\pmail
   npm run build
   ```

2. **Deploy updated frontend** to your hosting

3. **Test account creation** on `login.pryro.com`

4. **Monitor logs** for any issues:
   ```bash
   pm2 logs pmail-server
   ```

---

**Server:** root@vmi3109658  
**Domain:** login.pryro.com  
**API Port:** 5000  
**Date:** November 28, 2026
