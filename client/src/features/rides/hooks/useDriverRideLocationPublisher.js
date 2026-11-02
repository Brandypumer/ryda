import { useEffect, useState } from 'react';

import { getRideSocket } from '../lib/rideSocket';

const ACTIVE_TRACKING_STATUSES = new Set([
  'ACCEPTED',
  'DRIVER_ARRIVING',
  'DRIVER_ARRIVED',
  'IN_PROGRESS'
]);

export function useDriverRideLocationPublisher({ ride, accessToken, isAssignedDriver, onLocationChange }) {
  const [error, setError] = useState('');
  const [trackingStatus, setTrackingStatus] = useState(ride?.status);
  const isActiveRide = Boolean(ride?._id && isAssignedDriver && ACTIVE_TRACKING_STATUSES.has(trackingStatus));

  useEffect(() => {
    setTrackingStatus(ride?.status);
  }, [ride?._id, ride?.status]);

  useEffect(() => {
    if (!isActiveRide) return undefined;

    if (!navigator.geolocation) {
      setError('Live location is not supported by this browser.');
      return undefined;
    }

    const socket = getRideSocket(accessToken);
    const reportSocketError = (socketError) => setError(socketError.message || 'Live location connection was interrupted.');
    const joinRideRoom = () => socket.emit('ride:join', { rideId: ride._id });
    const updateStatus = (update) => {
      if (update.rideId === ride._id) setTrackingStatus(update.status);
    };
    socket.on('connect_error', reportSocketError);
    socket.on('connect', joinRideRoom);
    socket.on('ride:status:update', updateStatus);
    if (!socket.connected) socket.connect();
    else joinRideRoom();

    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const location = { latitude: Number(coords.latitude), longitude: Number(coords.longitude) };
        if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) return;

        onLocationChange?.(location);
        socket.emit(
          'driver:location:update',
          { rideId: ride._id, ...location },
          (result) => {
            if (!result?.ok) setError(result?.message || 'Unable to share your current location.');
            else setError('');
          }
        );
      },
      (positionError) => {
        if (positionError.code === positionError.PERMISSION_DENIED) {
          setError('Location permission is required while you have an active ride.');
        } else {
          setError('Unable to read your current location. Please try again.');
        }
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      socket.emit('ride:leave', { rideId: ride._id });
      socket.off('connect_error', reportSocketError);
      socket.off('connect', joinRideRoom);
      socket.off('ride:status:update', updateStatus);
    };
  }, [accessToken, isActiveRide, onLocationChange, ride?._id]);

  return { locationError: error, isTracking: isActiveRide && !error };
}
