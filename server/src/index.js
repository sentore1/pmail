import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import emailRoutes from './routes/emails.js';
import knoccRoutes from './routes/knocc.js';
import walletRoutes from './routes/wallet.js';
import invitationRoutes from './routes/invitations.js';
import googleRoutes from './routes/google.js';
import intelligenceRoutes from './routes/intelligence.js';
import payToReplyRoutes from './routes/payToReply.js';
import adminRoutes from './routes/admin.js';
import inboundRoutes from './routes/inbound.js';
import { startInboundSmtpServer } from './services/inboundSmtpServer.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      process.env.CLIENT_URL,
      'https://mail.pryro.com',
      'https://login.pryro.com',
      'http://localhost:5173',
      'http://localhost:3000',
    ].filter(Boolean);
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins for now
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/knocc', knoccRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/google', googleRoutes);
app.use('/api/intelligence', intelligenceRoutes);
app.use('/api/pay-to-reply', payToReplyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/inbound', inboundRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Pmail server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
    },
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Pmail server running on http://localhost:${PORT}`);
  // Start the optional inbound SMTP receiver (disabled unless INBOUND_SMTP_PORT is set)
  startInboundSmtpServer();
});
