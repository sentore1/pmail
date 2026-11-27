/**
 * PM2 Ecosystem Config
 *
 * Manages two processes:
 *   pmail-backend  — the Express API server
 *   pmail-webhook  — the GitHub webhook listener (port 9000)
 *
 * Usage on the server:
 *   pm2 start ecosystem.config.cjs
 *   pm2 save          ← persist across reboots
 *   pm2 startup       ← generate & register startup script
 */

module.exports = {
  apps: [
    {
      name: 'pmail-backend',
      script: './src/index.js',
      cwd: '/home/pryro.com/mail.pryro.com/app/server',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
      },
      // Restart on crash, back-off to avoid rapid loops
      autorestart: true,
      watch: false,
      max_memory_restart: '400M',
      restart_delay: 3000,
      error_file: '/root/.pm2/logs/pmail-backend-error.log',
      out_file: '/root/.pm2/logs/pmail-backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'pmail-webhook',
      script: './scripts/webhook.js',
      cwd: '/home/pryro.com/mail.pryro.com/app/server',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        // webhook.js reads WEBHOOK_SECRET/WEBHOOK_PORT/DEPLOY_BRANCH from server/.env
        // but we also set WEBHOOK_PORT here so PM2 restarts never fall back to 9000
        WEBHOOK_PORT: '9002',
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '100M',
      restart_delay: 3000,
      error_file: '/root/.pm2/logs/pmail-webhook-error.log',
      out_file: '/root/.pm2/logs/pmail-webhook-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
