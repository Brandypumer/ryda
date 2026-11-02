import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../shared/lib/api.js';
import { useAuth } from '../identity';
import { DriverRideLocationPublisher, DriverRideTrackingMap } from '../rides';
import { CourierDriverLocationPublisher } from '../courier/CourierTracking.jsx';

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || fallback;
}

function locationLabel(location) {
  return location?.address || 'Location details unavailable';
}

function amount(value) {
  return typeof value === 'number'
    ? new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value)
    : 'Integration pending';
}

function eligibilityMessage(dashboard) {
  if (!dashboard) return null;
  if (dashboard.verificationStatus !== 'APPROVED') {
    return 'Your verification must be approved before you can go online.';
  }
  if (dashboard.availability?.isSuspended) {
    return 'Your driver account is suspended. Contact an administrator before going online.';
  }
  if (dashboard.liabilities?.available === false) {
    return 'Eligibility is temporarily unavailable while platform-fee information is connecting.';
  }
  if (Number(dashboard.liabilities?.overdueTotal || 0) > 0) {
    return 'Settle overdue platform fees before going online.';
  }
  return null;
}

export function VerificationBadge({ status }) {
  const colors = {
    APPROVED: 'bg-emerald-100 text-emerald-800',
    REJECTED: 'bg-rose-100 text-rose-800',
    PENDING: 'bg-amber-100 text-amber-800'
  };

  return <span className={`rounded-full px-3 py-1 text-sm font-semibold ${colors[status] || 'bg-slate-100 text-slate-700'}`}>{status || 'PENDING'}</span>;
}

export function AvailabilityToggle({ isOnline, blocked, isSaving, onChange }) {
  const canTurnOnline = isOnline || !blocked;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={Boolean(isOnline)}
      disabled={isSaving || !canTurnOnline}
      onClick={() => onChange(!isOnline)}
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left font-semibold transition ${isOnline ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-slate-300 bg-white text-slate-800'} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      <span className={`h-3 w-3 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      {isSaving ? 'Updating availability…' : isOnline ? 'Online — tap to go offline' : 'Offline — tap to go online'}
    </button>
  );
}

export function ActiveAssignmentCard({ assignment }) {
  if (!assignment) {
    return <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">No active ride or courier assignment.</p>;
  }

  return (
    <article className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-indigo-950">Active {assignment.serviceType.toLowerCase()}</h3>
        <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-indigo-800">{assignment.status}</span>
      </div>
      <p className="mt-3 text-sm text-slate-700"><span className="font-medium">Pickup:</span> {locationLabel(assignment.pickup)}</p>
      <p className="mt-1 text-sm text-slate-700"><span className="font-medium">{assignment.serviceType === 'RIDE' ? 'Destination' : 'Drop-off'}:</span> {locationLabel(assignment.dropoff)}</p>
    </article>
  );
}

