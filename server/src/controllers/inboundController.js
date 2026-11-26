/**
 * inboundController.js
 *
 * Full lifecycle of an inbound email from an external (non-Pryro) sender to a
 * Pryro user.
 *
 * Entry points (both funnel into processInboundEmail):
 *   A. POST /api/inbound/submit      — external sender fills the form at /?inbound
 *   B. POST /api/inbound/webhook     — real email received by the SMTP gateway
 *                                       (local dev server or SendGrid/Postmark)
 *
 * Flow:
 *   1. External email arrives for user@pryro → InboundRequest PENDING
 *      → if recipient.inboundFee === 0: delivered immediately (ACCEPTED, in inbox)
 *      → if fee > 0: auto-reply to the external sender with a payment link
 *
 *   2. External sender pays via the public page (?inbound=<token>)
 *      → Stripe PaymentIntent → confirm → status PAID
 *      → wallet credited, Email row created in recipient's inbox WITH the body
 *        (the recipient can now read the email — that's what the fee unlocks)
 *      → recipient notified
 *
 *   3. Pryo user reads the email and chooses:
 *      → Accept  (POST /api/inbound/:id/accept)  — keeps the email, opens the
 *        conversation; external sender notified they may receive a reply
 *      → Decline (POST /api/inbound/:id/decline) — email removed, wallet credit
 *        reversed, Stripe refund issued, sender notified
 */

import crypto from 'crypto';
import prisma from '../utils/prisma.js';
import Stripe from 'stripe';
import { getTransporter } from '../services/emailService.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy');
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const generatePayToken = () => crypto.randomBytes(32).toString('hex');

const mailFrom = () => ({
  from: `"${process.env.SMTP_FROM_NAME || 'Pryro Mail'}" <${process.env.SMTP_FROM_EMAIL || 'noreply@pryro.com'}>`,
});

const sendExternal = async ({ to, subject, html, text }) => {
  const transport = await getTransporter();
  return transport.sendMail({ ...mailFrom(), to, subject, html, text });
};

/** Auto-reply to the external sender: "pay $X to deliver your message" */
const sendPaymentRequestEmail = async ({ to, senderName, recipientName, subject, inboundFee, payUrl }) => {
  const html = `
    <div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="background:#2563eb;padding:24px 32px;border-radius:8px 8px 0 0;">
        <h1 style="color:#fff;font-size:22px;margin:0;font-weight:700;letter-spacing:-0.5px;">pryro</h1>
        <p style="color:#bfdbfe;font-size:13px;margin:4px 0 0;">Email Delivery Required</p>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:32px;">
        <h2 style="font-size:18px;color:#111827;margin:0 0 12px;">Hi ${senderName},</h2>
        <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 8px;">
          Your email to <strong>${recipientName}</strong> on Pryro has been received, but
          ${recipientName} requires a delivery fee before it reaches their inbox.
        </p>
        <p style="color:#6b7280;font-size:14px;margin:0 0 24px;">
          A one-time fee of <strong>$${inboundFee.toFixed(2)}</strong> is required to deliver
          your message. Once paid, ${recipientName} will be able to read your email and
          may accept or decline to continue the conversation.
        </p>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:0 0 24px;">
          <p style="font-size:13px;color:#6b7280;margin:0 0 4px;">Your email subject</p>
          <p style="font-size:15px;color:#111827;margin:0;font-weight:500;">${subject}</p>
        </div>
        <a href="${payUrl}"
           style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;
                  padding:12px 32px;border-radius:6px;font-size:15px;font-weight:600;">
          Pay $${inboundFee.toFixed(2)} &amp; Deliver
        </a>
        <p style="color:#9ca3af;font-size:12px;margin:16px 0 0;">
          This link is unique to your message.
        </p>
      </div>
      <p style="text-align:center;color:#9ca3af;font-size:12px;margin:24px 0;">
        Pryro Mail — privacy-first email platform
      </p>
    </div>`;

  return sendExternal({
    to,
    subject: `Pay $${inboundFee.toFixed(2)} to deliver your message to ${recipientName}`,
    html,
    text: `Hi ${senderName},\n\nYour email "${subject}" to ${recipientName} requires a delivery fee of $${inboundFee.toFixed(2)}.\nPay here: ${payUrl}\n\nPryro Mail`,
  }).catch((err) => {
    console.error('Payment request email failed:', err.message);
  });
};

