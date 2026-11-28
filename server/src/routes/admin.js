import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getEarnings,
  getEarningsStats,
  getEntropySignups,
  getEntropyRecord,
  labelEntropyRecord,
  getEntropyStats,
} from '../controllers/adminController.js';

const router = express.Router();

// Admin routes require both a valid JWT AND the admin secret header
// Set ADMIN_SECRET in .env — never expose it publicly
const requireAdmin = (req, res, next) => {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

router.use(authenticate, requireAdmin);

// Earnings
router.get('/earnings',       getEarnings);
router.get('/earnings/stats', getEarningsStats);

// Human Entropy / Bot Detection
// Stats must come before /:id to avoid route collision
router.get('/entropy',          getEntropySignups);
router.get('/entropy/stats',    getEntropyStats);
router.get('/entropy/:id',      getEntropyRecord);
router.patch('/entropy/:id/label', labelEntropyRecord);

export default router;
