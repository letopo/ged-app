// backend/src/config/sageConnection.js — Connexion en LECTURE SEULE au SQL
// Server de Sage 100 (facturation patients HSJM), pour l'import automatique
// des factures PHP dans la GED (voir utils/sageFactureSync.js).
//
// IMPORTANT : ce module ne doit JAMAIS exécuter d'INSERT/UPDATE/DELETE contre
// Sage — uniquement des SELECT. Toutes les informations de connexion viennent
// de variables d'environnement, jamais en dur dans le code.
//
// Auth NTLM (compte Windows) tant qu'aucun compte SQL Server dédié en lecture
// seule n'a été créé côté Sage — à migrer dès que possible (voir
// SAGE_AUTH_TYPE=sql pour basculer sans changer de code).

const authType = process.env.SAGE_AUTH_TYPE || 'ntlm'; // 'ntlm' | 'sql'

function isConfigured() {
  return Boolean(process.env.SAGE_HOST && process.env.SAGE_DATABASE && process.env.SAGE_PASSWORD);
}

function buildConfig() {
  const base = {
    server: process.env.SAGE_HOST,
    port: Number(process.env.SAGE_PORT) || 1433,
    database: process.env.SAGE_DATABASE,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      connectTimeout: 8000,
      requestTimeout: 20000,
    },
  };

  if (authType === 'sql') {
    return {
      ...base,
      user: process.env.SAGE_USER,
      password: process.env.SAGE_PASSWORD,
    };
  }

  return {
    ...base,
    authentication: {
      type: 'ntlm',
      options: {
        domain: process.env.SAGE_DOMAIN,
        userName: process.env.SAGE_USER,
        password: process.env.SAGE_PASSWORD,
      },
    },
  };
}

export const sageConnectionConfig = isConfigured() ? buildConfig() : null;
export { isConfigured as isSageConfigured };
