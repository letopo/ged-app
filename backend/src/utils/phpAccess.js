// backend/src/utils/phpAccess.js — accès au module PHP (Point Focal Hôpital).
// Données médicales : chaque route /api/php est contrôlée ici, pas seulement
// masquée dans le menu.
//  - utilisation complète : administrateurs, rôle « Point Focal PHP », poste « php » ;
//  - consultation seule (listes, statistiques, exports) : poste « php_lecture ».
import { getUserPosteCodes } from './posteResolver.js';

export const PHP_FULL_ROLES = ['admin', 'superadmin', 'agent_accueil_php', 'agent_accueil_PHP'];
export const PHP_POSTE = 'php';
export const PHP_LECTURE_POSTE = 'php_lecture';

export async function getPhpAccess(user) {
  if (!user) return { read: false, write: false };
  if (PHP_FULL_ROLES.includes(user.role)) return { read: true, write: true };
  const postes = await getUserPosteCodes(user.id);
  const write = postes.includes(PHP_POSTE);
  return { read: write || postes.includes(PHP_LECTURE_POSTE), write };
}

const guard = (level, message) => async (req, res, next) => {
  try {
    const access = await getPhpAccess(req.user);
    if (access[level]) return next();
    return res.status(403).json({ success: false, message });
  } catch (err) {
    next(err);
  }
};

// Toute route du module (montée sur /api/php après protect)
export const requirePhpRead = guard('read', 'Accès réservé au module PHP : demandez le poste « Module PHP » à un administrateur.');
// Création, modification, suppression, import
export const requirePhpWrite = guard('write', 'Consultation seule : la saisie dans le module PHP demande le poste « Module PHP ».');
