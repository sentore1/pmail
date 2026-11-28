import nodemailer from 'nodemailer';
import crypto from 'crypto';

const MAIL_DOMAIN  = process.env.MAIL_DOMAIN || 'pryro.com';
const SMTP_HOST    = process.env.MAILCOW_SMTP_HOST || process.env.SMTP_HOST;
const SMTP_PORT    = parseInt(process.env.MAILCOW_SMTP_PORT || process.env.SMTP_PORT || '587', 10);
const SMTP_SECURE  = (process.env.MAILCOW_SMTP_SECURE || process.env.SMTP_SECURE) === 'true';

// ── Encryption helpers ────────────────────────────────────────────────────────
const ALGO    = 'aes-256-cbc';
const ENC_KEY = Buffer.from(
  (process.env.SMTP_ENCRYPT_KEY || process.env.JWT_SECRET || 'fallback-32-char-key-padding!!').padEnd(32).slice(0, 32)
);

export const encryptSmtpPassword = (plain) => {
  const iv     = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, ENC_KEY, iv);
  return iv.toString('hex') + ':' + cipher.update(plain, 'utf8', 'hex') + cipher.final('hex');
};

const decryptSmtpPassword = (encrypted) => {
  const [ivHex, enc] = encrypted.split(':');
  const decipher     = crypto.createDecipheriv(ALGO, ENC_KEY, Buffer.from(ivHex, 'hex'));
  return decipher.update(enc, 'hex', 'utf8') + decipher.final('utf8');
};

// ── Per-user transporter ──────────────────────────────────────────────────────
// Authenticates as the actual sender (e.g. sentore.latif@pryro.com) so the
// From address matches the SMTP auth user — Mailcow requires this.
const createUserTransporter = (senderEmail, encryptedPass) => {
  if (!SMTP_HOST) throw new Error('SMTP host not configured (set MAILCOW_SMTP_HOST)');
  const pass = encryptedPass ? decryptSmtpPassword(encryptedPass) : null;
  // Fall back to shared noreply creds if user has no stored password yet
  const auth = pass
    ? { user: senderEmail, pass }
    : { user: process.env.MAILCOW_SMTP_USER || process.env.SMTP_USER,
        pass: process.env.MAILCOW_SMTP_PASS || process.env.SMTP_PASS };
  return nodemailer.createTransport({
    host: SMTP_HOST, port: SMTP_PORT, secure: SMTP_SECURE,
    auth, tls: { rejectUnauthorized: false },
  });
};

// ── Shared transporter for system emails (password reset, etc.) ───────────────
let sharedTransporter = null;
let etherealInfo      = null;

export const getTransporter = async () => {
  if (sharedTransporter) return sharedTransporter;

  if (SMTP_HOST && (process.env.MAILCOW_SMTP_USER || process.env.SMTP_USER)) {
    sharedTransporter = nodemailer.createTransport({
      host: SMTP_HOST, port: SMTP_PORT, secure: SMTP_SECURE,
      auth: {
        user: process.env.MAILCOW_SMTP_USER || process.env.SMTP_USER,
        pass: process.env.MAILCOW_SMTP_PASS || process.env.SMTP_PASS,
      },
      tls: { rejectUnauthorized: false },
    });
  } else {
    const testAccount = await nodemailer.createTestAccount();
    etherealInfo      = testAccount;
    sharedTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email', port: 587, secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log('📧 Using Ethereal test email (dev mode)');
  }

  return sharedTransporter;
};

/**
 * Generate a cryptographically-unique reply token.
 */
export const generateReplyToken = () => crypto.randomBytes(32).toString('hex');

/**
 * Build the HTML body for the outbound email sent to an external recipient.
 *
 * The full original message is included so the recipient can read it in their
 * normal email client.  A prominent "Reply" button links to the public pay-to-
 * reply page where they pay the fee (if any) and compose their reply.
 */
