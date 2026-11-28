#!/bin/bash
# Script to fix production server issues

echo "🔧 Pmail Production Server Fix Script"
echo "======================================"
echo ""

# Find the server directory
if [ -d "/var/www/pmail/server" ]; then
    SERVER_DIR="/var/www/pmail/server"
elif [ -d "/home/pmail/server" ]; then
    SERVER_DIR="/home/pmail/server"
elif [ -d "/root/pmail/server" ]; then
    SERVER_DIR="/root/pmail/server"
else
    echo "❌ Cannot find pmail/server directory!"
    echo "Please run: git clone https://github.com/sentore1/pmail.git /var/www/pmail"
    exit 1
fi

echo "✅ Found server directory: $SERVER_DIR"
cd "$SERVER_DIR"

echo ""
echo "1️⃣ Installing dependencies..."
npm install

echo ""
echo "2️⃣ Generating Prisma client..."
npx prisma generate

echo ""
echo "3️⃣ Checking if PM2 is installed..."
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

echo ""
echo "4️⃣ Stopping any existing server..."
pm2 stop pmail-server 2>/dev/null || true
pm2 delete pmail-server 2>/dev/null || true

echo ""
echo "5️⃣ Starting server with PM2..."
pm2 start src/index.js --name pmail-server

echo ""
echo "6️⃣ Saving PM2 configuration..."
pm2 save

echo ""
echo "7️⃣ Testing server..."
sleep 3
curl -s http://localhost:5000/api/health

echo ""
echo ""
echo "8️⃣ Checking PM2 status..."
pm2 status

echo ""
echo "======================================"
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Check logs: pm2 logs pmail-server"
echo "2. Test API: curl http://localhost:5000/api/health"
echo "3. Configure Nginx to proxy /api to port 5000"
echo ""
echo "Need to configure Nginx? Run: nano /etc/nginx/sites-available/default"
