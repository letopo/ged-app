// backend/src/utils/dmeConnection.js
// Connexion au DME (Dossier Médical Électronique développé à l'hôpital) :
// base MySQL, LECTURE SEULE. La GED y lira les ordonnances signées par les
// patients et les bulletins d'examens pour les joindre à la liasse PHP.
// Le compte doit n'avoir que le droit SELECT (voir Paramètres › Intégrations).
import mysql from 'mysql2/promise';

export const DME_DEFAULTS = { host: '', port: 3306, database: 'DME_HOSPITAL', username: 'ged' };

/** Ouvre une connexion ; la session est mise en lecture seule. */
export async function openDme(config, password) {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: config.host, port: Number(config.port) || 3306, user: config.username, password,
      database: config.database, connectTimeout: 8000, dateStrings: true, charset: 'utf8mb4',
    });
  } catch (err) {
    throw new Error(describeDmeError(err, config));
  }
  await conn.query('SET SESSION TRANSACTION READ ONLY').catch(() => {});
  return conn;
}

/** Message compréhensible pour les erreurs de connexion courantes. */
export function describeDmeError(err, config = {}) {
  const where = `${config.host || '?'}:${config.port || 3306}`;
  switch (err?.code) {
    case 'ECONNREFUSED':
    case 'ETIMEDOUT':
    case 'EHOSTUNREACH':
      return `Le serveur MySQL du DME (${where}) refuse la connexion. Sur le serveur du DME : MySQL doit écouter le réseau (bind-address) et le pare-feu doit autoriser le serveur de la GED sur le port ${config.port || 3306}.`;
    case 'ER_ACCESS_DENIED_ERROR':
      return `Accès refusé pour l'utilisateur « ${config.username} » depuis le serveur de la GED : vérifiez le mot de passe et que l'utilisateur est autorisé depuis cette adresse (CREATE USER '${config.username}'@'<adresse de la GED>').`;
    case 'ER_HOST_NOT_PRIVILEGED':
      return `Le serveur MySQL du DME n'accepte pas les connexions depuis le serveur de la GED : créez l'utilisateur pour cette adresse.`;
    case 'ER_BAD_DB_ERROR':
      return `La base « ${config.database} » n'existe pas sur le serveur du DME.`;
    case 'ER_DBACCESS_DENIED_ERROR':
      return `L'utilisateur « ${config.username} » n'a pas accès à la base « ${config.database} » (GRANT SELECT ON ${config.database}.* …).`;
    case 'ENOTFOUND':
      return `Adresse du serveur du DME introuvable : ${config.host}.`;
    default:
      return `Connexion au DME impossible : ${err?.message || err}`;
  }
}

/**
 * Test : version, droits de l'utilisateur, tables de la base (noms et nombre
 * de lignes estimé, AUCUNE donnée de patient).
 */
export async function inspectDme(config, password) {
  const conn = await openDme(config, password);
  try {
    const [[v]] = await conn.query('SELECT VERSION() AS version, CURRENT_USER() AS compte');
    const [grants] = await conn.query('SHOW GRANTS');
    const [tables] = await conn.query(
      `SELECT TABLE_NAME AS name, TABLE_ROWS AS approxRows, TABLE_COMMENT AS comment
         FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME`, [config.database]);
    const grantText = grants.map((g) => Object.values(g)[0]).join(' | ');
    const writes = /\b(ALL PRIVILEGES|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE)\b/i.test(grantText.replace(/USAGE/g, ''));
    return {
      version: v.version, compte: v.compte, droitsEcriture: writes, grants: grantText,
      tables: tables.map((t) => ({ name: t.name, rows: Number(t.approxRows) || 0, comment: t.comment || null })),
    };
  } finally {
    await conn.end().catch(() => {});
  }
}
