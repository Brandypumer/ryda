import { useEffect, useState } from 'react';

import { friendlyRideSocketError, getRideSocket } from '../lib/rideSocket';

const ACTIVE_TRACKING_STATUSES = new Set([
  'ACCEPTED',
  'DRIVER_ARRIVING',
  'DRIVER_ARRIVED',
  'IN_PROGRESS'
]);
const TERMINAL_RIDE_STATUSES = new Set(['COMPLETED', 'CANCELLED', 'NO_SHOW']);

export function useRiderRideTracking({ ride, accessToken }) {
  const [driverLocation, setDriverLocation] = useState(null);
  const [trackingStatus, setTrackingStatus] = useState(ride?.status);
  const [connectionError, setConnectionError] = useState('');

  useEffect(() => {
    setTrackingStatus(ride?.status);
    if (!ride?._id) setDriverLocation(null);
  }, [ride?._id, ride?.status]);

  useEffect(() => {
    if (!ride?._id || TERMINAL_RIDE_STATUSES.has(trackingStatus)) return undefined;

    const socket = getRideSocket(accessToken);
    const joinRideRoom = () => {
      socket.emit('ride:join', { rideId: ride._id }, (result) => {
        if (!result?.ok) setConnectionError(result?.message || 'Unable to join live ride tracking.');
        else setConnectionError('');
      });
    };
    const updateLocation = (location) => {
      if (location.rideId === ride._id) setDriverLocation(location);
    };
    const updateStatus = (update) => {
      if (update.rideId === ride._id) setTrackingStatus(update.status);
    };
    const reportSocketError = () => setConnectionError(friendlyRideSocketError());
    const clearSocketError = () => setConnectionError('');

    socket.on('connect', joinRideRoom);
    socket.on('ride:location:update', updateLocation);
    socket.on('ride:accepted', updateStatus);
    socket.on('ride:status:update', updateStatus);
    socket.on('connect_error', reportSocketError);
    socket.on('connect', clearSocketError);

    if (socket.connected) joinRideRoom();
    else socket.connect();

    return () => {
      socket.emit('ride:leave', { rideId: ride._id });
      socket.off('connect', joinRideRoom);
      socket.off('ride:location:update', updateLocation);
      socket.off('ride:accepted', updateStatus);
      socket.off('ride:status:update', updateStatus);
      socket.off('connect_error', reportSocketError);
      socket.off('connect', clearSocketError);
    };
  }, [accessToken, ride?._id, trackingStatus]);

  return {
    driverLocation,
    connectionError,
    isTracking: Boolean(ride?._id && ACTIVE_TRACKING_STATUSES.has(trackingStatus))
  };
}
