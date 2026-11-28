# 🚀 Deploy via SSH - Complete Guide

## What I Fixed:

1. ✅ **Password requirement**: 12 chars → 7 chars (in `OnboardingFlow.jsx`)
2. ✅ **API URL**: Updated `.env` to point to `https://mail.pryro.com/api`

## 📡 Deploy Using SSH

### Option 1: Automated Deployment (Recommended)

#### Step 1: Upload the deployment script

**On your local machine (PowerShell in `e:\pmail`):**

```powershell
scp deploy-to-production.sh root@vmi3109658:/root/
```

#### Step 2: Connect to server

```powershell
ssh root@vmi3109658
```

#### Step 3: Run the deployment script

```bash
chmod +x /root/deploy-to-production.sh
bash /root/deploy-to-production.sh
```

This will automatically:
- ✅ Pull latest code from GitHub
- ✅ Install dependencies
- ✅ Build the frontend (`npm run build`)
- ✅ Deploy the backend
- ✅ Restart PM2

---

### Option 2: Manual Step-by-Step

#### Step 1: Connect to server

```powershell
ssh root@vmi3109658
```

#### Step 2: Navigate to project directory

```bash
# Try to find your pmail directory
cd /var/www/pmail || cd /home/pmail || cd /root/pmail

# If not found, clone it:
# cd /var/www
# git clone https://github.com/sentore1/pmail.git
# cd pmail
```

#### Step 3: Pull latest changes

```bash
git pull origin main
```

This pulls the changes you just made (password fix + API URL fix).

#### Step 4: Install dependencies

```bash
npm install
```

#### Step 5: Build frontend

```bash
npm run build
```

This creates a `dist` folder with your production-ready frontend.

#### Step 6: Deploy backend

```bash
cd server
npm install
npx prisma generate
npx prisma migrate deploy
```

#### Step 7: Restart backend

```bash
pm2 restart pmail-server

# Or if not running:
pm2 start src/index.js --name pmail-server
pm2 save
```

#### Step 8: Verify

```bash
# Check backend
pm2 status
curl http://localhost:5000/api/health

# Check frontend build
cd ..
ls -lh dist/
```

---

## 📂 After Building - Deploy Frontend

The `npm run build` command creates a `dist` folder. You need to serve this folder on **mail.pryro.com**.

### Method A: Copy to Web Root

```bash
# Example: If your web root is /var/www/mail.pryro.com/html
cp -r /var/www/pmail/dist/* /var/www/mail.pryro.com/html/

# Or wherever your web server serves from
```

### Method B: Configure Web Server to Serve from dist

**For Nginx:**

Edit your nginx config:

```bash
nano /etc/nginx/sites-available/mail.pryro.com
```

**Add or update:**

```nginx
server {
    listen 80;
    listen 443 ssl;
    server_name mail.pryro.com;

    # SSL certificates (if using HTTPS)
    # ssl_certificate /path/to/cert.pem;
    # ssl_certificate_key /path/to/key.pem;

    # Serve frontend from dist folder
    root /var/www/pmail/dist;
    index index.html;

    # API proxy
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

    # Frontend - SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Save and reload Nginx:**

```bash
nginx -t
systemctl reload nginx
```

---

## ✅ Verification Checklist

After deployment:

```bash
# 1. Check frontend files
ls -la /var/www/pmail/dist/

# 2. Check backend status
pm2 status

# 3. Test backend API
curl http://localhost:5000/api/health

# 4. Test public API
curl https://mail.pryro.com/api/health

# 5. Check logs
pm2 logs pmail-server --lines 20
```

---

## 🧪 Test on Browser

1. Go to **https://mail.pryro.com**
2. Try to create an account
3. Use password with at least **7 characters**
4. Should work without "Failed to fetch" error!

---

## 🔄 Future Deployments

After making changes locally and pushing to GitHub:

```bash
# SSH into server
ssh root@vmi3109658

# Run deployment
cd /var/www/pmail
git pull
npm install
npm run build
cd server
npm install
pm2 restart pmail-server

# If you configured nginx to serve from dist, you're done!
# Otherwise, copy dist to your web root:
# cp -r ../dist/* /path/to/web/root/
```

---

## 🆘 Troubleshooting

### "npm: command not found"

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
```

### "git: command not found"

```bash
apt-get update
apt-get install -y git
```

### Build fails

```bash
# Check Node version (needs 16+)
node --version

# Clear cache and retry
rm -rf node_modules package-lock.json
npm install
npm run build
```

### "pm2: command not found"

```bash
npm install -g pm2
```

---

## 📊 Check Build Output

After `npm run build`, check what was built:

```bash
cd /var/www/pmail
ls -la dist/
cat dist/index.html | grep "VITE_API_URL"
```

The build should use the API URL from your `.env` file.

---

## 🎯 Summary

**What happens when you run `npm run build` on the server:**

1. Vite reads your `.env` file
2. Sees `VITE_API_URL=https://mail.pryro.com/api`
3. Builds frontend with that API URL embedded
4. Creates `dist` folder with production files
5. That `dist` folder is what users access on mail.pryro.com

**The fix is in the code:**
- Password reduced to 7 chars
- API URL points to mail.pryro.com

**You just need to build and deploy it!** 🚀

---

**Server:** root@vmi3109658  
**Domain:** mail.pryro.com  
**Project Path:** /var/www/pmail (or /home/pmail)
