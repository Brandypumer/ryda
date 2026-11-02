import { useEffect, useState } from 'react';

import { getRideSocket } from '../lib/rideSocket';

const TERMINAL_RIDE_STATUSES = new Set(['COMPLETED', 'CANCELLED', 'NO_SHOW']);

export function useDriverRideTracking({ ride, accessToken }) {
  const [riderLocation, setRiderLocation] = useState(null);
  const [connectionError, setConnectionError] = useState('');

  useEffect(() => {
    if (!ride?._id || TERMINAL_RIDE_STATUSES.has(ride.status)) {
      setRiderLocation(null);
      return undefined;
    }

    const socket = getRideSocket(accessToken);
    const joinRideRoom = () => {
      socket.emit('ride:join', { rideId: ride._id }, (result) => {
        if (!result?.ok) setConnectionError(result?.message || 'Unable to join live ride tracking.');
        else setConnectionError('');
      });
    };
    const updateRiderLocation = (location) => {
      if (String(location.rideId) === String(ride._id)) setRiderLocation(location);
    };
    const reportSocketError = (error) => setConnectionError(error.message || 'Live tracking connection was interrupted.');

    socket.on('connect', joinRideRoom);
    socket.on('ride:rider-location:update', updateRiderLocation);
    socket.on('connect_error', reportSocketError);
    if (socket.connected) joinRideRoom();
    else socket.connect();

    return () => {
      socket.emit('ride:leave', { rideId: ride._id });
      socket.off('connect', joinRideRoom);
      socket.off('ride:rider-location:update', updateRiderLocation);
      socket.off('connect_error', reportSocketError);
    };
  }, [accessToken, ride?._id, ride?.status]);

  return { riderLocation, connectionError };
}
