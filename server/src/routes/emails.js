import express from 'express';
import { sendEmail, getInbox, getSentEmails, getStarredEmails, getBinEmails, getEmailById, deleteEmail, starEmail, restoreEmail, permanentlyDeleteEmail } from '../controllers/emailController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/', sendEmail);
router.get('/inbox', getInbox);
router.get('/sent', getSentEmails);
router.get('/starred', getStarredEmails);
router.get('/bin', getBinEmails);
router.get('/:id', getEmailById);
router.delete('/:id', deleteEmail);
router.put('/:id/star', starEmail);
router.put('/:id/restore', restoreEmail);
router.delete('/:id/permanent', permanentlyDeleteEmail);

export default router;
