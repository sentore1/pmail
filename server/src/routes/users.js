import express from 'express';
import { searchUsers, getContacts, updateProfile, blockUser, unblockUser, getBlockedUsers } from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/search', searchUsers);
router.get('/contacts', getContacts);
router.get('/blocked', getBlockedUsers);
router.put('/profile', updateProfile);
router.post('/block/:userId', blockUser);
router.delete('/block/:userId', unblockUser);

export default router;
