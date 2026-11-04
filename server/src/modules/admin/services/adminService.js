import mongoose from 'mongoose';
import AppError from '../../../shared/utils/AppError.js';
import DriverWallet from '../../payments/models/DriverWallet.js';
import WithdrawalRequest from '../../payments/models/WithdrawalRequest.js';

const MODEL_NAMES = {
  User: 'User',
  DriverProfile: 'DriverProfile',
  Ride: 'Ride',
  CourierDelivery: 'CourierDelivery',
  Payment: 'Payment',
  PlatformFeeLiability: 'PlatformFeeLiability'
};

const ACTIVE_RIDE_STATUSES = ['ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'IN_PROGRESS'];
const ACTIVE_COURIER_STATUSES = ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'];

function getModel(name) {
  try {
    return mongoose.model(MODEL_NAMES[name] || name);
  } catch (_error) {
    throw new AppError(`${name} model is not available. Complete the related feature integration first.`, 503);
  }
}

export function getModelIfRegistered(name) {
  return mongoose.models[MODEL_NAMES[name] || name] || null;
}

function toObjectId(value, fieldName) {
  if (!mongoose.isValidObjectId(value)) throw new AppError(`${fieldName} is invalid.`, 400);
  return new mongoose.Types.ObjectId(value);
}

export async function listUsers() {
  const User = getModel('User');
  return User.find({}).select('-passwordHash').sort({ createdAt: -1 });
}

export async function listDrivers() {
  const DriverProfile = getModel('DriverProfile');
  return DriverProfile.find({}).populate('userId', '-passwordHash').sort({ createdAt: -1 });
}

export async function updateDriverVerification(driverId, verificationStatus) {
  if (!['APPROVED', 'REJECTED'].includes(verificationStatus)) {
    throw new AppError('verificationStatus must be APPROVED or REJECTED.', 400);
  }

  const DriverProfile = getModel('DriverProfile');
  const id = toObjectId(driverId, 'driverId');
  const driver = await DriverProfile.findOneAndUpdate(
    { $or: [{ _id: id }, { userId: id }] },
    { $set: { verificationStatus } },
    { new: true }
  );

  if (!driver) throw new AppError('Driver profile was not found.', 404);
  return driver;
}

export async function updateDriverSuspension(driverId, isSuspended) {
  if (typeof isSuspended !== 'boolean') throw new AppError('isSuspended must be boolean.', 400);

  const DriverProfile = getModel('DriverProfile');
  const id = toObjectId(driverId, 'driverId');
  const driver = await DriverProfile.findOne({ $or: [{ _id: id }, { userId: id }] });

  if (!driver) throw new AppError('Driver profile was not found.', 404);
  await updateUserSuspension(driver.userId, isSuspended);
  return DriverProfile.findById(driver._id);
}

export async function updateUserSuspension(userId, isSuspended) {
  if (typeof isSuspended !== 'boolean') throw new AppError('suspended must be boolean.', 400);
  const User = getModel('User');
  const id = toObjectId(userId, 'userId');
  const user = await User.findById(id).select('role isSuspended');
  if (!user) throw new AppError('User was not found.', 404);
  if (user.role === 'ADMIN') throw new AppError('Admin accounts cannot be suspended by this action.', 403);

  if (isSuspended) {
    const Ride = getModelIfRegistered('Ride');
    const CourierDelivery = getModelIfRegistered('CourierDelivery');
    const [rideAssignment, courierAssignment] = await Promise.all([
      Ride?.exists({ $or: [{ riderId: id }, { driverId: id }], status: { $in: ACTIVE_RIDE_STATUSES } }),
      CourierDelivery?.exists({ $or: [{ senderId: id }, { driverId: id }], status: { $in: ACTIVE_COURIER_STATUSES } })
    ]);
    if (rideAssignment || courierAssignment) {
      throw new AppError('User has an active assignment. Complete or cancel it before suspension.', 409);
    }
  }

  const updated = await User.findOneAndUpdate(
    { _id: id, role: { $in: ['RIDER', 'DRIVER'] } },
    { $set: { isSuspended } },
    { new: true, runValidators: true }
  ).select('-passwordHash');
  if (!updated) throw new AppError('Only Rider or Driver accounts may be suspended.', 403);

  if (updated.role === 'DRIVER') {
    const DriverProfile = getModelIfRegistered('DriverProfile');
    if (DriverProfile) await DriverProfile.updateOne({ userId: id }, { $set: { isSuspended } });
  }
  return updated;
}

export async function getDashboardSummary() {
  const count = async (name) => {
    const Model = getModelIfRegistered(name);
    return Model ? Model.countDocuments() : 0;
  };

  const [users, drivers, rides, courierDeliveries, payments, liabilities, withdrawals] = await Promise.all([
    count('User'),
    count('DriverProfile'),
    count('Ride'),
    count('CourierDelivery'),
    count('Payment'),
    count('PlatformFeeLiability'),
    WithdrawalRequest.countDocuments()
  ]);

  const [pendingDrivers, overdueLiabilities, pendingWithdrawals] = await Promise.all([
    getModelIfRegistered('DriverProfile')?.countDocuments({ verificationStatus: 'PENDING' }) || 0,
    getModelIfRegistered('PlatformFeeLiability')?.countDocuments({ status: 'OVERDUE' }) || 0,
    WithdrawalRequest.countDocuments({ status: 'PENDING' })
  ]);

  return {
    totals: { users, drivers, rides, courierDeliveries, payments, liabilities, withdrawals },
    pendingDrivers,
    overdueLiabilities,
    pendingWithdrawals
  };
}

export async function listRecords(name, sort = { createdAt: -1 }) {
  const Model = getModel(name);
  return Model.find({}).sort(sort);
}

export async function listWithdrawals() {
  return WithdrawalRequest.find({}).populate('driverId', 'fullName email phone').sort({ requestedAt: -1 });
}

export async function reviewWithdrawal(withdrawalId, nextStatus, adminId, adminNote) {
  if (!['APPROVED', 'REJECTED', 'PAID'].includes(nextStatus)) {
    throw new AppError('status must be APPROVED, REJECTED, or PAID.', 400);
  }

  const id = toObjectId(withdrawalId, 'withdrawalId');
  const session = await mongoose.startSession();
  try {
    let withdrawal;
    await session.withTransaction(async () => {
      withdrawal = await WithdrawalRequest.findById(id).session(session);
      if (!withdrawal) throw new AppError('Withdrawal request was not found.', 404);
      if (withdrawal.status === nextStatus) return;
      if (withdrawal.status === 'REJECTED' || withdrawal.status === 'PAID') {
        throw new AppError(`A ${withdrawal.status} withdrawal cannot be changed.`, 409);
      }
      if (withdrawal.status === 'PENDING' && nextStatus === 'PAID') {
        throw new AppError('Approve the withdrawal before marking it PAID.', 409);
      }

      const wallet = nextStatus === 'APPROVED'
        ? await DriverWallet.findOne({
          driverId: withdrawal.driverId,
          pendingBalance: { $gte: withdrawal.amount }
        }).session(session)
        : await DriverWallet.findOneAndUpdate(
          { driverId: withdrawal.driverId, pendingBalance: { $gte: withdrawal.amount } },
          nextStatus === 'REJECTED'
            ? { $inc: { pendingBalance: -withdrawal.amount, availableBalance: withdrawal.amount } }
            : { $inc: { pendingBalance: -withdrawal.amount, totalWithdrawn: withdrawal.amount } },
          { new: true, session }
        );

      if (!wallet) throw new AppError('Wallet reservation is missing or insufficient for this withdrawal.', 409);

      withdrawal.status = nextStatus;
      withdrawal.adminNote = typeof adminNote === 'string' ? adminNote.trim() : withdrawal.adminNote;
      withdrawal.reviewedAt = new Date();
      withdrawal.reviewedBy = adminId;
      await withdrawal.save({ session });
    });

    return withdrawal;
  } finally {
    await session.endSession();
  }
}
