import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import LogoutButton from '../components/LogoutButton';
import { getAuthError, getMyDriverVerification } from '../api/authApi';
import { useAuth } from '../hooks/AuthContext';

const VERIFICATION_STYLES = {
  PENDING: 'bg-amber-50 text-amber-800 ring-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  REJECTED: 'bg-rose-50 text-rose-800 ring-rose-200'
};

function profileValues(user) {
  return {
    fullName: user?.fullName || '',
    phone: user?.phone || ''
  };
}

function accountRole(role) {
  return role ? `${role[0]}${role.slice(1).toLowerCase()}` : 'Account';
}

export default function ProfilePage() {
  const { user, token, isAuthenticated, isRestoring, updateProfile } = useAuth();
  const [values, setValues] = useState(() => profileValues(user));
  const [verification, setVerification] = useState(null);
  const [verificationError, setVerificationError] = useState('');
  const [isLoadingVerification, setIsLoadingVerification] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setValues(profileValues(user));
  }, [user]);

  useEffect(() => {
    if (!token || user?.role !== 'DRIVER') {
      setVerification(null);
      setVerificationError('');
      setIsLoadingVerification(false);
      return undefined;
    }

    let isMounted = true;
    setIsLoadingVerification(true);
    setVerificationError('');

    async function loadVerification() {
      try {
        const profile = await getMyDriverVerification(token);
        if (isMounted) setVerification(profile);
      } catch (requestError) {
        if (requestError.response?.status !== 404 && isMounted) {
          setVerificationError(getAuthError(requestError));
        }
      } finally {
        if (isMounted) setIsLoadingVerification(false);
      }
    }

    loadVerification();

    return () => {
      isMounted = false;
    };
  }, [token, user?.role]);

  if (isRestoring) {
    return <p className="text-center text-sm text-slate-500">Loading your profile…</p>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((currentValues) => ({ ...currentValues, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      await updateProfile(values);
      setSuccess('Your profile has been updated.');
    } catch (profileError) {
      setError(profileError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const verificationStatus = verification?.verificationStatus;

  return (
    <main className="mx-auto max-w-3xl space-y-6 py-4 sm:py-8">
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Account</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">{user.fullName}</h1>
            <p className="mt-2 text-sm text-slate-600">{user.email}</p>
          </div>
          <span className="inline-flex w-fit rounded-full bg-teal-50 px-3 py-1 text-sm font-semibold text-teal-800 ring-1 ring-teal-200">
            {accountRole(user.role)} account
          </span>
        </div>
        <p className="mt-5 border-t border-slate-100 pt-5 text-sm leading-6 text-slate-600">
          Keep your contact details current so Ryda can support your bookings and delivery updates.
        </p>
      </section>

      {user.role === 'DRIVER' && (
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Driver verification</h2>
              <p className="mt-1 text-sm text-slate-600">
                Your Keke must be approved before you can go online.
              </p>
            </div>
            <Link
              className="inline-flex w-fit rounded-lg border border-teal-700 px-4 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
              to="/driver-verification"
            >
              {verificationStatus ? 'View verification' : 'Start verification'}
            </Link>
          </div>
          <div className="mt-4 min-h-9" aria-live="polite">
            {isLoadingVerification && <p className="text-sm text-slate-500">Loading verification status…</p>}
            {!isLoadingVerification && verificationStatus && (
              <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ring-1 ${VERIFICATION_STYLES[verificationStatus] || 'bg-slate-100 text-slate-700 ring-slate-200'}`}>
                {verificationStatus}
              </span>
            )}
            {!isLoadingVerification && !verificationStatus && !verificationError && (
              <p className="text-sm text-slate-600">No verification has been submitted yet.</p>
            )}
            {verificationError && <p className="text-sm text-rose-700" role="alert">{verificationError}</p>}
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Contact details</h2>
            <p className="mt-1 text-sm text-slate-600">Update the information Ryda uses to contact you.</p>
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div className="min-h-11" aria-live="polite">
              {error && (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
                  {error}
                </p>
              )}
              {success && (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
                  {success}
                </p>
              )}
            </div>
            <label className="block text-sm font-medium text-slate-700">
              Full name
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                type="text"
                name="fullName"
                value={values.fullName}
                onChange={handleChange}
                autoComplete="name"
                placeholder="e.g. Ebuka Doe"
                required
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Phone number
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                type="tel"
                name="phone"
                value={values.phone}
                onChange={handleChange}
                autoComplete="tel"
                placeholder="e.g. 08012345678"
                required
              />
            </label>
            <button
              className="w-full rounded-lg bg-teal-700 px-4 py-2.5 font-semibold text-white transition hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-teal-400"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving changes…' : 'Save changes'}
            </button>
          </form>
        </section>

        <aside className="rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-lg font-bold text-slate-900">Account details</h2>
          <p className="mt-1 text-sm text-slate-600">These details are managed by your account and cannot be changed here.</p>
          <dl className="mt-6 space-y-5 text-sm">
            <div>
              <dt className="font-medium text-slate-500">Email address</dt>
              <dd className="mt-1 break-words text-slate-900">{user.email}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Account type</dt>
              <dd className="mt-1 text-slate-900">{accountRole(user.role)}</dd>
            </div>
          </dl>
          <div className="mt-8 border-t border-slate-200 pt-5">
            <LogoutButton />
          </div>
        </aside>
      </div>
    </main>
  );
}
