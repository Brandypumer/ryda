import AppRoutes from './AppRoutes';
import Footer from './Footer';
import Navigation from './navigation/Navigation';
import { ApplicationSidebar, ApplicationTopBar } from './navigation/ApplicationShell';
import { PageContainer } from '../shared/ui';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../features/identity';

const publicPaths = new Set(['/', '/about', '/how-it-works', '/safety', '/help', '/privacy', '/terms', '/login', '/register']);

export default function App() {
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const isPublicPage = publicPaths.has(pathname);
  const useApplicationShell = isAuthenticated && !isPublicPage;

  if (useApplicationShell) {
    return (
      <div className="flex min-h-screen bg-[#f7f8f7]">
        <ApplicationSidebar />
        <div className="min-w-0 flex-1">
          <ApplicationTopBar />
          <main className="min-w-0 py-6 sm:py-8 lg:py-10">
            <PageContainer className="max-w-7xl"><AppRoutes /></PageContainer>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Navigation />
      <main className="flex-1 py-6 sm:py-8 lg:py-10">
        <PageContainer>
          <AppRoutes />
        </PageContainer>
      </main>
      <Footer />
    </div>
  );
}
