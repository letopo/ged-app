import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const ROUTE_LABELS = {
  '/dashboard': 'Tableau de bord',
  '/documents': 'Documents',
  '/archives': 'Archives',
  '/upload': 'Upload',
  '/my-tasks': 'Mes tâches',
  '/workflow-dashboard': 'Workflow',
  '/user-management': 'Utilisateurs',
  '/employees': 'Employés',
  '/services': 'Services',
  '/schedules': 'Plannings',
  '/schedules/create': 'Nouveau planning',
  '/portail': 'Portail',
  '/accueil': 'Accueil',
  '/caisse': 'Caisse',
  '/invoices': 'Factures',
  '/gmao': 'GMAO',
  '/demandes-achat': 'Demandes d\'Achat',
  '/settings': 'Paramètres',
  '/parametres/notifications': 'Notifications',
  '/php': 'Module PHP',
  '/php/patients': 'Patients',
  '/php/consultations': 'Consultations',
  '/php/statistiques': 'Statistiques',
  '/php/repos': 'Repos & Hospitalisations',
};

// Pages qui n'ont pas besoin du breadcrumb
const HIDDEN_ROUTES = ['/dashboard', '/login', '/register', '/display'];

export default function Breadcrumb() {
  const location = useLocation();
  const pathname = location.pathname;

  if (HIDDEN_ROUTES.includes(pathname)) return null;

  // Construire les segments
  const segments = pathname.split('/').filter(Boolean);
  const crumbs = [];

  // Toujours ajouter Accueil
  crumbs.push({ label: 'Accueil', path: '/dashboard', isHome: true });

  // Construire le chemin cumulatif
  let cumPath = '';
  for (const seg of segments) {
    cumPath += '/' + seg;
    const label = ROUTE_LABELS[cumPath];
    if (label) {
      crumbs.push({ label, path: cumPath });
    } else {
      // Segment dynamique (ex: ID) — on l'ignore ou on affiche "Détail"
      const parent = ROUTE_LABELS['/' + segments[0]];
      if (parent) crumbs.push({ label: 'Détail', path: cumPath });
    }
  }

  // Dédupliquer les entrées consécutives identiques
  const unique = crumbs.filter((c, i, arr) => i === 0 || c.path !== arr[i - 1].path);

  if (unique.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1 text-sm text-gray-500 dark:text-dark-text-secondary mb-4 px-1">
      {unique.map((crumb, i) => {
        const isLast = i === unique.length - 1;
        return (
          <span key={crumb.path} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-gray-600 flex-shrink-0" />}
            {isLast ? (
              <span className="font-medium text-gray-700 dark:text-dark-text">
                {crumb.isHome ? <Home className="w-3.5 h-3.5 inline -mt-0.5" /> : crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.path}
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {crumb.isHome ? <Home className="w-3.5 h-3.5 inline -mt-0.5" /> : crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
