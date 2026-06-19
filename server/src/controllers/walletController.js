import prisma from '../utils/prisma.js';
import axios from 'axios';

// Polar Lightning Network configuration
const POLAR_API_URL = process.env.POLAR_API_URL || 'http://localhost:8081';
const POLAR_MACAROON = process.env.POLAR_MACAROON || '';

// Lightning Network helper functions
const createLNInvoice = async (amountSats, description) => {
  try {
    const response = await axios.post(
      `${POLAR_API_URL}/v1/invoices`,
      {
        value: amountSats.toString(),
        memo: description,
        expiry: '3600', // 1 hour
      },
      {
        headers: {
          'Grpc-Metadata-macaroon': POLAR_MACAROON,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Lightning invoice creation error:', error);
    throw new Error('Failed to create Lightning invoice');
  }
};

const checkLNInvoice = async (paymentHash) => {
  try {
    const response = await axios.get(
      `${POLAR_API_URL}/v1/invoice/${paymentHash}`,
      {
        headers: {
          'Grpc-Metadata-macaroon': POLAR_MACAROON,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Lightning invoice check error:', error);
    throw new Error('Failed to check Lightning invoice');
  }
};

const sendLNPayment = async (paymentRequest) => {
  try {
    const response = await axios.post(
      `${POLAR_API_URL}/v1/channels/transactions`,
      {
        payment_request: paymentRequest,
      },
      {
        headers: {
          'Grpc-Metadata-macaroon': POLAR_MACAROON,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Lightning payment error:', error);
    throw new Error('Failed to send Lightning payment');
  }
};

// Convert USD to Satoshis (assuming 1 BTC = $40,000)
const usdToSats = (usd) => {
  const BTC_PRICE = 40000; // You should fetch this from an API
  const btc = usd / BTC_PRICE;
  return Math.floor(btc * 100000000); // Convert to satoshis
};

const satsToUsd = (sats) => {
  const BTC_PRICE = 40000;
  const btc = sats / 100000000;
  return btc * BTC_PRICE;
};

export const addFunds = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Update wallet balance
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        walletBalance: { increment: parseFloat(amount) },
      },
      select: {
        walletBalance: true,
      },
    });

    // Create transaction
    await prisma.transaction.create({
      data: {
        userId,
        type: 'DEPOSIT',
        amount: parseFloat(amount),
        description: 'Wallet funds added via card',
      },
    });

    res.json({
      message: 'Funds added successfully',
      walletBalance: user.walletBalance,
    });
  } catch (error) {
    console.error('Add funds error:', error);
    res.status(500).json({ error: 'Failed to add funds' });
  }
};

export const createLightningInvoice = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const amountSats = usdToSats(parseFloat(amount));
    const description = `Add $${amount} to Pmail wallet`;

    // Create Lightning invoice
    const invoice = await createLNInvoice(amountSats, description);

    res.json({
      invoice: {
        paymentRequest: invoice.payment_request,
        paymentHash: invoice.r_hash,
        amountSats,
        amountUsd: parseFloat(amount),
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      },
    });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error: 'Failed to create Lightning invoice' });
  }
};

export const checkInvoiceStatus = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const userId = req.user.id;

    // Check Lightning invoice status
    const invoice = await checkLNInvoice(invoiceId);

    if (invoice.settled) {
      const amountUsd = satsToUsd(parseInt(invoice.value));

      // Update wallet balance
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          walletBalance: { increment: amountUsd },
        },
        select: {
          walletBalance: true,
        },
      });

      // Create transaction
      await prisma.transaction.create({
        data: {
          userId,
          type: 'DEPOSIT',
          amount: amountUsd,
          description: `Lightning deposit: ${invoice.value} sats`,
        },
      });

      res.json({
        settled: true,
        walletBalance: user.walletBalance,
      });
    } else {
      res.json({
        settled: false,
      });
    }
  } catch (error) {
    console.error('Check invoice status error:', error);
    res.status(500).json({ error: 'Failed to check invoice status' });
  }
};

export const withdrawFunds = async (req, res) => {
  try {
    const { amount, paymentRequest } = req.body;
    const userId = req.user.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true },
    });

    if (user.walletBalance < parseFloat(amount)) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Send Lightning payment if payment request provided
    if (paymentRequest) {
      await sendLNPayment(paymentRequest);
    }

    // Deduct from wallet balance
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        walletBalance: { decrement: parseFloat(amount) },
      },
      select: {
        walletBalance: true,
      },
    });

    // Create transaction
    await prisma.transaction.create({
      data: {
        userId,
        type: 'WITHDRAWAL',
        amount: -parseFloat(amount),
        description: paymentRequest
          ? 'Lightning withdrawal'
          : 'Withdrawal to bank account',
      },
    });

    res.json({
      message: 'Withdrawal successful',
      walletBalance: updatedUser.walletBalance,
    });
  } catch (error) {
    console.error('Withdraw funds error:', error);
    res.status(500).json({ error: 'Failed to withdraw funds' });
  }
};

export const getBalance = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true },
    });

    res.json({ walletBalance: user.walletBalance });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ error: 'Failed to get balance' });
  }
};

export const getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;

    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ transactions });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
};
