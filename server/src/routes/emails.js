import express from 'express';
import {
  sendEmail,
  getInbox,
  getSentEmails,
  getStarredEmails,
  getBinEmails,
  getEmailById,
  deleteEmail,
  starEmail,
  restoreEmail,
  permanentlyDeleteEmail,
  saveDraft,
  getDrafts,
  deleteDraft,
  getAttachment,
} from '../controllers/emailController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Send
router.post('/', sendEmail);

// Folders
router.get('/inbox', getInbox);
router.get('/sent', getSentEmails);
router.get('/starred', getStarredEmails);
router.get('/bin', getBinEmails);

// Drafts
router.post('/drafts', saveDraft);
router.put('/drafts', saveDraft);          // update existing draft (id in body)
router.get('/drafts', getDrafts);
router.delete('/drafts/:id', deleteDraft);

// Individual email
router.get('/:id', getEmailById);
router.delete('/:id', deleteEmail);
router.put('/:id/star', starEmail);
router.put('/:id/restore', restoreEmail);
router.delete('/:id/permanent', permanentlyDeleteEmail);

// Attachments
router.get('/:emailId/attachments/:attachmentId', getAttachment);

export default router;
