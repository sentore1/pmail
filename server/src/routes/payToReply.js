import express from 'express';
import {
  getInvitation,
  createPayment,
  confirmPayment,
  submitReply,
} from '../controllers/payToReplyController.js';

const router = express.Router();

// ─── Public routes (no authentication) ─────────────────────────────────────
// These endpoints are accessed by external email recipients who do NOT have
// a Pmail account.  Security is provided by the unique replyToken per invitation.

// Get invitation info (sender, subject, fee, status)
router.get('/:token', getInvitation);

// Create a Stripe PaymentIntent for the reply fee
router.post('/:token/create-payment', createPayment);

// Confirm Stripe payment — marks invitation PAID, credits sender wallet
router.post('/:token/confirm-payment', confirmPayment);

// Submit the reply text (only allowed after payment, or if fee is 0)
router.post('/:token/reply', submitReply);

export default router;
