import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  sendInvitation,
  sendBulkInvitations,
  getSentInvitations,
  getInvitationStats,
  resendInvitation,
  cancelInvitation,
} from '../controllers/invitationController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Send single invitation
router.post('/', sendInvitation);

// Send bulk invitations
router.post('/bulk', sendBulkInvitations);

// Get user's sent invitations
router.get('/', getSentInvitations);

// Get invitation statistics
router.get('/stats', getInvitationStats);

// Resend invitation
router.post('/:invitationId/resend', resendInvitation);

// Cancel invitation
router.delete('/:invitationId', cancelInvitation);

export default router;
