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
    const existing = await Payment.findOne({ serviceType, serviceId: service._id, status: 'PENDING' }).sort({ createdAt: -1 });
    if (existing) {
      if (existing.authorizationUrl) {
        return response.status(200).json({ payment: existing, authorizationUrl: existing.authorizationUrl, accessCode: null });
      }

      const retryReference = `RYDA-${serviceType}-${crypto.randomUUID()}`;
      const retryPaystack = await initializePaystackTransaction({
        email,
        amountKobo: ngnToKobo(amounts.grossAmount),
        reference: retryReference,
        metadata: { serviceType, serviceId: String(service._id), userId: String(request.user.id) },
        callbackUrl
      });
      existing.reference = retryPaystack.reference || retryReference;
      existing.authorizationUrl = retryPaystack.authorization_url || '';
      await existing.save();
      return response.status(200).json({ payment: existing, authorizationUrl: retryPaystack.authorization_url, accessCode: retryPaystack.access_code });
    }

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
    const payment = await Payment.findOne({ reference, userId: request.user.id });
    if (!payment) throw new AppError('Payment reference was not found.', 404);
    if (payment.status === 'PAID') {
      const result = await reconcilePaidPayment(payment);
      return response.status(200).json({ payment: result.payment, earning: result.earning, alreadyVerified: true });
    }

    const paystack = await verifyPaystackTransaction(reference);
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
