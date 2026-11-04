import express from 'express';
import { addFunds, getBalance, getTransactions, createLightningInvoice, checkInvoiceStatus, withdrawFunds, createStripePaymentIntent, confirmStripePayment } from '../controllers/walletController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

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
