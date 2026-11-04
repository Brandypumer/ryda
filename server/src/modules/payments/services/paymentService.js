import mongoose from 'mongoose';
import AppError from '../../../shared/utils/AppError.js';
import PlatformFeeLiability from '../models/PlatformFeeLiability.js';
import Payment from '../models/Payment.js';
import { creditDriverEarningOnce } from './ledgerService.js';
import { RYDA_CONFIG } from '../../../shared/constants/rydaConfig.js';

const SERVICE_CONFIG = {
  RIDE: { modelName: 'Ride', ownerField: 'riderId', completedStatuses: ['COMPLETED'] },
  COURIER: { modelName: 'CourierDelivery', ownerField: 'senderId', completedStatuses: ['DELIVERED'] }
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
    throw new AppError(`${modelName} model is not available. Integrate the service module before taking payments.`, 503);
  }
}

function toObjectId(value, fieldName) {
  if (!mongoose.isValidObjectId(value)) throw new AppError(`${fieldName} is invalid.`, 400);
  return new mongoose.Types.ObjectId(value);
}

export async function getOwnedService({ serviceType, serviceId, userId }) {
  const config = getServiceConfig(serviceType);
  const model = getServiceModel(serviceType);
  const id = toObjectId(serviceId, 'serviceId');
  const ownerId = toObjectId(userId, 'userId');
  const service = await model.findOne({ _id: id, [config.ownerField]: ownerId });

  if (!service) throw new AppError('Service was not found or does not belong to this account.', 404);
  if (serviceType === 'COURIER' && !service.driverId) {
    throw new AppError('The service must have an assigned driver before payment.', 409);
  }
  if (!Number.isFinite(service.grossFare) || service.grossFare <= 0) {
    throw new AppError('The service does not have a valid server-calculated fare.', 409);
  }

  return { service, model, config };
}

export function getPaymentAmounts(service) {
  const amounts = {
    grossAmount: service.grossFare,
    platformFee: service.platformFee,
    driverNet: service.driverNet
  };

  if (Object.values(amounts).some((amount) => !Number.isFinite(amount) || amount < 0)) {
    throw new AppError('The service has incomplete server-calculated payment amounts.', 409);
  }

  return amounts;
}

export async function settlePayment(payment, paystackData) {
  const amountKobo = Math.round(payment.grossAmount * 100);
  if (
    !paystackData ||
    paystackData.reference && paystackData.reference !== payment.reference ||
    paystackData.amount !== amountKobo ||
    paystackData.currency && paystackData.currency !== 'NGN'
  ) {
    throw new AppError('The verified Paystack amount does not match this service.', 400);
  }

  const paidPayment = await Payment.findOneAndUpdate(
    { _id: payment._id, status: { $ne: 'PAID' } },
    { $set: { status: 'PAID', paidAt: new Date() } },
    { new: true }
  ) || await Payment.findById(payment._id);

  const config = getServiceConfig(paidPayment.serviceType);
  const model = getServiceModel(paidPayment.serviceType);

  await model.updateOne(
    { _id: paidPayment.serviceId },
    {
      $set: {
        paymentStatus: 'PAID',
        ...(paidPayment.serviceType === 'RIDE'
          ? { requestExpiresAt: new Date(Date.now() + RYDA_CONFIG.RIDE_REQUEST_EXPIRY_MINUTES * 60 * 1000) }
          : {})
      }
    }
  );

  await PlatformFeeLiability.findOneAndUpdate(
    { serviceType: paidPayment.serviceType, serviceId: paidPayment.serviceId, status: { $in: ['PENDING', 'OVERDUE'] } },
    { $set: { status: 'SETTLED', settledAt: new Date() } },
    { new: true }
  );

  const service = await model.findById(paidPayment.serviceId).select('status');
  let earning = { credited: false };
  if (service && config.completedStatuses.includes(service.status)) {
    earning = await creditDriverEarningOnce(paidPayment._id);
  }

  return { payment: paidPayment, earning };
}

export async function creditCompletedPayment(paymentId) {
  const payment = await Payment.findOne({ _id: paymentId, status: 'PAID' });
  if (!payment) return { credited: false };

  const config = getServiceConfig(payment.serviceType);
  const model = getServiceModel(payment.serviceType);
  const service = await model.findById(payment.serviceId).select('status');
  if (!service || !config.completedStatuses.includes(service.status)) return { credited: false };

  return creditDriverEarningOnce(payment._id);
}
