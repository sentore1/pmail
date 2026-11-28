#!/bin/bash
# Quick diagnostics for "Failed to fetch" error

echo "🔍 Quick Server Diagnostics"
echo "=========================="
echo ""

# 1. Check if PM2 is running
echo "1️⃣ PM2 Process:"
pm2 list | grep pmail || echo "❌ pmail-server not found in PM2"
echo ""

# 2. Check recent errors in logs
echo "2️⃣ Recent Errors (last 30 lines):"
pm2 logs pmail-server --err --lines 30 --nostream
echo ""

# 3. Test registration endpoint
echo "3️⃣ Testing Registration Endpoint:"
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123","name":"Test User"}' \
  -w "\nHTTP Status: %{http_code}\n" \
  || echo "❌ Cannot reach registration endpoint"
echo ""

# 4. Check CORS settings
echo "4️⃣ CORS Configuration:"
grep CLIENT_URL /var/www/pmail/server/.env || grep CLIENT_URL /home/pmail/server/.env
echo ""

# 5. Check if port is accessible
echo "5️⃣ Port 5000 Status:"
netstat -tlnp | grep :5000
echo ""

# 6. Check Nginx config
echo "6️⃣ Nginx API Configuration:"
grep -A 10 "location /api" /etc/nginx/sites-enabled/* | head -20
echo ""

echo "=========================="
echo "✅ Diagnostics complete!"
echo ""
echo "Common fixes:"
echo "• If PM2 not running: pm2 restart pmail-server"
echo "• If port blocked: check firewall and nginx"
echo "• If CORS error: update CLIENT_URL in .env"
echo "• View full logs: pm2 logs pmail-server"
