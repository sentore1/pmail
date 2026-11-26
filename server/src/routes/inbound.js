import express from 'express';
import {
  submitInbound,
  inboundWebhook,
  getInboundRequest,
  createInboundPayment,
  confirmInboundPayment,
  acceptInbound,
  declineInbound,
  listInboundRequests,
} from '../controllers/inboundController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// ─── PUBLIC routes (no authentication) ──────────────────────────────────────
// Used by external senders who don't have a Pryro account.

// External sender submits the form at /?inbound (no token yet)
router.post('/submit', submitInbound);

// Real-email gateway (SendGrid Inbound Parse / Postmark / Mailgun webhook)
router.post('/webhook', inboundWebhook);

// Get InboundRequest info by pay-token (shows fee, status, recipient name)
router.get('/p/:token', getInboundRequest);

// Create a Stripe PaymentIntent for the inbound fee
router.post('/p/:token/create-payment', createInboundPayment);

// Confirm Stripe payment — delivers email to recipient's inbox
router.post('/p/:token/confirm-payment', confirmInboundPayment);

// ─── AUTHENTICATED routes (Pryro users only) ─────────────────────────────────

// List all inbound requests addressed to the logged-in user
router.get('/', authenticate, listInboundRequests);

// Accept an inbound email (keeps it in inbox, opens conversation)
router.post('/:id/accept', authenticate, acceptInbound);

// Decline an inbound email (removes from inbox, issues Stripe refund)
router.post('/:id/decline', authenticate, declineInbound);

export default router;
