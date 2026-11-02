import mongoose from 'mongoose';
import { SERVICE_STATUSES } from '../../shared/constants/rydaConfig.js';

const locationSchema = new mongoose.Schema({
  address: { type: String, required: true, trim: true },
  latitude: { type: Number, min: -90, max: 90 },
  longitude: { type: Number, min: -180, max: 180 }
}, { _id: false });

const courierDeliverySchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  recipientName: { type: String, required: true, trim: true },
  recipientPhone: { type: String, required: true, trim: true },
  packageDescription: { type: String, required: true, trim: true },
  pickup: { type: locationSchema, required: true },
  dropoff: { type: locationSchema, required: true },
  grossFare: { type: Number, required: true, min: 0 },
  platformFee: { type: Number, required: true, min: 0 },
  driverNet: { type: Number, required: true, min: 0 },
  status: { type: String, enum: SERVICE_STATUSES.COURIER, default: 'REQUESTED', required: true },
  paymentStatus: { type: String, enum: SERVICE_STATUSES.PAYMENT, default: 'PENDING', required: true },
  acceptedAt: { type: Date, default: null },
  paymentDeadlineAt: { type: Date, default: null },
  pickedUpAt: { type: Date, default: null },
  deliveredAt: { type: Date, default: null }
}, { timestamps: true });

const CourierDelivery = mongoose.models.CourierDelivery || mongoose.model('CourierDelivery', courierDeliverySchema);

export default CourierDelivery;
