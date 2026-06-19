import express from 'express';
import { sendKnoccRequest, getReceivedRequests, getSentRequests, respondToRequest } from '../controllers/knoccController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/request', sendKnoccRequest);
router.get('/requests', getReceivedRequests);
router.get('/sent', getSentRequests);
router.post('/requests/:id/respond', respondToRequest);

export default router;
