import nodemailer from 'nodemailer';
import crypto from 'crypto';

let transporter = null;
let etherealInfo = null;

/**
 * Get (or lazily create) the Nodemailer transporter.
 *
 * If SMTP_HOST / SMTP_USER / SMTP_PASS are set in .env, uses the configured
 * production SMTP server.  Otherwise falls back to an auto-generated Ethereal
 * test account (messages are not actually delivered — a preview URL is logged).
 */
export const getTransporter = async () => {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_PORT, SMTP_SECURE } = process.env;

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT || '587', 10),
      secure: SMTP_SECURE === 'true',
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    console.log(`📧 SMTP transport configured for ${SMTP_HOST}:${SMTP_PORT || 587}`);
  } else {
    // Development fallback — Ethereal test account
    const testAccount = await nodemailer.createTestAccount();
    etherealInfo = testAccount;
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log('📧 Using Ethereal test email (dev mode). Preview URLs will be logged on send.');
  }

  return transporter;
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
export const sendExternalEmail = async ({ to, senderName, subject, body, replyUrl, replyFee }) => {
  const transport = await getTransporter();

  const fromName = process.env.SMTP_FROM_NAME || 'Pmail';
  const fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@pmail.app';

  const info = await transport.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    html: buildOutboundHtml({ senderName, subject, body, replyUrl, replyFee }),
    text: `You received a message from ${senderName} via Pmail.\n\nSubject: ${subject}\n\nTo reply, visit: ${replyUrl}${replyFee > 0 ? `\n\nA fee of $${replyFee.toFixed(2)} is required to reply.` : ''}`,
  });

  // Log preview URL for Ethereal (dev) so the developer can view the email
  if (etherealInfo) {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`📧 Ethereal preview: ${previewUrl}`);
  }

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
