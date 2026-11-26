/**
 * GitHub Webhook Listener for auto-deployment on Contabo
 *
 * Runs as a separate small HTTP server (default port 9000).
 * GitHub sends a POST to http://<server-ip>:9000/webhook on every push,
 * this script verifies the HMAC signature and runs deploy.sh
 *
 * Env vars (set in .env or ecosystem.config.cjs):
 *   WEBHOOK_SECRET  - the secret you configure in the GitHub webhook
 *   WEBHOOK_PORT    - optional, defaults to 9000
 *   DEPLOY_BRANCH   - optional, branch that triggers deploys, defaults to main
 */

import http from 'http';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = '/home/pryro.com/mail.pryro.com/app';

// Load .env manually (no dotenv dependency needed in this script)
const envPath = path.join(rootDir, 'server', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = (m[2] || '').replace(/^["']|["']$/g, '');
    }
  }
}

const PORT = parseInt(process.env.WEBHOOK_PORT || '9000', 10);
const SECRET = process.env.WEBHOOK_SECRET;
const DEPLOY_BRANCH = process.env.DEPLOY_BRANCH || 'main';

if (!SECRET) {
  console.error('[webhook] FATAL: WEBHOOK_SECRET is not set. Add it to server/.env');
  process.exit(1);
}

function verifySignature(req, rawBody) {
  const sigHeader = req.headers['x-hub-signature-256'] || '';
  const expected =
    'sha256=' +
    crypto.createHmac('sha256', SECRET).update(rawBody, 'utf8').digest('hex');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(sigHeader),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

function runDeploy(pushData, log) {
  const deployScript = path.join(__dirname, 'deploy.sh');
  const ref = pushData.ref || ''; // e.g. "refs/heads/main"
  const branch = ref.replace('refs/heads/', '');
  const pusher = pushData.pusher ? pushData.pusher.name : 'unknown';
  const head = (pushData.head_commit && pushData.head_commit.id
    ? pushData.head_commit.id.slice(0, 7)
    : 'unknown');

  log(`Push to ${branch} by ${pusher} (${head}) — ${branch === DEPLOY_BRANCH ? 'deploying' : 'skipped (branch != ' + DEPLOY_BRANCH + ')'}`);

  if (branch !== DEPLOY_BRANCH) return;

  execFile('bash', [deployScript], { cwd: rootDir }, (err, stdout, stderr) => {
    if (stdout) log('deploy.sh stdout:\n' + stdout);
    if (stderr) log('deploy.sh stderr:\n' + stderr);
    if (err) {
      log(`deploy.sh FAILED: ${err.message}`);
    } else {
      log('deploy.sh completed successfully');
    }
  });
}

const server = http.createServer((req, res) => {
  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('webhook listener alive\n');
    return;
  }

  if (req.method !== 'POST' || req.url !== '/webhook') {
    res.writeHead(404);
    res.end();
    return;
  }

  const chunks = [];
  req.on('data', (c) => {
    // GitHub payloads are small; 5MB cap is generous protection
    if (chunks.length > 0 && Buffer.concat(chunks).length + c.length > 5 * 1024 * 1024) {
      req.destroy();
      return;
    }
    chunks.push(c);
  });

  req.on('end', () => {
    const raw = Buffer.concat(chunks).toString('utf8');

    if (!verifySignature(req, raw)) {
      console.warn(`[webhook] ${new Date().toISOString()} INVALID SIGNATURE — rejected`);
      res.writeHead(401, { 'Content-Type': 'text/plain' });
      res.end('invalid signature\n');
      return;
    }

    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      res.writeHead(400);
      res.end('bad json\n');
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok\n');

    if (req.headers['x-github-event'] === 'ping') {
      console.log('[webhook] Ping received — connection OK');
      return;
    }

    if (req.headers['x-github-event'] === 'push') {
      runDeploy(payload, (msg) => console.log(`[webhook] ${new Date().toISOString()} ${msg}`));
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[webhook] Listening on port ${PORT}, deploying branch "${DEPLOY_BRANCH}"`);
});
