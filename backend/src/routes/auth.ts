import { Router } from 'express';
import {
  register,
  login,
  refreshToken,
  uploadKeyBundle,
  getKeyBundle,
  getMe,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import {
  registerValidation,
  loginValidation,
  keyBundleValidation,
} from '../validators/authValidator';
import { authRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', authRateLimiter, registerValidation, register);
router.post('/login', authRateLimiter, loginValidation, login);
router.post('/refresh', refreshToken);
router.get('/me', authenticate, getMe);

// E2EE key bundle endpoints
router.post('/keys', authenticate, keyBundleValidation, uploadKeyBundle);
router.get('/keys/:userId', authenticate, getKeyBundle);

export default router;
