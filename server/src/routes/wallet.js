import express from 'express';
import { addFunds, getBalance, getTransactions, createLightningInvoice, checkInvoiceStatus, withdrawFunds, createStripePaymentIntent, confirmStripePayment, initiateMomoPayment, checkMomoPayment, momoWebhook, getActiveGateway, approveMomoSandbox } from '../controllers/walletController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// MoMo webhook — no auth (called by MTN servers)
router.post('/momo/webhook', momoWebhook);

router.use(authenticate);

// Active gateway (public to authenticated users)
router.get('/gateway', getActiveGateway);

// MoMo routes
router.post('/momo/initiate', initiateMomoPayment);
router.get('/momo/status/:referenceId', checkMomoPayment);
router.post('/momo/sandbox-approve/:referenceId', approveMomoSandbox);

// Stripe payment routes
router.post('/stripe/create-payment-intent', createStripePaymentIntent);
router.post('/stripe/confirm-payment', confirmStripePayment);

// Legacy and Lightning routes
router.post('/add-funds', addFunds);
router.post('/create-invoice', createLightningInvoice);
router.get('/invoice/:invoiceId/status', checkInvoiceStatus);
router.post('/withdraw', withdrawFunds);
router.get('/balance', getBalance);
router.get('/transactions', getTransactions);

export default router;
