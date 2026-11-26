import express from 'express';
import { register, login, getMe, checkUsername, suggest, forgotPassword, resetPassword, verifyResetToken } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/suggest', suggest);
router.post('/register', register);
router.post('/login', login);
router.post('/check-username', checkUsername);
router.get('/me', authenticate, getMe);

// Password reset
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/verify-reset-token', verifyResetToken);

export default router;
