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

export function ngnToKobo(amountNgn) {
  const amount = Number(amountNgn);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new AppError('Payment amount must be a valid NGN value.', 409);
  }
  return Math.round(amount * 100);
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

export async function reconcilePaidPayment(payment) {
  const config = getServiceConfig(payment.serviceType);
  const model = getServiceModel(payment.serviceType);
  const serviceUpdate = { $set: { paymentStatus: 'PAID' } };

  if (payment.serviceType === 'RIDE') {
    const currentService = await model.findById(payment.serviceId).select('requestExpiresAt');
    if (!currentService?.requestExpiresAt) {
      serviceUpdate.$set.requestExpiresAt = new Date(Date.now() + RYDA_CONFIG.RIDE_REQUEST_EXPIRY_MINUTES * 60 * 1000);
    }
  }

  await model.updateOne({ _id: payment.serviceId }, serviceUpdate);
  await PlatformFeeLiability.findOneAndUpdate(
    { serviceType: payment.serviceType, serviceId: payment.serviceId, status: { $in: ['PENDING', 'OVERDUE'] } },
    { $set: { status: 'SETTLED', settledAt: new Date() } },
    { new: true }
  );

  const service = await model.findById(payment.serviceId).select('status');
  const earning = service && config.completedStatuses.includes(service.status)
    ? await creditDriverEarningOnce(payment._id)
    : { credited: false };

  return { payment: await Payment.findById(payment._id), earning };
}

export async function settlePayment(payment, paystackData) {
  const model = getServiceModel(payment.serviceType);
  const service = await model.findById(payment.serviceId).select('grossFare platformFee driverNet');
  if (!service) throw new AppError('The paid service could not be found.', 404);
  const authoritativeAmounts = getPaymentAmounts(service);
  const amountKobo = ngnToKobo(authoritativeAmounts.grossAmount);
  const requestedAmountKobo = Number(paystackData?.requested_amount);
  const hasRequestedAmount = Number.isFinite(requestedAmountKobo);
  const verifiedAmountKobo = hasRequestedAmount ? requestedAmountKobo : Number(paystackData?.amount);
  if (paystackData?.status !== 'success') throw new AppError('Paystack has not marked this transaction successful.', 409);
  if (paystackData.reference !== payment.reference) throw new AppError('The verified Paystack reference does not match this payment.', 400);
  if (String(paystackData.currency || '').trim().toUpperCase() !== 'NGN') {
    throw new AppError('The verified Paystack currency is not NGN. This payment cannot be applied to the booking.', 400);
  }
  if (!Number.isInteger(verifiedAmountKobo) || verifiedAmountKobo !== amountKobo) {
    const returnedAmount = Number.isFinite(verifiedAmountKobo) ? verifiedAmountKobo : 'an invalid amount of';
    const source = hasRequestedAmount ? 'requested amount' : 'amount';
    throw new AppError(`Paystack returned ${returnedAmount} kobo as its ${source}; this booking requires ${amountKobo} kobo. Payment has not been marked PAID.`, 400);
  }
  if (payment.grossAmount !== authoritativeAmounts.grossAmount) {
    throw new AppError('The payment record does not match the service fare.', 409);
  }

  const paidAt = new Date(paystackData.paid_at || Date.now());
  const paidPayment = await Payment.findOneAndUpdate(
    { _id: payment._id, status: { $ne: 'PAID' } },
    { $set: { status: 'PAID', paidAt: Number.isNaN(paidAt.getTime()) ? new Date() : paidAt } },
    { new: true }
  ) || await Payment.findById(payment._id);

  return reconcilePaidPayment(paidPayment);
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
