import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

import { Ride } from '../models/Ride.js';

const ACTIVE_TRACKING_STATUSES = new Set([
  'ACCEPTED',
  'DRIVER_ARRIVING',
  'DRIVER_ARRIVED',
  'IN_PROGRESS'
]);

let rideIO;

export function rideRoom(rideId) {
  return `ride:${rideId}`;
}

export function isRideTrackingActive(status) {
  return ACTIVE_TRACKING_STATUSES.has(status);
}

export function registerRideTrackingSocket(io) {
  rideIO = io;

  io.on('connection', (socket) => {
    socket.on('ride:join', async ({ rideId } = {}, acknowledge = () => {}) => {
      try {
        const user = authenticateSocket(socket);
        const ride = await findRide(rideId);

        if (!isRideParticipant(ride, user.id)) {
          throw new Error('You are not allowed to join this ride.');
        }

        if (!isRideTrackingActive(ride.status) && ride.status !== 'REQUESTED') {
          throw new Error('Live tracking is not active for this ride.');
        }

        socket.join(rideRoom(rideId));
        acknowledge({ ok: true });
      } catch (error) {
        acknowledge({ ok: false, message: error.message });
      }
    });

    socket.on('ride:leave', ({ rideId } = {}) => {
      if (mongoose.isValidObjectId(rideId)) {
        socket.leave(rideRoom(rideId));
      }
    });

    socket.on('driver:location:update', async (payload = {}, acknowledge = () => {}) => {
      try {
        const user = authenticateSocket(socket);
        const { rideId, latitude, longitude } = payload;

        if (user.role !== 'DRIVER') {
          throw new Error('Only drivers can publish ride locations.');
        }

        validateLocationPayload(rideId, latitude, longitude);
        const ride = await findRide(rideId);

        if (!ride.driverId || ride.driverId.toString() !== user.id) {
          throw new Error('You are not assigned to this ride.');
        }

        if (!isRideTrackingActive(ride.status)) {
          throw new Error('Location tracking is not active for this ride.');
        }

        const location = {
          rideId,
          latitude: Number(latitude),
          longitude: Number(longitude),
          timestamp: new Date().toISOString()
        };

        io.to(rideRoom(rideId)).emit('ride:location:update', location);
        acknowledge({ ok: true, location });
      } catch (error) {
        acknowledge({ ok: false, message: error.message });
      }
    });

    socket.on('rider:location:update', async (payload = {}, acknowledge = () => {}) => {
      try {
        const user = authenticateSocket(socket);
        const { rideId, latitude, longitude } = payload;

        if (user.role !== 'RIDER') {
          throw new Error('Only riders can publish rider locations.');
        }

        validateLocationPayload(rideId, latitude, longitude);
        const ride = await findRide(rideId);

        if (ride.riderId?.toString() !== user.id) {
          throw new Error('You are not the rider for this ride.');
        }

        if (!isRideTrackingActive(ride.status)) {
          throw new Error('Location tracking is not active for this ride.');
        }

        const location = {
          rideId,
          latitude: Number(latitude),
          longitude: Number(longitude),
          timestamp: new Date().toISOString()
        };

        io.to(rideRoom(rideId)).emit('ride:rider-location:update', location);
        acknowledge({ ok: true, location });
      } catch (error) {
        acknowledge({ ok: false, message: error.message });
      }
    });
  });
}

export function emitRideAccepted(ride) {
  emitRideEvent('ride:accepted', ride);
}

export function emitRideStatusUpdate(ride) {
  emitRideEvent('ride:status:update', ride);
}

export function emitRideDriverProposed(ride, proposedDriver) {
  emitRideEvent('ride:driver-proposed', ride, {
    proposedDriverId: proposedDriver?._id?.toString() || ride.proposedDriverId?.toString() || null,
    proposedDriver: proposedDriver ? { fullName: proposedDriver.fullName, role: proposedDriver.role } : null
  });
}

export function emitRideDriverDeclined(ride) {
  emitRideEvent('ride:driver-declined', ride);
}

function emitRideEvent(event, ride, extra = {}) {
  if (!rideIO || !ride?._id) return;

  rideIO.to(rideRoom(ride._id.toString())).emit(event, {
    rideId: ride._id.toString(),
    status: ride.status,
    driverId: ride.driverId?.toString() || null,
    proposedDriverId: ride.proposedDriverId?.toString() || null,
    ...extra,
    timestamp: new Date().toISOString()
  });
}

function authenticateSocket(socket) {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

  if (!token) {
    throw new Error('Authentication is required.');
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const id = payload.id || payload._id || payload.userId;

    if (!id) throw new Error('Authentication token is invalid.');
    return { id: id.toString(), role: payload.role };
  } catch (_error) {
    throw new Error('Authentication is required.');
  }
}

async function findRide(rideId) {
  if (!mongoose.isValidObjectId(rideId)) {
    throw new Error('Ride not found.');
  }

  const ride = await Ride.findById(rideId).select('riderId driverId proposedDriverId status');
  if (!ride) throw new Error('Ride not found.');
  return ride;
}

function isRideParticipant(ride, userId) {
  return ride.riderId?.toString() === userId || ride.driverId?.toString() === userId;
}

function validateLocationPayload(rideId, latitude, longitude) {
  if (!mongoose.isValidObjectId(rideId)) {
    throw new Error('Ride not found.');
  }

  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);

  if (!Number.isFinite(parsedLatitude) || parsedLatitude < -90 || parsedLatitude > 90) {
    throw new Error('Latitude must be between -90 and 90.');
  }

  if (!Number.isFinite(parsedLongitude) || parsedLongitude < -180 || parsedLongitude > 180) {
    throw new Error('Longitude must be between -180 and 180.');
  }
}
