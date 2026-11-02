import { useCallback, useEffect, useState } from 'react';
import { RYDA_CONFIG } from '../../shared/constants/rydaConfig.js';
import { api } from '../../shared/lib/api.js';
import { CourierLiveTracking } from './CourierTracking.jsx';

const initialForm = {
  recipientName: '', recipientPhone: '', packageDescription: '',
  pickupAddress: '', dropoffAddress: ''
};

function apiError(error, fallback) {
  return error.response?.data?.message || fallback;
}

function naira(value) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value);
}

function validLocation(value, label) {
  if (!value.address.trim()) return `${label} address is required.`;
  return null;
}

function canCancel(courier) {
  return courier?.status === 'REQUESTED' || (courier?.status === 'ACCEPTED' && courier?.paymentStatus === 'PENDING');
}

export function CourierCreateForm({ onCreated }) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    const required = [
      ['recipientName', 'Recipient name'], ['recipientPhone', 'Recipient phone'], ['packageDescription', 'Package description']
    ].find(([field]) => !form[field].trim());
    const locationError = validLocation({ address: form.pickupAddress }, 'Pickup')
      || validLocation({ address: form.dropoffAddress }, 'Drop-off');
    if (required || locationError) {
      setError(required ? `${required[1]} is required.` : locationError);
      return;
    }

    const payload = {
      recipientName: form.recipientName.trim(),
      recipientPhone: form.recipientPhone.trim(),
      packageDescription: form.packageDescription.trim(),
      pickup: { address: form.pickupAddress.trim() },
      dropoff: { address: form.dropoffAddress.trim() }
    };

    setSubmitting(true);
    try {
      const response = await api.post('/courier', payload);
      setSuccess('Courier request created successfully.');
      setForm(initialForm);
      onCreated(response.data?.courier);
    } catch (createError) {
      setError(apiError(createError, 'Unable to create your courier request.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold">Send a package or document</h2>
      <p className="mt-1 text-sm text-slate-600">Courier fare: <span className="font-semibold text-slate-900">{naira(RYDA_CONFIG.COURIER_FARE_NGN)}</span></p>
      <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">For your safety and transaction traceability, make payments only through Ryda. Payments made outside Ryda cannot be verified through our platform and are not covered by Ryda payment records or dispute support.</p>
      {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {success && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
      <form className="mt-5 space-y-5" onSubmit={submit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Recipient name" name="recipientName" value={form.recipientName} onChange={update} placeholder="e.g. Ada Okafor" />
          <Field label="Recipient phone" name="recipientPhone" value={form.recipientPhone} onChange={update} placeholder="e.g. 08012345678" />
        </div>
        <label className="block text-sm font-medium text-slate-800">Package description<textarea name="packageDescription" value={form.packageDescription} onChange={update} rows="3" placeholder="e.g. Document envelope" className="mt-1 w-full rounded-lg border border-slate-300 p-2" /></label>
        <LocationFields title="Pickup" prefix="pickup" form={form} onChange={update} placeholder="e.g. School Library entrance" />
        <LocationFields title="Drop-off" prefix="dropoff" form={form} onChange={update} placeholder="e.g. Hostel Block B" />
        <button type="submit" disabled={submitting} className="rounded-lg bg-indigo-700 px-4 py-3 font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'Creating courier request…' : 'Create courier request'}</button>
      </form>
    </section>
  );
}

function Field({ label, name, value, onChange, type = 'text', placeholder }) {
  return <label className="block text-sm font-medium text-slate-800">{label}<input required type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} className="mt-1 w-full rounded-lg border border-slate-300 p-2" /></label>;
}

function LocationFields({ title, prefix, form, onChange, placeholder }) {
  return (
    <fieldset className="rounded-lg border border-slate-200 p-4">
      <legend className="px-1 text-sm font-semibold text-slate-800">{title}</legend>
      <Field label="Address" name={`${prefix}Address`} value={form[`${prefix}Address`]} onChange={onChange} placeholder={placeholder} />
    </fieldset>
  );
}

export function CourierDetail({ courier, loading, error, onCancel, cancelling, onCourierUpdate }) {
  const [payment, setPayment] = useState(null);
  const [authorizationUrl, setAuthorizationUrl] = useState('');
  const [paymentStatus, setPaymentStatus] = useState(courier?.paymentStatus);

  useEffect(() => {
    setPaymentStatus(courier?.paymentStatus);
    if (courier?.paymentStatus === 'PAID') {
      setPayment(null);
      setAuthorizationUrl('');
    }
  }, [courier?._id, courier?.paymentStatus]);

  if (loading) return <p className="text-sm text-slate-600">Loading courier details…</p>;
  if (error) return <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>;
  if (!courier) return <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">Select a courier request to view its details.</p>;

  async function initializePayment() {
    try {
      const response = await api.post('/payments/initialize', { serviceType: 'COURIER', serviceId: courier._id });
      setPayment(response.data.payment);
      setAuthorizationUrl(response.data.authorizationUrl || '');
    } catch (_error) {
      setAuthorizationUrl('');
    }
  }

  async function verifyPayment() {
    if (!payment?.reference) return;
    await api.get(`/payments/verify/${encodeURIComponent(payment.reference)}`);
    setPaymentStatus('PAID');
    onCourierUpdate((current) => ({ ...current, paymentStatus: 'PAID' }));
  }

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-xl font-bold">Courier details</h2><p className="mt-1 text-sm text-slate-600">Recipient: {courier.recipientName} · {courier.recipientPhone}</p></div>
        <div className="text-right text-sm"><p className="font-semibold">{courier.status}</p><p className="text-slate-600">Payment: {courier.paymentStatus}</p></div>
      </div>
      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
        <div><dt className="font-medium text-slate-500">Package</dt><dd className="mt-1">{courier.packageDescription}</dd></div>
        <div><dt className="font-medium text-slate-500">Fare</dt><dd className="mt-1 font-semibold">{naira(courier.grossFare ?? RYDA_CONFIG.COURIER_FARE_NGN)}</dd></div>
        <div><dt className="font-medium text-slate-500">Pickup</dt><dd className="mt-1">{courier.pickup?.address || 'Unavailable'}</dd></div>
        <div><dt className="font-medium text-slate-500">Drop-off</dt><dd className="mt-1">{courier.dropoff?.address || 'Unavailable'}</dd></div>
      </dl>
      <CourierLiveTracking courier={courier} onCourierUpdate={onCourierUpdate} />
      {courier.driverId && paymentStatus !== 'PAID' && <section className="mt-5 space-y-2 border-t border-slate-200 pt-5"><h3 className="font-semibold">Pay for this delivery</h3>{!payment ? <button type="button" onClick={initializePayment} className="rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white">Continue to Paystack</button> : <><p className="text-sm text-slate-600">Reference: {payment.reference}</p>{authorizationUrl && <a className="block text-sm text-indigo-700 underline" href={authorizationUrl} target="_blank" rel="noreferrer">Open Paystack checkout</a>}<button type="button" onClick={verifyPayment} className="rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white">Verify payment</button></>}</section>}
      {canCancel(courier) && <button type="button" disabled={cancelling} onClick={() => onCancel(courier._id)} className="mt-5 rounded-lg border border-rose-300 px-4 py-2 font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60">{cancelling ? 'Cancelling…' : 'Cancel courier request'}</button>}
    </article>
  );
}

export function CourierHistory({ couriers, loading, error, onSelect }) {
  if (loading) return <p className="text-sm text-slate-600">Loading courier history…</p>;
  if (error) return <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>;
  if (!couriers.length) return <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">You have not created any courier requests yet.</p>;
  return <div className="space-y-2">{couriers.map((courier) => <button type="button" key={courier._id} onClick={() => onSelect(courier._id)} className="w-full rounded-lg border border-slate-200 bg-white p-4 text-left hover:border-indigo-300 hover:bg-indigo-50"><span className="font-semibold">{courier.recipientName}</span><span className="ml-2 text-sm text-slate-600">{courier.pickup?.address} → {courier.dropoff?.address}</span><span className="float-right text-sm font-semibold">{courier.status}</span></button>)}</div>;
}

export default function CourierSenderPage() {
  const [couriers, setCouriers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true); setHistoryError('');
    try {
      const response = await api.get('/courier/my');
      setCouriers(Array.isArray(response.data?.courier) ? response.data.courier : []);
    } catch (error) {
      setHistoryError(apiError(error, 'Unable to load courier history.'));
    } finally { setLoadingHistory(false); }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  async function selectCourier(id) {
    setLoadingDetail(true); setDetailError('');
    try {
      const response = await api.get(`/courier/${id}`);
      setSelected(response.data?.courier || null);
    } catch (error) {
      setSelected(null); setDetailError(apiError(error, 'Unable to load courier details.'));
    } finally { setLoadingDetail(false); }
  }

  async function cancelCourier(id) {
    setCancelling(true); setDetailError('');
    try {
      const response = await api.patch(`/courier/${id}/cancel`);
      setSelected(response.data?.courier || null);
      await loadHistory();
    } catch (error) {
      setDetailError(apiError(error, 'Unable to cancel courier request.'));
    } finally { setCancelling(false); }
  }

  async function handleCreated(courier) {
    await loadHistory();
    if (courier?._id) setSelected(courier);
  }

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-6">
      <header><p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">Courier</p><h1 className="mt-1 text-3xl font-bold">Send a campus delivery</h1><p className="mt-2 text-slate-600">Request delivery for an existing package or document.</p></header>
      <CourierCreateForm onCreated={handleCreated} />
      <section className="grid gap-6 lg:grid-cols-2">
        <div><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-bold">Your courier requests</h2><button type="button" onClick={loadHistory} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50">Refresh</button></div><CourierHistory couriers={couriers} loading={loadingHistory} error={historyError} onSelect={selectCourier} /></div>
        <CourierDetail courier={selected} loading={loadingDetail} error={detailError} onCancel={cancelCourier} cancelling={cancelling} onCourierUpdate={setSelected} />
      </section>
    </main>
  );
}
