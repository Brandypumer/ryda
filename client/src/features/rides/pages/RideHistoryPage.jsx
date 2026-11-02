import { useEffect, useState } from 'react';

import { api } from '../../../shared/lib/api';
import { useAuth } from '../../identity';
import RideTrackingMap from '../components/RideTrackingMap';
import { getRideSocket } from '../lib/rideSocket';

export default function RideHistoryPage() {
  const { token } = useAuth();
  const [rides, setRides] = useState([]);
  const [selectedRideId, setSelectedRideId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isCurrent = true;

    async function loadRides() {
      try {
        const { data } = await api.get('/rides/my');
        if (isCurrent) setRides(data.rides || []);
      } catch (requestError) {
        if (isCurrent) setError(requestError.response?.data?.message || 'Unable to load your ride history.');
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    loadRides();
    return () => {
      isCurrent = false;
    };
  }, []);

  const rideIds = rides
    .filter((ride) => !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(ride.status))
    .map((ride) => ride._id)
    .join(',');

  useEffect(() => {
    if (!token || !rideIds) return undefined;

    const socket = getRideSocket(token);
    const ids = rideIds.split(',');
    const joinRides = () => ids.forEach((rideId) => socket.emit('ride:join', { rideId }));
    const updateRide = (update) => {
      setRides((current) => current.map((ride) => (
        String(ride._id) === String(update.rideId)
          ? { ...ride, status: update.status, driverId: update.driverId ?? ride.driverId }
          : ride
      )));
    };

    socket.on('connect', joinRides);
    socket.on('ride:accepted', updateRide);
    socket.on('ride:status:update', updateRide);
    if (!socket.connected) socket.connect();
    else joinRides();

    return () => {
      ids.forEach((rideId) => socket.emit('ride:leave', { rideId }));
      socket.off('connect', joinRides);
      socket.off('ride:accepted', updateRide);
      socket.off('ride:status:update', updateRide);
    };
  }, [rideIds, token]);

  const selectedRide = rides.find((ride) => String(ride._id) === String(selectedRideId));

  if (isLoading) return <p className="text-slate-600">Loading your rides…</p>;
  if (error) return <p className="text-red-600" role="alert">{error}</p>;

  return (
    <section className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Ride history</h1>
        <p className="mt-1 text-sm text-slate-600">Follow active trips, review previous rides, and rate completed journeys.</p>
      </div>

      {rides.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600"><p className="font-semibold text-slate-800">No rides yet</p><p className="mt-1">Your requested and completed Keke rides will appear here.</p></div>
      ) : (
        <div className="space-y-3">
          {rides.map((ride) => (
            <button
              key={ride._id}
              className="w-full rounded-xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200 hover:ring-emerald-500"
              onClick={() => setSelectedRideId(ride._id)}
              type="button"
            >
              <span className="block font-semibold text-slate-900">{ride.pickup?.address} → {ride.destination?.address}</span>
              <span className="mt-1 block text-sm text-slate-600">{ride.status} · ₦{ride.grossFare}</span>
            </button>
          ))}
        </div>
      )}

      {selectedRide && <RideDetails ride={selectedRide} accessToken={token} />}
    </section>
  );
}

