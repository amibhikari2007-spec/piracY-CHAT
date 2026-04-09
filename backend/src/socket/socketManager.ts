import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../services/jwtService';
import { User } from '../models/User';
import { Message } from '../models/Message';
import { Conversation } from '../models/Conversation';
import config from '../config/env';

interface SocketUser {
  userId: string;
  username: string;
  socketId: string;
}

// In-memory user socket map
const onlineUsers = new Map<string, SocketUser>();

const getUserSocketId = (userId: string): string | undefined =>
  onlineUsers.get(userId)?.socketId;

export const initializeSocket = (httpServer: HttpServer): Server => {
  const io = new Server(httpServer, {
    cors: {
      origin: config.clientUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ── Auth Middleware ──────────────────────────────────────────────────────────
  io.use(async (socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = verifyAccessToken(token);
      (socket as any).user = decoded;
      next();
    } catch {
      next(new Error('Invalid authentication token'));
    }
  });

  // ── Connection Handler ───────────────────────────────────────────────────────
  io.on('connection', async (socket: Socket) => {
    const user = (socket as any).user as { userId: string; username: string };

    // Register online status
    onlineUsers.set(user.userId, {
      userId: user.userId,
      username: user.username,
      socketId: socket.id,
    });

    // Update DB presence
    await User.findByIdAndUpdate(user.userId, {
      isOnline: true,
      lastSeen: new Date(),
    });

    // Broadcast online status to all users in any shared conversations
    socket.broadcast.emit('user:online', { userId: user.userId });

    console.log(`🟢 ${user.username} connected (${socket.id})`);

    // ── Join Conversation Room ─────────────────────────────────────────────
    socket.on('conversation:join', (conversationId: string) => {
      socket.join(`conv:${conversationId}`);
      console.log(`${user.username} joined room conv:${conversationId}`);
    });

    socket.on('conversation:leave', (conversationId: string) => {
      socket.leave(`conv:${conversationId}`);
    });

    // ── Send Encrypted Message ─────────────────────────────────────────────
    socket.on(
      'message:send',
      async (payload: {
        conversationId: string;
        receiverId: string;
        encryptedPayload: { type: number; body: string; registrationId?: number };
        sessionId: string;
        messageType?: string;
        media?: {
          url: string;
          encryptedKey: string;
          iv: string;
          mimeType: string;
          fileName: string;
          fileSize: number;
        };
        tempId: string; // client-side temp id for optimistic UI
      }) => {
        try {
          const {
            conversationId,
            receiverId,
            encryptedPayload,
            sessionId,
            messageType = 'text',
            media,
            tempId,
          } = payload;

          // Save message (encrypted — never touch plaintext)
          const message = await Message.create({
            conversationId,
            sender: user.userId,
            receiver: receiverId,
            encryptedPayload,
            sessionId,
            messageType,
            media: media || null,
            status: 'sent',
            sentAt: new Date(),
          });

          // Update conversation last message
          await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: message._id,
            lastMessageAt: new Date(),
            $inc: { [`unreadCount.${receiverId}`]: 1 },
          });

          const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'username avatar')
            .lean();

          // Emit to sender for confirmation + tempId resolution
          socket.emit('message:sent', {
            ...populatedMessage,
            tempId,
          });

          // Emit to receiver if online
          const receiverSocketId = getUserSocketId(receiverId);
          if (receiverSocketId) {
            io.to(receiverSocketId).emit('message:receive', populatedMessage);

            // Auto-mark as delivered if receiver is online
            await Message.findByIdAndUpdate(message._id, {
              status: 'delivered',
              deliveredAt: new Date(),
            });

            io.to(receiverSocketId).emit('message:delivered', {
              messageId: message._id,
              conversationId,
            });

            // Notify sender of delivery
            socket.emit('message:status', {
              messageId: message._id,
              status: 'delivered',
            });
          }

          // Emit to conversation room (for group support later)
          socket
            .to(`conv:${conversationId}`)
            .emit('conversation:updated', { conversationId, lastMessageAt: new Date() });
        } catch (err) {
          console.error('message:send error:', err);
          socket.emit('message:error', {
            tempId: payload.tempId,
            error: 'Failed to send message',
          });
        }
      }
    );

    // ── Message Seen ───────────────────────────────────────────────────────
    socket.on(
      'message:seen',
      async (payload: { conversationId: string; senderId: string }) => {
        const { conversationId, senderId } = payload;

        await Message.updateMany(
          {
            conversationId,
            receiver: user.userId,
            status: { $in: ['sent', 'delivered'] },
          },
          { $set: { status: 'seen', seenAt: new Date() } }
        );

        await Conversation.updateOne(
          { _id: conversationId },
          { $set: { [`unreadCount.${user.userId}`]: 0 } }
        );

        const senderSocketId = getUserSocketId(senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit('message:status', {
            conversationId,
            status: 'seen',
            seenBy: user.userId,
          });
        }
      }
    );

    // ── Typing Indicators ──────────────────────────────────────────────────
    socket.on(
      'typing:start',
      (payload: { conversationId: string; receiverId: string }) => {
        const receiverSocketId = getUserSocketId(payload.receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('typing:start', {
            conversationId: payload.conversationId,
            userId: user.userId,
            username: user.username,
          });
        }
      }
    );

    socket.on(
      'typing:stop',
      (payload: { conversationId: string; receiverId: string }) => {
        const receiverSocketId = getUserSocketId(payload.receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('typing:stop', {
            conversationId: payload.conversationId,
            userId: user.userId,
          });
        }
      }
    );

    // ── Active Conversation Tracking ───────────────────────────────────────
    socket.on('presence:active', async (conversationId: string) => {
      await User.findByIdAndUpdate(user.userId, {
        activeConversation: conversationId,
      });
    });

    socket.on('presence:idle', async () => {
      await User.findByIdAndUpdate(user.userId, {
        activeConversation: null,
      });
    });

    // ── Signal Protocol Key Exchange ───────────────────────────────────────
    socket.on(
      'signal:prekey-bundle-request',
      async (payload: { targetUserId: string }) => {
        const targetSocketId = getUserSocketId(payload.targetUserId);
        if (targetSocketId) {
          io.to(targetSocketId).emit('signal:session-init', {
            fromUserId: user.userId,
            fromUsername: user.username,
          });
        }
      }
    );

    // ── Disconnect ─────────────────────────────────────────────────────────
    socket.on('disconnect', async (reason) => {
      onlineUsers.delete(user.userId);

      const lastSeen = new Date();
      await User.findByIdAndUpdate(user.userId, {
        isOnline: false,
        lastSeen,
        activeConversation: null,
      });

      socket.broadcast.emit('user:offline', {
        userId: user.userId,
        lastSeen,
      });

      console.log(`🔴 ${user.username} disconnected: ${reason}`);
    });
  });

  return io;
};

export const getOnlineUsers = (): string[] => Array.from(onlineUsers.keys());
