import crypto from 'node:crypto';
import AppError from '../../../shared/utils/AppError.js';
import Payment from '../models/Payment.js';
import { initializePaystackTransaction, verifyPaystackTransaction } from '../services/paystackService.js';
import { getDriverFinancialEligibility } from '../services/liabilityService.js';
import PlatformFeeLiability from '../models/PlatformFeeLiability.js';
import { ngnToKobo } from '../services/paymentService.js';
import User from '../../identity/models/User.js';

const FAILED_PROVIDER_STATUSES = new Set(['failed', 'abandoned']);

export async function listDriverLiabilities(request, response, next) {
  try {
    const eligibility = await getDriverFinancialEligibility(request.user.id);
    return response.status(200).json(eligibility);
  } catch (error) {
    return next(error);
  }
}

export async function settleDriverLiability(request, response, next) {
  try {
    const { liabilityId, reference } = request.body;
    const eligibility = await getDriverFinancialEligibility(request.user.id);
    const liability = eligibility.liabilities.find((item) => String(item._id) === String(liabilityId));

    if (!liability) throw new AppError('Liability was not found for this driver.', 404);
    if (liability.status === 'SETTLED' && reference) {
      const settledPayment = await Payment.findOne({
        reference,
        userId: request.user.id,
        driverId: request.user.id,
        serviceType: 'FEE_SETTLEMENT',
        serviceId: liability.serviceId,
        status: 'PAID'
      });
      if (settledPayment) {
        return response.status(200).json({
          payment: settledPayment,
          liability,
          eligibility
        });
      }
    }
    if (liability.status === 'SETTLED') {
      return response.status(200).json({ liability, eligibility });
    }
    if (liability.status !== 'OVERDUE') {
      throw new AppError('Only overdue liabilities can be settled.', 409);
    }

    if (!reference) {
      const user = await User.findById(request.user.id).select('email role');
      const payerEmail = user?.email?.trim();
      if (user?.role !== 'DRIVER' || !payerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payerEmail)) {
        throw new AppError('Your RYDA account must have a valid email before settling a platform fee.', 400);
      }

      const existingPayment = await Payment.findOne({
        userId: request.user.id,
        driverId: request.user.id,
        serviceType: 'FEE_SETTLEMENT',
        serviceId: liability.serviceId,
        status: 'PENDING'
      }).sort({ createdAt: -1 });
      if (existingPayment) {
        const existingTransaction = await verifyPaystackTransaction(existingPayment.reference);
        if (existingTransaction.status === 'success') {
          return settleDriverLiability({ ...request, body: { liabilityId, reference: existingPayment.reference } }, response, next);
        }
        if (!FAILED_PROVIDER_STATUSES.has(existingTransaction.status)) {
          return response.status(200).json({ payment: existingPayment, liability, authorizationUrl: existingPayment.authorizationUrl || null, accessCode: null });
        }
        await Payment.updateOne({ _id: existingPayment._id, status: 'PENDING' }, { $set: { status: 'FAILED', authorizationUrl: '' } });
      }

      const paymentReference = `RYDA-FEE-${crypto.randomUUID()}`;
      const paystack = await initializePaystackTransaction({
        email: payerEmail,
        amountKobo: ngnToKobo(liability.amount),
        reference: paymentReference,
        metadata: {
          serviceType: 'FEE_SETTLEMENT',
          serviceId: String(liability.serviceId),
          liabilityId: String(liability._id),
          driverId: String(request.user.id)
        }
      });

      const payment = await Payment.create({
        userId: request.user.id,
        driverId: request.user.id,
        serviceType: 'FEE_SETTLEMENT',
        serviceId: liability.serviceId,
        reference: paystack.reference || paymentReference,
        grossAmount: liability.amount,
        platformFee: liability.amount,
        driverNet: 0,
        status: 'PENDING',
        provider: 'PAYSTACK'
      });

      return response.status(201).json({
        payment,
        liability,
        authorizationUrl: paystack.authorization_url,
        accessCode: paystack.access_code
      });
    }

    const payment = await Payment.findOne({
      reference,
      userId: request.user.id,
      driverId: request.user.id,
      serviceType: 'FEE_SETTLEMENT',
      serviceId: liability.serviceId
    });
    if (!payment) throw new AppError('Fee settlement payment was not found.', 404);

    if (payment.status !== 'PAID') {
      const paystack = await verifyPaystackTransaction(reference);
      if (paystack.status !== 'success' || paystack.reference !== payment.reference) {
        throw new AppError('Paystack has not verified this fee settlement.', 409);
      }
      const expectedKobo = ngnToKobo(liability.amount);
      const requestedAmount = Number(paystack.requested_amount);
      const verifiedAmount = Number.isFinite(requestedAmount) ? requestedAmount : Number(paystack.amount);
      if (verifiedAmount !== expectedKobo || String(paystack.currency || '').trim().toUpperCase() !== 'NGN') {
        throw new AppError('The verified fee settlement amount does not match the liability.', 400);
      }

      await Payment.findOneAndUpdate(
        { _id: payment._id, status: { $ne: 'PAID' } },
        { $set: { status: 'PAID', paidAt: new Date() } },
        { new: true }
      );
    }

    const settled = await PlatformFeeLiability.findOneAndUpdate(
      { _id: liability._id, driverId: request.user.id, status: { $in: ['PENDING', 'OVERDUE'] } },
      { $set: { status: 'SETTLED', settledAt: new Date() } },
      { new: true }
    );

    return response.status(200).json({
      payment: await Payment.findById(payment._id),
      liability: settled || await PlatformFeeLiability.findById(liability._id),
      eligibility: await getDriverFinancialEligibility(request.user.id)
    });
  } catch (error) {
    return next(error);
  }
}
