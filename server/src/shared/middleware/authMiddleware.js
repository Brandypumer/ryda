import jwt from 'jsonwebtoken';
import AppError from '../utils/AppError.js';
import User from '../../modules/identity/models/User.js';

export async function requireAuth(request, _response, next) {
  const authorization = request.headers.authorization || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new AppError('Authentication is required.', 401));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const userId = payload.id || payload._id || payload.userId;

    if (!userId) {
      return next(new AppError('Token does not contain a user identifier.', 401));
    }

    const user = await User.findById(userId).select('role isSuspended');
    if (!user) return next(new AppError('User account was not found.', 401));
    if (user.isSuspended) return next(new AppError('Your account has been suspended.', 403));
    request.user = { ...payload, id: userId, role: user.role, isSuspended: user.isSuspended };
    return next();
  } catch (_error) {
    return next(new AppError('Invalid or expired token.', 401));
  }
}
