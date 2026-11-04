import mongoose from 'mongoose';
import { SERVICE_STATUSES } from '../../../shared/constants/rydaConfig.js';

const { Schema } = mongoose;

const paymentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    driverId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    serviceType: { type: String, enum: ['RIDE', 'COURIER', 'FEE_SETTLEMENT'], required: true },
    serviceId: { type: Schema.Types.ObjectId, required: true, index: true },
    reference: { type: String, required: true, unique: true, trim: true },
    grossAmount: { type: Number, required: true, min: 0 },
    platformFee: { type: Number, required: true, min: 0 },
    driverNet: { type: Number, required: true, min: 0 },
    status: { type: String, enum: SERVICE_STATUSES.PAYMENT, default: 'PENDING', index: true },
    provider: { type: String, required: true, trim: true },
    authorizationUrl: { type: String, default: '' },
    paidAt: { type: Date },
    walletCreditedAt: { type: Date }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

paymentSchema.index({ serviceType: 1, serviceId: 1 });

export default mongoose.model('Payment', paymentSchema);
