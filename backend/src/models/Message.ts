import mongoose, { Document, Schema } from 'mongoose';

export type MessageStatus = 'sent' | 'delivered' | 'seen';
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file';

export interface IEncryptedPayload {
  type: number;        // Signal Protocol message type (1=whisper, 3=prekey)
  body: string;        // base64 encrypted ciphertext
  registrationId?: number;
}

export interface IMediaAttachment {
  url: string;               // Cloudinary URL (encrypted blob)
  encryptedKey: string;      // AES key encrypted with Signal session
  iv: string;                // Initialization vector (base64)
  mimeType: string;
  fileName: string;
  fileSize: number;
  thumbnailUrl?: string;
}

export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  // E2EE - never store plaintext
  encryptedPayload: IEncryptedPayload;
  sessionId: string;             // Signal session identifier
  messageType: MessageType;
  media?: IMediaAttachment;
  // Delivery tracking
  status: MessageStatus;
  sentAt: Date;
  deliveredAt?: Date;
  seenAt?: Date;
  // Soft delete
  deletedFor: mongoose.Types.ObjectId[];
  deletedForEveryone: boolean;
  // Metadata
  replyTo?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EncryptedPayloadSchema = new Schema<IEncryptedPayload>({
  type: { type: Number, required: true },
  body: { type: String, required: true },
  registrationId: { type: Number },
}, { _id: false });

const MediaAttachmentSchema = new Schema<IMediaAttachment>({
  url: { type: String, required: true },
  encryptedKey: { type: String, required: true },
  iv: { type: String, required: true },
  mimeType: { type: String, required: true },
  fileName: { type: String, required: true },
  fileSize: { type: Number, required: true },
  thumbnailUrl: { type: String },
}, { _id: false });

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    encryptedPayload: {
      type: EncryptedPayloadSchema,
      required: true,
    },
    sessionId: {
      type: String,
      required: true,
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'video', 'audio', 'file'],
      default: 'text',
    },
    media: {
      type: MediaAttachmentSchema,
      default: null,
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'seen'],
      default: 'sent',
    },
    sentAt: { type: Date, default: Date.now },
    deliveredAt: { type: Date, default: null },
    seenAt: { type: Date, default: null },
    deletedFor: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    deletedForEveryone: { type: Boolean, default: false },
    replyTo: { type: Schema.Types.ObjectId, ref: 'Message', default: null },
  },
  { timestamps: true }
);

// Compound indexes for efficient queries
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
MessageSchema.index({ status: 1, receiver: 1 });
MessageSchema.index({ conversationId: 1, status: 1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
