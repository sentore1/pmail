import prisma from '../utils/prisma.js';
import axios from 'axios';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy');

const POLAR_API_URL = process.env.POLAR_API_URL || 'http://localhost:8081';
const POLAR_MACAROON = process.env.POLAR_MACAROON || '';

// Fetch live BTC price with a 5-minute cache
let btcPriceCache = { price: 60000, fetchedAt: 0 };
const getBtcPrice = async () => {
  const now = Date.now();
  if (now - btcPriceCache.fetchedAt < 5 * 60 * 1000) return btcPriceCache.price;
  try {
    const r = await axios.get('https://api.coinbase.com/v2/prices/BTC-USD/spot', { timeout: 3000 });
    const price = parseFloat(r.data?.data?.amount);
    if (price > 0) { btcPriceCache = { price, fetchedAt: now }; return price; }
  } catch { /* use cached */ }
  return btcPriceCache.price;
};

const usdToSats = async (usd) => {
  const btcPrice = await getBtcPrice();
  return Math.floor((usd / btcPrice) * 1e8);
};
const satsToUsd = async (sats) => {
  const btcPrice = await getBtcPrice();
  return (sats / 1e8) * btcPrice;
};

const lnHeaders = () => ({ 'Grpc-Metadata-macaroon': POLAR_MACAROON });

const createLNInvoice = async (amountSats, description) => {
  const r = await axios.post(`${POLAR_API_URL}/v1/invoices`,
    { value: amountSats.toString(), memo: description, expiry: '3600' },
    { headers: lnHeaders() });
  return r.data;
};

const checkLNInvoice = async (paymentHash) => {
  // paymentHash may arrive as base64 — encode for URL
  const encoded = encodeURIComponent(paymentHash);
  const r = await axios.get(`${POLAR_API_URL}/v1/invoice/${encoded}`, { headers: lnHeaders() });
  return r.data;
};

const sendLNPayment = async (paymentRequest) => {
  const r = await axios.post(`${POLAR_API_URL}/v1/channels/transactions`,
    { payment_request: paymentRequest },
    { headers: lnHeaders() });
  return r.data;
};

// Validate a numeric amount from request body
const parseAmount = (raw) => {
  const n = parseFloat(raw);
  if (!isFinite(n) || n <= 0) return null;
  return n;
};

// Create Stripe Payment Intent
export const createStripePaymentIntent = async (req, res) => {
  try {
    const amount = parseAmount(req.body.amount);
    if (!amount) return res.status(400).json({ error: 'Amount must be a positive number' });
    
    const userId = req.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });

    // Calculate fee (5% of transaction)
    const feePercentage = parseFloat(process.env.TRANSACTION_FEE_PERCENTAGE || 5);
    const feeAmount = amount * (feePercentage / 100);
    const totalAmount = amount + feeAmount;
    
    // Create Stripe Payment Intent (Stripe expects amount in cents)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        userId: userId.toString(),
        depositAmount: amount.toString(),
        feeAmount: feeAmount.toString(),
        feePercentage: feePercentage.toString(),
      },
      description: `Pmail Wallet Top-up: $${amount.toFixed(2)} + $${feeAmount.toFixed(2)} fee (${feePercentage}%)`,
      receipt_email: user.email,
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount,
      feeAmount,
      totalAmount,
      feePercentage,
    });
  } catch (err) {
    console.error('Create payment intent error:', err);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
};

// Confirm and credit wallet after successful Stripe payment
export const confirmStripePayment = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    if (!paymentIntentId) return res.status(400).json({ error: 'Payment intent ID required' });
    
    const userId = req.user.id;

    // Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    // Check for duplicate processing
    const existingTxn = await prisma.transaction.findFirst({
      where: {
        userId,
        description: { contains: paymentIntentId },
        type: 'DEPOSIT',
      },
    });

    if (existingTxn) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { walletBalance: true } });
      return res.json({ 
        message: 'Payment already processed',
        walletBalance: user.walletBalance,
        alreadyProcessed: true,
      });
    }

    // Extract amounts from metadata
    const depositAmount = parseFloat(paymentIntent.metadata.depositAmount);
    const feeAmount = parseFloat(paymentIntent.metadata.feeAmount);
    const feePercentage = parseFloat(paymentIntent.metadata.feePercentage);

    // Credit user wallet with deposit amount (fee goes to company)
    const user = await prisma.user.update({
      where: { id: userId },
      data: { walletBalance: { increment: depositAmount } },
      select: { walletBalance: true },
    });

    // Record transaction
    await prisma.transaction.create({
      data: {
        userId,
        type: 'DEPOSIT',
        amount: depositAmount,
        description: `Stripe deposit: $${depositAmount.toFixed(2)} (Fee: $${feeAmount.toFixed(2)}, ${feePercentage}%) - ${paymentIntentId}`,
      },
    });

    res.json({
      message: 'Funds added successfully',
      walletBalance: user.walletBalance,
      depositAmount,
      feeAmount,
      totalCharged: depositAmount + feeAmount,
    });
  } catch (err) {
    console.error('Confirm payment error:', err);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
};