/** Notify the Pryro recipient that a paid inbound message is waiting */
const sendInboundNotificationEmail = async ({ to, recipientName, senderName, senderEmail, subject }) =>
  sendExternal({
    to,
    subject: `New paid message from ${senderName}`,
    html: `
      <div style="max-width:600px;margin:0 auto;font-family:sans-serif;">
        <div style="background:#2563eb;padding:24px 32px;border-radius:8px 8px 0 0;">
          <h1 style="color:#fff;font-size:22px;margin:0;">pryro</h1>
          <p style="color:#bfdbfe;font-size:13px;margin:4px 0 0;">New Inbound Message</p>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:32px;">
          <h2 style="font-size:18px;color:#111827;margin:0 0 12px;">Hi ${recipientName},</h2>
          <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 24px;">
            You have a new message in your Pryro inbox from
            <strong>${senderName}</strong> (${senderEmail}). The sender has paid your
            inbound fee. Open your inbox to read it, then Accept or Decline the conversation.
          </p>
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;">
            <p style="font-size:13px;color:#6b7280;margin:0 0 4px;">Subject</p>
            <p style="font-size:15px;color:#111827;margin:0;font-weight:500;">${subject}</p>
          </div>
        </div>
      </div>`,
    text: `Hi ${recipientName},\n\nNew message from ${senderName} (${senderEmail}).\nSubject: ${subject}\n\nLog in to Pryro to read and Accept/Decline.`,
  }).catch((err) => {
    console.error('Inbound notification email failed:', err.message);
  });

/** Notify the external sender of accept/decline outcome */
const sendDecisionEmail = async ({ to, senderName, recipientName, accepted }) =>
  sendExternal({
    to,
    subject: accepted ? `Your message to ${recipientName} was accepted` : `Your message to ${recipientName} was declined`,
    html: `
      <div style="max-width:600px;margin:0 auto;font-family:sans-serif;">
        <div style="background:${accepted ? '#16a34a' : '#dc2626'};padding:24px 32px;border-radius:8px 8px 0 0;">
          <h1 style="color:#fff;font-size:22px;margin:0;">pryro</h1>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:32px;">
          <p style="font-size:15px;color:#374151;line-height:1.6;">
            Hi ${senderName}, ${recipientName} has <strong>${accepted ? 'accepted' : 'declined'}</strong> your message.
            ${accepted
              ? 'They can now read and reply to your email via Pryro.'
              : 'Your delivery fee has been refunded and will appear on your statement within 3–5 business days.'}
          </p>
        </div>
      </div>`,
    text: `Hi ${senderName},\n\n${recipientName} has ${accepted ? 'accepted' : 'declined'} your message. ${accepted ? '' : 'Your fee has been refunded.'}\n\nPryro Mail`,
  }).catch((err) => {
    console.error('Decision email failed:', err.message);
  });

// ─── Core: process an inbound external email ──────────────────────────────────
/**
 * Used by both the public submit form and the SMTP/webhook receiver.
 * @param {object} p
 * @param {string} p.recipientEmail — the Pryro user's address
 * @param {string} p.externalEmail   — the external sender's address
 * @param {string} p.externalName    — external sender's display name
 * @param {string} p.subject
 * @param {string} p.body           — HTML or plain body
 * @returns {object} { request, free, payUrl, recipient }
 */
