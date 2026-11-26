import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getEarnings, getEarningsStats } from '../controllers/adminController.js';

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

router.get('/earnings', getEarnings);
router.get('/earnings/stats', getEarningsStats);

export default router;
