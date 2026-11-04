import mongoose from 'mongoose';

import { RYDA_CONFIG, SERVICE_STATUSES } from '../../../shared/constants/rydaConfig.js';

const locationSchema = new mongoose.Schema(
  {
    address: {
      type: String,
      required: true,
      trim: true
    },
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180
    }
  },
  { _id: false }
);

const rideSchema = new mongoose.Schema(
  {
    riderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User'
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    proposedDriverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    driverProposedAt: {
      type: Date,
      default: null
    },
    bookedSeats: {
      type: Number,
      required: true,
      min: 1,
      max: RYDA_CONFIG.KEKE_SEAT_CAPACITY,
      validate: {
        validator: Number.isInteger,
        message: 'bookedSeats must be a whole number.'
      }
    },
    isPrivateRide: {
      type: Boolean,
      default: false
    },
    pickup: {
      type: locationSchema,
      required: true
    },
    destination: {
      type: locationSchema,
      required: true
    },
    grossFare: {
      type: Number,
      required: true
    },
    platformFee: {
      type: Number,
      required: true
    },
    driverNet: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: SERVICE_STATUSES.RIDE,
      default: 'REQUESTED'
    },
    paymentStatus: {
      type: String,
      enum: SERVICE_STATUSES.PAYMENT,
      default: 'PENDING'
    },
    requestExpiresAt: {
      type: Date,
      default: null
    },
    acceptedAt: Date,
    paymentDeadlineAt: Date,
    startedAt: Date,
    completedAt: Date
  },
  { timestamps: true }
);

rideSchema.pre('validate', function calculateRidePricing(next) {
  if (typeof this.bookedSeats === 'number' && Number.isFinite(this.bookedSeats)) {
    const grossFare = this.bookedSeats * RYDA_CONFIG.RIDE_FARE_PER_SEAT_NGN;

    this.isPrivateRide = this.bookedSeats === RYDA_CONFIG.KEKE_SEAT_CAPACITY;
    this.grossFare = grossFare;
    this.platformFee = grossFare * RYDA_CONFIG.PLATFORM_FEE_RATE;
    this.driverNet = grossFare - this.platformFee;
  }

  next();
});

export const Ride = mongoose.model('Ride', rideSchema);
