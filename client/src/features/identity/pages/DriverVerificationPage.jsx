import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import {
  getAuthError,
  getMyDriverVerification,
  submitDriverVerification,
  uploadDriverVerificationFiles
} from '../api/authApi';
import { useAuth } from '../hooks/AuthContext';

const INITIAL_VALUES = {
  vehicleNumber: ''
};
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const VEHICLE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const IDENTITY_DOCUMENT_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

const STATUS_STYLES = {
  PENDING: 'bg-amber-50 text-amber-800',
  APPROVED: 'bg-emerald-50 text-emerald-800',
  REJECTED: 'bg-rose-50 text-rose-800'
};

function validateFile(file, fieldName, allowedTypes) {
  if (!file || file.size === 0) {
    return `${fieldName} is required.`;
  }

  if (!allowedTypes.includes(file.type)) {
    return `${fieldName} must use a supported file type.`;
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `${fieldName} must be 5 MB or smaller.`;
  }

  return '';
}

export default function DriverVerificationPage() {
  const { user, token, isAuthenticated, isRestoring } = useAuth();
  const [profile, setProfile] = useState(null);
  const [values, setValues] = useState(INITIAL_VALUES);
  const [vehicleImageFile, setVehicleImageFile] = useState(null);
  const [identityDocumentFile, setIdentityDocumentFile] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token || user?.role !== 'DRIVER') {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function loadVerification() {
      try {
        const existingProfile = await getMyDriverVerification(token);
        if (isMounted) {
          setProfile(existingProfile);
        }
      } catch (requestError) {
        if (requestError.response?.status !== 404 && isMounted) {
          setError(getAuthError(requestError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadVerification();

    return () => {
      isMounted = false;
    };
  }, [token, user?.role]);

  if (isRestoring || isLoading) {
    return <p className="text-center text-sm text-slate-500">Loading verification status…</p>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'DRIVER') {
    return (
      <AuthLayout
        title="Driver verification"
        subtitle="Only Driver accounts can submit Keke verification details."
      />
    );
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((currentValues) => ({ ...currentValues, [name]: value }));
  }

  function handleFileChange(event, fieldName, allowedTypes, setFile) {
    const file = event.target.files?.[0] || null;
    const fileError = validateFile(file, fieldName, allowedTypes);

    if (fileError) {
      setFile(null);
      setError(fileError);
      event.target.value = '';
      return;
    }

    setError('');
    setFile(file);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const vehicleError = validateFile(vehicleImageFile, 'Keke image', VEHICLE_IMAGE_TYPES);
    const documentError = validateFile(identityDocumentFile, 'Identity document', IDENTITY_DOCUMENT_TYPES);

    if (vehicleError || documentError) {
      setError(vehicleError || documentError);
      return;
    }

    setIsSubmitting(true);

    try {
      const uploadedFiles = await uploadDriverVerificationFiles(token, {
        vehicleImage: vehicleImageFile,
        identityDocument: identityDocumentFile
      });
      const submittedProfile = await submitDriverVerification(token, {
        vehicleNumber: values.vehicleNumber,
        ...uploadedFiles
      });

      setProfile(submittedProfile);
    } catch (requestError) {
      setError(getAuthError(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (profile) {
    return (
      <AuthLayout
        title="Driver verification"
        subtitle="Your verification has been submitted. You must wait for admin approval before going online."
      >
        <div className="space-y-4 text-sm text-slate-700">
          <div>
            <p className="font-medium text-slate-900">Verification status</p>
            <span className={`mt-2 inline-flex rounded-full px-3 py-1 font-semibold ${STATUS_STYLES[profile.verificationStatus]}`}>
              {profile.verificationStatus}
            </span>
          </div>
          <p>Vehicle number: {profile.vehicleNumber}</p>
          <p className="rounded-lg bg-slate-50 p-3 text-slate-600">
            Additional submissions are disabled while this verification record is under review.
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Verify your Keke"
      subtitle="Submit your vehicle details for review. You must wait for admin approval before going online."
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
          Vehicle number
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            type="text"
            name="vehicleNumber"
            value={values.vehicleNumber}
            onChange={handleChange}
            placeholder="e.g. KJA-123-AB"
            required
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Keke image
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            type="file"
            name="vehicleImage"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) =>
              handleFileChange(event, 'Keke image', VEHICLE_IMAGE_TYPES, setVehicleImageFile)
            }
            required
          />
          {vehicleImageFile && <span className="mt-1 block text-xs font-normal text-slate-500">Selected: {vehicleImageFile.name}</span>}
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Identity document
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            type="file"
            name="identityDocument"
            accept="image/jpeg,image/png,application/pdf"
            onChange={(event) =>
              handleFileChange(event, 'Identity document', IDENTITY_DOCUMENT_TYPES, setIdentityDocumentFile)
            }
            required
          />
          {identityDocumentFile && <span className="mt-1 block text-xs font-normal text-slate-500">Selected: {identityDocumentFile.name}</span>}
        </label>
        <p className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">
          Upload a clear Keke image and identity document. Images and documents must be JPEG, PNG, or WebP for the Keke image; the identity document may also be a PDF. Each file must be 5 MB or smaller. Ryda stores Cloudinary URLs only, never your file bytes. Admin approval is required before you can go online.
        </p>
        <button
          className="w-full rounded-lg bg-teal-700 px-4 py-2.5 font-semibold text-white hover:bg-teal-800"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Uploading verification files…' : 'Submit for verification'}
        </button>
      </form>
    </AuthLayout>
  );
}