export const processInboundEmail = async ({ recipientEmail, externalEmail, externalName, subject, body }) => {
  const recipient = await prisma.user.findUnique({
    where: { email: recipientEmail.trim().toLowerCase() },
    select: { id: true, name: true, email: true, inboundFee: true },
  });

  if (!recipient) {
    const err = new Error('No Pryro user found with that email address');
    err.status = 404;
    throw err;
  }
  if (recipientEmail.trim().toLowerCase() === externalEmail.trim().toLowerCase()) {
    const err = new Error('Sender and recipient are the same address');
    err.status = 400;
    throw err;
  }

  const fee = recipient.inboundFee ?? 0;
  const payToken = generatePayToken();
  const senderName = (externalName?.trim()) || externalEmail.trim();

  const request = await prisma.inboundRequest.create({
    data: {
      recipientId:   recipient.id,
      externalEmail: externalEmail.trim().toLowerCase(),
      externalName:  senderName,
      subject:       subject.trim(),
      body:          body.trim(),
      inboundFee:    fee,
      payToken,
      status:        'PENDING',
    },
  });

  // Free delivery — straight into the inbox, auto-accepted
  if (fee === 0) {
    const email = await prisma.email.create({
      data: {
        subject:             subject.trim(),
        body:                body.trim(),
        senderId:            null,
        externalSenderEmail: externalEmail.trim().toLowerCase(),
        externalSenderName:  senderName,
        isDraft:             false,
        recipients: { create: { recipientId: recipient.id, type: 'TO' } },
      },
    });
    await prisma.inboundRequest.update({
      where: { id: request.id },
      data:  { status: 'ACCEPTED', acceptedAt: new Date(), emailId: email.id },
    });
    return { request, free: true, payUrl: null, recipient };
  }

  // Paid delivery — auto-reply to the external sender with the payment link
  const payUrl = `${CLIENT_URL}/?inbound=${payToken}`;
  await sendPaymentRequestEmail({
    to:            externalEmail.trim(),
    senderName,
    recipientName: recipient.name,
    subject:       subject.trim(),
    inboundFee:    fee,
    payUrl,
  });

  return { request, free: false, payUrl, recipient };
};

// ─── A. Public submit-form entry point ────────────────────────────────────────
export const submitInbound = async (req, res) => {
  try {
    const { recipientEmail, externalEmail, externalName, subject, body } = req.body;

    for (const [field, value] of [
      ['Recipient email', recipientEmail],
      ['Your email', externalEmail],
      ['Subject', subject],
      ['Message', body],
    ]) {
      if (!value?.trim()) return res.status(400).json({ error: `${field} is required` });
    }

    const { free, payUrl, recipient } = await processInboundEmail({
      recipientEmail, externalEmail, externalName, subject, body,
    });

    if (free) {
      return res.status(201).json({
        message: 'Your message has been delivered successfully.',
        delivered: true,
      });
    }

    res.status(201).json({
      message: `Almost there — a delivery fee of $${recipient.inboundFee.toFixed(2)} is required. We've sent a payment link to ${externalEmail}.`,
      delivered: false,
      payUrl,
      inboundFee: recipient.inboundFee,
    });
  } catch (error) {
    console.error('Submit inbound error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to process your message' });
  }
};