function RideDetails({ ride, accessToken }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payment, setPayment] = useState(null);
  const [authorizationUrl, setAuthorizationUrl] = useState('');
  const [paymentStatus, setPaymentStatus] = useState(ride.paymentStatus);

  async function initializePayment() {
    setMessage('');
    try {
      const { data } = await api.post('/payments/initialize', { serviceType: 'RIDE', serviceId: ride._id });
      setPayment(data.payment);
      setAuthorizationUrl(data.authorizationUrl || '');
      if (!data.authorizationUrl) setMessage('A pending payment already exists. Finish checkout and verify it here.');
    } catch (requestError) {
      setMessage(requestError.response?.data?.message || 'Unable to start payment.');
    }
  }

  async function verifyPayment() {
    if (!payment?.reference) return;
    setMessage('');
    try {
      await api.get(`/payments/verify/${encodeURIComponent(payment.reference)}`);
      setPaymentStatus('PAID');
      setMessage('Ride payment verified.');
    } catch (requestError) {
      setMessage(requestError.response?.data?.message || 'Payment is not verified yet.');
    }
  }

  async function submitReview(event) {
    event.preventDefault();
    setMessage('');

    if (rating < 1 || rating > 5) {
      setMessage('Choose a rating from 1 to 5 stars.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/rides/${ride._id}/review`, { rating, comment });
      setMessage('Thanks for rating your driver.');
    } catch (requestError) {
      setMessage(requestError.response?.data?.message || 'Unable to submit your review.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <article className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-lg font-semibold text-slate-900">Ride details</h2>
      <dl className="mt-3 space-y-2 text-sm text-slate-700">
        <div><dt className="font-medium">Pickup</dt><dd>{ride.pickup?.address}</dd></div>
        <div><dt className="font-medium">Destination</dt><dd>{ride.destination?.address}</dd></div>
        <div><dt className="font-medium">Status</dt><dd className="mt-1"><StatusBadge status={ride.status} /></dd></div>
        <div><dt className="font-medium">Fare</dt><dd>₦{ride.grossFare}</dd></div>
      </dl>

      {['ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'IN_PROGRESS'].includes(ride.status) && (
        <div className="mt-5">
          <RideTrackingMap ride={ride} accessToken={accessToken} />
        </div>
      )}

      {ride.driverId && paymentStatus !== 'PAID' && (
        <section className="mt-5 space-y-3 border-t border-slate-200 pt-5">
          <h3 className="font-semibold text-slate-900">Pay for this ride</h3>
          {!payment ? (
            <button className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white" onClick={initializePayment} type="button">Continue to Paystack</button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-slate-600">Reference: {payment.reference}</p>
              {authorizationUrl && <a className="block text-sm font-medium text-emerald-700 underline" href={authorizationUrl} rel="noreferrer" target="_blank">Open Paystack checkout</a>}
              <button className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white" onClick={verifyPayment} type="button">Verify payment</button>
            </div>
          )}
        </section>
      )}

      {ride.status === 'COMPLETED' && (
        <form className="mt-5 space-y-3 border-t border-slate-200 pt-5" onSubmit={submitReview}>
          <fieldset>
            <legend className="font-semibold text-slate-900">Rate your driver</legend>
            <div className="mt-2 flex gap-1" aria-label="Star rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button aria-label={`${star} star${star === 1 ? '' : 's'}`} className={`text-2xl ${star <= rating ? 'text-amber-400' : 'text-slate-300'}`} key={star} onClick={() => setRating(star)} type="button">★</button>
              ))}
            </div>
          </fieldset>
          <label className="block text-sm text-slate-700">
            Comment (optional)
            <textarea className="mt-1 w-full rounded-lg border border-slate-300 p-2" maxLength="500" onChange={(event) => setComment(event.target.value)} placeholder="Tell us about your ride experience" rows="3" value={comment} />
          </label>
          {message && <p className="text-sm text-slate-700" role="status">{message}</p>}
          <button className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white disabled:bg-emerald-300" disabled={isSubmitting} type="submit">{isSubmitting ? 'Submitting…' : 'Submit review'}</button>
        </form>
      )}
    </article>
  );
}

function StatusBadge({ status }) {
  const styles = {
    COMPLETED: 'bg-emerald-50 text-emerald-800',
    CANCELLED: 'bg-slate-100 text-slate-700',
    NO_SHOW: 'bg-rose-50 text-rose-800',
    IN_PROGRESS: 'bg-sky-50 text-sky-800',
    ACCEPTED: 'bg-indigo-50 text-indigo-800',
    DRIVER_ARRIVING: 'bg-indigo-50 text-indigo-800',
    DRIVER_ARRIVED: 'bg-indigo-50 text-indigo-800',
    REQUESTED: 'bg-amber-50 text-amber-800'
  };

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status] || 'bg-slate-100 text-slate-700'}`}>{status}</span>;
}
