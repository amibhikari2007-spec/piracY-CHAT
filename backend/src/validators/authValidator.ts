import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
    return;
  }
  next();
};

export const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  handleValidationErrors,
];

export const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors,
];

export const keyBundleValidation = [
  body('identityKey').notEmpty().isString().withMessage('identityKey required'),
  body('registrationId').isInt({ min: 1 }).withMessage('registrationId required'),
  body('signedPreKey').isObject().withMessage('signedPreKey required'),
  body('signedPreKey.keyId').isInt({ min: 1 }),
  body('signedPreKey.publicKey').isString().notEmpty(),
  body('signedPreKey.signature').isString().notEmpty(),
  body('preKeys').isArray({ min: 1 }).withMessage('At least one preKey required'),
  handleValidationErrors,
];
