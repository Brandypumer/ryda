import mongoose from 'mongoose';

import AppError from '../../../shared/utils/AppError.js';
import Payment from '../../payments/models/Payment.js';
import { waiveServicePlatformFeeLiability } from '../../payments/services/liabilityService.js';
import { creditCompletedPayment } from '../../payments/services/paymentService.js';
import { assertNoActiveAssignment } from '../../../shared/services/activeAssignmentService.js';
import { Ride } from '../models/Ride.js';
import { assertDriverEligible } from '../services/driverEligibility.js';
import { assertValidRideTransition, operationalTimestamps } from '../services/rideStatusMachine.js';
import { emitRideDriverProposed, emitRideStatusUpdate } from '../sockets/rideTrackingSocket.js';

export async function acceptRide(request, response, next) {
  try {
    const { id } = request.params;

    if (!mongoose.isValidObjectId(id)) {
      throw new AppError('Ride not found.', 404);
    }

    const requestedRide = await Ride.findOne({ _id: id, status: 'REQUESTED', driverId: null }).select('paymentStatus proposedDriverId requestExpiresAt');
    if (!requestedRide) {
      throw new AppError('This ride is no longer available to accept.', 409);
    }
    if (requestedRide.paymentStatus !== 'PAID') {
      throw new AppError('Ride payment has not been completed.', 409);
    }
    if (!requestedRide.requestExpiresAt || requestedRide.requestExpiresAt <= new Date()) {
      throw new AppError('This ride request has expired.', 409);
    }

    await assertDriverEligible(request.user.id);
    await assertNoActiveAssignment(request.user.id, 'RIDE');

    if (requestedRide.proposedDriverId && requestedRide.proposedDriverId.toString() !== request.user.id) {
      throw new AppError('Another driver is currently awaiting rider confirmation.', 409);
    }

    const ride = await Ride.findOneAndUpdate(
      { _id: id, status: 'REQUESTED', paymentStatus: 'PAID', driverId: null, proposedDriverId: { $in: [null, request.user.id] } },
      { $set: { proposedDriverId: request.user.id, driverProposedAt: new Date() } },
      { new: true, runValidators: true }
    ).populate('proposedDriverId', 'fullName role');

    if (!ride) {
      throw new AppError('This ride is no longer available to offer.', 409);
    }
    emitRideDriverProposed(ride, ride.proposedDriverId);
    return response.status(200).json({ ride });
  } catch (error) {
    return next(error);
  }
}

export async function updateRideStatus(request, response, next) {
  try {
    const { id } = request.params;
    const { status } = request.body;

    if (!mongoose.isValidObjectId(id)) {
      throw new AppError('Ride not found.', 404);
    }

    if (typeof status !== 'string') {
      throw new AppError('A target ride status is required.', 400);
    }

    const ride = await Ride.findById(id).select('driverId status paymentStatus');
    if (!ride) {
      throw new AppError('Ride not found.', 404);
    }

    if (!ride.driverId || ride.driverId.toString() !== request.user.id) {
      throw new AppError('Only the assigned driver can update this ride.', 403);
    }

    if (ride.status === status && ['CANCELLED', 'NO_SHOW'].includes(status)) {
      if (ride.paymentStatus !== 'PAID') {
        await waiveServicePlatformFeeLiability({
          driverId: request.user.id,
          serviceType: 'RIDE',
          serviceId: id,
          reason: `Ride ${status.toLowerCase()}.`
        });
      }
      return response.status(200).json({ ride, earning: { credited: false } });
    }

    if (ride.status === 'COMPLETED' && status === 'COMPLETED') {
      const payment = await Payment.findOne({ serviceType: 'RIDE', serviceId: id, status: 'PAID' });
      const earning = payment ? await creditCompletedPayment(payment._id) : { credited: false };
      return response.status(200).json({ ride, earning });
    }

    assertValidRideTransition(ride.status, status);

    const updatedRide = await Ride.findOneAndUpdate(
      { _id: id, driverId: request.user.id, status: ride.status },
      { $set: { status, ...operationalTimestamps(status, new Date()) } },
      { new: true, runValidators: true }
    );

    if (!updatedRide) {
      throw new AppError('Ride status changed before your update could be applied. Please refresh and try again.', 409);
    }

    emitRideStatusUpdate(updatedRide);

    if (status === 'CANCELLED' || status === 'NO_SHOW') {
      if (updatedRide.paymentStatus !== 'PAID') {
        try {
          await waiveServicePlatformFeeLiability({
            driverId: request.user.id,
            serviceType: 'RIDE',
            serviceId: updatedRide._id,
            reason: `Ride ${status.toLowerCase()}.`
          });
        } catch (error) {
          return next(new AppError('Ride status was updated, but its platform-fee liability waiver could not be recorded.', 503));
        }
      }
    }

    let earning = { credited: false };
    if (status === 'COMPLETED') {
      const payment = await Payment.findOne({ serviceType: 'RIDE', serviceId: updatedRide._id, status: 'PAID' });
      if (payment) {
        try {
          earning = await creditCompletedPayment(payment._id);
        } catch (error) {
          return next(new AppError('Ride completed, but wallet credit could not be applied. Retry the completed status request to reconcile it.', 503));
        }
      }
    }

    return response.status(200).json({ ride: updatedRide, earning });
  } catch (error) {
    return next(error);
  }
}
