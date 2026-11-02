import { useEffect, useState } from 'react';

import { getRideSocket } from '../lib/rideSocket';

const ACTIVE_TRACKING_STATUSES = new Set([
  'ACCEPTED',
  'DRIVER_ARRIVING',
  'DRIVER_ARRIVED',
  'IN_PROGRESS'
]);

export function useRiderRideLocationPublisher({ ride, accessToken, enabled = false }) {
  const [riderLocation, setRiderLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [trackingStatus, setTrackingStatus] = useState(ride?.status);
  const canShare = Boolean(enabled && ride?._id && ACTIVE_TRACKING_STATUSES.has(trackingStatus));

  useEffect(() => {
    setTrackingStatus(ride?.status);
    if (!ride?._id) setRiderLocation(null);
  }, [ride?._id, ride?.status]);

  useEffect(() => {
    if (!canShare) return undefined;

    if (!navigator.geolocation) {
      setLocationError('Live location is not supported by this browser.');
      return undefined;
    }

    const socket = getRideSocket(accessToken);
    const joinRideRoom = () => socket.emit('ride:join', { rideId: ride._id });
    const updateStatus = (update) => {
      if (String(update.rideId) === String(ride._id)) setTrackingStatus(update.status);
    };
    const reportSocketError = (error) => setLocationError(error.message || 'Live location connection was interrupted.');

    socket.on('connect', joinRideRoom);
    socket.on('ride:accepted', updateStatus);
    socket.on('ride:status:update', updateStatus);
    socket.on('connect_error', reportSocketError);
    if (socket.connected) joinRideRoom();
    else socket.connect();

    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const latitude = Number(coords.latitude);
        const longitude = Number(coords.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

        const location = { latitude, longitude };
        setRiderLocation(location);
        socket.emit('rider:location:update', { rideId: ride._id, ...location }, (result) => {
          if (!result?.ok) setLocationError(result?.message || 'Unable to share your live location.');
          else setLocationError('');
        });
      },
      (error) => {
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? 'Live location permission is off. Pickup, destination, and driver tracking still remain available.'
            : 'Unable to read your current location. Please try again.'
        );
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      socket.emit('ride:leave', { rideId: ride._id });
      socket.off('connect', joinRideRoom);
      socket.off('ride:accepted', updateStatus);
      socket.off('ride:status:update', updateStatus);
      socket.off('connect_error', reportSocketError);
    };
  }, [accessToken, canShare, ride?._id]);

  return { riderLocation, locationError, isSharing: canShare && !locationError };
}
