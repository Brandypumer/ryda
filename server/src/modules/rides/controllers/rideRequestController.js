import mongoose from 'mongoose';

import AppError from '../../../shared/utils/AppError.js';
import { waiveServicePlatformFeeLiability } from '../../payments/services/liabilityService.js';
import { ensureServicePlatformFeeLiability } from '../../payments/services/liabilityService.js';
import Payment from '../../payments/models/Payment.js';
import { assertNoActiveAssignment } from '../../../shared/services/activeAssignmentService.js';
import { assertDriverEligible } from '../services/driverEligibility.js';
import { assertRideWithinDemoArea } from '../services/rideLocation.js';
import { Ride } from '../models/Ride.js';
import { Review } from '../models/Review.js';
import User from '../../identity/models/User.js';
import DriverProfile from '../../identity/models/DriverProfile.js';
import { emitRideAccepted, emitRideDriverDeclined, emitRideStatusUpdate } from '../sockets/rideTrackingSocket.js';
import { RYDA_CONFIG } from '../../../shared/constants/rydaConfig.js';

const PAYMENT_GRACE_PERIOD_MS = RYDA_CONFIG.PAYMENT_GRACE_PERIOD_MINUTES * 60 * 1000;
const REQUEST_EXPIRY_MS = RYDA_CONFIG.RIDE_REQUEST_EXPIRY_MINUTES * 60 * 1000;

const CANCELLABLE_STATUSES = ['REQUESTED', 'ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED'];

function isValidRideId(id) {
  return mongoose.isValidObjectId(id);
}

export async function createRide(request, response, next) {
  try {
    const { pickup, destination, bookedSeats } = request.body;
    assertRideWithinDemoArea(pickup, destination);
    const ride = await Ride.create({
      riderId: request.user.id,
      pickup,
      destination,
      bookedSeats
    });

    return response.status(201).json({ ride });
  } catch (error) {
    return next(error);
  }
}

export async function getMyRides(request, response, next) {
  try {
    const rides = await Ride.find({ riderId: request.user.id }).populate('proposedDriverId', 'fullName role').sort({ createdAt: -1 });

    return response.status(200).json({ rides });
  } catch (error) {
    return next(error);
  }
}

export async function retrySearch(request, response, next) {
  try {
    const { id } = request.params;
    if (!isValidRideId(id)) throw new AppError('Ride not found.', 404);
    const ride = await Ride.findOneAndUpdate(
      { _id: id, riderId: request.user.id, status: 'REQUESTED', paymentStatus: 'PAID', driverId: null, proposedDriverId: null, requestExpiresAt: { $lte: new Date() } },
      { $set: { requestExpiresAt: new Date(Date.now() + REQUEST_EXPIRY_MS) } },
      { new: true, runValidators: true }
    );
    if (!ride) throw new AppError('This ride is not eligible to search again yet.', 409);
    return response.status(200).json({ ride });
  } catch (error) { return next(error); }
}

export async function getRide(request, response, next) {
  try {
    const { id } = request.params;

    if (!isValidRideId(id)) {
      throw new AppError('Ride not found.', 404);
    }

    const ride = await Ride.findOne({ _id: id, riderId: request.user.id }).populate('proposedDriverId', 'fullName role');
    if (!ride) {
      throw new AppError('Ride not found.', 404);
    }

    return response.status(200).json({ ride });
  } catch (error) {
    return next(error);
  }
}

export async function getRideDriverProfile(request, response, next) {
  try {
    const { id } = request.params;
    if (!isValidRideId(id)) throw new AppError('Ride not found.', 404);
    const ride = await Ride.findOne({ _id: id, riderId: request.user.id }).select('driverId proposedDriverId');
    const driverId = ride?.driverId || ride?.proposedDriverId;
    if (!driverId) throw new AppError('No driver profile is available for this ride yet.', 404);
    const [user, driver, rating] = await Promise.all([
      User.findById(driverId).select('fullName profileImage role'),
      DriverProfile.findOne({ userId: driverId }).select('vehicleType vehicleNumber averageRating completedRides verificationStatus'),
      Review.aggregate([{ $match: { driverId: new mongoose.Types.ObjectId(driverId) } }, { $group: { _id: '$driverId', averageRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } }])
    ]);
    if (!user || user.role !== 'DRIVER') throw new AppError('Driver profile was not found.', 404);
    return response.status(200).json({ profile: { ...user.toObject(), driver: driver?.toObject() || null, averageRating: rating[0]?.averageRating || driver?.averageRating || 0, reviewCount: rating[0]?.reviewCount || 0 } });
  } catch (error) { return next(error); }
}

