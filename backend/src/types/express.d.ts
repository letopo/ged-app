// backend/src/types/express.d.ts
// Propriétés que nos middlewares ajoutent à la requête Express.
import type User from '../models/User.js';

declare global {
  namespace Express {
    interface Request {
      /** Utilisateur connecté (middleware/auth.js protect, middleware/superadmin.js). */
      user?: User;
      /** Jeton de session vérifié (middleware/auth.js protect) ; rem = « Rester connecté ». */
      session?: { id: string; rem?: boolean; sid?: string; tv?: number; iat?: number; exp?: number };
      /** Établissement résolu depuis l'hôte ou l'utilisateur (middleware/tenant.js). */
      tenantId?: string | null;
      tenant?: { id: string; [key: string]: unknown } | null;
      /** Route /api/super-admin : pas de filtre d'établissement (middleware/tenant.js). */
      isSuperAdminRoute?: boolean;
      /** Contenu de la licence vérifiée (middleware/licenseCheck.js). */
      licenseInfo?: Record<string, unknown>;
    }
  }
}

export {};
