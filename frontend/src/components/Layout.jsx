// frontend/src/components/Layout.jsx
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Breadcrumb from './Breadcrumb';
import ScrollToTop from './ScrollToTop';
import KeyboardShortcuts from './KeyboardShortcuts';
import PageTransition from './PageTransition';

const Layout = () => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>
      <Navbar />
      <main style={{ flex: 1, padding: '20px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <Breadcrumb />
          <PageTransition>
            <Outlet />
          </PageTransition>
        </div>
      </main>
      <footer style={{ background: 'var(--surface-2)', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '16px 20px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <span style={{ fontWeight: 700, color: 'var(--fg)' }}>GED</span>
              <span style={{ color: 'var(--fg-subtle)' }}>•</span>
              <span style={{ color: 'var(--fg-muted)' }}>HSJM Workflow</span>
              <span style={{ color: 'var(--fg-subtle)' }}>•</span>
              <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>v3.0</span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--fg-subtle)', margin: 0 }}>
              © {new Date().getFullYear()} Gestion Électronique de Documents — Tous droits réservés
            </p>
          </div>
        </div>
      </footer>
      <ScrollToTop />
      <KeyboardShortcuts />
    </div>
  );
};

export default Layout;
