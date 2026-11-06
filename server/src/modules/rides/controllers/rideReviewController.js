import mongoose from 'mongoose';

import AppError from '../../../shared/utils/AppError.js';
import { Ride } from '../models/Ride.js';
import { Review } from '../models/Review.js';
import DriverProfile from '../../identity/models/DriverProfile.js';

export async function createRideReview(request, response, next) {
  try {
    const { id } = request.params;
    const rating = Number(request.body.rating);
    const comment = typeof request.body.comment === 'string' ? request.body.comment.trim() : '';

    if (!mongoose.isValidObjectId(id)) {
      throw new AppError('Ride not found.', 404);
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new AppError('Rating must be a whole number between 1 and 5.', 400);
    }

    if (comment.length > 500) {
      throw new AppError('Review comment cannot exceed 500 characters.', 400);
    }

    const ride = await Ride.findOne({
      _id: id,
      riderId: request.user.id,
      status: 'COMPLETED',
      driverId: { $ne: null }
    }).select('driverId');

    if (!ride) {
      throw new AppError('Only the rider who owns a completed ride can review it.', 403);
    }

    const review = await Review.create({
      rideId: ride._id,
      riderId: request.user.id,
      driverId: ride.driverId,
      rating,
      comment
    });

    const [summary] = await Review.aggregate([
      { $match: { driverId: ride.driverId } },
      { $group: { _id: '$driverId', averageRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } }
    ]);
    await DriverProfile.updateOne(
      { userId: ride.driverId },
      { $set: { averageRating: summary?.averageRating || rating } }
    );

    return response.status(201).json({ review, averageRating: summary?.averageRating || rating, reviewCount: summary?.reviewCount || 1 });
  } catch (error) {
    if (error?.code === 11000) {
      return next(new AppError('You have already reviewed this ride.', 409));
    }

    return next(error);
  }
}
