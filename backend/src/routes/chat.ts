import { Router } from 'express';
import {
  getOrCreateConversation,
  getMyConversations,
  getMessages,
  searchUsers,
  markMessagesSeen,
} from '../controllers/chatController';
import { authenticate } from '../middleware/auth';
import { upload, uploadMedia } from '../controllers/mediaController';
import { uploadRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(authenticate);

// Conversations
router.get('/conversations', getMyConversations);
router.get('/conversations/:userId', getOrCreateConversation);
router.get('/messages/:conversationId', getMessages);
router.patch('/messages/:conversationId/seen', markMessagesSeen);

// Users
router.get('/users/search', searchUsers);

// Encrypted media upload
router.post(
  '/media/upload',
  uploadRateLimiter,
  upload.single('file'),
  uploadMedia
);

export default router;
