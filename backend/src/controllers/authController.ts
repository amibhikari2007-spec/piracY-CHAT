import { Request, Response } from 'express';
import { User } from '../models/User';
import {
  generateTokens,
  generateAccessToken,
  verifyRefreshToken,
} from '../services/jwtService';
import { AuthRequest } from '../middleware/auth';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message:
          existingUser.email === email
            ? 'Email already registered'
            : 'Username already taken',
      });
      return;
    }

    const user = await User.create({ username, email, password });
    const tokens = generateTokens({
      userId: user._id.toString(),
      username: user.username,
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          hasKeyBundle: false,
        },
        ...tokens,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }

    // Update presence on login
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save({ validateBeforeSave: false });

    const tokens = generateTokens({
      userId: user._id.toString(),
      username: user.username,
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen,
          hasKeyBundle: !!user.identityKey,
        },
        ...tokens,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

export const refreshToken = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(401).json({ success: false, message: 'Refresh token required' });
      return;
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.userId);

    if (!user) {
      res.status(401).json({ success: false, message: 'User not found' });
      return;
    }

    const newAccessToken = generateAccessToken({
      userId: user._id.toString(),
      username: user.username,
    });

    res.json({ success: true, data: { accessToken: newAccessToken } });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
};

/**
 * Upload Signal Protocol key bundle after registration
 */
export const uploadKeyBundle = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { identityKey, registrationId, signedPreKey, preKeys } = req.body;
    const userId = req.user!.userId;

    await User.findByIdAndUpdate(userId, {
      identityKey,
      registrationId,
      signedPreKey,
      preKeys,
    });

    res.json({ success: true, message: 'Key bundle uploaded successfully' });
  } catch (error) {
    console.error('Key bundle upload error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload key bundle' });
  }
};

/**
 * Fetch another user's public key bundle to initiate a Signal session
 */
export const getKeyBundle = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select(
      'identityKey registrationId signedPreKey preKeys'
    );

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    if (!user.identityKey) {
      res.status(404).json({
        success: false,
        message: 'User has no key bundle. E2EE not yet configured.',
      });
      return;
    }

    // Pop one-time preKey from list (as per Signal protocol)
    const preKey = user.preKeys.pop();
    if (preKey) {
      await User.findByIdAndUpdate(userId, { preKeys: user.preKeys });
    }

    res.json({
      success: true,
      data: {
        identityKey: user.identityKey,
        registrationId: user.registrationId,
        signedPreKey: user.signedPreKey,
        preKey: preKey || null,
      },
    });
  } catch (error) {
    console.error('Key bundle fetch error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch key bundle' });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user!.userId).select(
      '-preKeys -signedPreKey -identityKey'
    );

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id.toString(),
          _id: user._id.toString(),
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen,
          hasKeyBundle: !!user.identityKey,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch user' });
  }
};