#!/bin/bash
# Complete deployment script for mail.pryro.com

echo "🚀 Deploying Pmail to Production"
echo "=================================="
echo ""

# Find the app directory
if [ -d "/var/www/pmail" ]; then
    APP_DIR="/var/www/pmail"
elif [ -d "/home/pmail" ]; then
    APP_DIR="/home/pmail"
elif [ -d "/root/pmail" ]; then
    APP_DIR="/root/pmail"
else
    echo "❌ pmail directory not found!"
    echo "Cloning from GitHub..."
    cd /var/www
    git clone https://github.com/sentore1/pmail.git
    APP_DIR="/var/www/pmail"
fi

echo "✅ Found app directory: $APP_DIR"
cd "$APP_DIR"

echo ""
echo "1️⃣ Pulling latest changes from GitHub..."
git pull origin main

echo ""
echo "2️⃣ Installing frontend dependencies..."
npm install

echo ""
echo "3️⃣ Building frontend..."
npm run build

echo ""
echo "4️⃣ Checking if dist folder was created..."
if [ -d "dist" ]; then
    echo "✅ Build successful! dist folder created"
    echo "   Size: $(du -sh dist | cut -f1)"
else
    echo "❌ Build failed! No dist folder found"
    exit 1
fi

echo ""
echo "5️⃣ Deploying backend..."
cd server

echo "   Installing backend dependencies..."
npm install

echo "   Generating Prisma client..."
npx prisma generate

echo "   Applying database migrations..."
npx prisma migrate deploy

echo ""
echo "6️⃣ Restarting backend with PM2..."
pm2 restart pmail-server || pm2 start src/index.js --name pmail-server
pm2 save

echo ""
echo "7️⃣ Testing backend..."
sleep 2
curl -s http://localhost:5000/api/health

echo ""
echo ""
echo "=================================="
echo "✅ Deployment Complete!"
echo ""
echo "Frontend built in: $APP_DIR/dist"
echo "Backend status: $(pm2 status | grep pmail-server)"
echo ""
echo "Next steps:"
echo "1. Configure your web server to serve from: $APP_DIR/dist"
echo "2. Or manually copy dist folder to your web root"
echo "3. Test: https://mail.pryro.com"
echo ""
echo "View logs: pm2 logs pmail-server"
