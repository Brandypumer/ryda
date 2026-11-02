import { useCallback, useEffect, useState } from 'react';
import { api } from '../../shared/lib/api';

const naira = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' });

function errorMessage(error) {
  return error.response?.data?.message || 'Unable to load the admin dashboard.';
}

export default function AdminDashboard() {
  const [data, setData] = useState({ totals: {}, users: [], drivers: [], rides: [], courier: [], payments: [], liabilities: [], withdrawals: [] });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    const requests = await Promise.allSettled([
      api.get('/admin/dashboard'),
      api.get('/admin/users'),
      api.get('/admin/drivers'),
      api.get('/admin/rides'),
      api.get('/admin/courier'),
      api.get('/admin/payments'),
      api.get('/admin/liabilities'),
      api.get('/admin/withdrawals')
    ]);

    const [summary, users, drivers, rides, courier, payments, liabilities, withdrawals] = requests;
    const firstError = requests.find((result) => result.status === 'rejected');
    if (firstError) setMessage(errorMessage(firstError.reason));
    setData({
      totals: summary.status === 'fulfilled' ? summary.value.data.totals || {} : {},
      pendingDrivers: summary.status === 'fulfilled' ? summary.value.data.pendingDrivers : 0,
      users: users.status === 'fulfilled' ? users.value.data.users || [] : [],
      drivers: drivers.status === 'fulfilled' ? drivers.value.data.drivers || [] : [],
      rides: rides.status === 'fulfilled' ? rides.value.data.rides || [] : [],
      courier: courier.status === 'fulfilled' ? courier.value.data.courier || [] : [],
      payments: payments.status === 'fulfilled' ? payments.value.data.payments || [] : [],
      liabilities: liabilities.status === 'fulfilled' ? liabilities.value.data.liabilities || [] : [],
      withdrawals: withdrawals.status === 'fulfilled' ? withdrawals.value.data.withdrawals || [] : []
    });
    setLoading(false);
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  async function runAction(key, action) {
    setBusy(key);
    setMessage('');
    try {
      await action();
      await loadDashboard();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy('');
    }
  }

  if (loading) return <p>Loading admin dashboard…</p>;

  const pendingDrivers = data.drivers.filter((driver) => driver.verificationStatus === 'PENDING');
  const overdueLiabilities = data.liabilities.filter((liability) => liability.status === 'OVERDUE');

  return (
    <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
        <h1 className="text-3xl font-bold">Admin dashboard</h1>
        <p className="mt-1 text-slate-600">Review platform activity and demo ledger actions.</p>
        </div>
        <button type="button" onClick={loadDashboard} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">Refresh data</button>
      </header>

      {message && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700" role="alert">{message}</p>}

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Object.entries(data.totals).map(([key, value]) => <Metric key={key} label={key} value={value} />)}
      </div>

      <Panel title={`Pending driver verifications (${pendingDrivers.length})`}>
        <Table headers={['Driver', 'Vehicle', 'Status', 'Actions']}>
          {pendingDrivers.map((driver) => (
            <tr key={driver._id}>
              <Cell>{driver.userId?.fullName || driver.userId?.email || driver.userId || '—'}</Cell>
              <Cell>{driver.vehicleNumber || '—'}</Cell>
              <Cell><StatusBadge status={driver.verificationStatus} /></Cell>
              <Cell>
                <ActionButton disabled={busy === driver._id} onClick={() => runAction(driver._id, () => api.patch(`/admin/drivers/${driver._id}/verification`, { verificationStatus: 'APPROVED' }))}>Approve</ActionButton>{' '}
                <ActionButton tone="danger" disabled={busy === driver._id} onClick={() => runAction(driver._id, () => api.patch(`/admin/drivers/${driver._id}/verification`, { verificationStatus: 'REJECTED' }))}>Reject</ActionButton>
              </Cell>
            </tr>
          ))}
        </Table>
      </Panel>

      <Panel title="Drivers">
        <Table headers={['Driver', 'Verification', 'Suspension', 'Actions']}>
          {data.drivers.map((driver) => (
            <tr key={driver._id}>
              <Cell>{driver.userId?.fullName || driver.userId?.email || driver.userId || '—'}</Cell>
              <Cell><StatusBadge status={driver.verificationStatus} /></Cell>
              <Cell><StatusBadge status={driver.isSuspended ? 'SUSPENDED' : 'ACTIVE'} /></Cell>
              <Cell><ActionButton disabled={busy === `suspend-${driver._id}`} onClick={() => runAction(`suspend-${driver._id}`, () => api.patch(`/admin/drivers/${driver._id}/suspension`, { isSuspended: !driver.isSuspended }))}>{driver.isSuspended ? 'Reactivate' : 'Suspend'}</ActionButton></Cell>
            </tr>
          ))}
        </Table>
      </Panel>

      <Panel title={`Overdue liabilities (${overdueLiabilities.length})`}>
        <Table headers={['Driver', 'Service', 'Amount', 'Status']}>
          {overdueLiabilities.map((liability) => <tr key={liability._id}><Cell>{String(liability.driverId)}</Cell><Cell>{liability.serviceType}</Cell><Cell>{naira.format(liability.amount)}</Cell><Cell><StatusBadge status={liability.status} /></Cell></tr>)}
        </Table>
      </Panel>

      <Panel title="Withdrawal requests">
        <Table headers={['Driver', 'Amount', 'Status', 'Actions']}>
          {data.withdrawals.map((withdrawal) => (
            <tr key={withdrawal._id}>
              <Cell>{withdrawal.driverId?.fullName || withdrawal.driverId?.email || String(withdrawal.driverId)}</Cell>
              <Cell>{naira.format(withdrawal.amount)}</Cell>
              <Cell><StatusBadge status={withdrawal.status} /></Cell>
              <Cell>
                {withdrawal.status === 'PENDING' && <>
                  <ActionButton disabled={busy === withdrawal._id} onClick={() => runAction(withdrawal._id, () => api.patch(`/admin/withdrawals/${withdrawal._id}`, { status: 'APPROVED' }))}>Approve</ActionButton>{' '}
                  <ActionButton tone="danger" disabled={busy === withdrawal._id} onClick={() => runAction(withdrawal._id, () => api.patch(`/admin/withdrawals/${withdrawal._id}`, { status: 'REJECTED' }))}>Reject</ActionButton>
                </>}
                {withdrawal.status === 'APPROVED' && <ActionButton disabled={busy === withdrawal._id} onClick={() => runAction(withdrawal._id, () => api.patch(`/admin/withdrawals/${withdrawal._id}`, { status: 'PAID' }))}>Mark paid</ActionButton>}
              </Cell>
            </tr>
          ))}
        </Table>
      </Panel>

      <Panel title="Users"><Table headers={['Name', 'Email', 'Role']}>
        {data.users.map((user) => <tr key={user._id}><Cell>{user.fullName || '—'}</Cell><Cell>{user.email}</Cell><Cell>{user.role}</Cell></tr>)}
      </Table></Panel>

      <Panel title="Rides"><RecordTable records={data.rides} fields={['_id', 'status', 'paymentStatus', 'grossFare']} /></Panel>
      <Panel title="Courier deliveries"><RecordTable records={data.courier} fields={['_id', 'status', 'paymentStatus', 'grossFare']} /></Panel>
      <Panel title="Payment records"><RecordTable records={data.payments} fields={['_id', 'serviceType', 'grossAmount', 'status', 'provider']} /></Panel>
      <Panel title="Liability records"><RecordTable records={data.liabilities} fields={['_id', 'driverId', 'serviceType', 'serviceId', 'amount', 'status', 'dueAt']} /></Panel>
    </section>
  );
}

