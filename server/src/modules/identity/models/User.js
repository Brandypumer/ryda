import mongoose from 'mongoose';

export const USER_ROLES = ['RIDER', 'DRIVER', 'ADMIN'];

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    role: {
      type: String,
      enum: USER_ROLES,
      default: 'RIDER',
      required: true
    },
    profileImage: {
      type: String,
      default: ''
    },
    isSuspended: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
