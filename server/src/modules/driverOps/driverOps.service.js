import AppError from '../../shared/utils/AppError.js';
import {
  getCourierModel,
  getDriverProfileModel,
  getRideModel,
  getWalletModel
} from './driverOps.models.js';
import { getDriverFinancialEligibility } from '../payments/services/liabilityService.js';
import { findActiveAssignments } from '../../shared/services/activeAssignmentService.js';

const ACTIVE_RIDE_STATUSES = ['ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'IN_PROGRESS'];
const ACTIVE_COURIER_STATUSES = ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'];

async function getProfile(driverId, { required = true } = {}) {
  const DriverProfile = getDriverProfileModel();
  const profile = await DriverProfile.findOne({ userId: driverId }).lean();

  if (!profile && required) {
    throw new AppError('Driver profile was not found.', 404);
  }

  return profile;
}

async function getLiabilitySummary(driverId) {
  const eligibility = await getDriverFinancialEligibility(driverId);
  const items = eligibility.liabilities.map((item) => item.toObject ? item.toObject() : item);

  return {
    available: true,
    overdueTotal: eligibility.overdueTotal,
    outstandingTotal: items.reduce((total, item) => total + Number(item.amount || 0), 0),
    items
  };
}

async function getEligibility(driverId, { requireOnline = false } = {}) {
  const profile = await getProfile(driverId);
  const liabilities = await getLiabilitySummary(driverId);

  if (!liabilities.available) {
    return {
      profile,
      liabilities,
      allowed: false,
      reason: 'Platform-fee eligibility is temporarily unavailable.'
    };
  }

  const reason = profile.verificationStatus !== 'APPROVED'
    ? 'Driver verification must be approved.'
    : profile.isSuspended
      ? 'Suspended drivers cannot receive requests.'
      : liabilities.overdueTotal > 0
        ? 'Outstanding overdue platform fees must be settled.'
        : requireOnline && !profile.isOnline
          ? 'Driver must be online to view requests.'
          : null;

  return { profile, liabilities, allowed: !reason, reason };
}

export async function setAvailability(driverId, isOnline) {
  let eligibility;
  try {
    eligibility = await getEligibility(driverId);
  } catch (error) {
    if (isOnline) throw error;
    eligibility = {
      profile: await getProfile(driverId),
      liabilities: { available: false, overdueTotal: null, outstandingTotal: null, items: [] }
    };
  }

  if (isOnline && !eligibility.allowed) {
    throw new AppError(eligibility.reason, 403);
  }

  const DriverProfile = getDriverProfileModel();
  const profile = await DriverProfile.findByIdAndUpdate(
    eligibility.profile._id,
    { $set: { isOnline } },
    { new: true }
  ).lean();

  return {
    isOnline: profile.isOnline,
    verificationStatus: profile.verificationStatus,
    isSuspended: profile.isSuspended,
    overduePlatformFeeTotal: eligibility.liabilities.overdueTotal
  };
}

function assignment(serviceType, item) {
  if (!item) return null;

  return {
    serviceType,
    id: item._id,
    status: item.status,
    pickup: item.pickup,
    dropoff: item.destination || item.dropoff,
    acceptedAt: item.acceptedAt,
    ...(serviceType === 'RIDE' ? {
      riderId: item.riderId,
      bookedSeats: item.bookedSeats,
      grossFare: item.grossFare,
      paymentStatus: item.paymentStatus
    } : {})
  };
}

async function findOneActive(Model, driverId, statuses) {
  return Model
    ? Model.findOne({ driverId, status: { $in: statuses } }).sort({ acceptedAt: 1 }).lean()
    : null;
}

export async function buildDashboard(driverId) {
  const profile = await getProfile(driverId, { required: false });
  if (!profile || profile.verificationStatus !== 'APPROVED') {
    return {
      verificationStatus: profile?.verificationStatus || null,
      rejectionReason: profile?.rejectionReason || null
    };
  }
  const [liabilities, Ride, CourierDelivery, DriverWallet] = await Promise.all([
    getLiabilitySummary(driverId),
    Promise.resolve(getRideModel()),
    Promise.resolve(getCourierModel()),
    Promise.resolve(getWalletModel())
  ]);
  const [activeRide, activeCourier, pendingProposal, completedRides, completedCourier, wallet, activeAssignments] = await Promise.all([
    findOneActive(Ride, driverId, ACTIVE_RIDE_STATUSES),
    findOneActive(CourierDelivery, driverId, ACTIVE_COURIER_STATUSES),
    Ride ? Ride.findOne({ proposedDriverId: driverId, status: 'REQUESTED' }).sort({ driverProposedAt: -1 }).lean() : null,
    Ride ? Ride.countDocuments({ driverId, status: 'COMPLETED' }) : null,
    CourierDelivery ? CourierDelivery.countDocuments({ driverId, status: 'DELIVERED' }) : null,
    DriverWallet ? DriverWallet.findOne({ driverId }).lean() : null,
    findActiveAssignments(driverId)
  ]);

  const active = [activeRide && assignment('RIDE', activeRide), activeCourier && assignment('COURIER', activeCourier)].filter(Boolean);

  return {
    availability: { isOnline: profile.isOnline, isSuspended: profile.isSuspended },
    verificationStatus: profile.verificationStatus,
    activeAssignment: active[0] || null,
    pendingProposal: pendingProposal ? assignment('RIDE', pendingProposal) : null,
    activeAssignments: active,
    assignmentConflict: active.length > 1,
    completed: { rides: completedRides, courier: completedCourier },
    wallet: wallet || null,
    liabilities
  };
}

function requestSummary(serviceType, item) {
  const destination = item.destination || item.dropoff;
  const summary = {
    serviceType,
    id: item._id,
    pickup: item.pickup,
    ...(destination ? { destination } : {}),
    ...(item.dropoff ? { dropoff: item.dropoff } : {}),
    status: item.status,
    fare: item.grossFare,
    grossFare: item.grossFare,
    createdAt: item.createdAt,
    ...(serviceType === 'RIDE' ? {
      ...(item.bookedSeats != null ? { bookedSeats: item.bookedSeats } : {}),
      ...(item.isPrivateRide != null ? { isPrivateRide: item.isPrivateRide } : {})
    } : {
      ...(item.recipientName ? { recipientName: item.recipientName } : {}),
      ...(item.packageDescription ? { packageDescription: item.packageDescription } : {})
    })
  };

  return summary;
}

export async function getAvailableRequests(driverId) {
  const eligibility = await getEligibility(driverId, { requireOnline: true });
  if (!eligibility.allowed) {
    throw new AppError(eligibility.reason, 403);
  }

  const [Ride, CourierDelivery] = [getRideModel(), getCourierModel()];
  const [rides, courier] = await Promise.all([
    Ride ? Ride.find({ status: 'REQUESTED', paymentStatus: 'PAID', requestExpiresAt: { $gt: new Date() }, driverId: null, proposedDriverId: null }).sort({ createdAt: 1 }).lean() : [],
    CourierDelivery ? CourierDelivery.find({ status: 'REQUESTED', driverId: null }).sort({ createdAt: 1 }).lean() : []
  ]);

  const requests = [...rides.map((item) => requestSummary('RIDE', item)), ...courier.map((item) => requestSummary('COURIER', item))]
    .sort((first, second) => new Date(first.createdAt) - new Date(second.createdAt));

  return {
    requests,
    sources: { ride: Boolean(Ride), courier: Boolean(CourierDelivery) }
  };
}
