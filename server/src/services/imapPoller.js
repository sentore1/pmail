import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import prisma from '../utils/prisma.js';
import { decryptSmtpPassword } from './emailService.js';

const IMAP_HOST   = process.env.MAILCOW_IMAP_HOST || process.env.MAILCOW_SMTP_HOST || 'mail.pryro.com';
const IMAP_PORT   = parseInt(process.env.MAILCOW_IMAP_PORT || '993', 10);
const IMAP_SECURE = IMAP_PORT === 993;
const MAIL_DOMAIN = process.env.MAIL_DOMAIN || 'pryro.com';
const POLL_MS     = parseInt(process.env.IMAP_POLL_MS || '30000', 10);

/**
 * Fetch unseen emails for one user and import them into Pmail DB.
 */
const pollUser = async (user) => {
  if (!user.smtpPassword) return;

  let password;
  try {
    password = decryptSmtpPassword(user.smtpPassword);
  } catch {
    return; // bad decrypt — skip silently
  }

  const client = new ImapFlow({
    host: IMAP_HOST,
    port: IMAP_PORT,
    secure: IMAP_SECURE,
    auth: { user: user.email, pass: password },
    logger: false,
    tls: { rejectUnauthorized: false },
    greetingTimeout: 60000,
    socketTimeout: 120000,
  });

  try {
    await client.connect();
    await client.mailboxOpen('INBOX');

    // Fetch all unseen messages
    for await (const msg of client.fetch('1:*', { envelope: true, source: true, flags: true })) {
      if (msg.flags.has('\\Seen')) continue;

      const parsed = await simpleParser(msg.source);
      const fromAddress = parsed.from?.value?.[0]?.address;
      const fromName    = parsed.from?.value?.[0]?.name || fromAddress;
      const subject     = parsed.subject || '(no subject)';
      const body        = parsed.html || parsed.text || '';

      if (!fromAddress) continue;

      // Skip emails sent by this user themselves (already in Pmail as sent)
      if (fromAddress.toLowerCase() === user.email.toLowerCase()) {
        await client.messageFlagsAdd(msg.seq, ['\\Seen']);
        continue;
      }

      // Check if already imported (avoid duplicates via message-id)
      const messageId = parsed.messageId;
      if (messageId) {
        const exists = await prisma.email.findFirst({
          where: { externalMessageId: messageId },
        });
        if (exists) {
          await client.messageFlagsAdd(msg.seq, ['\\Seen']);
          continue;
        }
      }

      // Check if sender is a registered Pmail user
      const senderUser = await prisma.user.findUnique({ where: { email: fromAddress.toLowerCase() } });

      // Create the email record in Pmail DB
      const email = await prisma.email.create({
        data: {
          subject,
          body,
          externalMessageId: messageId || null,
          // If sender is a Pmail user link them, otherwise store as external
          senderId:           senderUser?.id || null,
          externalSenderEmail: senderUser ? null : fromAddress,
          externalSenderName:  senderUser ? null : fromName,
          isDraft: false,
          recipients: {
            create: { recipientId: user.id, type: 'TO' },
          },
        },
      });

      console.log(`📥 Imported email for ${user.email} from ${fromAddress}: "${subject}"`);

      // Mark as seen in IMAP so we don't import it again
      await client.messageFlagsAdd(msg.seq, ['\\Seen']);
    }

    await client.logout();
  } catch (err) {
    console.error(`[imapPoller] Error polling ${user.email}:`, err.message);
    try { await client.logout(); } catch {}
  }
};

/**
 * Poll all users with stored SMTP passwords.
 */
const pollAll = async () => {
  const users = await prisma.user.findMany({
    where: { smtpPassword: { not: null } },
    select: { id: true, email: true, smtpPassword: true },
  });

  for (const user of users) {
    await pollUser(user);
  }
};

/**
 * Start the IMAP polling loop.
 * Called once from index.js on server startup.
 */
export const startImapPoller = () => {
  const host = IMAP_HOST;
  if (!host) {
    console.log('📭 IMAP poller disabled (MAILCOW_SMTP_HOST not set)');
    return;
  }

  console.log(`📬 IMAP poller started — checking every ${POLL_MS / 1000}s via ${host}:${IMAP_PORT}`);

  // Run immediately on startup, then on interval
  pollAll().catch(console.error);
  setInterval(() => pollAll().catch(console.error), POLL_MS);
};
