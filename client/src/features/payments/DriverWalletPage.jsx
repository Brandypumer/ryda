import { useEffect, useState } from 'react';
import { api } from '../../shared/lib/api';

const naira = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' });

function errorMessage(error) {
  return error.response?.data?.message || 'Unable to complete that request.';
}

export default function DriverWalletPage() {
  const [dashboard, setDashboard] = useState(null);
  const [amount, setAmount] = useState('');
  const [settlement, setSettlement] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadDashboard() {
    try {
      const { data } = await api.get('/driver/wallet');
      setDashboard(data);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function requestWithdrawal(event) {
    event.preventDefault();
    setMessage('');
    try {
      await api.post('/driver/withdrawals', { amount: Number(amount) });
      setAmount('');
      setMessage('Withdrawal request submitted for admin review.');
      await loadDashboard();
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }

  async function startFeeSettlement(liabilityId) {
    setMessage('');
    try {
      const { data } = await api.post('/driver/liabilities/settle', { liabilityId });
      setSettlement(data);
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }

  async function finishFeeSettlement(event) {
    event.preventDefault();
    try {
      const { data } = await api.post('/driver/liabilities/settle', {
        liabilityId: settlement.liability._id,
        reference: settlement.payment.reference
      });
      setSettlement(null);
      setMessage(data.eligibility.isBlocked ? 'Some overdue fees remain.' : 'Fee settled; driver eligibility restored.');
      await loadDashboard();
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }

  if (loading) return <p>Loading wallet…</p>;
  if (!dashboard) return <p>{message || 'Wallet unavailable.'}</p>;

  const { wallet, eligibility, withdrawals } = dashboard;
  const overdue = eligibility.liabilities.filter((item) => item.status === 'OVERDUE');

  return (
    <section className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-3xl font-bold">Driver wallet</h1>
        <p className="mt-1 text-slate-600">Earnings, outstanding fees, and demo withdrawal requests.</p>
      </div>

      {message && <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700" role="status">{message}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Summary label="Available" value={wallet.availableBalance} />
        <Summary label="Pending withdrawals" value={wallet.pendingBalance} />
        <Summary label="Total earned" value={wallet.totalEarned} />
      </div>

      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Outstanding platform fees</h2>
        <p className="mt-1 text-sm text-slate-600">
          {eligibility.isBlocked ? `${naira.format(eligibility.overdueTotal)} overdue — new requests are blocked.` : 'No overdue platform fees.'}
        </p>
        {overdue.length > 0 && (
          <div className="mt-4 space-y-3">
            {overdue.map((liability) => (
              <div key={liability._id} className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                <span>{liability.serviceType} · {naira.format(liability.amount)}</span>
                <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white" onClick={() => startFeeSettlement(liability._id)}>
                  Settle with Paystack
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {settlement && (
        <section className="rounded-xl bg-amber-50 p-5">
          <h2 className="font-semibold">Finish fee settlement</h2>
          {settlement.authorizationUrl && <a className="mt-2 block underline" href={settlement.authorizationUrl} target="_blank" rel="noreferrer">Open Paystack checkout</a>}
          <form className="mt-3 flex flex-wrap gap-2" onSubmit={finishFeeSettlement}>
            <input className="rounded-lg border px-3 py-2" value={settlement.payment.reference} readOnly aria-label="Payment reference" />
            <button className="rounded-lg bg-amber-600 px-3 py-2 text-white" type="submit">Verify settlement</button>
          </form>
        </section>
      )}

      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Request withdrawal</h2>
        <form className="mt-3 flex flex-wrap gap-2" onSubmit={requestWithdrawal}>
          <input className="min-w-0 flex-1 rounded-lg border px-3 py-2" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="e.g. 1500" aria-label="Withdrawal amount in Naira" required />
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-white" type="submit">Submit request</button>
        </form>
        <p className="mt-2 text-xs text-slate-500">Demo ledger only; no bank transfer is made.</p>
      </section>

      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Withdrawal history</h2>
        <div className="mt-3 space-y-2 text-sm">
          {withdrawals.length === 0 && <p className="text-slate-500">No withdrawal requests yet.</p>}
          {withdrawals.map((withdrawal) => <p key={withdrawal._id} className="flex justify-between border-t pt-2"><span>{naira.format(withdrawal.amount)}</span><span>{withdrawal.status}</span></p>)}
        </div>
      </section>
    </section>
  );
}

function Summary({ label, value }) {
  return <div className="rounded-xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{naira.format(value)}</p></div>;
}
