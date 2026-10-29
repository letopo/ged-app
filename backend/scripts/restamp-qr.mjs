#!/usr/bin/env node
// backend/scripts/restamp-qr.mjs
// Remplace le QR de vérification des documents déjà signés dont l'adresse est
// fausse (voir src/utils/qrRestamp.js). Simulation par défaut.
//
//   Production : docker exec ged-backend node scripts/restamp-qr.mjs           (simulation)
//                docker exec ged-backend node scripts/restamp-qr.mjs --apply   (écrit)
//   Local      : node --import tsx scripts/restamp-qr.mjs [--apply]
import fs from 'fs';

const root = fs.existsSync(new URL('../dist/utils/qrRestamp.js', import.meta.url)) ? '../dist' : '../src';
const { restampVerificationQrs } = await import(`${root}/utils/qrRestamp.js`);
const { default: sequelize } = await import(`${root}/config/database.js`);

const apply = process.argv.includes('--apply');
console.log(apply ? '== Remplacement des QR de vérification ==' : '== Simulation (ajouter --apply pour écrire) ==');
try {
  const s = await restampVerificationQrs({ apply });
  console.log(`\n${s.total} document(s) avec QR : ${s.ok} déjà corrects, ${s.updated} ${apply ? 'mis à jour' : 'à mettre à jour'}, `
    + `${s.missingFile} fichier(s) absent(s), ${s.noQr} sans QR repérable, ${s.failed} échec(s).`);
} catch (err) {
  console.error(`❌ ${err.message}`);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
