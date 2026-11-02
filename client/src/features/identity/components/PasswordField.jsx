import { useState } from 'react';

export default function PasswordField({ id, label = 'Password', helpText, ...inputProps }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700" htmlFor={id}>
        {label}
      </label>
      <div className="relative mt-1">
        <input
          {...inputProps}
          id={id}
          type={isVisible ? 'text' : 'password'}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-11 text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
        <button
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-slate-500 hover:text-teal-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-600"
          type="button"
          aria-label={isVisible ? 'Hide password' : 'Show password'}
          aria-pressed={isVisible}
          onClick={() => setIsVisible((currentValue) => !currentValue)}
        >
          {isVisible ? (
            <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="m3 3 18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 4.2A10.5 10.5 0 0 1 12 4c5.3 0 8.6 4.5 9.6 6.1a1.7 1.7 0 0 1 0 1.8 16.7 16.7 0 0 1-3 3.6M6.1 6.1A16.2 16.2 0 0 0 2.4 10a1.7 1.7 0 0 0 0 1.8C3.4 13.5 6.7 18 12 18c1 0 2-.2 2.9-.5" />
            </svg>
          ) : (
            <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.4 10.1C3.4 8.5 6.7 4 12 4s8.6 4.5 9.6 6.1a1.7 1.7 0 0 1 0 1.8C20.6 13.5 17.3 18 12 18S3.4 13.5 2.4 11.9a1.7 1.7 0 0 1 0-1.8Z" />
              <circle cx="12" cy="11" r="3" />
            </svg>
          )}
        </button>
      </div>
      {helpText && <p className="mt-1 min-h-5 text-xs text-slate-500">{helpText}</p>}
    </div>
  );
}
