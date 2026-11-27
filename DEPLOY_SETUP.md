# Pmail — Contabo Server + GitHub Webhook Auto-Deploy Setup

This project auto-deploys to your Contabo server on every `git push` to `main`.

```
Local (Windows)  ──git push──▶  GitHub repo  ──webhook POST──▶  Contabo server :9000
                                                                        │
                                                        deploy.sh runs (pull, build, migrate, pm2 restart)
```

**Server layout used by all scripts:**
- App repo: `/home/pryro.com/mail.pryro.com/app`
- Backend runs via PM2 as `pmail-backend` (port 5000)
- Webhook listener runs via PM2 as `pmail-webhook` (port 9000)
- Frontend (Vite build) served as static files

---

## Part 1 — Connect to the Contabo server via SSH

### 1.1 From your Windows machine (PowerShell)

```powershell
# Windows 10/11 has OpenSSH built in. Test the connection:
ssh root@YOUR_CONTABO_IP
```

Use the IP and root password from the Contabo customer panel (or the
key you uploaded when creating the server).

### 1.2 (Recommended) Set up SSH key login so you never type the password

```powershell
# Generate a key (skip if you already have one)
ssh-keygen -t ed25519 -f $env:USERPROFILE\.ssh\id_ed25519

# Copy the public key to the server
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh root@YOUR_CONTABO_IP "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"
```

### 1.3 Optional: SSH config alias

Create `C:\Users\lenovo\.ssh\config`:

```
Host contabo
    HostName YOUR_CONTABO_IP
    User root
    IdentityFile ~/.ssh/id_ed25519
```

Then just: `ssh contabo`

---

## Part 2 — Prepare the server (one-time)

SSH in, then run each block.

### 2.1 Install Node.js 20.x, PM2, Git, Nginx

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get update && apt-get install -y nodejs git nginx
npm install -g pm2
```

### 2.2 Create the deploy directory and clone the repo

```bash
mkdir -p /home/pryro.com/mail.pryro.com
cd /home/pryro.com/mail.pryro.com

# For private repos: deploy key (read-only) so the server can pull
ssh-keygen -t ed25519 -f /root/.ssh/pmail_deploy -N ""
cat /root/.ssh/pmail_deploy.pub
# ↑ Add this key in GitHub → your repo → Settings → Deploy keys (allow read-only)

# Tell git to use it for github.com
cat >> /root/.ssh/config <<'EOF'
Host github.com
    IdentityFile /root/.ssh/pmail_deploy
    StrictHostKeyChecking accept-new
EOF

git clone git@github.com:YOUR_USERNAME/pmail.git app
cd app
```

> ⚠️ If your repo URL differs, adjust — but keep the local path exactly
> `/home/pryro.com/mail.pryro.com/app` or update `deploy.sh`, `webhook.js`
> and `ecosystem.config.cjs` to match.

### 2.3 Configure the production `.env` on the server

```bash
cd /home/pryro.com/mail.pryro.com/app/server
nano .env
```

Set production values — most importantly:

```env
NODE_ENV="production"
PORT=5000
CLIENT_URL="https://mail.pryro.com"

# Generate the webhook secret and paste it here:
#   openssl rand -hex 32
WEBHOOK_SECRET="PASTE_THE_GENERATED_SECRET_HERE"
WEBHOOK_PORT=9000
DEPLOY_BRANCH="main"

# Use a real production database (SQLite dev.db is not ideal for production):
DATABASE_URL="file:./dev.db"        # or a Postgres URL if you migrate

JWT_SECRET="generate-a-new-strong-secret"
```

**Keep this secret — you'll paste the same value into GitHub in Part 3.**

### 2.4 First build + start services

```bash
cd /home/pryro.com/mail.pryro.com/app
npm install
npm run build

cd server
npm install
npx prisma migrate deploy
npx prisma generate

cd ..
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup      # follow the printed instruction to enable boot persistence
```

Verify:

```bash
pm2 status
curl http://localhost:9000/health     # → "webhook listener alive"
curl http://localhost:5000/api/...    # your backend responds
```

### 2.5 Open the webhook port

If you use `ufw`:

```bash
ufw allow 9000/tcp    # webhook (or restrict to GitHub IPs / use nginx proxy)
ufw allow 80,443/tcp  # web
```

Contabo also has a cloud firewall in the customer panel — make sure port 9000
is reachable there too, or (better) proxy it through nginx with HTTPS:

**Recommended: nginx reverse proxy for the webhook** (lets you use
`https://mail.pryro.com/webhook` instead of exposing port 9000):

```nginx
# /etc/nginx/sites-available/pmail-webhook
server {
    listen 80;
    server_name deploy.pryro.com;   # or any subdomain pointing at the server

    location / {
        proxy_pass http://127.0.0.1:9000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/pmail-webhook /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

(Add certbot TLS later: `apt install certbot python3-certbot-nginx`)

---

## Part 3 — Add the webhook in GitHub

1. Open your repo on GitHub → **Settings → Webhooks → Add webhook**
2. **Payload URL:**
   - Direct: `http://YOUR_CONTABO_IP:9000/webhook`
   - Via nginx: `https://deploy.pryro.com/webhook`
3. **Content type:** `application/json`
4. **Secret:** paste the exact `WEBHOOK_SECRET` from `server/.env`
5. **Which events:** Just the **push** event
6. Click **Add webhook** — GitHub sends a `ping`. Check the server log:

```bash
pm2 logs pmail-webhook --lines 20
# → "[webhook] Ping received — connection OK"
```

Also check in GitHub: the webhook entry should show a green check ✓
(Recent Deliveries → the ping delivery with response 200).

---

## Part 4 — Use it

```powershell
# from e:\pmail
git add -A
git commit -m "deploy: some change"
git push origin main
```

Within seconds on the server: pull → build → migrate → restart. Watch it:

```bash
pm2 logs pmail-webhook --lines 50
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| GitHub webhook shows red ✗ / timeout | Port 9000 blocked (Contabo firewall or ufw) or webhook.js not running |
| "invalid signature" in logs | `WEBHOOK_SECRET` in GitHub ≠ `server/.env` |
| Ping OK but pushes don't deploy | Push was to a branch ≠ `DEPLOY_BRANCH` (default `main`) |
| deploy.sh fails at `git fetch` | Deploy key missing or repo path differs from `/home/pryro.com/mail.pryro.com/app` |
| Backend down after deploy | `pm2 logs pmail-backend` — often a missing prod env var in `server/.env` |
| Frontend not updating | Check `npm run build` output in deploy log; verify nginx serves `dist/` |
