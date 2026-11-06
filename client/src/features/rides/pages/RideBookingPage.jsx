import { Component, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';

import { RYDA_CONFIG } from '../../../shared/constants/rydaConfig.js';
import { api } from '../../../shared/lib/api';
import { useAuth } from '../../identity';
import RideTrackingMap from '../components/RideTrackingMap';
import { getRideSocket } from '../lib/rideSocket';
import { calculateDistanceKm, DEMO_DISTANCE_ERROR, isNigeriaFeature, MAX_DEMO_RIDE_DISTANCE_KM } from '../lib/rideLocation';

const ACTIVE_RIDE_STATUSES = new Set(['REQUESTED', 'ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'IN_PROGRESS']);
const TRACKING_STATUSES = new Set(['ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'IN_PROGRESS']);
const OFF_PLATFORM_PAYMENT_WARNING =
  'For your safety and transaction traceability, make payments only through RYDA. Payments made outside RYDA cannot be verified through our platform and are not covered by RYDA payment records or dispute support.';
const initialLocation = { address: '', latitude: '', longitude: '' };
const statusCopy = {
  REQUESTED: 'Looking for a driver',
  ACCEPTED: 'Driver confirmed',
  DRIVER_ARRIVING: 'Driver is on the way',
  DRIVER_ARRIVED: 'Your driver has arrived',
  IN_PROGRESS: 'Ride in progress',
  COMPLETED: 'Ride completed'
};

function hasValidCoordinates(location) {
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  return String(location.latitude).trim() !== '' && String(location.longitude).trim() !== ''
    && Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

function formatNaira(amount) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(amount) || 0);
}

export default function RideBookingPage() {
  return <RideHubErrorBoundary><RideHub /></RideHubErrorBoundary>;
}

function RideHub() {
  const { isAuthenticated, isRestoring, token, user } = useAuth();
  const [rides, setRides] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [pickup, setPickup] = useState(initialLocation);
  const [destination, setDestination] = useState(initialLocation);
  const [bookedSeats, setBookedSeats] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [success, setSuccess] = useState('');

  const loadRides = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const response = await api.get('/rides/my');
      setRides(Array.isArray(response.data?.rides) ? response.data.rides : []);
    } catch (error) {
      setRides([]);
      setLoadError(error.response?.data?.message || 'Unable to load your rides. You can refresh and try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'RIDER') loadRides();
    else if (!isRestoring) setIsLoading(false);
  }, [isAuthenticated, isRestoring, loadRides, user?.role]);

  const activeRide = useMemo(() => rides.find((ride) => ACTIVE_RIDE_STATUSES.has(ride.status)) || null, [rides]);
  const handleRideUpdate = useCallback((updater) => {
    setRides((current) => {
      const next = updater(current);
      if (next.some((item, index) => String(item._id) === String(current[index]?._id) && item.status === 'COMPLETED' && current[index]?.status !== 'COMPLETED')) setSuccess('Ride completed. You can book another ride.');
      return next;
    });
  }, []);
  useRideStatusUpdates({ ride: activeRide, token, onUpdate: handleRideUpdate, onProposal: loadRides });

  if (isRestoring) return <RidePageMessage message="Checking your saved session…" />;
  if (!isAuthenticated) return <Navigate replace to="/login" />;
  if (user?.role !== 'RIDER') return <RidePageMessage message="The ride hub is available to rider accounts. Switch to the workflow for your account role." />;
  if (isLoading) return <RidePageMessage message="Loading your ride hub…" busy />;

  if (activeRide) {
    return <section className="mx-auto max-w-6xl space-y-5 py-2 sm:py-6"><RideHubHeader />{loadError && <RetryNotice message={loadError} onRetry={loadRides} />}{success && <Notice tone="success">{success}</Notice>}<ActiveRidePanel ride={activeRide} accessToken={token} onPaymentStatusChange={async (paymentStatus) => { setRides((current) => current.map((item) => String(item._id) === String(activeRide._id) ? { ...item, paymentStatus } : item)); await loadRides(); }} onCancelled={(cancelledRide) => { setRides((current) => current.map((item) => String(item._id) === String(cancelledRide._id) ? cancelledRide : item)); setSuccess('Ride cancelled.'); }} onRideUpdated={(updatedRide) => setRides((current) => current.map((item) => String(item._id) === String(updatedRide._id) ? updatedRide : item))} /></section>;
  }

  const capacity = RYDA_CONFIG.KEKE_SEAT_CAPACITY;
  const fare = bookedSeats * RYDA_CONFIG.RIDE_FARE_PER_SEAT_NGN;

  async function handleSubmit(event) {
    event.preventDefault();
    setBookingError('');
    setSuccess('');
    if (!pickup.address.trim() || !destination.address.trim()) return setBookingError('Select both a pickup location and destination.');
    if (!Number.isInteger(bookedSeats) || bookedSeats < 1 || bookedSeats > capacity) return setBookingError(`Choose between 1 and ${capacity} seats.`);
    if (!hasValidCoordinates(pickup) || !hasValidCoordinates(destination)) return setBookingError('Select a suggested pickup and destination so we can locate your ride.');
    if (calculateDistanceKm(Number(pickup.latitude), Number(pickup.longitude), Number(destination.latitude), Number(destination.longitude)) > MAX_DEMO_RIDE_DISTANCE_KM + 1e-9) return setBookingError(DEMO_DISTANCE_ERROR);
    setIsSubmitting(true);
    try {
      const response = await api.post('/rides', {
        pickup: { address: pickup.address.trim(), latitude: Number(pickup.latitude), longitude: Number(pickup.longitude) },
        destination: { address: destination.address.trim(), latitude: Number(destination.latitude), longitude: Number(destination.longitude) },
        bookedSeats
      });
      const createdRide = response.data?.ride;
      setSuccess('Ride request sent. We will notify you when a driver accepts it.');
      if (createdRide?._id) setRides((current) => [createdRide, ...current]);
      else await loadRides();
    } catch (error) {
      setBookingError(error.response?.data?.message || 'Unable to request a ride. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return <section className="mx-auto max-w-5xl space-y-5 py-2 sm:py-6"><RideHubHeader />{loadError && <RetryNotice message={loadError} onRetry={loadRides} />}<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start"><form className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8" onSubmit={handleSubmit}><div className="border-b border-slate-100 pb-5"><p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Campus ride</p><h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Book a Keke</h1><p className="mt-2 text-sm leading-6 text-slate-600">Choose up to {capacity} seats and send your request to available drivers.</p></div><div className="mt-6 space-y-5"><LocationFields label="Pickup point" placeholder="e.g. Main Gate" location={pickup} onChange={(field, value) => setPickup((current) => ({ ...current, [field]: value }))} /><LocationFields label="Destination" placeholder="e.g. Faculty of Engineering" location={destination} onChange={(field, value) => setDestination((current) => ({ ...current, [field]: value }))} /><SeatSelector capacity={capacity} bookedSeats={bookedSeats} onChange={setBookedSeats} /><FarePreview bookedSeats={bookedSeats} capacity={capacity} fare={fare} /><aside className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950" aria-label="Platform payment notice"><span className="font-semibold">Pay through RYDA</span><p className="mt-1">{OFF_PLATFORM_PAYMENT_WARNING}</p></aside>{bookingError && <Notice tone="error">{bookingError}</Notice>}{success && <Notice tone="success">{success}</Notice>}<button className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-emerald-300" disabled={isSubmitting} type="submit">{isSubmitting ? 'Sending ride request…' : 'Request a ride'}</button></div></form><aside className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700"><h2 className="font-semibold text-slate-900">Your rides</h2><p className="mt-2">Once a driver accepts, this page becomes your live trip view.</p><Link className="mt-4 inline-flex font-semibold text-emerald-700 underline decoration-emerald-300 underline-offset-4 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2" to="/rides/history">View ride history</Link></aside></div></section>;
}

function useRideStatusUpdates({ ride, token, onUpdate, onProposal }) {
  useEffect(() => {
    if (!ride?._id || !token) return undefined;
    const socket = getRideSocket(token);
    const join = () => socket.emit('ride:join', { rideId: ride._id });
    const update = (event) => {
      if (String(event.rideId) !== String(ride._id)) return;
      onUpdate((current) => current.map((item) => String(item._id) === String(event.rideId) ? { ...item, status: event.status, driverId: event.driverId ?? item.driverId, proposedDriverId: event.proposedDriverId ?? item.proposedDriverId, proposedDriver: event.proposedDriver || item.proposedDriver } : item));
      if (event.proposedDriverId && onProposal) onProposal();
    };
    socket.on('connect', join); socket.on('ride:accepted', update); socket.on('ride:status:update', update); socket.on('ride:driver-proposed', update); socket.on('ride:driver-declined', update);
    if (socket.connected) join(); else socket.connect();
    return () => { socket.emit('ride:leave', { rideId: ride._id }); socket.off('connect', join); socket.off('ride:accepted', update); socket.off('ride:status:update', update); socket.off('ride:driver-proposed', update); socket.off('ride:driver-declined', update); };
  }, [onProposal, onUpdate, ride?._id, token]);
}

function ActiveRidePanel({ ride, accessToken, onPaymentStatusChange, onCancelled, onRideUpdated }) {
  const privateRide = ride.isPrivateRide || ride.bookedSeats === RYDA_CONFIG.KEKE_SEAT_CAPACITY;
  const canCancel = ['REQUESTED', 'ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED'].includes(ride.status);
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, new Date(ride.requestExpiresAt || 0).getTime() - Date.now()));
  const [actionError, setActionError] = useState('');
  useEffect(() => {
    if (ride.status !== 'REQUESTED' || ride.paymentStatus !== 'PAID' || ride.proposedDriverId) return undefined;
    const update = () => setRemainingMs(Math.max(0, new Date(ride.requestExpiresAt || 0).getTime() - Date.now()));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [ride.paymentStatus, ride.proposedDriverId, ride.requestExpiresAt, ride.status]);
  const searchExpired = ride.status === 'REQUESTED' && ride.paymentStatus === 'PAID' && !ride.proposedDriverId && (!ride.requestExpiresAt || remainingMs <= 0);
  async function respondToDriver(action) {
    setActionError('');
    try { const { data } = await api.post(`/rides/${ride._id}/${action}`); onRideUpdated(data.ride); }
    catch (error) { setActionError(error.response?.data?.message || 'Unable to update this ride. Please refresh and try again.'); }
  }
  return <article className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"><div className="border-b border-slate-100 p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Active ride</p><h1 className="mt-1 text-2xl font-bold text-slate-950">{statusCopy[ride.status] || 'Ride update'}</h1></div><StatusBadge status={ride.status} /></div><dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4"><Detail label="Pickup" value={ride.pickup?.address || 'Pickup details unavailable'} /><Detail label="Destination" value={ride.destination?.address || 'Destination details unavailable'} /><Detail label="Seats" value={`${ride.bookedSeats || 1} ${ride.bookedSeats === 1 ? 'seat' : 'seats'}${privateRide ? ' · Private Keke' : ''}`} /><Detail label="Fare" value={formatNaira(ride.grossFare)} />{ride.paymentStatus && <Detail label="Payment" value={ride.paymentStatus} />}</dl></div><div className="space-y-4 p-5 sm:p-7">{ride.paymentStatus !== 'PAID' && <RidePaymentPanel ride={ride} onPaymentStatusChange={onPaymentStatusChange} />}{ride.proposedDriverId && ride.status === 'REQUESTED' && <section className="rounded-xl border border-sky-200 bg-sky-50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-sky-950">Driver found</h2><p className="mt-1 text-sm text-sky-900">{ride.proposedDriver?.fullName || 'A verified driver'} wants to take your ride.</p></div><DriverProfileButton rideId={ride._id} /></div><div className="mt-3 flex flex-wrap gap-2"><button className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white" onClick={() => respondToDriver('confirm-driver')} type="button">Accept Driver</button><button className="rounded-lg border border-sky-300 bg-white px-3 py-2 text-sm font-semibold text-sky-800" onClick={() => respondToDriver('decline-driver')} type="button">Decline</button></div></section>}{ride.paymentStatus === 'PAID' && ride.status === 'REQUESTED' && !ride.proposedDriverId && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">Payment confirmed. Looking for a driver...</p>}{canCancel && <RideCancellationPanel ride={ride} onCancelled={onCancelled} />}{ride.status === 'REQUESTED' && ride.paymentStatus !== 'PAID' && <p className="text-sm text-slate-600">Complete payment before a driver can accept this ride.</p>}{ride.status === 'REQUESTED' && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Your pickup and destination are shown below while the request is open.</p>}<RideTrackingMap key={ride._id} ride={ride} accessToken={accessToken} shareRiderLocation={TRACKING_STATUSES.has(ride.status)} /></div></article>;
}

function RidePaymentPanel({ ride, onPaymentStatusChange }) {
  const [payment, setPayment] = useState(null);
  const [authorizationUrl, setAuthorizationUrl] = useState('');
  const [retryAllowed, setRetryAllowed] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(true);
  const paymentStatusChangeRef = useRef(onPaymentStatusChange);
  paymentStatusChangeRef.current = onPaymentStatusChange;

  function handlePaymentError(error, fallback) {
    const details = error.response?.data;
    if (details?.payment?.serviceType === 'RIDE' && String(details.payment.serviceId) === String(ride._id)) {
      setPayment(details.payment);
      setRetryAllowed(details.retryAllowed === true);
      setAuthorizationUrl(details.retryAllowed ? '' : details.payment.authorizationUrl || '');
    }
    setMessage(details?.message || error.message || fallback);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const callbackReference = params.get('reference') || params.get('trxref');
    let cancelled = false;
    setIsSubmitting(true);
    if (callbackReference) setPayment({ reference: callbackReference });
    setMessage('Checking for an existing ride payment...');

    async function restorePayment() {
      try {
        const history = await api.get('/payments/history');
        if (cancelled) return;
        const attempts = (history.data.payments || []).filter((item) => item.serviceType === 'RIDE' && String(item.serviceId) === String(ride._id));
        const existing = attempts.find((item) => item.status === 'PAID')
          || attempts.find((item) => item.reference === callbackReference)
          || attempts.find((item) => item.status === 'PENDING')
          || attempts.find((item) => item.status === 'FAILED');
        const reference = existing?.reference || callbackReference;
        if (!reference) { setMessage(''); return; }
        setPayment(existing || { reference });
        setRetryAllowed(existing?.status === 'FAILED');
        setAuthorizationUrl(existing?.status === 'FAILED' ? '' : existing?.authorizationUrl || '');
        setMessage('Confirming your Paystack payment...');
        const { data } = await api.get(`/payments/verify/${encodeURIComponent(reference)}`);
        if (cancelled) return;
        if (data.payment?.serviceType !== 'RIDE' || String(data.payment.serviceId) !== String(ride._id)) {
          throw new Error('The returned payment belongs to a different booking.');
        }
        if (data.payment.status !== 'PAID') throw new Error('Payment is not verified yet. Use Verify payment / Retry.');
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('reference');
        cleanUrl.searchParams.delete('trxref');
        window.history.replaceState({}, document.title, `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
        await paymentStatusChangeRef.current('PAID');
      } catch (error) {
        if (!cancelled) handlePaymentError(error, 'Payment is not verified yet. Use Verify payment / Retry.');
      } finally {
        if (!cancelled) setIsSubmitting(false);
      }
    }

    restorePayment();
    return () => { cancelled = true; };
  }, [ride._id]);

  async function initializePayment() {
    setIsSubmitting(true);
    setMessage('');
    try {
      const { data } = await api.post('/payments/initialize', { serviceType: 'RIDE', serviceId: ride._id });
      setPayment(data.payment);
      setAuthorizationUrl(data.authorizationUrl || '');
      setRetryAllowed(false);
      if (data.payment?.status === 'PAID' || data.alreadyVerified) {
        await onPaymentStatusChange('PAID');
        setMessage('Ride payment is already confirmed.');
      } else if (data.authorizationUrl) {
        window.location.assign(data.authorizationUrl);
      } else setMessage('A pending payment already exists. Finish checkout and verify it here.');
    } catch (error) {
      handlePaymentError(error, 'Unable to start payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function verifyPayment() {
    if (!payment?.reference) return;
    setIsSubmitting(true);
    setMessage('');
    try {
      const { data } = await api.get(`/payments/verify/${encodeURIComponent(payment.reference)}`);
      if (data.payment?.serviceType !== 'RIDE' || String(data.payment.serviceId) !== String(ride._id)) {
        throw new Error('The returned payment belongs to a different booking.');
      }
      if (data.payment.status !== 'PAID') throw new Error('Payment is not verified yet. You can retry after completing checkout.');
      await onPaymentStatusChange(data.payment.status);
      setMessage('Ride payment verified.');
    } catch (error) {
      handlePaymentError(error, 'Payment is not verified yet. You can retry after completing checkout.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4" aria-label="Ride payment">
      <h2 className="font-semibold text-emerald-950">Pay for your ride</h2>
      <p className="mt-1 text-sm text-emerald-900">Payment status: {payment?.status || ride.paymentStatus || 'PENDING'}</p>
      <p className="mt-1 text-sm text-emerald-900">Complete payment before a driver can accept this ride.</p>
      <p className="mt-2 text-sm leading-6 text-emerald-950">{OFF_PLATFORM_PAYMENT_WARNING}</p>
      {message && <p className="mt-3 text-sm text-emerald-900" role="status">{message}</p>}
      {!payment ? (
        <button className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white disabled:bg-emerald-300" disabled={isSubmitting} onClick={initializePayment} type="button">{isSubmitting ? 'Checking payment...' : `Pay ${formatNaira(ride.grossFare)}`}</button>
      ) : (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-emerald-900">Reference: {payment.reference}</p>
          {retryAllowed ? (
            <button className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white disabled:bg-emerald-300" disabled={isSubmitting} onClick={initializePayment} type="button">{isSubmitting ? 'Starting payment...' : 'Retry payment'}</button>
          ) : (
            <>
              {authorizationUrl && <a className="block text-sm font-medium text-emerald-800 underline" href={authorizationUrl} rel="noreferrer" target="_blank">Open Paystack checkout</a>}
              <button className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white disabled:bg-emerald-300" disabled={isSubmitting} onClick={verifyPayment} type="button">{isSubmitting ? 'Checking payment...' : 'Verify payment'}</button>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function RideCancellationPanel({ ride, onCancelled }) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function cancelRide() {
    setIsSubmitting(true);
    setError('');
    try {
      const { data } = await api.patch(`/rides/${ride._id}/cancel`);
      onCancelled(data.ride);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to cancel this ride. Please try again.');
    } finally {
      setIsSubmitting(false);
      setIsConfirming(false);
    }
  }

  return <section className="space-y-2" aria-label="Ride cancellation">{error && <p className="text-sm text-rose-700" role="alert">{error}</p>}{!isConfirming ? <button className="rounded-lg border border-rose-300 px-4 py-2 font-semibold text-rose-700 hover:bg-rose-50" onClick={() => setIsConfirming(true)} type="button">Cancel Ride</button> : <div className="rounded-lg border border-rose-200 bg-rose-50 p-3"><p className="text-sm font-medium text-rose-900">Cancel this ride?</p><div className="mt-2 flex gap-2"><button className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold" disabled={isSubmitting} onClick={() => setIsConfirming(false)} type="button">Keep Ride</button><button className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-rose-300" disabled={isSubmitting} onClick={cancelRide} type="button">{isSubmitting ? 'Cancelling...' : 'Cancel Ride'}</button></div></div>}</section>;
}

function RideHubHeader() { return <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">RYDA rides</p><h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">Your campus ride hub</h1></div><Link className="text-sm font-semibold text-emerald-700 underline decoration-emerald-300 underline-offset-4" to="/rides/history">Ride history</Link></header>; }
function RidePageMessage({ message, busy = false }) { return <section className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 text-slate-700" aria-busy={busy}><p>{message}</p></section>; }
function RetryNotice({ message, onRetry }) { return <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert"><span>{message}</span><button className="rounded-lg border border-rose-300 bg-white px-3 py-2 font-semibold hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-600 focus:ring-offset-2" onClick={onRetry} type="button">Try again</button></div>; }
function Notice({ tone, children }) { return <p className={`rounded-lg px-3 py-2 text-sm font-medium ${tone === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-800'}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</p>; }
function Detail({ label, value }) { return <div><dt className="font-medium text-slate-500">{label}</dt><dd className="mt-1 font-semibold text-slate-900">{value}</dd></div>; }
function StatusBadge({ status }) { return <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">{status}</span>; }
function SeatSelector({ capacity, bookedSeats, onChange }) { return <fieldset><legend className="text-sm font-semibold text-slate-900">How many seats do you need?</legend><p className="mt-1 text-sm text-slate-600">Choose all {capacity} seats to book a private Keke.</p><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{Array.from({ length: capacity }, (_, index) => index + 1).map((count) => <button key={count} aria-pressed={bookedSeats === count} className={`rounded-xl border px-3 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 ${bookedSeats === count ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-600' : 'border-slate-200 text-slate-700 hover:border-emerald-400 hover:bg-emerald-50/50'}`} onClick={() => onChange(count)} type="button"><span className="block font-semibold">{count} {count === 1 ? 'seat' : 'seats'}</span><span className="mt-1 block text-sm">{formatNaira(count * RYDA_CONFIG.RIDE_FARE_PER_SEAT_NGN)}</span>{count === capacity && <span className="mt-1 block text-xs font-medium">Private Keke</span>}</button>)}</div></fieldset>; }
function FarePreview({ bookedSeats, capacity, fare }) { return <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-emerald-950">Fare preview</p><p className="mt-1 text-sm text-emerald-900">{bookedSeats} {bookedSeats === 1 ? 'seat' : 'seats'} at {formatNaira(RYDA_CONFIG.RIDE_FARE_PER_SEAT_NGN)} each</p></div><p className="text-2xl font-bold text-emerald-950">{formatNaira(fare)}</p></div>{bookedSeats === capacity && <p className="mt-3 rounded-lg bg-white/70 px-3 py-2 text-sm font-medium text-emerald-900">Private Keke selected: all {capacity} seats are reserved for your trip.</p>}</div>; }
function LocationFields({ label, placeholder, location, onChange }) {
  const [query, setQuery] = useState(location.address || '');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const apiKey = import.meta.env.VITE_OPENROUTESERVICE_API_KEY;

  useEffect(() => { setQuery(location.address || ''); }, [location.address]);
  useEffect(() => {
    if (query.trim().length < 3 || !apiKey) { setSuggestions([]); return undefined; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true); setError('');
      try {
        const params = new URLSearchParams({ api_key: apiKey, text: query.trim(), size: '5', 'boundary.country': 'NGA' });
        const response = await fetch(`https://api.heigit.org/pelias/v1/autocomplete?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error('Location search unavailable.');
        const data = await response.json();
        if (controller.signal.aborted) return;
        const results = Array.isArray(data.features) ? data.features.filter(isNigeriaFeature) : [];
        setSuggestions(results);
        if (!results.length) setError('No matching locations in Nigeria. Try another address.');
      } catch (requestError) { if (requestError.name !== 'AbortError') setError('Location search unavailable.'); }
      finally { setLoading(false); }
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [apiKey, query]);

  function selectFeature(feature) {
    if (!isNigeriaFeature(feature)) return;
    const [longitude, latitude] = feature.geometry?.coordinates || [];
    if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) return;
    const address = feature.properties?.label || feature.properties?.name || query.trim();
    setQuery(address); setSuggestions([]); onChange('address', address); onChange('latitude', Number(latitude)); onChange('longitude', Number(longitude));
  }

  function editAddress(event) { setQuery(event.target.value); setSuggestions([]); onChange('address', event.target.value); onChange('latitude', ''); onChange('longitude', ''); }
  function useCurrentLocation() {
    if (!navigator.geolocation) { setError('Location permission is off. Search for your pickup location instead.'); return; }
    if (!apiKey) { setError('Location search is unavailable. Please try again when it is configured.'); return; }
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      setError('');
      try {
        const params = new URLSearchParams({ api_key: apiKey, 'point.lat': String(coords.latitude), 'point.lon': String(coords.longitude) });
        const response = await fetch(`https://api.heigit.org/pelias/v1/reverse?${params}`);
        if (!response.ok) throw new Error('Unable to confirm your current location. Search for a pickup in Nigeria.');
        const data = await response.json();
        const feature = data.features?.[0];
        if (!isNigeriaFeature(feature)) throw new Error('Choose a pickup location in Nigeria for the RYDA demo.');
        const address = feature.properties?.label || 'Current location';
        setQuery(address); onChange('address', address); onChange('latitude', coords.latitude); onChange('longitude', coords.longitude);
      } catch (locationError) { setQuery(''); setSuggestions([]); onChange('address', ''); onChange('latitude', ''); onChange('longitude', ''); setError(locationError.message || 'Unable to confirm your current location. Search for a pickup in Nigeria.'); }
    }, () => setError('Location permission is off. Search for your pickup location instead.'));
  }

  return <fieldset className="space-y-3"><legend className="text-sm font-semibold text-slate-900">{label}</legend><label className="relative block text-sm font-medium text-slate-700">{label === 'Pickup point' ? 'Where should your driver meet you?' : 'Where are you going?'}<input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" onChange={editAddress} placeholder={placeholder} required value={query} />{suggestions.length > 0 && <div className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">{suggestions.map((feature) => <button className="block w-full px-3 py-2 text-left text-sm hover:bg-emerald-50" key={feature.properties?.id || feature.properties?.label} onClick={() => selectFeature(feature)} type="button">{feature.properties?.label || feature.properties?.name}</button>)}</div>}</label>{label === 'Pickup point' && <button className="text-sm font-semibold text-emerald-700" onClick={useCurrentLocation} type="button">Use my current location</button>}{loading && <p className="text-xs text-slate-500">Searching locations…</p>}{error && <p className="text-sm text-amber-800" role="status">{error}</p>}</fieldset>;
}

class RideHubErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  render() { if (this.state.failed) return <section className="mx-auto max-w-3xl rounded-xl border border-rose-200 bg-white p-6 text-slate-700"><h1 className="text-xl font-bold text-slate-950">Your ride hub needs to reload</h1><p className="mt-2">A ride screen error occurred. Your booking and ride data have not been changed.</p><button className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white" onClick={() => window.location.reload()} type="button">Reload ride hub</button></section>; return this.props.children; }
}
