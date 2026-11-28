#!/bin/bash
# Script to check Pmail server status and logs on production

echo "🔍 Checking Pmail Server Status..."
echo "=================================="
echo ""

# Check if PM2 is running
echo "📊 PM2 Status:"
pm2 status

echo ""
echo "=================================="
echo ""

# Check recent logs
echo "📝 Recent Server Logs (last 50 lines):"
pm2 logs pmail-server --lines 50 --nostream

echo ""
echo "=================================="
echo ""

# Check if server is responding
echo "🌐 Testing API Health Endpoint:"
curl -s http://localhost:5000/api/health || echo "❌ Local API not responding"

echo ""
echo ""

# Check if nginx is properly configured
echo "🔧 Testing Public API:"
curl -s https://login.pryro.com/api/health || echo "❌ Public API not responding"

echo ""
echo ""

# Check database connection
echo "💾 Testing Database:"
cd /var/www/pmail/server || cd /home/pmail/server
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.user.count().then(c => console.log('✅ Database connected. Users:', c)).catch(e => console.log('❌ Database error:', e.message)).finally(() => prisma.\$disconnect());"

echo ""
echo "=================================="
echo ""

# Check port 5000
echo "🔌 Checking Port 5000:"
netstat -tlnp | grep :5000 || echo "❌ Nothing listening on port 5000"

echo ""
echo "=================================="
echo ""

# Check environment
echo "⚙️ Environment Variables:"
cd /var/www/pmail/server || cd /home/pmail/server
echo "PORT: $(grep ^PORT .env)"
echo "NODE_ENV: $(grep ^NODE_ENV .env)"
echo "CLIENT_URL: $(grep ^CLIENT_URL .env)"

echo ""
echo "=================================="
echo "✅ Check complete!"