// Legacy add funds (for backward compatibility or testing)
export const addFunds = async (req, res) => {
  try {
    const amount = parseAmount(req.body.amount);
    if (!amount) return res.status(400).json({ error: 'Amount must be a positive number' });
    const userId = req.user.id;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { walletBalance: { increment: amount } },
      select: { walletBalance: true },
    });

    await prisma.transaction.create({
      data: { userId, type: 'DEPOSIT', amount, description: 'Funds added via card' },
    });

    res.json({ message: 'Funds added successfully', walletBalance: user.walletBalance });
  } catch (err) {
    console.error('Add funds error:', err);
    res.status(500).json({ error: 'Failed to add funds' });
  }
};

export const createLightningInvoice = async (req, res) => {
  try {
    const amount = parseAmount(req.body.amount);
    if (!amount) return res.status(400).json({ error: 'Amount must be a positive number' });

    const amountSats = await usdToSats(amount);
    const invoice = await createLNInvoice(amountSats, `Add $${amount} to Pmail wallet`);

    res.json({
      invoice: {
        paymentRequest: invoice.payment_request,
        paymentHash: invoice.r_hash,
        amountSats,
        amountUsd: amount,
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      },
    });
  } catch (err) {
    console.error('Create invoice error:', err);
    res.status(500).json({ error: 'Failed to create Lightning invoice' });
  }
};

export const checkInvoiceStatus = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const userId = req.user.id;
    const invoice = await checkLNInvoice(invoiceId);

    if (!invoice.settled) return res.json({ settled: false });

    // Idempotency: check if we already credited this payment
    const txnDescription = `Lightning deposit: ${invoice.value} sats`;
    const existing = await prisma.transaction.findFirst({
      where: { userId, description: txnDescription, type: 'DEPOSIT' },
    });
    if (existing) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { walletBalance: true } });
      return res.json({ settled: true, walletBalance: user.walletBalance, alreadyCredited: true });
    }

    const amountUsd = await satsToUsd(parseInt(invoice.value));
    const user = await prisma.user.update({
      where: { id: userId },
      data: { walletBalance: { increment: amountUsd } },
      select: { walletBalance: true },
    });

    await prisma.transaction.create({
      data: { userId, type: 'DEPOSIT', amount: amountUsd, description: txnDescription },
    });

    res.json({ settled: true, walletBalance: user.walletBalance });
  } catch (err) {
    console.error('Check invoice status error:', err);
    res.status(500).json({ error: 'Failed to check invoice status' });
  }
};

export const withdrawFunds = async (req, res) => {
  try {
    const amount = parseAmount(req.body.amount);
    if (!amount) return res.status(400).json({ error: 'Amount must be a positive number' });
    const { paymentRequest } = req.body;
    const userId = req.user.id;

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { walletBalance: true } });
    if (user.walletBalance < amount) return res.status(400).json({ error: 'Insufficient balance' });

    // Validate Lightning invoice format (starts with lnbc/lntb/lnbcrt)
    if (paymentRequest && !/^ln[a-z]{2,6}[0-9]/i.test(paymentRequest)) {
      return res.status(400).json({ error: 'Invalid Lightning invoice format' });
    }

    if (paymentRequest) await sendLNPayment(paymentRequest);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { walletBalance: { decrement: amount } },
      select: { walletBalance: true },
    });

    await prisma.transaction.create({
      data: {
        userId, type: 'WITHDRAWAL', amount: -amount,
        description: paymentRequest ? 'Lightning withdrawal' : 'Withdrawal to bank account',
      },
    });

    res.json({ message: 'Withdrawal successful', walletBalance: updated.walletBalance });
  } catch (err) {
    console.error('Withdraw funds error:', err);
    res.status(500).json({ error: 'Failed to withdraw funds' });
  }
};

export const getBalance = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { walletBalance: true },
    });
    res.json({ walletBalance: user.walletBalance });
  } catch (err) {
    console.error('Get balance error:', err);
    res.status(500).json({ error: 'Failed to get balance' });
  }
};

export const getTransactions = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const skip  = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
      prisma.transaction.count({ where: { userId: req.user.id } }),
    ]);

    res.json({ transactions, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('Get transactions error:', err);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
};
