import crypto from 'node:crypto';
import AppError from '../../../shared/utils/AppError.js';
import Payment from '../models/Payment.js';
import { initializePaystackTransaction, verifyPaystackTransaction } from '../services/paystackService.js';
import { getOwnedService, getPaymentAmounts, ngnToKobo, reconcilePaidPayment, settlePayment } from '../services/paymentService.js';
import User from '../../identity/models/User.js';
import { getClientOrigin } from '../../../shared/config/clientOrigin.js';

function normalizeServiceType(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

const FAILED_PROVIDER_STATUSES = new Set(['failed', 'abandoned']);

async function inspectRidePaymentAttempt(payment) {
  const transaction = await verifyPaystackTransaction(payment.reference);
  // Safe provider diagnostics only: never log credentials or payment instrument data.
  console.info('Paystack payment verification', {
    status: transaction.status,
    reference: transaction.reference,
    amount: transaction.amount,
    requested_amount: transaction.requested_amount,
    currency: transaction.currency
  });
  if (transaction.reference !== payment.reference) throw new AppError('The verified Paystack reference does not match this payment.', 400);
  if (FAILED_PROVIDER_STATUSES.has(transaction.status)) {
    payment = await Payment.findOneAndUpdate(
      { _id: payment._id, status: { $in: ['PENDING', 'FAILED'] } },
      { $set: { status: 'FAILED', authorizationUrl: '' } },
      { new: true }
    ) || await Payment.findById(payment._id);
    if (!payment) throw new AppError('Payment reference was not found.', 404);
  }
  return { payment, transaction };
}

function sendUnpaidPayment(response, { payment, transaction }) {
  const retryAllowed = FAILED_PROVIDER_STATUSES.has(transaction.status);
  return response.status(409).json({
    payment,
    paymentStatus: payment.status,
    providerStatus: transaction.status,
    retryAllowed,
    message: retryAllowed
      ? 'Payment was not completed. Retry payment.'
      : 'Payment is not confirmed yet. Finish checkout or verify again.'
  });
}

export async function initializePayment(request, response, next) {
  try {
    const serviceType = normalizeServiceType(request.body.serviceType);
    const { serviceId } = request.body;
    const user = await User.findById(request.user.id).select('email');
    const email = user?.email;
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      throw new AppError('Your account must have a valid email before starting payment.', 400);
    }

    const { service } = await getOwnedService({ serviceType, serviceId, userId: request.user.id });
    const callbackUrl = `${getClientOrigin()}/rides`;
    const paidPayment = await Payment.findOne({ serviceType, serviceId: service._id, userId: request.user.id, status: 'PAID' }).sort({ paidAt: -1, createdAt: -1 });
    if (paidPayment) {
      const result = await reconcilePaidPayment(paidPayment);
      return response.status(200).json({ payment: result.payment, authorizationUrl: null, accessCode: null, alreadyVerified: true });
    }
    if (service.paymentStatus === 'PAID') throw new AppError('This service has already been paid.', 409);
    const amounts = getPaymentAmounts(service);
    const attempts = await Payment.find({ serviceType, serviceId: service._id, userId: request.user.id, status: serviceType === 'RIDE' ? { $in: ['PENDING', 'FAILED'] } : 'PENDING' }).sort({ createdAt: -1 });
    let reusablePayment = null;
    let unresolvedAttempt = null;
    for (const existing of attempts) {
      // Checkout may have succeeded even if the browser never returned to Ryda.
      const inspection = serviceType === 'RIDE'
        ? await inspectRidePaymentAttempt(existing)
        : { payment: existing, transaction: await verifyPaystackTransaction(existing.reference) };
      const { payment, transaction } = inspection;
      if (payment.status === 'PAID') {
        const result = await reconcilePaidPayment(payment);
        return response.status(200).json({ payment: result.payment, authorizationUrl: null, accessCode: null, alreadyVerified: true });
      }
      if (transaction.status === 'success') {
        const result = await settlePayment(payment, transaction);
        return response.status(200).json({ payment: result.payment, authorizationUrl: null, accessCode: null, alreadyVerified: true });
      }
      if (serviceType === 'RIDE' && FAILED_PROVIDER_STATUSES.has(transaction.status)) continue;
      reusablePayment ||= payment;
      unresolvedAttempt ||= inspection;
    }
    if (reusablePayment?.authorizationUrl) {
      return response.status(200).json({ payment: reusablePayment, authorizationUrl: reusablePayment.authorizationUrl, accessCode: null });
    }
    if (serviceType === 'RIDE' && unresolvedAttempt) return sendUnpaidPayment(response, unresolvedAttempt);
    // Keep previous references verifiable when creating another attempt.

    const reference = `RYDA-${serviceType}-${crypto.randomUUID()}`;
    const paystack = await initializePaystackTransaction({
      email,
      amountKobo: ngnToKobo(amounts.grossAmount),
      reference,
      metadata: { serviceType, serviceId: String(service._id), userId: String(request.user.id) },
      callbackUrl
    });

    const payment = await Payment.create({
      userId: request.user.id,
      driverId: service.driverId,
      serviceType,
      serviceId: service._id,
      reference: paystack.reference || reference,
      ...amounts,
      status: 'PENDING',
      provider: 'PAYSTACK',
      authorizationUrl: paystack.authorization_url || ''
    });

    return response.status(201).json({
      payment,
      authorizationUrl: paystack.authorization_url,
      accessCode: paystack.access_code
    });
  } catch (error) {
    return next(error);
  }
}

export async function verifyPayment(request, response, next) {
  try {
    const { reference } = request.params;
    let payment = await Payment.findOne({ reference, userId: request.user.id });
    if (!payment) throw new AppError('Payment reference was not found.', 404);
    if (payment.status !== 'PAID') {
      payment = await Payment.findOne({
        serviceType: payment.serviceType,
        serviceId: payment.serviceId,
        userId: request.user.id,
        status: 'PAID'
      }) || payment;
    }
    if (payment.status === 'PAID') {
      const result = await reconcilePaidPayment(payment);
      return response.status(200).json({ payment: result.payment, earning: result.earning, alreadyVerified: true });
    }

    let paystack;
    if (payment.serviceType === 'RIDE') {
      const inspection = await inspectRidePaymentAttempt(payment);
      payment = inspection.payment;
      paystack = inspection.transaction;
      if (payment.status === 'PAID') {
        const result = await reconcilePaidPayment(payment);
        return response.status(200).json({ payment: result.payment, earning: result.earning, alreadyVerified: true });
      }
      if (paystack.status !== 'success') return sendUnpaidPayment(response, inspection);
    } else {
      paystack = await verifyPaystackTransaction(reference);
    }
    if (paystack.status !== 'success') throw new AppError('Paystack has not marked this transaction successful.', 409);

    const result = await settlePayment(payment, paystack);
    return response.status(200).json({ payment: result.payment, earning: result.earning, alreadyVerified: false });
  } catch (error) {
    return next(error);
  }
}

export async function listPaymentHistory(request, response, next) {
  try {
    const filter = request.user.role === 'ADMIN' ? {} : { userId: request.user.id };
    const payments = await Payment.find(filter).sort({ createdAt: -1 });
    return response.status(200).json({ payments });
  } catch (error) {
    return next(error);
  }
}
