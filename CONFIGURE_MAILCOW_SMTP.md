# 🔧 Fix: Emails Not Sending to External Users (Gmail, etc.)

## 🔴 Problem
Emails to external addresses (non-Pryro users like Gmail) are not being sent because Mailcow SMTP is not configured.

Currently using: **Ethereal** (test email service - emails don't actually send)

## ✅ Solution: Configure Mailcow SMTP

### Step 1: Get Mailcow Credentials

You need to get from your Mailcow installation at **mail.pryro.com**:

1. **API Key**:
   - Log in to Mailcow admin panel: https://mail.pryro.com
   - Go to: **System > API**
   - Generate a **Read-Write API Key**
   - Copy it

2. **SMTP Password for noreply@pryro.com**:
   - In Mailcow admin: **Configuration > Mailboxes**
   - Find or create: `noreply@pryro.com`
   - Set/copy the password

### Step 2: Update Server .env File

SSH into your server and edit the `.env` file:

```bash
ssh root@vmi3109658
cd /var/www/pmail-backend/server
nano .env
```

**Find these lines and update them:**

```bash
# Replace these placeholder values with REAL credentials:

MAILCOW_API_URL="https://mail.pryro.com"
MAILCOW_API_KEY="YOUR-ACTUAL-API-KEY-FROM-MAILCOW"
MAIL_DOMAIN="pryro.com"
MAILCOW_SMTP_HOST="mail.pryro.com"
MAILCOW_SMTP_PORT=587
MAILCOW_SMTP_SECURE=false
MAILCOW_SMTP_USER="noreply@pryro.com"
MAILCOW_SMTP_PASS="YOUR-ACTUAL-PASSWORD-FROM-MAILCOW"
MAILCOW_QUOTA_MB=1024
```

**Save:** Ctrl+X, then Y, then Enter

### Step 3: Restart the Backend

```bash
pm2 restart pmail-server
pm2 logs pmail-server --lines 20
```

**Look for this line in logs:**
```
📧 Mailcow SMTP transport configured for mail.pryro.com
```

If you see:
```
📧 Using Ethereal test email (dev mode)
```
Then credentials are still wrong.

### Step 4: Test Sending Email

1. Go to https://mail.pryro.com
2. Compose a new email
3. Send to: **abdousentore@gmail.com** (or your Gmail)
4. Check your Gmail inbox - it should arrive!

---

## 🔍 Troubleshooting

### "Ethereal test email" still showing in logs

**Problem:** Credentials not being read

**Check:**
```bash
cd /var/www/pmail-backend/server
cat .env | grep MAILCOW_SMTP
```

Make sure no spaces around `=`:
- ✅ `MAILCOW_SMTP_USER="noreply@pryro.com"`
- ❌ `MAILCOW_SMTP_USER = "noreply@pryro.com"` (spaces = broken)

### "Authentication failed" error

**Problem:** Wrong password or username

**Solution:**
- In Mailcow, reset the password for `noreply@pryro.com`
- Update `.env` with the new password
- Restart: `pm2 restart pmail-server`

### "Connection refused" error

**Problem:** Mailcow SMTP port blocked or wrong host

**Check:**
```bash
telnet mail.pryro.com 587
```

If it doesn't connect, check firewall settings.

### Create noreply@pryro.com if it doesn't exist

```bash
# In Mailcow admin panel:
1. Go to: Configuration > Mailboxes
2. Click "Add mailbox"
3. Local part: noreply
4. Domain: pryro.com
5. Set a strong password
6. Quota: 1024 MB
7. Save
```

---

## 📧 How It Works After Configuration

1. **User sends email to Gmail** (abdousentore@gmail.com)
2. **Pmail backend** uses Mailcow SMTP to send via `noreply@pryro.com`
3. **Gmail receives** email from `noreply@pryro.com`
4. **Email includes** reply link with payment option (if enabled)
5. **External user can reply** via the payment page

---

## ✅ Verification Checklist

After configuration, verify:

- [ ] `.env` has real Mailcow credentials (not "your-mailcow-...")
- [ ] PM2 logs show "Mailcow SMTP transport configured"
- [ ] No "Ethereal" mentioned in logs
- [ ] Test email to Gmail arrives in inbox
- [ ] Check Gmail spam folder if not in inbox
- [ ] Reply link in email works

---

**Domain:** mail.pryro.com  
**Mailbox to create:** noreply@pryro.com  
**Server:** root@vmi3109658
