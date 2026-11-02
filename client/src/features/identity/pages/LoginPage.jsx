import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import PasswordField from '../components/PasswordField';
import { useAuth } from '../hooks/AuthContext';

const INITIAL_VALUES = { email: '', password: '' };

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isRestoring } = useAuth();
  const [values, setValues] = useState(INITIAL_VALUES);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((currentValues) => ({ ...currentValues, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(values);
      navigate('/');
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to book rides, send parcels, or manage your driver account."
      footer={
        <>
          New to Ryda?{' '}
          <Link className="font-semibold text-teal-700 hover:text-teal-800" to="/register">
            Create an account
          </Link>
        </>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="min-h-11" aria-live="polite">
          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
              {error}
            </p>
          )}
        </div>
        {isRestoring && <p className="text-sm text-slate-500">Checking your saved session…</p>}
        <label className="block text-sm font-medium text-slate-700">
          Email address
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            type="email"
            name="email"
            value={values.email}
            onChange={handleChange}
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </label>
        <PasswordField
          id="login-password"
          name="password"
          value={values.password}
          onChange={handleChange}
          autoComplete="current-password"
          placeholder="Enter your password"
          required
        />
        <button
          className="w-full rounded-lg bg-teal-700 px-4 py-2.5 font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-teal-400"
          type="submit"
          disabled={isSubmitting || isRestoring}
        >
          {isSubmitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </AuthLayout>
  );
}