const buildOutboundHtml = ({ senderName, subject, body, replyUrl, replyFee }) => {
  const feeNote = replyFee > 0
    ? `<p style="color:#6b7280;font-size:14px;margin:0 0 24px;">
         To reply to this email, a fee of <strong>$${replyFee.toFixed(2)}</strong> is required.
       </p>`
    : `<p style="color:#6b7280;font-size:14px;margin:0 0 24px;">
         Click the button below to reply to this email.
       </p>`;

  return `
    <div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="background:#4f46e5;padding:24px 32px;border-radius:8px 8px 0 0;">
        <h1 style="color:#fff;font-size:20px;margin:0;">Pmail</h1>
        <p style="color:#c7d2fe;font-size:13px;margin:4px 0 0;">
          You received a message from ${senderName}
        </p>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:32px;">
        <h2 style="font-size:18px;color:#111827;margin:0 0 16px;">${subject}</h2>
        <div style="font-size:15px;color:#374151;line-height:1.6;">
          ${body}
        </div>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;" />
        ${feeNote}
        <a href="${replyUrl}"
           style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;
                  padding:12px 32px;border-radius:6px;font-size:15px;font-weight:600;">
          ${replyFee > 0 ? `Pay $${replyFee.toFixed(2)} & Reply` : 'Reply to this email'}
        </a>
        <p style="color:#9ca3af;font-size:12px;margin:16px 0 0;">
          This link is unique to you. Do not share it with others.
        </p>
      </div>
      <p style="text-align:center;color:#9ca3af;font-size:12px;margin:24px 0;">
        Sent via Pmail — privacy-focused email with paid replies
      </p>
    </div>`;
};

/**
 * Send an outbound email to an external recipient via SMTP.
 *
 * @param {object} params
 * @param {string} params.to          — external recipient email address
 * @param {string} params.senderName  — Pmail sender's display name
 * @param {string} params.subject     — email subject
 * @param {string} params.body        — HTML body of the original message
 * @param {string} params.replyUrl     — public reply page URL (includes token)
 * @param {number} params.replyFee     — fee required to reply (0 = free)
 * @returns {object} — Nodemailer info (includes `messageId` and, for Ethereal, `previewUrl`)
 */
export const sendExternalEmail = async ({ to, senderName, senderUsername, senderSmtpPassword, subject, body, replyUrl, replyFee }) => {
  const mailDomain      = MAIL_DOMAIN;
  const senderEmail     = `${senderUsername.toLowerCase()}@${mailDomain}`;
  const transport       = createUserTransporter(senderEmail, senderSmtpPassword);

  const info = await transport.sendMail({
    from:    `"${senderName}" <${senderEmail}>`,
    replyTo: `"${senderName}" <${senderEmail}>`,
    to,
    subject,
    html:  buildOutboundHtml({ senderName, subject, body, replyUrl, replyFee }),
    text:  `You received a message from ${senderName} via Pmail.\n\nSubject: ${subject}\n\nTo reply, visit: ${replyUrl}${replyFee > 0 ? `\n\nA fee of $${replyFee.toFixed(2)} is required to reply.` : ''}`,
  });

  if (etherealInfo) console.log(`📧 Ethereal preview: ${nodemailer.getTestMessageUrl(info)}`);

  return info;
};

/**
 * Build the HTML body for the password reset email.
 */
const buildPasswordResetHtml = ({ name, resetUrl }) => `
  <div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <div style="background:#2563eb;padding:24px 32px;border-radius:8px 8px 0 0;">
      <h1 style="color:#fff;font-size:22px;margin:0;font-weight:700;letter-spacing:-0.5px;">pryro</h1>
      <p style="color:#bfdbfe;font-size:13px;margin:4px 0 0;">Password Reset Request</p>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:32px;">
      <h2 style="font-size:18px;color:#111827;margin:0 0 12px;">Hi ${name},</h2>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 8px;">
        We received a request to reset the password for your Pryro account.
      </p>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 24px;">
        Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.
      </p>
      <a href="${resetUrl}"
         style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;
                padding:12px 32px;border-radius:6px;font-size:15px;font-weight:600;">
        Reset my password
      </a>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;" />
      <p style="color:#6b7280;font-size:13px;margin:0 0 8px;">
        If you didn't request a password reset, you can safely ignore this email —
        your password will not change.
      </p>
      <p style="color:#6b7280;font-size:13px;margin:0;">
        For security, this link can only be used once and expires after 1 hour.
      </p>
    </div>
    <p style="text-align:center;color:#9ca3af;font-size:12px;margin:24px 0;">
      Pryro Mail — privacy-focused email
    </p>
  </div>`;

/**
 * Send a password reset email to a Pryro user.
 *
 * @param {object} params
 * @param {string} params.to       — user's pryro.com email address
 * @param {string} params.name     — user's display name
 * @param {string} params.resetUrl — full reset URL containing the token
 */
export const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  const transport = await getTransporter();

  const fromName = process.env.SMTP_FROM_NAME || 'Pryro Mail';
  const fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@pryro.com';

  const info = await transport.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject: 'Reset your Pryro password',
    html: buildPasswordResetHtml({ name, resetUrl }),
    text: `Hi ${name},\n\nWe received a request to reset your Pryro password.\n\nClick this link to reset it (expires in 1 hour):\n${resetUrl}\n\nIf you didn't request this, ignore this email — your password won't change.`,
  });

  if (etherealInfo) {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`📧 Password reset email preview: ${previewUrl}`);
  }

  return info;
};
