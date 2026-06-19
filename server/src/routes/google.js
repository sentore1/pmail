import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getAuthUrl,
  handleCallback,
  getContacts,
  getContactsWithCode,
  getGmailAuthUrl,
  handleGmailCallback,
  revokeGmailAccess,
  syncGmailLearning,
  getGmailStatus,
} from '../controllers/googleOAuthController.js';

const router = express.Router();

// ── Contacts OAuth (invite friends) ───────────────────────────────────────
router.get('/auth-url', authenticate, getAuthUrl);
router.get('/callback', handleCallback);

// ── Gmail AI learning OAuth ────────────────────────────────────────────────
router.get('/gmail-auth-url', authenticate, getGmailAuthUrl);
router.get('/gmail-callback', handleGmailCallback);           // public — OAuth redirect
router.post('/gmail-revoke', authenticate, revokeGmailAccess);
router.post('/gmail-sync', authenticate, syncGmailLearning);
router.get('/gmail-status', authenticate, getGmailStatus);

// ── Legacy endpoints (still supported) ────────────────────────────────────
router.post('/contacts', authenticate, getContacts);
router.post('/contacts-with-code', authenticate, getContactsWithCode);

export default router;
