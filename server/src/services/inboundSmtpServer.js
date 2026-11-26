/**
 * inboundSmtpServer.js
 *
 * An optional in-process SMTP server that receives real emails from external
 * senders and routes them through the inbound-request flow.
 *
 * Usage (development / self-hosted):
 *   Set INBOUND_SMTP_PORT (default 2525) in server/.env and the server will
 *   listen for incoming SMTP connections on that port.
 *
 * Production (recommended):
 *   Use an email gateway instead (SendGrid Inbound Parse, Postmark, Mailgun)
 *   and configure the POST /api/inbound/webhook endpoint as the destination.
 *   Set INBOUND_SMTP_PORT="" to disable the in-process SMTP server.
 *
 * MX / routing:
 *   Point the MX record of your domain (e.g. pryro.com) to this server's IP
 *   on port 25 (or use a gateway relay on a non-privileged port with iptables).
 */

import { SMTPServer } from 'smtp-server';
import { simpleParser } from 'mailparser';
import { processInboundEmail } from '../controllers/inboundController.js';

let smtpServer = null;

export const startInboundSmtpServer = () => {
  const port = parseInt(process.env.INBOUND_SMTP_PORT || '', 10);

  // Skip if disabled (port not set or 0)
  if (!port) {
    console.log('📬 Inbound SMTP server disabled (INBOUND_SMTP_PORT not set)');
    return;
  }

  smtpServer = new SMTPServer({
    // Disable auth — anyone can send (we gate by fee, not by credentials)
    authOptional: true,
    disabledCommands: ['AUTH'],

    // Log TLS errors but keep accepting plain connections in dev
    secure: false,

    onData(stream, session, callback) {
      let raw = '';
      stream.on('data', (chunk) => { raw += chunk.toString(); });
      stream.on('end', async () => {
        try {
          const parsed = await simpleParser(raw);

          const toAddresses = (parsed.to?.value || []).map((a) => a.address);
          const fromAddress  = parsed.from?.value?.[0]?.address || '';
          const fromName     = parsed.from?.value?.[0]?.name || '';
          const subject      = parsed.subject || '(no subject)';
          const body         = parsed.html || parsed.text || '';

          if (!fromAddress) {
            console.warn('Inbound SMTP: missing From address — skipping');
            return callback();
          }

          for (const to of toAddresses) {
            try {
              await processInboundEmail({
                recipientEmail: to,
                externalEmail:  fromAddress,
                externalName:   fromName,
                subject,
                body,
              });
              console.log(`📬 Inbound email processed: ${fromAddress} → ${to}`);
            } catch (err) {
              // 404 = no Pryro user at that address — silently ignore (bounce would be better
              // in production but this avoids retry loops in dev)
              if (err.status !== 404) {
                console.error(`Inbound SMTP processing error for ${to}:`, err.message);
              }
            }
          }

          callback();
        } catch (err) {
          console.error('Inbound SMTP parse error:', err.message);
          callback(new Error('Message parse failed'));
        }
      });
    },

    onError(err) {
      console.error('Inbound SMTP server error:', err.message);
    },
  });

  smtpServer.listen(port, '0.0.0.0', () => {
    console.log(`📬 Inbound SMTP server listening on port ${port}`);
    console.log('   Point an MX record (or gateway relay) to this server to receive real emails.');
  });

  smtpServer.on('error', (err) => {
    console.error('Inbound SMTP server error:', err.message);
  });
};

export const stopInboundSmtpServer = () => {
  if (smtpServer) {
    smtpServer.close();
    smtpServer = null;
  }
};
