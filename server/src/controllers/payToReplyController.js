import prisma from '../utils/prisma.js';
import Stripe from 'stripe';
import { sendExternalEmail } from '../services/emailService.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy');

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// ─── Get invitation by reply token (PUBLIC — no auth) ────────────────────────

export const getInvitation = async (req, res) => {
  try {
    const { token } = req.params;

    const invitation = await prisma.payToReplyInvitation.findUnique({
      where: { replyToken: token },
      include: {
        email: {
          select: {
            id: true,
            subject: true,
            body: true,
            sentAt: true,
            attachments: { select: { id: true, filename: true, mimeType: true, size: true } },
          },
        },
        sender: {
          select: { name: true, email: true },
        },
      },
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found or expired' });
    }

    res.json({
      id: invitation.id,
      status: invitation.status,
      replyFee: invitation.replyFee,
      externalEmail: invitation.externalEmail,
      createdAt: invitation.createdAt,
      paidAt: invitation.paidAt,
      repliedAt: invitation.repliedAt,
      email: {
        subject: invitation.email.subject,
        sentAt: invitation.email.sentAt,
        attachments: invitation.email.attachments,
      },
      sender: {
        name: invitation.sender.name,
        email: invitation.sender.email,
      },
    });
  } catch (error) {
    console.error('Get invitation error:', error);
    res.status(500).json({ error: 'Failed to retrieve invitation' });
  }
};

// ─── Create Stripe Payment Intent for reply fee (PUBLIC — no auth) ──────────

export const createPayment = async (req, res) => {
  try {
    const { token } = req.params;

    const invitation = await prisma.payToReplyInvitation.findUnique({
      where: { replyToken: token },
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (invitation.status === 'PAID' || invitation.status === 'REPLIED') {
      return res.status(400).json({ error: 'Reply fee already paid' });
    }

    if (invitation.replyFee <= 0) {
      return res.status(400).json({ error: 'No payment required for this invitation' });
    }

    // Calculate platform fee (same percentage as wallet deposits)
    const feePercentage = parseFloat(process.env.TRANSACTION_FEE_PERCENTAGE || 5);
    const platformFee = invitation.replyFee * (feePercentage / 100);
    const totalAmount = invitation.replyFee + platformFee;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // Stripe uses cents
      currency: 'usd',
      metadata: {
        invitationId: invitation.id,
        senderId: invitation.senderId,
        replyFee: invitation.replyFee.toString(),
        platformFee: platformFee.toString(),
        feePercentage: feePercentage.toString(),
        type: 'PAY_TO_REPLY',
      },
      description: `Pmail reply fee: $${invitation.replyFee.toFixed(2)} + $${platformFee.toFixed(2)} fee`,
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      replyFee: invitation.replyFee,
      platformFee,
      totalAmount,
    });
  } catch (error) {
    console.error('Create pay-to-reply payment error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
};

// ─── Confirm payment & unlock reply (PUBLIC — no auth) ───────────────────────

export const confirmPayment = async (req, res) => {
  try {
    const { token } = req.params;
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ error: 'Payment intent ID required' });
    }

    const invitation = await prisma.payToReplyInvitation.findUnique({
      where: { replyToken: token },
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (invitation.status === 'PAID' || invitation.status === 'REPLIED') {
      return res.json({ message: 'Payment already confirmed', alreadyPaid: true });
    }

    // Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    // Guard against duplicate confirmation
    if (paymentIntent.metadata.invitationId !== invitation.id) {
      return res.status(400).json({ error: 'Payment does not match invitation' });
    }

    const replyFee = parseFloat(paymentIntent.metadata.replyFee);

    // Mark invitation as paid and credit the sender's wallet atomically
    await prisma.$transaction([
      prisma.payToReplyInvitation.update({
        where: { id: invitation.id },
        data: { status: 'PAID', paidAt: new Date() },
      }),
      prisma.user.update({
        where: { id: invitation.senderId },
        data: { walletBalance: { increment: replyFee } },
      }),
      prisma.transaction.create({
        data: {
          userId: invitation.senderId,
          type: 'REPLY_FEE_RECEIVED',
          amount: replyFee,
          description: `Pay-to-reply fee from ${invitation.externalEmail} - ${paymentIntentId}`,
        },
      }),
    ]);

    res.json({ message: 'Payment confirmed — you can now reply', replyFee });
  } catch (error) {
    console.error('Confirm pay-to-reply payment error:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
};

// ─── Submit reply (PUBLIC — no auth, requires PAID status) ──────────────────

export const submitReply = async (req, res) => {
  try {
    const { token } = req.params;
    const { replyBody, senderName } = req.body;

    if (!replyBody || !replyBody.trim()) {
      return res.status(400).json({ error: 'Reply body is required' });
    }
    if (!senderName || !senderName.trim()) {
      return res.status(400).json({ error: 'Your name is required' });
    }

    const invitation = await prisma.payToReplyInvitation.findUnique({
      where: { replyToken: token },
      include: { email: true },
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    // Free reply (fee = 0) doesn't require PAID status; paid reply does
    if (invitation.replyFee > 0 && invitation.status !== 'PAID' && invitation.status !== 'REPLIED') {
      return res.status(403).json({ error: 'Payment required before replying' });
    }

    if (invitation.status === 'REPLIED') {
      return res.status(400).json({ error: 'You have already replied to this email' });
    }

    // Create the reply email — senderId is null (external sender), externalSenderEmail/Name store their info
    const replyEmail = await prisma.email.create({
      data: {
        subject: invitation.email.subject.startsWith('Re:')
          ? invitation.email.subject
          : `Re: ${invitation.email.subject}`,
        body: replyBody,
        senderId: null, // external sender — not a Pmail user
        externalSenderEmail: invitation.externalEmail,
        externalSenderName: senderName.trim(),
        isDraft: false,
        recipients: {
          create: {
            recipientId: invitation.senderId,
            type: 'TO',
          },
        },
      },
    });

    // Mark invitation as replied
    await prisma.payToReplyInvitation.update({
      where: { id: invitation.id },
      data: { status: 'REPLIED', repliedAt: new Date() },
    });

    res.status(201).json({
      message: 'Reply sent successfully',
      emailId: replyEmail.id,
    });
  } catch (error) {
    console.error('Submit reply error:', error);
    res.status(500).json({ error: 'Failed to send reply' });
  }
};
