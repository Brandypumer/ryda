import { Route, Routes } from 'react-router-dom';
import DriverWalletPage from '../features/payments/DriverWalletPage';
import AdminDashboard from '../features/admin/AdminDashboard';
import { DriverVerificationPage, LoginPage, ProfilePage, RegisterPage } from '../features/identity';
import { RideBookingPage, RideHistoryPage } from '../features/rides';
import CourierSenderPage from '../features/courier/CourierSenderPage';
import DriverDashboardPage from '../features/driver-ops/DriverDashboardPage';
import LandingPage from '../features/public/LandingPage';
import { AboutPage, HelpPage, HowItWorksPage, PrivacyPage, SafetyPage, TermsPage } from '../features/public/PublicPages';

function Placeholder({ title }) {
  return <h1 className="text-2xl font-semibold">{title} is coming soon.</h1>;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/how-it-works" element={<HowItWorksPage />} />
      <Route path="/safety" element={<SafetyPage />} />
      <Route path="/help" element={<HelpPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/driver-verification" element={<DriverVerificationPage />} />
      <Route path="/rides" element={<RideBookingPage />} />
      <Route path="/rides/history" element={<RideHistoryPage />} />
      <Route path="/courier" element={<CourierSenderPage />} />
      <Route path="/driver" element={<DriverDashboardPage />} />
      {/* Feature owners replace these baseline placeholders when their routes are integrated. */}
      <Route path="/payments/*" element={<DriverWalletPage />} />
      <Route path="/admin/*" element={<AdminDashboard />} />
      <Route path="*" element={<Placeholder title="Page" />} />
    </Routes>
  );
}
