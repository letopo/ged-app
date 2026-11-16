// backend/src/middleware/requireModule.js — coupe une route quand le module
// n'est pas actif pour le tenant (cf. config/modules.js, utils/tenantModules.js).
// Monté devant le routeur dans server.js : un module coupé ne répond plus du
// tout, quel que soit l'utilisateur. En cas d'erreur de lecture, l'accès est
// refusé (pas d'ouverture par défaut).
import { isModuleActive } from '../utils/tenantModules.js';
import { MODULE_BY_KEY } from '../config/modules.js';

export const requireModule = (key) => {
  if (!MODULE_BY_KEY[key]) throw new Error(`requireModule : module inconnu « ${key} »`);
  const label = MODULE_BY_KEY[key].label;
  return async (req, res, next) => {
    // Routes sans tenant (super-admin) : rien à couper
    if (!req.tenantId) return next();
    try {
      if (await isModuleActive(req.tenantId, key)) return next();
      return res.status(403).json({
        success: false,
        code: 'MODULE_DISABLED',
        module: key,
        message: `Le module « ${label} » n’est pas activé pour votre établissement.`,
      });
    } catch (err) {
      console.error(`[Modules] lecture impossible (${key}) :`, err.message);
      return res.status(503).json({ success: false, code: 'MODULE_CHECK_FAILED', message: 'Vérification du module impossible, réessayez.' });
    }
  };
};
