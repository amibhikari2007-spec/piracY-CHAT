import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface ISignedPreKey {
  keyId: number;
  publicKey: string; // base64
  signature: string; // base64
}

export interface IPreKey {
  keyId: number;
  publicKey: string; // base64
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  username: string;
  email: string;
  password: string;
  avatar?: string;
  // E2EE fields
  identityKey: string;        // base64 public identity key
  registrationId: number;
  signedPreKey: ISignedPreKey;
  preKeys: IPreKey[];
  // Presence
  isOnline: boolean;
  lastSeen: Date;
  activeConversation?: string;
  // Meta
  createdAt: Date;
  updatedAt: Date;
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const SignedPreKeySchema = new Schema<ISignedPreKey>({
  keyId: { type: Number, required: true },
  publicKey: { type: String, required: true },
  signature: { type: String, required: true },
}, { _id: false });

const PreKeySchema = new Schema<IPreKey>({
  keyId: { type: Number, required: true },
  publicKey: { type: String, required: true },
}, { _id: false });

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username must be at most 30 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    avatar: { type: String, default: null },

    // E2EE Key Bundle
    identityKey: { type: String, default: '' },
    registrationId: { type: Number, default: 0 },
    signedPreKey: { type: SignedPreKeySchema, default: null },
    preKeys: { type: [PreKeySchema], default: [] },

    // Presence
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
    activeConversation: { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.password;
        return ret;
      },
    },
  }
);

// Indexes for performance
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ isOnline: 1 });
UserSchema.index({ lastSeen: -1 });

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>('User', UserSchema);
