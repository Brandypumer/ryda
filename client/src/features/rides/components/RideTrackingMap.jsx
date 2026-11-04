import { useEffect, useState } from 'react';
import { api } from '../../../shared/lib/api';
import { useRiderRideTracking } from '../hooks/useRiderRideTracking';
import { useRiderRideLocationPublisher } from '../hooks/useRiderRideLocationPublisher';
import RideMap from './RideMap';

export default function RideTrackingMap({ ride, accessToken, shareRiderLocation = false }) {
  const { driverLocation, connectionError } = useRiderRideTracking({ ride, accessToken });
  const { riderLocation, locationError } = useRiderRideLocationPublisher({ ride, accessToken, enabled: shareRiderLocation });
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, new Date(ride?.requestExpiresAt || 0).getTime() - Date.now()));
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState('');

  useEffect(() => {
    if (ride?.status !== 'REQUESTED' || ride?.paymentStatus !== 'PAID' || ride?.proposedDriverId) return undefined;
    const update = () => setRemainingMs(Math.max(0, new Date(ride.requestExpiresAt || 0).getTime() - Date.now()));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [ride?.paymentStatus, ride?.proposedDriverId, ride?.requestExpiresAt, ride?.status]);

  async function retrySearch() {
    setRetrying(true);
    setRetryError('');
    try {
      await api.post(`/rides/${ride._id}/retry-search`);
      window.location.reload();
    } catch (error) {
      setRetryError(error.response?.data?.message || 'Unable to reopen driver search.');
    } finally {
      setRetrying(false);
    }
  }

  if (!ride) return null;

  return (
    <section className="space-y-2">
      {ride.status === 'REQUESTED' && ride.paymentStatus === 'PAID' && !ride.proposedDriverId && (remainingMs > 0 ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">Looking for a driver · Request expires in <span className="font-semibold">{formatRemaining(remainingMs)}</span>.</p> : <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><p className="font-semibold">Your driver search expired.</p><p className="mt-1">No driver accepted the request within 15 minutes.</p><button className="mt-3 rounded-lg bg-amber-700 px-3 py-2 font-semibold text-white disabled:opacity-60" disabled={retrying} onClick={retrySearch} type="button">{retrying ? 'Searching…' : 'Search again'}</button>{retryError && <p className="mt-2 text-rose-700" role="alert">{retryError}</p>}</div>)}
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

function formatRemaining(milliseconds) { const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000)); return `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`; }
