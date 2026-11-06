import AppRoutes from './AppRoutes';
import Footer from './Footer';
import Navigation from './navigation/Navigation';
import { ApplicationSidebar, ApplicationTopBar } from './navigation/ApplicationShell';
import { PageContainer } from '../shared/ui';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/identity';
import { getRoleDestination } from '../features/identity/roleDestination';
import { AppearancePanel } from '../shared/theme';

const publicPaths = new Set(['/', '/about', '/how-it-works', '/safety', '/help', '/contact', '/privacy', '/terms', '/login', '/register']);

export default function App() {
  const { isAuthenticated, isRestoring, user } = useAuth();
  const { pathname } = useLocation();
  const isPublicPage = publicPaths.has(pathname);
  const useApplicationShell = isAuthenticated && !isPublicPage;

  if (!isRestoring && isAuthenticated && ['/','/login','/register'].includes(pathname)) {
    return <Navigate replace to={getRoleDestination(user?.role)} />;
  }

  if (useApplicationShell) {
    return (<>
      <div className="flex min-h-screen bg-[#f7f8f7]">
        <ApplicationSidebar />
        <div className="min-w-0 flex-1 lg:pl-64">
          <ApplicationTopBar />
          <main className="page-transition min-w-0 py-6 sm:py-8 lg:py-10">
            <PageContainer className="max-w-7xl"><AppRoutes /></PageContainer>
          </main>
        </div>
      </div>
      <AppearancePanel />
    </>);
  }

  return (<>
    <div className="app-shell">
      <Navigation />
      <main className="page-transition flex-1 py-6 sm:py-8 lg:py-10">
        <PageContainer>
          <AppRoutes />
        </PageContainer>
      </main>
      <Footer />
    </div>
    <AppearancePanel />
  </>);
}
