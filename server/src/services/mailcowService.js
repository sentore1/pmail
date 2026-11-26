import axios from 'axios';

const MAILCOW_URL = process.env.MAILCOW_API_URL; // e.g. https://mail.pryro.com
const MAILCOW_KEY = process.env.MAILCOW_API_KEY;
const MAIL_DOMAIN = process.env.MAIL_DOMAIN || 'pryro.com';

const api = () => axios.create({
  baseURL: `${MAILCOW_URL}/api/v1`,
  headers: { 'X-API-Key': MAILCOW_KEY, 'Content-Type': 'application/json' },
  timeout: 10000,
});

/**
 * Create a Mailcow mailbox for a new user.
 * Called during registration — failures are non-fatal (logged only).
 */
export const createMailbox = async (username, password, displayName) => {
  if (!MAILCOW_URL || !MAILCOW_KEY) {
    console.warn('⚠️  Mailcow not configured — skipping mailbox creation');
    return null;
  }
  try {
    const res = await api().post('/add/mailbox', {
      local_part: username.toLowerCase(),
      domain: MAIL_DOMAIN,
      name: displayName,
      password,
      password2: password,
      quota: parseInt(process.env.MAILCOW_QUOTA_MB || '1024'),
      active: '1',
      force_pw_update: '0',
    });
    console.log(`📬 Mailcow mailbox created: ${username}@${MAIL_DOMAIN}`);
    return res.data;
  } catch (err) {
    console.error('Mailcow mailbox creation failed:', err?.response?.data || err.message);
    return null;
  }
};

/**
 * Delete a Mailcow mailbox (e.g. on account deletion).
 */
export const deleteMailbox = async (username) => {
  if (!MAILCOW_URL || !MAILCOW_KEY) return null;
  try {
    await api().post('/delete/mailbox', [`${username.toLowerCase()}@${MAIL_DOMAIN}`]);
  } catch (err) {
    console.error('Mailcow mailbox deletion failed:', err?.response?.data || err.message);
  }
};

/**
 * Returns SMTP config for sending as a specific user via Mailcow.
 * Used by emailService when sending external emails.
 */
export const getUserSmtpConfig = (username) => {
  if (!MAILCOW_URL || !process.env.MAILCOW_SMTP_HOST) return null;
  return {
    host: process.env.MAILCOW_SMTP_HOST,
    port: parseInt(process.env.MAILCOW_SMTP_PORT || '587'),
    secure: process.env.MAILCOW_SMTP_SECURE === 'true',
    auth: {
      user: `${username.toLowerCase()}@${MAIL_DOMAIN}`,
      pass: process.env.MAILCOW_SMTP_MASTER_PASS, // master password or per-user stored pass
    },
  };
};
