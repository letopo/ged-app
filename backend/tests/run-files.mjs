// Lance chaque fichier de test directement (`node --import tsx fichier`), l'un
// après l'autre. Pourquoi pas `node --test` : sous Node 20, le lanceur échange
// avec chaque fichier par des messages sérialisés sur la sortie standard, et
// les journaux abondants du serveur les corrompent parfois (« Unable to
// deserialize cloned data », httpRules.test.js en CI). Lancé directement, un
// fichier écrit son rapport TAP et sort en erreur si un test échoue.
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';

const dir = process.argv[2] || 'tests/integration';
const files = readdirSync(dir).filter((f) => f.endsWith('.test.js')).sort();
const echecs = [];
const t0 = Date.now();
for (const f of files) {
  const file = path.join(dir, f);
  console.log(`\n▶ ${file}`);
  const r = spawnSync(process.execPath, ['--import', 'tsx', file], { stdio: 'inherit', env: process.env });
  if (r.status !== 0) echecs.push(`${file} (code ${r.status ?? r.signal})`);
}
console.log(`\n${files.length - echecs.length}/${files.length} fichiers réussis en ${Math.round((Date.now() - t0) / 1000)} s.`);
if (echecs.length) {
  console.log(`Échecs :\n  ${echecs.join('\n  ')}`);
  process.exit(1);
}
