import express from 'express';
import { addFunds, getBalance, getTransactions, createLightningInvoice, checkInvoiceStatus, withdrawFunds } from '../controllers/walletController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/add-funds', addFunds);
router.post('/create-invoice', createLightningInvoice);
router.get('/invoice/:invoiceId/status', checkInvoiceStatus);
router.post('/withdraw', withdrawFunds);
router.get('/balance', getBalance);
router.get('/transactions', getTransactions);

export default router;
