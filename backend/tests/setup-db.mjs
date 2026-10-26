// Prépare la base de test : la recrée, charge la structure
// (tests/fixtures/schema.sql) puis applique les migrations plus récentes.
import './helpers/env.js';
import fs from 'fs/promises';
import { spawnSync } from 'child_process';
import pg from 'pg';

const { DB_HOST: host, DB_PORT: port, DB_NAME: database, DB_USER: user, DB_PASSWORD: password } = process.env;

let admin;
for (let i = 0; ; i++) {
  admin = new pg.Client({ host, port, user, password, database: 'postgres' });
  try { await admin.connect(); break; } catch (err) {
    if (i >= 30) throw err;
    await new Promise((r) => setTimeout(r, 1000)); // base en cours de démarrage
  }
}
await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
await admin.query(`CREATE DATABASE "${database}"`);
await admin.end();

const db = new pg.Client({ host, port, user, password, database });
await db.connect();
await db.query(await fs.readFile(new URL('./fixtures/schema.sql', import.meta.url), 'utf8'));
await db.end();

const mig = spawnSync('npx', ['sequelize-cli', 'db:migrate', '--env', 'development'], { stdio: 'pipe', encoding: 'utf8', env: process.env });
if (mig.status !== 0) {
  console.error(mig.stdout, mig.stderr);
  process.exit(1);
}
const applied = (mig.stdout.match(/: migrated/g) || []).length;
console.log(`✅ Base de test « ${database} » prête (${applied} migration(s) récente(s) appliquée(s)).`);