// ─── B. Webhook entry point (SendGrid Inbound Parse / Postmark / Mailgun) ─────
// Accepts JSON: { to, from, fromName, subject, text, html }
// Also accepts SendGrid's multipart-ish flat fields (envelope, headers).
export const inboundWebhook = async (req, res) => {
  try {
    let { to, from, fromName, subject, text, html } = req.body;

    // SendGrid Inbound Parse sends an "envelope" JSON string
    if (!to || !from) {
      try {
        const envelope = typeof req.body.envelope === 'string'
          ? JSON.parse(req.body.envelope)
          : req.body.envelope;
        if (envelope) {
          to = to || (envelope.to && envelope.to[0]);
          from = from || envelope.from;
        }
      } catch { /* not SendGrid format */ }
    }

    if (!to || !from) {
      return res.status(400).json({ error: 'Both "to" and "from" are required' });
    }

    // Take the first address if a full "Name <a@b.c>" or comma list is passed
    const extractAddress = (v) => {
      if (!v) return '';
      const m = String(v).match(/<([^>]+)>/);
      return (m ? m[1] : String(v).split(',')[0]).trim();
    };
    const extractName = (v) => {
      if (!v) return '';
      const m = String(v).match(/^(.*?)(?:<[^>]+>)?$/);
      const name = (m ? m[1] : '').replace(/["<>]/g, '').trim();
      return name && !name.includes('@') ? name : '';
    };

    const body = html || text || '';
    if (!subject) subject = '(no subject)';
    if (!body) return res.status(400).json({ error: 'Email body is required' });

    await processInboundEmail({
      recipientEmail: extractAddress(to),
      externalEmail:  extractAddress(from),
      externalName:   fromName || extractName(from),
      subject,
      body,
    });

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Inbound webhook error:', error);
    // Always 200 for provider webhooks so they don't retry endlessly on 4xx
    res.status(error.status === 404 ? 202 : 500).json({ received: false, error: error.message });
  }
};

// ─── 2. Get InboundRequest by token (PUBLIC) ──────────────────────────────────
export const getInboundRequest = async (req, res) => {
  try {
    const { token } = req.params;

    const request = await prisma.inboundRequest.findUnique({
      where: { payToken: token },
      include: { recipient: { select: { name: true, email: true } } },
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found or link has expired' });
    }

    res.json({
      id:            request.id,
      status:        request.status,
      inboundFee:    request.inboundFee,
      subject:       request.subject,
      externalEmail: request.externalEmail,
      externalName:  request.externalName,
      createdAt:     request.createdAt,
      paidAt:        request.paidAt,
      acceptedAt:    request.acceptedAt,
      declinedAt:    request.declinedAt,
      recipient: { name: request.recipient.name, email: request.recipient.email },
    });
  } catch (error) {
    console.error('Get inbound request error:', error);
    res.status(500).json({ error: 'Failed to retrieve request' });
  }
};

// ─── 3. Create Stripe PaymentIntent (PUBLIC) ─────────────────────────────────
export const createInboundPayment = async (req, res) => {
  try {
    const { token } = req.params;

    const request = await prisma.inboundRequest.findUnique({
      where: { payToken: token },
      include: { recipient: { select: { name: true } } },
    });

    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status === 'PAID' || request.status === 'ACCEPTED') {
      return res.status(400).json({ error: 'Delivery fee already paid' });
    }
    if (request.inboundFee <= 0) {
      return res.status(400).json({ error: 'No payment required' });
    }

    const feePercentage = parseFloat(process.env.TRANSACTION_FEE_PERCENTAGE || 5);
    const platformFee   = request.inboundFee * (feePercentage / 100);
    const totalAmount   = request.inboundFee + platformFee;

    const paymentIntent = await stripe.paymentIntents.create({
      amount:   Math.round(totalAmount * 100),
      currency: 'usd',
      metadata: {
        inboundRequestId: request.id,
        recipientId:      request.recipientId,
        inboundFee:       request.inboundFee.toString(),
        platformFee:      platformFee.toString(),
        type:             'INBOUND_EMAIL',
      },
      description: `Pryro inbound email fee: $${request.inboundFee.toFixed(2)} + $${platformFee.toFixed(2)} fee`,
    });

    res.json({
      clientSecret:     paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      inboundFee:       request.inboundFee,
      platformFee,
      totalAmount,
    });
  } catch (error) {
    console.error('Create inbound payment error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
};

// ─── 4. Confirm payment (PUBLIC) — delivers the email to the Pryro inbox ──────
export const confirmInboundPayment = async (req, res) => {
  try {
    const { token } = req.params;
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ error: 'paymentIntentId is required' });
    }

    const request = await prisma.inboundRequest.findUnique({
      where: { payToken: token },
      include: { recipient: { select: { id: true, name: true, email: true } } },
    });

    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status === 'PAID' || request.status === 'ACCEPTED') {
      return res.json({ message: 'Already paid', alreadyPaid: true });
    }

    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (pi.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment not completed' });
    }
    if (pi.metadata.inboundRequestId !== request.id) {
      return res.status(400).json({ error: 'Payment does not match this request' });
    }

    const inboundFee = parseFloat(pi.metadata.inboundFee);

    // 1) Mark PAID + credit the recipient's wallet
    await prisma.$transaction([
      prisma.inboundRequest.update({
        where: { id: request.id },
        data:  { status: 'PAID', paidAt: new Date() },
      }),
      prisma.user.update({
        where: { id: request.recipientId },
        data:  { walletBalance: { increment: inboundFee } },
      }),
      prisma.transaction.create({
        data: {
          userId:      request.recipientId,
          type:        'INBOUND_FEE_RECEIVED',
          amount:      inboundFee,
          description: `Inbound email fee from ${request.externalEmail} — ${paymentIntentId}`,
        },
      }),
    ]);

    // 2) Deliver the email to the recipient's inbox — body IS visible
    //    (the fee unlocked reading it; Accept/Decline governs the conversation)
    const email = await prisma.email.create({
      data: {
        subject:             request.subject,
        body:                request.body,
        senderId:            null,
        externalSenderEmail: request.externalEmail,
        externalSenderName:  request.externalName || request.externalEmail,
        isDraft:             false,
        recipients: { create: { recipientId: request.recipientId, type: 'TO' } },
      },
    });
    await prisma.inboundRequest.update({
      where: { id: request.id },
      data:  { emailId: email.id },
    });

    // 3) Notify the Pryro user
    await sendInboundNotificationEmail({
      to:            request.recipient.email,
      recipientName: request.recipient.name,
      senderName:    request.externalName || request.externalEmail,
      senderEmail:   request.externalEmail,
      subject:       request.subject,
    });

    res.json({
      message: 'Payment confirmed — your message has been delivered',
      inboundFee,
    });
  } catch (error) {
    console.error('Confirm inbound payment error:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
};

// ─── 5. Accept (JWT — Pryo recipient) ─────────────────────────────────────────
export const acceptInbound = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const request = await prisma.inboundRequest.findUnique({ where: { id } });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.recipientId !== userId) {
      return res.status(403).json({ error: 'Not authorised' });
    }
    if (request.status !== 'PAID') {
      return res.status(400).json({ error: `Cannot accept a request with status ${request.status}` });
    }

    await prisma.inboundRequest.update({
      where: { id: request.id },
      data:  { status: 'ACCEPTED', acceptedAt: new Date() },
    });

    // Tell the external sender their message was accepted
    const recipient = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    await sendDecisionEmail({
      to:           request.externalEmail,
      senderName:   request.externalName || request.externalEmail,
      recipientName: recipient.name,
      accepted:     true,
    });

    res.json({ message: 'Message accepted — it stays in your inbox and the sender can continue the conversation' });
  } catch (error) {
    console.error('Accept inbound error:', error);
    res.status(500).json({ error: 'Failed to accept message' });
  }
};

