import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import PasswordField from '../components/PasswordField';
import { useAuth } from '../hooks/AuthContext';
import { getRoleDestination } from '../roleDestination';

const INITIAL_VALUES = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  role: 'RIDER'
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, user } = useAuth();
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
      const registeredUser = await register(values);
      navigate(getRoleDestination(registeredUser?.role || user?.role || values.role));
    } catch (registrationError) {
      setError(registrationError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Create your Ryda account"
      subtitle="Choose Rider to book campus trips or Driver to start your verification journey."
      footer={
        <>
          Already have an account?{' '}
          <Link className="font-semibold text-teal-700 hover:text-teal-800" to="/login">
            Log in
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
        <label className="block text-sm font-medium text-slate-700">
          Full name
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
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
        <label className="block text-sm font-medium text-slate-700">
          Phone number
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            type="tel"
            name="phone"
            value={values.phone}
            onChange={handleChange}
            autoComplete="tel"
            placeholder="e.g. 08012345678"
            required
          />
        </label>
        <fieldset>
          <legend className="text-sm font-medium text-slate-700">I want to use Ryda as a</legend>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {[
              ['RIDER', 'Rider', 'Book campus rides and deliveries.'],
              ['DRIVER', 'Driver', 'Offer Keke rides and deliveries.']
            ].map(([value, label, description]) => (
              <label
                key={value}
                className={`cursor-pointer rounded-lg border p-3 text-sm ${
                  values.role === value
                    ? 'border-teal-700 bg-teal-50 text-teal-900'
                    : 'border-slate-300 text-slate-700'
                }`}
              >
                <input
                  className="sr-only"
                  type="radio"
                  name="role"
                  value={value}
                  checked={values.role === value}
                  onChange={handleChange}
                />
                <span className="block font-semibold">{label}</span>
                <span className="mt-1 block text-xs leading-5">{description}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <PasswordField
          id="register-password"
          name="password"
          value={values.password}
          onChange={handleChange}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          minLength="8"
          required
          helpText="Use at least 8 characters."
        />
        <button
          className="w-full rounded-lg bg-teal-700 px-4 py-2.5 font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-teal-400"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  );
}
