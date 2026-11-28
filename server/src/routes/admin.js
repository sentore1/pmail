import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getEarnings,
  getEarningsStats,
  getEntropySignups,
  getEntropyRecord,
  labelEntropyRecord,
  getEntropyStats,
  getSettings,
  updateSettings,
  getUsers,
} from '../controllers/adminController.js';

const router = express.Router();

const requireAdmin = (req, res, next) => {
  if (!req.user?.isAdmin) return res.status(403).json({ error: 'Forbidden' });
  next();
};

router.use(authenticate, requireAdmin);

// Platform settings (payment gateway toggle)
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// Users
router.get('/users', getUsers);

// Earnings
router.get('/earnings',       getEarnings);
router.get('/earnings/stats', getEarningsStats);

// Human Entropy / Bot Detection
router.get('/entropy',             getEntropySignups);
router.get('/entropy/stats',       getEntropyStats);
router.get('/entropy/:id',         getEntropyRecord);
router.patch('/entropy/:id/label', labelEntropyRecord);

export default router;
