// Environnement des tests d'intégration : base JETABLE dédiée (jamais la base
// de développement ni de production). À importer en tout premier.
//   Base locale : npm run test:db (conteneur postgres sur le port 55432).
process.env.NODE_ENV = 'test';
process.env.DB_HOST = process.env.TEST_DB_HOST || 'localhost';
process.env.DB_PORT = process.env.TEST_DB_PORT || '55432';
process.env.DB_NAME = process.env.TEST_DB_NAME || 'ged_test';
process.env.DB_USER = process.env.TEST_DB_USER || 'postgres';
process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'test';
process.env.JWT_SECRET = 'jwt-secret-des-tests';
process.env.WORKFLOW_ENABLE_NOTIFICATIONS = 'false';

if (!/_test$/.test(process.env.DB_NAME)) {
  throw new Error(`Tests : la base doit se terminer par « _test » (reçu : ${process.env.DB_NAME}).`);
}
