import { useMemo, useState } from 'react';
import { api } from '../../../shared/lib/api';
import { RYDA_CONFIG } from '../../../shared/constants/rydaConfig.js';

const OFF_PLATFORM_PAYMENT_WARNING =
  'For your safety and transaction traceability, make payments only through Ryda. Payments made outside Ryda cannot be verified through our platform and are not covered by Ryda payment records or dispute support.';

const initialLocation = { address: '', latitude: '', longitude: '' };

function hasValidCoordinates(location) {
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);

  return (
    String(location.latitude).trim() !== '' &&
    String(location.longitude).trim() !== '' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function formatNaira(amount) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  }).format(amount);
}

export default function RideBookingPage() {
  const [pickup, setPickup] = useState(initialLocation);
  const [destination, setDestination] = useState(initialLocation);
  const [bookedSeats, setBookedSeats] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const capacity = RYDA_CONFIG.KEKE_SEAT_CAPACITY;
  const isValidSeatCount = Number.isInteger(bookedSeats) && bookedSeats >= 1 && bookedSeats <= capacity;
  const fare = useMemo(() => bookedSeats * RYDA_CONFIG.RIDE_FARE_PER_SEAT_NGN, [bookedSeats]);
  const isPrivateRide = bookedSeats === capacity;

  const updateLocation = (setter, field) => (event) => {
    setter((location) => ({ ...location, [field]: event.target.value }));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!pickup.address.trim() || !destination.address.trim()) {
      setError('Enter both your pickup point and destination.');
      return;
    }

    if (!isValidSeatCount) {
      setError(`Choose between 1 and ${capacity} seats.`);
      return;
    }

    if (!hasValidCoordinates(pickup) || !hasValidCoordinates(destination)) {
      setError('Add valid map coordinates for both locations before requesting your ride.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/rides', {
        pickup: {
          address: pickup.address.trim(),
          latitude: Number(pickup.latitude),
          longitude: Number(pickup.longitude)
        },
        destination: {
          address: destination.address.trim(),
          latitude: Number(destination.latitude),
          longitude: Number(destination.longitude)
        },
        bookedSeats
      });
      setSuccess('Ride request sent. We will notify you when a driver accepts it.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to request a ride. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl py-2 sm:py-6">
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <header className="border-b border-slate-100 pb-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Campus ride</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Book a Keke</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Tell us where you are going, choose up to {capacity} seats, and send your request to available drivers.
          </p>
        </header>

        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-5">
            <LocationFields
              label="Pickup point"
              placeholder="e.g. Main Gate"
              location={pickup}
              onChange={updateLocation(setPickup)}
            />
            <LocationFields
              label="Destination"
              placeholder="e.g. Faculty of Engineering"
              location={destination}
              onChange={updateLocation(setDestination)}
            />
          </div>

          <fieldset>
            <legend className="text-sm font-semibold text-slate-900">How many seats do you need?</legend>
            <p className="mt-1 text-sm text-slate-600">Choose all {capacity} seats to book a private Keke.</p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: capacity }, (_, index) => index + 1).map((seatCount) => (
                <button
                  key={seatCount}
                  aria-pressed={bookedSeats === seatCount}
                  className={`rounded-xl border px-3 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 ${
                    bookedSeats === seatCount
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-600'
                      : 'border-slate-200 text-slate-700 hover:border-emerald-400 hover:bg-emerald-50/50'
                  }`}
                  onClick={() => setBookedSeats(seatCount)}
                  type="button"
                >
                  <span className="block font-semibold">
                    {seatCount} {seatCount === 1 ? 'seat' : 'seats'}
                  </span>
                  <span className="mt-1 block text-sm">{formatNaira(seatCount * RYDA_CONFIG.RIDE_FARE_PER_SEAT_NGN)}</span>
                  {seatCount === capacity && <span className="mt-1 block text-xs font-medium">Private Keke</span>}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-emerald-950">Fare preview</p>
                <p className="mt-1 text-sm text-emerald-900">
                  {bookedSeats} {bookedSeats === 1 ? 'seat' : 'seats'} at {formatNaira(RYDA_CONFIG.RIDE_FARE_PER_SEAT_NGN)} each
                </p>
              </div>
              <p className="text-2xl font-bold text-emerald-950">{formatNaira(fare)}</p>
            </div>
            {isPrivateRide && (
              <p className="mt-3 rounded-lg bg-white/70 px-3 py-2 text-sm font-medium text-emerald-900">
                Private Keke selected: all {capacity} seats are reserved for your trip.
              </p>
            )}
          </div>

          <aside className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950" aria-label="Platform payment notice">
            <span className="font-semibold">Pay through Ryda</span>
            <p className="mt-1">{OFF_PLATFORM_PAYMENT_WARNING}</p>
          </aside>

          <div className="min-h-11" aria-live="polite">
            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700" role="alert">
                {error}
              </p>
            )}
            {success && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800" role="status">
                {success}
              </p>
            )}
          </div>

          <button
            className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-emerald-300"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Sending ride request…' : 'Request a ride'}
          </button>
        </form>
      </div>
    </section>
  );
}

function LocationFields({ label, placeholder, location, onChange }) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-slate-900">{label}</legend>
      <label className="block text-sm font-medium text-slate-700">
        Address
        <input
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          onChange={onChange('address')}
          placeholder={placeholder}
          required
          value={location.address}
        />
      </label>
      <details className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">
          Add map coordinates required by the current ride service
        </summary>
        <p className="mt-2 text-xs leading-5 text-slate-600">
          These help drivers locate your pickup and destination. They are required by the existing ride API.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm text-slate-700">
            Latitude
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              inputMode="decimal"
              onChange={onChange('latitude')}
              step="any"
              type="number"
              value={location.latitude}
            />
          </label>
          <label className="text-sm text-slate-700">
            Longitude
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              inputMode="decimal"
              onChange={onChange('longitude')}
              step="any"
              type="number"
              value={location.longitude}
            />
          </label>
        </div>
      </details>
    </fieldset>
  );
}