// ─── 6. Decline (JWT — Pryro recipient) ───────────────────────────────────────
export const declineInbound = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const request = await prisma.inboundRequest.findUnique({
      where:   { id },
      include: { email: true },
    });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.recipientId !== userId) {
      return res.status(403).json({ error: 'Not authorised' });
    }
    if (request.status !== 'PAID') {
      return res.status(400).json({ error: `Cannot decline a request with status ${request.status}` });
    }

    // Stripe refund — find the PaymentIntent id from the wallet transaction log
    let refundIssued = false;
    try {
      const txn = await prisma.transaction.findFirst({
        where: {
          userId:      request.recipientId,
          type:        'INBOUND_FEE_RECEIVED',
          description: { contains: request.externalEmail },
        },
        orderBy: { createdAt: 'desc' },
      });
      const match = txn?.description.match(/—\s*(pi_[A-Za-z0-9_]+)/);
      if (match) {
        const pi = await stripe.paymentIntents.retrieve(match[1]);
        if (pi.latest_charge) {
          await stripe.refunds.create({ charge: pi.latest_charge });
          refundIssued = true;
        }
      }
    } catch (refundErr) {
      console.error('Refund attempt failed (non-fatal):', refundErr.message);
    }

    // Reverse the wallet credit, mark DECLINED, remove the delivered email
    await prisma.$transaction([
      prisma.inboundRequest.update({
        where: { id: request.id },
        data:  { status: 'DECLINED', declinedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: request.recipientId },
        data:  { walletBalance: { decrement: request.inboundFee } },
      }),
      prisma.transaction.create({
        data: {
          userId:      request.recipientId,
          type:        'INBOUND_FEE_REFUNDED',
          amount:      -request.inboundFee,
          description: `Inbound email declined — refund for ${request.externalEmail}`,
        },
      }),
      ...(request.emailId
        ? [prisma.email.delete({ where: { id: request.emailId } })]
        : []),
    ]);

    const recipient = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    await sendDecisionEmail({
      to:            request.externalEmail,
      senderName:    request.externalName || request.externalEmail,
      recipientName: recipient.name,
      accepted:      false,
    });

    res.json({ message: 'Message declined', refundIssued });
  } catch (error) {
    console.error('Decline inbound error:', error);
    res.status(500).json({ error: 'Failed to decline message' });
  }
};

// ─── 7. List inbound requests (JWT) ───────────────────────────────────────────
export const listInboundRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    const requests = await prisma.inboundRequest.findMany({
      where: {
        recipientId: userId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id:            true,
        externalEmail: true,
        externalName:  true,
        subject:       true,
        inboundFee:    true,
        status:        true,
        createdAt:     true,
        paidAt:        true,
        acceptedAt:    true,
        declinedAt:    true,
        emailId:       true,
      },
    });

    res.json({ requests });
  } catch (error) {
    console.error('List inbound requests error:', error);
    res.status(500).json({ error: 'Failed to list inbound requests' });
  }
};
