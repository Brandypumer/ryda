import mongoose from 'mongoose';
import AppError from '../../../shared/utils/AppError.js';
import { RYDA_CONFIG } from '../../../shared/constants/rydaConfig.js';
import PlatformFeeLiability from '../models/PlatformFeeLiability.js';
import Payment from '../models/Payment.js';

const SERVICE_CONFIG = {
  RIDE: { modelName: 'Ride', cancelStatuses: ['CANCELLED', 'NO_SHOW'] },
  COURIER: { modelName: 'CourierDelivery', cancelStatuses: ['CANCELLED', 'NO_SHOW'] }
};

function getServiceConfig(serviceType) {
  const config = SERVICE_CONFIG[serviceType];
  if (!config) throw new AppError('serviceType must be RIDE or COURIER.', 400);
  return config;
}

function getServiceModel(serviceType) {
  const { modelName } = getServiceConfig(serviceType);
  try {
    return mongoose.model(modelName);
  } catch (_error) {
    return null;
  }
}

function toObjectId(value, fieldName) {
  if (!mongoose.isValidObjectId(value)) throw new AppError(`${fieldName} is invalid.`, 400);
  return new mongoose.Types.ObjectId(value);
}

export async function ensurePlatformFeeLiability({ driverId, serviceType, serviceId, amount, dueAt }) {
  const driverObjectId = toObjectId(driverId, 'driverId');
  const serviceObjectId = toObjectId(serviceId, 'serviceId');
  getServiceConfig(serviceType);

  if (!Number.isFinite(amount) || amount <= 0) throw new AppError('Liability amount must be positive.', 400);
  if (!(dueAt instanceof Date) || Number.isNaN(dueAt.getTime())) throw new AppError('dueAt is invalid.', 400);

  const paidPayment = await Payment.exists({ serviceType, serviceId: serviceObjectId, status: 'PAID' });
  const settledAt = paidPayment ? new Date() : undefined;

  return PlatformFeeLiability.findOneAndUpdate(
    { serviceType, serviceId: serviceObjectId },
    {
      $setOnInsert: {
        driverId: driverObjectId,
        serviceType,
        serviceId: serviceObjectId,
        amount,
        status: paidPayment ? 'SETTLED' : 'PENDING',
        dueAt,
        ...(settledAt ? { settledAt } : {})
      }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

export function ensureServicePlatformFeeLiability({ serviceType, service }) {
  if (!service || !service.driverId || !service._id) {
    throw new AppError('An assigned service is required to create a fee liability.', 400);
  }

  const acceptedAt = service.acceptedAt ? new Date(service.acceptedAt) : new Date();
  const dueAt = new Date(acceptedAt.getTime() + RYDA_CONFIG.PAYMENT_GRACE_PERIOD_MINUTES * 60 * 1000);
  return ensurePlatformFeeLiability({
    driverId: service.driverId,
    serviceType,
    serviceId: service._id,
    amount: service.platformFee,
    dueAt
  });
}

export async function waiveServicePlatformFeeLiability({ driverId, serviceType, serviceId, reason }) {
  const driverObjectId = toObjectId(driverId, 'driverId');
  const serviceObjectId = toObjectId(serviceId, 'serviceId');
  getServiceConfig(serviceType);

  const waived = await PlatformFeeLiability.findOneAndUpdate(
    { driverId: driverObjectId, serviceType, serviceId: serviceObjectId, status: { $in: ['PENDING', 'OVERDUE'] } },
    {
      $set: {
        status: 'WAIVED',
        waivedAt: new Date(),
        reason: typeof reason === 'string' && reason.trim() ? reason.trim() : 'Service cancelled or no-show.'
      }
    },
    { new: true }
  );

  if (waived) return waived;

  return PlatformFeeLiability.findOne({ driverId: driverObjectId, serviceType, serviceId: serviceObjectId });
}

async function reconcileOneLiability(liability, now) {
  if (liability.status !== 'PENDING' || liability.dueAt > now) return liability;

  const paidPayment = await Payment.exists({
    serviceType: liability.serviceType,
    serviceId: liability.serviceId,
    status: 'PAID'
  });
  if (paidPayment) {
    return PlatformFeeLiability.findOneAndUpdate(
      { _id: liability._id, status: 'PENDING' },
      { $set: { status: 'SETTLED', settledAt: now } },
      { new: true }
    );
  }

  const model = getServiceModel(liability.serviceType);
  const service = model ? await model.findById(liability.serviceId).select('status') : null;
  const cancelled = service && getServiceConfig(liability.serviceType).cancelStatuses.includes(service.status);

  if (cancelled) {
    return PlatformFeeLiability.findOneAndUpdate(
      { _id: liability._id, status: 'PENDING' },
      { $set: { status: 'WAIVED', waivedAt: now, reason: `Service ${service.status.toLowerCase()}.` } },
      { new: true }
    );
  }

  return PlatformFeeLiability.findOneAndUpdate(
    { _id: liability._id, status: 'PENDING' },
    { $set: { status: 'OVERDUE' } },
    { new: true }
  );
}

export async function reconcileDriverLiabilities(driverId) {
  const driverObjectId = toObjectId(driverId, 'driverId');
  const liabilities = await PlatformFeeLiability.find({ driverId: driverObjectId });
  const now = new Date();
  return Promise.all(liabilities.map((liability) => reconcileOneLiability(liability, now)));
}

export async function getDriverFinancialEligibility(driverId) {
  const liabilities = (await reconcileDriverLiabilities(driverId)).filter(Boolean);
  const overdue = liabilities.filter((liability) => liability.status === 'OVERDUE');
  const overdueTotal = overdue.reduce((total, liability) => total + liability.amount, 0);

  return {
    driverId,
    overdueTotal,
    isBlocked: overdueTotal > 0,
    liabilities
  };
}
