import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import AppError from '../../../shared/utils/AppError.js';
import User from '../models/User.js';

export async function registerUser({ fullName, email, phone, password, role }) {
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new AppError('An account with this email already exists.', 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  return User.create({ fullName, email, phone, passwordHash, role });
}

export async function authenticateUser({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError('Invalid email or password.', 401);
  }
  if (user.isSuspended) throw new AppError('Your account has been suspended.', 403);

  return user;
}

export async function getUserById(userId) {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  return user;
}

export async function updateUserProfile(userId, updates) {
  const user = await User.findByIdAndUpdate(userId, updates, {
    new: true,
    runValidators: true
  });

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  return user;
}

export function createAccessToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new AppError('JWT configuration is missing.', 500);
  }

  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
}

export function serializeUser(user) {
  const userObject = user.toObject ? user.toObject() : user;
  const { passwordHash, ...safeUser } = userObject;
  return safeUser;
}
