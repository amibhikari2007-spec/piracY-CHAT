import { Response } from 'express';
import mongoose from 'mongoose';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth';


export const getOrCreateConversation = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user!.userId;
    const otherUserId = req.params.userId;

    console.log('getOrCreateConversation:', { currentUserId, otherUserId });

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(currentUserId) ||
        !mongoose.Types.ObjectId.isValid(otherUserId)) {
      res.status(400).json({ success: false, message: 'Invalid user ID' });
      return;
    }

    const currentObjId = new mongoose.Types.ObjectId(currentUserId);
    const otherObjId   = new mongoose.Types.ObjectId(otherUserId);

    let conversation = await Conversation.findOne({
      participants: { $all: [currentObjId, otherObjId] },
    })
      .populate('participants', 'username email avatar isOnline lastSeen')
      .populate('lastMessage');

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [currentObjId, otherObjId],
      });
      await conversation.populate('participants', 'username email avatar isOnline lastSeen');
    }

    res.json({ success: true, data: { conversation } });
  } catch (error) {
    console.error('getOrCreateConversation error:', error);
    res.status(500).json({ success: false, message: 'Failed to get conversation' });
  }
};

export const getMyConversations = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.userId);

    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate('participants', 'username email avatar isOnline lastSeen')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 })
      .limit(50);

    res.json({ success: true, data: { conversations } });
  } catch (error) {
    console.error('getMyConversations error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch conversations' });
  }
};

export const getMessages = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const page  = parseInt(req.query.page as string)  || 1;
    const limit = parseInt(req.query.limit as string) || 30;
    const skip  = (page - 1) * limit;
    const userId = new mongoose.Types.ObjectId(req.user!.userId);

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      res.status(400).json({ success: false, message: 'Invalid conversation ID' });
      return;
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    const messages = await Message.find({
      conversationId,
      deletedForEveryone: false,
      deletedFor: { $ne: userId },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'username avatar')
      .lean();

    const total = await Message.countDocuments({
      conversationId,
      deletedForEveryone: false,
      deletedFor: { $ne: userId },
    });

    // Mark messages as delivered
    await Message.updateMany(
      { conversationId, receiver: userId, status: 'sent' },
      { $set: { status: 'delivered', deliveredAt: new Date() } }
    );

    res.json({
      success: true,
      data: {
        messages: messages.reverse(),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: skip + limit < total,
        },
      },
    });
  } catch (error) {
    console.error('getMessages error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
};

export const searchUsers = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { q } = req.query;
    const currentUserId = req.user!.userId;

    if (!q || typeof q !== 'string' || q.length < 2) {
      res.json({ success: true, data: { users: [] } });
      return;
    }

    const users = await User.find({
      _id: { $ne: currentUserId },
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { email:    { $regex: q, $options: 'i' } },
      ],
    })
      .select('username email avatar isOnline lastSeen')
      .limit(10)
      .lean();

    // Normalize _id to id
    const normalized = users.map((u) => ({
      ...u,
      id: u._id.toString(),
    }));

    res.json({ success: true, data: { users: normalized } });
  } catch (error) {
    console.error('searchUsers error:', error);
    res.status(500).json({ success: false, message: 'Search failed' });
  }
};

export const markMessagesSeen = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const userId = new mongoose.Types.ObjectId(req.user!.userId);

    await Message.updateMany(
      {
        conversationId,
        receiver: userId,
        status: { $in: ['sent', 'delivered'] },
      },
      { $set: { status: 'seen', seenAt: new Date() } }
    );

    await Conversation.updateOne(
      { _id: conversationId },
      { $set: { [`unreadCount.${userId}`]: 0 } }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('markMessagesSeen error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark as seen' });
  }
};