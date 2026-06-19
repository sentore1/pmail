import express from 'express';
import { register, login, getMe, checkUsername } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/check-username', checkUsername);
router.get('/me', authenticate, getMe);

export default router;
