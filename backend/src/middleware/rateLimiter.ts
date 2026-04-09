import rateLimit from 'express-rate-limit';
import config from '../config/env';

export const globalRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  skip: (req) => req.path === '/health',
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
  },
});

export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: {
    success: false,
    message: 'Upload rate limit exceeded.',
  },
});