function Metric({ label, value }) {
  return <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs uppercase text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{value ?? 0}</p></div>;
}

function StatusBadge({ status }) {
  const styles = {
    APPROVED: 'bg-emerald-50 text-emerald-800',
    PAID: 'bg-emerald-50 text-emerald-800',
    ACTIVE: 'bg-emerald-50 text-emerald-800',
    PENDING: 'bg-amber-50 text-amber-800',
    OVERDUE: 'bg-rose-50 text-rose-800',
    REJECTED: 'bg-rose-50 text-rose-800',
    SUSPENDED: 'bg-rose-50 text-rose-800'
  };

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status] || 'bg-slate-100 text-slate-700'}`}>{status || 'UNKNOWN'}</span>;
}

function Panel({ title, children }) {
  return <section className="overflow-hidden rounded-xl bg-white shadow-sm"><h2 className="border-b px-5 py-4 text-xl font-semibold">{title}</h2><div className="overflow-x-auto p-5">{children}</div></section>;
}

function Table({ headers, children }) {
  return <table className="min-w-full text-left text-sm"><thead><tr>{headers.map((header) => <th className="whitespace-nowrap px-3 py-2 font-semibold text-slate-500" key={header}>{header}</th>)}</tr></thead><tbody>{children || <tr><td className="px-3 py-3 text-slate-500" colSpan={headers.length}>No records.</td></tr>}</tbody></table>;
}

function RecordTable({ records, fields }) {
  return <Table headers={fields}><>{records.map((record) => <tr key={record._id}>{fields.map((field) => <Cell key={field}>{String(record[field] ?? '—')}</Cell>)}</tr>)}</></Table>;
}

function Cell({ children }) { return <td className="whitespace-nowrap border-t px-3 py-3">{children}</td>; }

function ActionButton({ children, tone, ...props }) {
  return <button className={`rounded-md px-3 py-1.5 text-sm text-white ${tone === 'danger' ? 'bg-rose-600' : 'bg-slate-900'}`} type="button" {...props}>{children}</button>;
}