export async function cancelRide(request, response, next) {
  try {
    const { id } = request.params;

    if (!isValidRideId(id)) {
      throw new AppError('Ride not found.', 404);
    }

    const ride = await Ride.findOne({ _id: id, riderId: request.user.id }).select('status driverId proposedDriverId paymentStatus');
    if (!ride) {
      throw new AppError('Ride not found.', 404);
    }

    if (ride.status === 'CANCELLED') {
      if (ride.driverId && ride.paymentStatus !== 'PAID') {
        await waiveServicePlatformFeeLiability({
          driverId: ride.driverId,
          serviceType: 'RIDE',
          serviceId: id,
          reason: 'Ride cancelled by its rider.'
        });
      }
      return response.status(200).json({ ride });
    }

    if (!CANCELLABLE_STATUSES.includes(ride.status)) {
      throw new AppError('This ride can no longer be cancelled because the trip has begun or ended.', 409);
    }

    const cancelledRide = await Ride.findOneAndUpdate(
      { _id: id, riderId: request.user.id, status: ride.status },
      { $set: { status: 'CANCELLED' }, $unset: { proposedDriverId: 1, driverProposedAt: 1 } },
      { new: true, runValidators: true }
    );

    if (!cancelledRide) {
      throw new AppError('Ride status changed before cancellation. Please refresh and try again.', 409);
    }

    emitRideStatusUpdate(cancelledRide);

    if (cancelledRide.driverId && cancelledRide.paymentStatus !== 'PAID') {
      try {
        await waiveServicePlatformFeeLiability({
          driverId: cancelledRide.driverId,
          serviceType: 'RIDE',
          serviceId: cancelledRide._id,
          reason: 'Ride cancelled by its rider.'
        });
      } catch (error) {
        return next(new AppError('Ride was cancelled, but its platform-fee liability waiver could not be recorded.', 503));
      }
    }

    return response.status(200).json({ ride: cancelledRide });
  } catch (error) {
    return next(error);
  }
}

export async function confirmDriver(request, response, next) {
  try {
    const { id } = request.params;
    if (!isValidRideId(id)) throw new AppError('Ride not found.', 404);
    const pending = await Ride.findOne({ _id: id, riderId: request.user.id, status: 'REQUESTED', paymentStatus: 'PAID' }).select('proposedDriverId');
    if (!pending?.proposedDriverId) throw new AppError('There is no driver offer waiting for this ride.', 409);
    const driverId = pending.proposedDriverId.toString();
    await assertDriverEligible(driverId);
    await assertNoActiveAssignment(driverId, 'RIDE');
    const acceptedAt = new Date();
    const ride = await Ride.findOneAndUpdate(
      { _id: id, riderId: request.user.id, status: 'REQUESTED', paymentStatus: 'PAID', driverId: null, proposedDriverId: driverId },
      { $set: { driverId, status: 'ACCEPTED', acceptedAt, paymentDeadlineAt: new Date(acceptedAt.getTime() + PAYMENT_GRACE_PERIOD_MS) }, $unset: { proposedDriverId: 1, driverProposedAt: 1 } },
      { new: true, runValidators: true }
    );
    if (!ride) throw new AppError('The driver offer changed before confirmation. Please refresh and try again.', 409);
    await Payment.updateMany({ serviceType: 'RIDE', serviceId: ride._id, driverId: null }, { $set: { driverId: ride.driverId } });
    try { await ensureServicePlatformFeeLiability({ serviceType: 'RIDE', service: ride }); } catch (_error) { return next(new AppError('Ride was accepted, but its platform-fee liability could not be recorded.', 503)); }
    emitRideAccepted(ride);
    return response.status(200).json({ ride });
  } catch (error) { return next(error); }
}

export async function declineDriver(request, response, next) {
  try {
    const { id } = request.params;
    if (!isValidRideId(id)) throw new AppError('Ride not found.', 404);
    const ride = await Ride.findOneAndUpdate(
      { _id: id, riderId: request.user.id, status: 'REQUESTED', proposedDriverId: { $ne: null } },
      { $unset: { proposedDriverId: 1, driverProposedAt: 1 } },
      { new: true, runValidators: true }
    );
    if (!ride) throw new AppError('There is no driver offer waiting for this ride.', 409);
    emitRideDriverDeclined(ride);
    return response.status(200).json({ ride });
  } catch (error) { return next(error); }
}
