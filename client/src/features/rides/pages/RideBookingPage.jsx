import { Component, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';

import { RYDA_CONFIG } from '../../../shared/constants/rydaConfig.js';
import { api } from '../../../shared/lib/api';
import { useAuth } from '../../identity';
import RideTrackingMap from '../components/RideTrackingMap';
import { getRideSocket } from '../lib/rideSocket';

const ACTIVE_RIDE_STATUSES = new Set(['REQUESTED', 'ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'IN_PROGRESS']);
const TRACKING_STATUSES = new Set(['ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'IN_PROGRESS']);
const OFF_PLATFORM_PAYMENT_WARNING =
  'For your safety and transaction traceability, make payments only through RYDA. Payments made outside RYDA cannot be verified through our platform and are not covered by RYDA payment records or dispute support.';
const initialLocation = { address: '', latitude: '', longitude: '' };
const statusCopy = {
  REQUESTED: 'Looking for a driver',
  ACCEPTED: 'Driver accepted your ride',
  DRIVER_ARRIVING: 'Driver is on the way',
  DRIVER_ARRIVED: 'Driver has arrived',
  IN_PROGRESS: 'Ride in progress'
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
  useRideStatusUpdates({ ride: activeRide, token, onUpdate: setRides });

  if (isRestoring) return <RidePageMessage message="Checking your saved session…" />;
  if (!isAuthenticated) return <Navigate replace to="/login" />;
  if (user?.role !== 'RIDER') return <RidePageMessage message="The ride hub is available to rider accounts. Switch to the workflow for your account role." />;
  if (isLoading) return <RidePageMessage message="Loading your ride hub…" busy />;

  if (activeRide) {
    return <section className="mx-auto max-w-6xl space-y-5 py-2 sm:py-6"><RideHubHeader />{loadError && <RetryNotice message={loadError} onRetry={loadRides} />}{success && <Notice tone="success">{success}</Notice>}<ActiveRidePanel ride={activeRide} accessToken={token} /></section>;
  }

  const capacity = RYDA_CONFIG.KEKE_SEAT_CAPACITY;
  const fare = bookedSeats * RYDA_CONFIG.RIDE_FARE_PER_SEAT_NGN;

  async function handleSubmit(event) {
    event.preventDefault();
    setBookingError('');
    setSuccess('');
    if (!pickup.address.trim() || !destination.address.trim()) return setBookingError('Enter both your pickup point and destination.');
    if (!Number.isInteger(bookedSeats) || bookedSeats < 1 || bookedSeats > capacity) return setBookingError(`Choose between 1 and ${capacity} seats.`);
    if (!hasValidCoordinates(pickup) || !hasValidCoordinates(destination)) return setBookingError('Add valid map coordinates for both locations before requesting your ride.');
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

function useRideStatusUpdates({ ride, token, onUpdate }) {
  useEffect(() => {
    if (!ride?._id || !token) return undefined;
    const socket = getRideSocket(token);
    const join = () => socket.emit('ride:join', { rideId: ride._id });
    const update = (event) => {
      if (String(event.rideId) !== String(ride._id)) return;
      onUpdate((current) => current.map((item) => String(item._id) === String(event.rideId) ? { ...item, status: event.status, driverId: event.driverId ?? item.driverId } : item));
    };
    socket.on('connect', join); socket.on('ride:accepted', update); socket.on('ride:status:update', update);
    if (socket.connected) join(); else socket.connect();
    return () => { socket.emit('ride:leave', { rideId: ride._id }); socket.off('connect', join); socket.off('ride:accepted', update); socket.off('ride:status:update', update); };
  }, [onUpdate, ride?._id, token]);
}

function ActiveRidePanel({ ride, accessToken }) {
  const privateRide = ride.isPrivateRide || ride.bookedSeats === RYDA_CONFIG.KEKE_SEAT_CAPACITY;
  return <article className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"><div className="border-b border-slate-100 p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Active ride</p><h1 className="mt-1 text-2xl font-bold text-slate-950">{statusCopy[ride.status] || 'Ride update'}</h1></div><StatusBadge status={ride.status} /></div><dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4"><Detail label="Pickup" value={ride.pickup?.address || 'Pickup details unavailable'} /><Detail label="Destination" value={ride.destination?.address || 'Destination details unavailable'} /><Detail label="Seats" value={`${ride.bookedSeats || 1} ${ride.bookedSeats === 1 ? 'seat' : 'seats'}${privateRide ? ' · Private Keke' : ''}`} /><Detail label="Fare" value={formatNaira(ride.grossFare)} />{ride.paymentStatus && <Detail label="Payment" value={ride.paymentStatus} />}</dl></div><div className="p-5 sm:p-7">{ride.status === 'REQUESTED' && <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Looking for a driver. Your pickup and destination are shown below while the request is open.</p>}<RideTrackingMap key={ride._id} ride={ride} accessToken={accessToken} shareRiderLocation={TRACKING_STATUSES.has(ride.status)} /></div></article>;
}

function RideHubHeader() { return <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">RYDA rides</p><h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">Your campus ride hub</h1></div><Link className="text-sm font-semibold text-emerald-700 underline decoration-emerald-300 underline-offset-4" to="/rides/history">Ride history</Link></header>; }
function RidePageMessage({ message, busy = false }) { return <section className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 text-slate-700" aria-busy={busy}><p>{message}</p></section>; }
function RetryNotice({ message, onRetry }) { return <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert"><span>{message}</span><button className="rounded-lg border border-rose-300 bg-white px-3 py-2 font-semibold hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-600 focus:ring-offset-2" onClick={onRetry} type="button">Try again</button></div>; }
function Notice({ tone, children }) { return <p className={`rounded-lg px-3 py-2 text-sm font-medium ${tone === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-800'}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</p>; }
function Detail({ label, value }) { return <div><dt className="font-medium text-slate-500">{label}</dt><dd className="mt-1 font-semibold text-slate-900">{value}</dd></div>; }
function StatusBadge({ status }) { return <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">{status}</span>; }
function SeatSelector({ capacity, bookedSeats, onChange }) { return <fieldset><legend className="text-sm font-semibold text-slate-900">How many seats do you need?</legend><p className="mt-1 text-sm text-slate-600">Choose all {capacity} seats to book a private Keke.</p><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{Array.from({ length: capacity }, (_, index) => index + 1).map((count) => <button key={count} aria-pressed={bookedSeats === count} className={`rounded-xl border px-3 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 ${bookedSeats === count ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-600' : 'border-slate-200 text-slate-700 hover:border-emerald-400 hover:bg-emerald-50/50'}`} onClick={() => onChange(count)} type="button"><span className="block font-semibold">{count} {count === 1 ? 'seat' : 'seats'}</span><span className="mt-1 block text-sm">{formatNaira(count * RYDA_CONFIG.RIDE_FARE_PER_SEAT_NGN)}</span>{count === capacity && <span className="mt-1 block text-xs font-medium">Private Keke</span>}</button>)}</div></fieldset>; }
function FarePreview({ bookedSeats, capacity, fare }) { return <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-emerald-950">Fare preview</p><p className="mt-1 text-sm text-emerald-900">{bookedSeats} {bookedSeats === 1 ? 'seat' : 'seats'} at {formatNaira(RYDA_CONFIG.RIDE_FARE_PER_SEAT_NGN)} each</p></div><p className="text-2xl font-bold text-emerald-950">{formatNaira(fare)}</p></div>{bookedSeats === capacity && <p className="mt-3 rounded-lg bg-white/70 px-3 py-2 text-sm font-medium text-emerald-900">Private Keke selected: all {capacity} seats are reserved for your trip.</p>}</div>; }
function LocationFields({ label, placeholder, location, onChange }) { return <fieldset className="space-y-3"><legend className="text-sm font-semibold text-slate-900">{label}</legend><label className="block text-sm font-medium text-slate-700">Address<input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" onChange={(event) => onChange('address', event.target.value)} placeholder={placeholder} required value={location.address} /></label><details className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><summary className="cursor-pointer text-sm font-medium text-slate-700">Add map coordinates required by the current ride service</summary><p className="mt-2 text-xs leading-5 text-slate-600">These help drivers locate your pickup and destination. They are required by the existing ride API.</p><div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="text-sm text-slate-700">Latitude<input className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" inputMode="decimal" onChange={(event) => onChange('latitude', event.target.value)} step="any" type="number" value={location.latitude} /></label><label className="text-sm text-slate-700">Longitude<input className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" inputMode="decimal" onChange={(event) => onChange('longitude', event.target.value)} step="any" type="number" value={location.longitude} /></label></div></details></fieldset>; }

class RideHubErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  render() { if (this.state.failed) return <section className="mx-auto max-w-3xl rounded-xl border border-rose-200 bg-white p-6 text-slate-700"><h1 className="text-xl font-bold text-slate-950">Your ride hub needs to reload</h1><p className="mt-2">A ride screen error occurred. Your booking and ride data have not been changed.</p><button className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white" onClick={() => window.location.reload()} type="button">Reload ride hub</button></section>; return this.props.children; }
}
