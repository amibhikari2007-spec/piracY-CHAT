import mongoose, { Document, Schema } from 'mongoose';

export interface IConversation extends Document {
  _id: mongoose.Types.ObjectId;
  participants: mongoose.Types.ObjectId[];
  lastMessage?: mongoose.Types.ObjectId;
  lastMessageAt?: Date;
  unreadCount: Map<string, number>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    lastMessageAt: { type: Date, default: null },
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ lastMessageAt: -1 });

export const Conversation = mongoose.model<IConversation>(
  'Conversation',
  ConversationSchema
);
