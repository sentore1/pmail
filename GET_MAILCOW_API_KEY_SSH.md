# 🔑 Get Mailcow API Key via SSH

## Method 1: Generate API Key via Mailcow CLI

```bash
ssh root@vmi3109658

# Navigate to Mailcow directory
cd /opt/mailcow-dockerized

# Generate API key using docker-compose
docker-compose exec mysql-mailcow mysql -u mailcow -p$(grep DBPASS mailcow.conf | cut -d'=' -f2) mailcow -e "SELECT api_key FROM api WHERE active='1' LIMIT 1;"

# If no key exists, you need to create one via web UI or database
```

## Method 2: Create API Key via Database

```bash
ssh root@vmi3109658
cd /opt/mailcow-dockerized

# Access MySQL container
docker-compose exec mysql-mailcow mysql -u mailcow -p$(grep DBPASS mailcow.conf | cut -d'=' -f2) mailcow

# Inside MySQL, create a new API key:
INSERT INTO api (api_key, active, allow_from, description) 
VALUES (SHA2(CONCAT(NOW(), RAND()), 256), 1, '0.0.0.0/0', 'Pmail Backend');

# View the generated key:
SELECT api_key, description FROM api WHERE active='1';

# Exit MySQL
exit
```

## Method 3: Use Existing Admin API Key

If you've already created an API key in the web interface, retrieve it:

```bash
ssh root@vmi3109658
cd /opt/mailcow-dockerized

# List all active API keys
docker-compose exec mysql-mailcow mysql -u mailcow -p$(grep DBPASS mailcow.conf | cut -d'=' -f2) mailcow -e "SELECT api_key, description, created FROM api WHERE active='1';"
```

## Method 4: Create Mailbox and Get Password

Since you need a mailbox for SMTP, create `noreply@pryro.com`:

```bash
ssh root@vmi3109658
cd /opt/mailcow-dockerized

# Generate a random password
NEW_PASSWORD=$(openssl rand -base64 16)
echo "Generated password: $NEW_PASSWORD"

# Create mailbox via API (if you have an existing API key)
# Replace YOUR_API_KEY with an existing key
curl -X POST "https://mail.pryro.com/api/v1/add/mailbox" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "local_part": "noreply",
    "domain": "pryro.com",
    "password": "'$NEW_PASSWORD'",
    "password2": "'$NEW_PASSWORD'",
    "quota": "1024",
    "active": "1"
  }'
```

## Method 5: Easiest - Use Web UI with Port Forwarding

If SSH access is available but you prefer the web UI:

```bash
# From your local machine, create an SSH tunnel
ssh -L 8443:localhost:8443 root@vmi3109658

# Then open in browser:
https://localhost:8443
```

This forwards Mailcow's web interface to your local machine.

---

## 📋 Complete Setup Script

Run this script on your server to set everything up:

```bash
#!/bin/bash
# Run on server: ssh root@vmi3109658

cd /opt/mailcow-dockerized || {
  echo "❌ Mailcow not found at /opt/mailcow-dockerized"
  exit 1
}

echo "🔑 Getting Mailcow Database Password..."
DB_PASS=$(grep DBPASS mailcow.conf | cut -d'=' -f2)

echo "📧 Checking for existing API keys..."
docker-compose exec -T mysql-mailcow mysql -u mailcow -p${DB_PASS} mailcow -e "SELECT api_key, description FROM api WHERE active='1' LIMIT 5;"

echo ""
echo "📬 Checking if noreply@pryro.com exists..."
docker-compose exec -T mysql-mailcow mysql -u mailcow -p${DB_PASS} mailcow -e "SELECT username FROM mailbox WHERE username='noreply@pryro.com';"

echo ""
echo "✅ Done! Copy the API key above and use it in your .env file"
```

---

## 🎯 Quick Summary

**To get API key:**
```bash
ssh root@vmi3109658
cd /opt/mailcow-dockerized
docker-compose exec mysql-mailcow mysql -u mailcow -p$(grep DBPASS mailcow.conf | cut -d'=' -f2) mailcow -e "SELECT api_key FROM api WHERE active='1';"
```

**To create noreply mailbox manually:**
1. Use Mailcow web UI: https://mail.pryro.com
2. Or use the API method above
3. Or create via database

**Then update Pmail backend:**
```bash
cd /var/www/pmail-backend/server
nano .env
# Add the API key and mailbox password
pm2 restart pmail-server
```

---

**Note:** If Mailcow is installed in a different location, find it with:
```bash
find /opt -name "mailcow.conf" 2>/dev/null
find /home -name "mailcow.conf" 2>/dev/null
```
