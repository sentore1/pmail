import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getAuthUrl,
  handleCallback,
  getContacts,
  getContactsWithCode,
} from '../controllers/googleOAuthController.js';

const router = express.Router();

// Get Google OAuth URL (requires authentication)
router.get('/auth-url', authenticate, getAuthUrl);

// Handle OAuth callback (public route)
router.get('/callback', handleCallback);

// Get contacts with access token (requires authentication)
router.post('/contacts', authenticate, getContacts);

// Get contacts with authorization code (requires authentication)
router.post('/contacts-with-code', authenticate, getContactsWithCode);

export default router;
