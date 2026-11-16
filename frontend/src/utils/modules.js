// frontend/src/utils/modules.js — modules activables par tenant
// (catalogue serveur : backend/src/config/modules.js).
// user.modules = modules actifs du tenant, renvoyés avec le profil. Absent
// (ancien profil en cache, lecture impossible) : on n'enlève rien du menu,
// le serveur coupe de toute façon les routes d'un module inactif.
export const hasModule = (user, key) => !Array.isArray(user?.modules) || user.modules.includes(key);
