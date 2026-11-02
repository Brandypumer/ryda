import { useDriverRideTracking } from '../hooks/useDriverRideTracking';
import RideMap from './RideMap';

export default function DriverRideTrackingMap({ ride, accessToken, driverLocation }) {
  const { riderLocation, connectionError } = useDriverRideTracking({ ride, accessToken });

  if (!ride) return null;

  return (
    <section className="mt-3 space-y-2" aria-label="Active ride map">
      <RideMap
        pickup={ride.pickup}
        destination={ride.destination}
        driverLocation={driverLocation}
        riderLocation={riderLocation}
      />
      <p className="text-xs text-slate-600">Purple marker: rider location when they enable sharing. Blue marker: your Keke.</p>
      {connectionError && <p className="text-sm text-red-600" role="alert">{connectionError}</p>}
    </section>
  );
}
