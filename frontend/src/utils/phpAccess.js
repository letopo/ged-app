// frontend/src/utils/phpAccess.js — accès au module PHP, même règle que le serveur
// (backend utils/phpAccess.js) : utilisation complète = administrateurs, rôle
// Point Focal PHP ou poste « php » ; consultation seule = poste « php_lecture ».
const FULL_ROLES = ['admin', 'superadmin', 'agent_accueil_php', 'agent_accueil_PHP'];

export function phpAccess(user) {
  if (!user) return { read: false, write: false };
  if (FULL_ROLES.includes(user.role)) return { read: true, write: true };
  const postes = user.postes || [];
  const write = postes.includes('php');
  return { read: write || postes.includes('php_lecture'), write };
}
