import { useRiderRideTracking } from '../hooks/useRiderRideTracking';
import { useRiderRideLocationPublisher } from '../hooks/useRiderRideLocationPublisher';
import RideMap from './RideMap';

export default function RideTrackingMap({ ride, accessToken, shareRiderLocation = false }) {
  const { driverLocation, connectionError } = useRiderRideTracking({ ride, accessToken });
  const { riderLocation, locationError } = useRiderRideLocationPublisher({ ride, accessToken, enabled: shareRiderLocation });

  if (!ride) return null;

  return (
    <section className="space-y-2">
      <RideMap
        pickup={ride.pickup}
        destination={ride.destination}
        driverLocation={driverLocation}
        riderLocation={riderLocation}
      />
      {connectionError && <p className="text-sm text-red-600" role="alert">{connectionError}</p>}
      {locationError && <p className="text-sm text-amber-800" role="status">{locationError}</p>}
    </section>
  );
}
