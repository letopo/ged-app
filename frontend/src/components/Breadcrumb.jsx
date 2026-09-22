// frontend/src/components/Breadcrumb.jsx
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Home } from 'lucide-react';

const ROUTE_LABELS = {
  '/dashboard':                  'Tableau de bord',
  '/documents':                  'Documents',
  '/archives':                   'Archives',
  '/upload':                     'Upload',
  '/my-tasks':                   'Mes tâches',
  '/workflow-dashboard':         'Workflow',
  '/user-management':            'Utilisateurs',
  '/employees':                  'Employés',
  '/services':                   'Services',
  '/schedules':                  'Plannings',
  '/schedules/create':           'Nouveau planning',
  '/portail':                    'Portail',
  '/accueil':                    'Accueil',
  '/caisse':                     'Caisse',
  '/invoices':                   'Factures',
  '/gmao':                       'GMAO',
  '/demandes-achat':             'Demandes d\'Achat',
  '/settings':                   'Paramètres',
  '/parametres/notifications':   'Notifications',
  '/php':                        'Module PHP',
  '/php/patients':               'Patients',
  '/php/consultations':          'Consultations',
  '/php/statistiques':           'Statistiques',
  '/php/repos':                  'Repos & Hospitalisations',
};

const HIDDEN_ROUTES = ['/dashboard', '/login', '/register', '/display'];

export default function Breadcrumb() {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  if (HIDDEN_ROUTES.includes(pathname)) return null;

  const segments = pathname.split('/').filter(Boolean);
  const crumbs   = [{ label: t('Accueil'), path: '/dashboard', isHome: true }];

  let cumPath = '';
  for (const seg of segments) {
    cumPath += '/' + seg;
    const label = ROUTE_LABELS[cumPath];
    if (label) {
      crumbs.push({ label: t(label), path: cumPath });
    } else {
      const parent = ROUTE_LABELS['/' + segments[0]];
      if (parent) crumbs.push({ label: t('Détail'), path: cumPath });
    }
  }

  const unique = crumbs.filter((c, i, arr) => i === 0 || c.path !== arr[i - 1].path);
  if (unique.length <= 1) return null;

  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--fg-muted)', marginBottom: 14 }}>
      {unique.map((crumb, i) => {
        const isLast = i === unique.length - 1;
        return (
          <span key={crumb.path} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {i > 0 && <ChevronRight size={12} color="var(--border-strong)" />}
            {isLast ? (
              <span style={{ fontWeight: 500, color: 'var(--fg)' }}>
                {crumb.isHome ? <Home size={12} style={{ display: 'inline', verticalAlign: 'middle', marginTop: -2 }} /> : crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.path}
                style={{ color: 'var(--fg-muted)', textDecoration: 'none', transition: 'color .1s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--brand)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--fg-muted)'}
              >
                {crumb.isHome ? <Home size={12} style={{ display: 'inline', verticalAlign: 'middle', marginTop: -2 }} /> : crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
