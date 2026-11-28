# 🚀 Ready to Deploy - Quick Guide

## ✅ All Fixes Applied

1. ✅ Password requirement: **12 chars → 7 chars**
2. ✅ API URL corrected: **https://mail.pryro.com/api**
3. ✅ Production server verified: **WORKING**

---

## 🎯 Deploy in 3 Steps

### Step 1: Rebuild Frontend

```powershell
npm run build
```

This creates a production-ready `dist` folder.

---

### Step 2: Upload to Server

Upload everything in the `dist` folder to your **mail.pryro.com** web root.

**Using SCP (if you have SSH access):**

```powershell
scp -r dist/* root@vmi3109658:/path/to/mail.pryro.com/public_html/
```

---

### Step 3: Test!

1. Go to **mail.pryro.com**
2. Try creating an account
3. Use a password with at least 7 characters
4. Should work! ✅

---

## 🧪 Quick Test

Open browser console (F12) on **mail.pryro.com** and run:

```javascript
// Test API connection
fetch('https://mail.pryro.com/api/health')
  .then(r => r.json())
  .then(console.log)

// Should show: {status: "ok", message: "Pmail server is running"}
```

---

## 📋 Checklist

Before deploying:
- [x] Password reduced to 7 characters
- [x] .env points to mail.pryro.com
- [x] Production API verified working
- [ ] Frontend rebuilt (`npm run build`)
- [ ] Dist folder uploaded to server
- [ ] Account creation tested

---

## 🆘 If Issues Occur

### Check Browser Console (F12)
Look for errors when creating account.

### Common Issues:

**CORS Error:**
- Server needs `CLIENT_URL=https://mail.pryro.com` in backend `.env`

**404 Error:**
- Wrong API URL, check frontend `.env`

**500 Error:**
- Backend issue, check server logs: `pm2 logs pmail-server`

---

## ✅ Success = No Errors!

If account creation works without "Failed to fetch", you're done! 🎉

---

**Your Domain:** mail.pryro.com  
**Your API:** https://mail.pryro.com/api  
**Status:** Ready to Deploy
