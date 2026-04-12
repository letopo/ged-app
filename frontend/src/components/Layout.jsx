// frontend/src/components/Layout.jsx - AVEC SUPPORT DARK MODE
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Breadcrumb from './Breadcrumb';
import ScrollToTop from './ScrollToTop';
import KeyboardShortcuts from './KeyboardShortcuts';
import PageTransition from './PageTransition';

const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-dark-bg transition-colors duration-200">
      <Navbar />
      <main className="flex-1 p-5">
        <div className="container mx-auto">
          <Breadcrumb />
          <PageTransition>
            <Outlet />
          </PageTransition>
        </div>
      </main>
      <footer className="bg-gray-800 dark:bg-gray-900 text-white transition-colors duration-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold">GED</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-400">HSJM Workflow</span>
              <span className="text-gray-400">•</span>
              <span className="text-xs text-gray-500">v3.0</span>
            </div>
            <p className="text-xs text-gray-500">© {new Date().getFullYear()} Gestion Électronique de Documents — Tous droits réservés</p>
          </div>
        </div>
      </footer>
      <ScrollToTop />
      <KeyboardShortcuts />
    </div>
  );
};

export default Layout;