export function RequestFeed({ requests, loading, acceptingId, onAccept }) {
  if (loading) return <p className="text-sm text-slate-600">Loading available requests…</p>;
  if (!requests.length) return <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">No ride or courier requests are available right now.</p>;

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {requests.map((request) => (
        <article key={`${request.serviceType}-${request.id}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className={`rounded px-2 py-1 text-xs font-bold ${request.serviceType === 'RIDE' ? 'bg-sky-100 text-sky-800' : 'bg-violet-100 text-violet-800'}`}>{request.serviceType}</span>
            {request.serviceType === 'RIDE' && request.bookedSeats != null && <span className="text-sm font-medium text-slate-700">{request.bookedSeats} seat{request.bookedSeats === 1 ? '' : 's'}</span>}
          </div>
          <p className="mt-3 text-sm text-slate-700"><span className="font-medium">Pickup:</span> {locationLabel(request.pickup)}</p>
          <p className="mt-1 text-sm text-slate-700"><span className="font-medium">{request.serviceType === 'RIDE' ? 'Destination' : 'Drop-off'}:</span> {locationLabel(request.destination || request.dropoff)}</p>
          {request.serviceType === 'RIDE' && (request.isPrivateRide || request.bookedSeats === 4) && <p className="mt-2 text-sm font-semibold text-indigo-800">Private Keke</p>}
          {request.serviceType === 'COURIER' && (request.recipientName || request.packageDescription) && <p className="mt-2 text-sm text-slate-700"><span className="font-medium">Courier:</span> {[request.recipientName, request.packageDescription].filter(Boolean).join(' · ')}</p>}
          {typeof (request.fare ?? request.grossFare) === 'number' && <p className="mt-3 text-sm font-semibold text-slate-900">Fare: {amount(request.fare ?? request.grossFare)}</p>}
          <button type="button" disabled={Boolean(acceptingId)} onClick={() => onAccept(request)} className="mt-4 rounded-lg bg-indigo-700 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60">{acceptingId === request.id ? 'Accepting…' : `Accept ${request.serviceType}`}</button>
        </article>
      ))}
    </div>
  );
}

export function DashboardSummaries({ dashboard }) {
  const completed = dashboard.completed || {};
  const wallet = dashboard.wallet;
  const liabilities = dashboard.liabilities;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-medium text-slate-600">Completed rides</h3>
        <p className="mt-2 text-2xl font-bold">{completed.rides ?? '—'}</p>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-medium text-slate-600">Completed courier deliveries</h3>
        <p className="mt-2 text-2xl font-bold">{completed.courier ?? '—'}</p>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-medium text-slate-600">Wallet</h3>
        <p className="mt-2 text-lg font-bold">{amount(wallet?.availableBalance)}</p>
        <p className="mt-1 text-xs text-slate-500">Wallet values are supplied by Payments.</p>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-medium text-slate-600">Outstanding liabilities</h3>
        <p className="mt-2 text-lg font-bold">{amount(liabilities?.outstandingTotal)}</p>
        <p className="mt-1 text-xs text-slate-500">Fee settlement is supplied by Payments.</p>
      </section>
    </div>
  );
}

export default function DriverDashboardPage() {
  const { token, user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestSources, setRequestSources] = useState({ ride: true, courier: true });
  const [acceptingId, setAcceptingId] = useState('');
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [error, setError] = useState('');
  const [requestError, setRequestError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [driverLocation, setDriverLocation] = useState(null);

  const loadRequests = useCallback(async () => {
    setRequestLoading(true);
    setRequestError('');
    try {
      const response = await api.get('/driver/requests');
      setRequests(Array.isArray(response.data?.requests) ? response.data.requests : []);
      setRequestSources(response.data?.sources || { ride: true, courier: true });
    } catch (requestErrorResponse) {
      setRequests([]);
      setRequestSources({ ride: true, courier: true });
      setRequestError(getErrorMessage(requestErrorResponse, 'Unable to load available requests.'));
    } finally {
      setRequestLoading(false);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/driver/dashboard');
      setDashboard(response.data?.dashboard || null);
      await loadRequests();
    } catch (dashboardError) {
      setDashboard(null);
      setRequests([]);
      setError(getErrorMessage(dashboardError, 'Unable to load the driver dashboard.'));
    } finally {
      setLoading(false);
    }
  }, [loadRequests]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  useEffect(() => {
    setDriverLocation(null);
  }, [dashboard?.activeAssignment?.id]);

  const updateDriverLocation = useCallback((location) => setDriverLocation(location), []);

  const blockedMessage = useMemo(() => eligibilityMessage(dashboard), [dashboard]);

  async function updateAvailability(isOnline) {
    setSavingAvailability(true);
    setError('');
    setFeedback('');
    try {
      const response = await api.patch('/driver/availability', { isOnline });
      setDashboard((current) => current ? {
        ...current,
        availability: { ...current.availability, ...response.data?.availability }
      } : current);
      setFeedback(isOnline ? 'You are now online and can receive requests.' : 'You are now offline and will not receive new requests.');
      if (isOnline) await loadRequests();
    } catch (availabilityError) {
      setError(getErrorMessage(availabilityError, 'Unable to update availability.'));
    } finally {
      setSavingAvailability(false);
    }
  }

  async function acceptRequest(request) {
    const endpoint = request.serviceType === 'RIDE'
      ? `/rides/${request.id}/accept`
      : `/courier/${request.id}/accept`;
    setAcceptingId(request.id);
    setRequestError('');
    setFeedback('');
    try {
      await api.post(endpoint);
      setFeedback(`${request.serviceType} request accepted. Your dashboard has been refreshed.`);
      await loadDashboard();
    } catch (acceptError) {
      setRequestError(getErrorMessage(acceptError, `Unable to accept this ${request.serviceType.toLowerCase()} request.`));
    } finally {
      setAcceptingId('');
    }
  }

  if (loading) {
    return <main className="mx-auto max-w-6xl p-6" aria-busy="true"><p className="text-slate-600">Loading driver dashboard…</p></main>;
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">Driver operations</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">Driver dashboard</h1>
          <p className="mt-2 text-slate-600">Manage availability, current work, and incoming campus requests.</p>
        </div>
        <button type="button" onClick={loadDashboard} className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-800 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2">Refresh dashboard</button>
      </header>

      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">{error}</p>}
      {feedback && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">{feedback}</p>}

      {!dashboard ? <p className="rounded-lg border border-slate-200 bg-white p-4 text-slate-700">Dashboard data is unavailable. Refresh to try again.</p> : <>
        <nav className="flex flex-wrap gap-2" aria-label="Driver dashboard links">
          <Link className="rounded-lg bg-indigo-700 px-3 py-2 text-sm font-semibold text-white" to="/driver">Dashboard</Link>
          <Link className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" to="/driver-verification">Verification</Link>
          <Link className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" to="/payments">Wallet</Link>
          <Link className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" to="/profile">Profile</Link>
        </nav>

        <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-3">
          <div>
            <p className="text-sm font-medium text-slate-600">Verification</p>
            <div className="mt-2"><VerificationBadge status={dashboard.verificationStatus} /></div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600">Availability</p>
            <p className={`mt-1 text-sm font-semibold ${dashboard.availability?.isOnline ? 'text-emerald-700' : 'text-slate-600'}`}>{dashboard.availability?.isOnline ? 'Currently online' : 'Currently offline'}</p>
            <div className="mt-2"><AvailabilityToggle isOnline={Boolean(dashboard.availability?.isOnline)} blocked={Boolean(blockedMessage)} isSaving={savingAvailability} onChange={updateAvailability} /></div>
          </div>
          <div className="flex items-end">
            <Link className="w-full rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-left text-sm font-semibold text-indigo-900 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2" to="/payments">Wallet & fee settlement<br /><span className="font-normal">Review balances and outstanding fees</span></Link>
          </div>
        </section>

        {blockedMessage && <section role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950"><span className="font-semibold">You cannot go online yet. </span>{blockedMessage}</section>}

        <DashboardSummaries dashboard={dashboard} />

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Active assignment</h2><p className="mt-1 text-sm text-slate-600">Only your current Ride or Courier delivery is shown here.</p></div></div>
          <ActiveAssignmentCard assignment={dashboard.activeAssignment} />
          {dashboard.assignmentConflict && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">This driver has conflicting active assignments. Complete or resolve one before accepting another request.</p>}
          {dashboard.activeAssignment?.serviceType === 'RIDE' && <>
            <DriverRideLocationPublisher
              ride={{ _id: dashboard.activeAssignment.id, status: dashboard.activeAssignment.status, driverId: user?.id }}
              accessToken={token}
              isAssignedDriver
              onLocationChange={updateDriverLocation}
            />
            <DriverRideTrackingMap
              ride={{
                _id: dashboard.activeAssignment.id,
                status: dashboard.activeAssignment.status,
                pickup: dashboard.activeAssignment.pickup,
                destination: dashboard.activeAssignment.dropoff
              }}
              accessToken={token}
              driverLocation={driverLocation}
            />
          </>}
          {dashboard.activeAssignment?.serviceType === 'COURIER' && <CourierDriverLocationPublisher courier={{ _id: dashboard.activeAssignment.id, status: dashboard.activeAssignment.status, driverId: user?.id }} currentUserId={user?.id} />}
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Available requests</h2><p className="mt-1 text-sm text-slate-600">Accept one eligible Ride or Courier request at a time.</p></div><button type="button" onClick={loadRequests} disabled={requestLoading} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60">Refresh requests</button></div>
          {requestError && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{requestError}</p>}
          {requestSources.ride === false && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Ride opportunities are temporarily unavailable while the Ride module is being integrated.</p>}
          {requestSources.courier === false && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Courier opportunities are temporarily unavailable while the Courier module is being integrated.</p>}
          <RequestFeed requests={requests} loading={requestLoading} acceptingId={acceptingId} onAccept={acceptRequest} />
        </section>
      </>}
    </main>
  );
}
