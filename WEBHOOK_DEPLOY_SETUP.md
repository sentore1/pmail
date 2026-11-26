# Webhook Deployment Setup Guide

Automated deployment flow:
```
git push → GitHub → POST /webhook on Contabo → deploy.sh → pm2 restart
```

---

## Files Created

| File | Purpose |
|---|---|
| `server/scripts/webhook.js` | HTTP listener (port 9000) that receives GitHub events |
| `server/scripts/deploy.sh` | Shell script: git pull, npm install, build, prisma migrate, pm2 restart |
| `ecosystem.config.cjs` | pm2 config managing both `pmail-backend` and `pmail-webhook` |

---

## Step 1 — One-time server setup (SSH into Contabo first)

```bash
# 1. Create log directory
mkdir -p /var/log/pmail

# 2. Clone the repo (if not already done)
git clone https://github.com/<your-username>/<your-repo>.git /var/www/pmail
cd /var/www/pmail

# 3. Make deploy script executable
chmod +x server/scripts/deploy.sh

# 4. Install global tools if missing
npm install -g pm2
```

---

## Step 2 — Add WEBHOOK_SECRET to server/.env

Open `/var/www/pmail/server/.env` and add:

```env
WEBHOOK_SECRET=some_long_random_string_you_choose
WEBHOOK_PORT=9000
DEPLOY_BRANCH=main
```

> Pick any strong random string for WEBHOOK_SECRET — you'll paste the same value into GitHub in Step 4.
> Generate one with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

---

## Step 3 — Start both processes with pm2

```bash
cd /var/www/pmail

# Start backend + webhook listener
pm2 start ecosystem.config.cjs

# Verify both are running
pm2 list

# Save process list so they survive reboots
pm2 save

# Register pm2 as a system startup service
pm2 startup
# → Copy and run the command pm2 prints
```

You should see two processes:

```
┌─────────────────┬─────┬────────┬─────┐
│ name            │ pid │ status │ ... │
├─────────────────┼─────┼────────┼─────┤
│ pmail-backend   │ ... │ online │     │
│ pmail-webhook   │ ... │ online │     │
└─────────────────┴─────┴────────┴─────┘
```

---

## Step 4 — Open port 9000 on Contabo firewall

```bash
# UFW (Ubuntu)
ufw allow 9000/tcp
ufw reload

# Or iptables
iptables -A INPUT -p tcp --dport 9000 -j ACCEPT
```

> Also open port 9000 in your Contabo control panel if you have a cloud firewall enabled.

Test the listener is reachable from your local machine:
```bash
curl http://<your-server-ip>:9000/health
# Should respond: webhook listener alive
```

---

## Step 5 — Register the webhook on GitHub

1. Go to your repo → **Settings** → **Webhooks** → **Add webhook**
2. Fill in:

| Field | Value |
|---|---|
| **Payload URL** | `http://<your-server-ip>:9000/webhook` |
| **Content type** | `application/json` |
| **Secret** | The same value you put in `WEBHOOK_SECRET` |
| **Which events** | Just the push event |
| **Active** | ✅ checked |

3. Click **Add webhook**

GitHub will immediately send a **ping** event. You should see a green tick next to the webhook — that confirms the connection works.

---

## Step 6 — Test a full deploy

```bash
# On your local machine — make a small change and push
git add .
git commit -m "test webhook deploy"
git push origin main
```

Then on the server watch the logs:

```bash
pm2 logs pmail-webhook   # see the webhook receive and trigger deploy.sh
pm2 logs pmail-backend   # confirm backend restarted cleanly
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| GitHub shows red X on webhook delivery | Check `pm2 logs pmail-webhook` for errors |
| `invalid signature` in logs | WEBHOOK_SECRET in .env doesn't match GitHub |
| Port 9000 not reachable | Check UFW / Contabo firewall, confirm pm2 is running |
| deploy.sh fails on `git reset` | Confirm server user has write access to `/var/www/pmail` |
| `pm2: command not found` in deploy.sh | Add pm2 to PATH: `export PATH="$(npm bin -g):$PATH"` in deploy.sh |
| Prisma migration fails | Check DATABASE_URL in server/.env is correct |

---

## Manual deploy (anytime)

If you ever need to deploy without pushing:

```bash
cd /var/www/pmail
bash server/scripts/deploy.sh
```
