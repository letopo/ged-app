// backend/src/seeders/phpReferenceSeeder.js
// Seeder des données de référence PHP (infirmeries + secteurs)
// Données extraites du fichier HSJM_Gestion_v3.xlsm

import { Infirmerie, Secteur } from '../models/index.js';

const INFIRMERIES = [
  { code: 'INF_NYOMBE',   nom: 'Infirmerie Nyombe',        localisation: 'NYOMBE' },
  { code: 'INF_BOUBA',    nom: 'Infirmerie Bouba',         localisation: 'BOUBA' },
  { code: 'INF_PENJA',    nom: 'Infirmerie Penja',         localisation: 'PENJA' },
  { code: 'INF_PHP_BAS',  nom: 'Infirmerie PHP Bas',       localisation: 'PHP_BAS' },
  { code: 'INF_LOUM',     nom: 'Infirmerie Loum',          localisation: 'LOUM' },
  { code: 'INF_MANTEM',   nom: 'Infirmerie Mantem',        localisation: 'MANTEM' },
  { code: 'INF_COFRUCA',  nom: 'Infirmerie Cofruca',       localisation: 'COFRUCA' },
  { code: 'INF_DIADIA',   nom: 'Infirmerie Diadia',        localisation: 'DIADIA' },
  { code: 'INF_MBONJO',   nom: 'Infirmerie Mbonjo',        localisation: 'MBONJO' },
  { code: 'INF_DEHANE',   nom: 'Infirmerie Dehane',        localisation: 'DEHANE' },
];

// Mapping secteur → code infirmerie (60 secteurs)
const SECTEURS_DATA = [
  // INF_NYOMBE (37 secteurs)
  { nom: 'PENJA EST',         infCode: 'INF_NYOMBE' },
  { nom: 'PENJA OUEST',       infCode: 'INF_NYOMBE' },
  { nom: 'NYOMBE',            infCode: 'INF_NYOMBE' },
  { nom: 'DAC',               infCode: 'INF_NYOMBE' },
  { nom: 'DEX',               infCode: 'INF_NYOMBE' },
  { nom: 'DQHSE',             infCode: 'INF_NYOMBE' },
  { nom: 'GARAGE',            infCode: 'INF_NYOMBE' },
  { nom: 'DRH',               infCode: 'INF_NYOMBE' },
  { nom: 'INTENDANCE',        infCode: 'INF_NYOMBE' },
  { nom: 'IRRIGATION',        infCode: 'INF_NYOMBE' },
  { nom: 'LOGISTIQUE',        infCode: 'INF_NYOMBE' },
  { nom: 'CERTIFICATION',     infCode: 'INF_NYOMBE' },
  { nom: 'DAF',               infCode: 'INF_NYOMBE' },
  { nom: 'DG',                infCode: 'INF_NYOMBE' },
  { nom: 'PROCESS CHAMP',     infCode: 'INF_NYOMBE' },
  { nom: 'MEDECINE',          infCode: 'INF_NYOMBE' },
  { nom: 'GTX',               infCode: 'INF_NYOMBE' },
  { nom: 'DTM',               infCode: 'INF_NYOMBE' },
  { nom: 'POIVRE',            infCode: 'INF_NYOMBE' },
  { nom: 'DALA',              infCode: 'INF_NYOMBE' },
  { nom: 'QUALITE',           infCode: 'INF_NYOMBE' },
  { nom: 'SECURITE',          infCode: 'INF_NYOMBE' },
  { nom: 'SIPA',              infCode: 'INF_NYOMBE' },
  { nom: 'FORMATION',         infCode: 'INF_NYOMBE' },
  { nom: 'DST',               infCode: 'INF_NYOMBE' },
  { nom: 'ESPACE VERT',       infCode: 'INF_NYOMBE' },
  { nom: 'PISTE',             infCode: 'INF_NYOMBE' },
  { nom: 'D GENERALE',        infCode: 'INF_NYOMBE' },
  { nom: 'CERCO',             infCode: 'INF_NYOMBE' },
  { nom: 'ACHAT',             infCode: 'INF_NYOMBE' },
  { nom: 'DIRECTION',         infCode: 'INF_NYOMBE' },
  { nom: 'CONTRÔLE QUALITE',  infCode: 'INF_NYOMBE' },
  { nom: 'BAOBA',             infCode: 'INF_NYOMBE' },
  { nom: 'DIVERS',            infCode: 'INF_NYOMBE' },
  { nom: 'INFRA ET ENERGIE',  infCode: 'INF_NYOMBE' },
  { nom: 'NORMALISATION',     infCode: 'INF_NYOMBE' },
  { nom: 'CACAO POIVRE',      infCode: 'INF_NYOMBE' },
  // INF_BOUBA (3 secteurs)
  { nom: 'BOUBA',             infCode: 'INF_BOUBA' },
  { nom: 'SIR',               infCode: 'INF_BOUBA' },
  { nom: 'BOUBOU',            infCode: 'INF_BOUBA' },
  // INF_PENJA (5 secteurs)
  { nom: 'MAGASIN CENTRAL',   infCode: 'INF_PENJA' },
  { nom: 'MPOULA',            infCode: 'INF_PENJA' },
  { nom: 'PHP HAUT',          infCode: 'INF_PENJA' },
  { nom: 'MPOULA 1',          infCode: 'INF_PENJA' },
  { nom: 'MPOULA 2',          infCode: 'INF_PENJA' },
  // INF_PHP_BAS (3 secteurs)
  { nom: 'PHP BAS',           infCode: 'INF_PHP_BAS' },
  { nom: 'KUMBE',             infCode: 'INF_PHP_BAS' },
  { nom: 'CAPLAIN',           infCode: 'INF_PHP_BAS' },
  // INF_LOUM (4 secteurs)
  { nom: 'LOUM 1',            infCode: 'INF_LOUM' },
  { nom: 'LOUM 2',            infCode: 'INF_LOUM' },
  { nom: 'NASSIF HAUT',       infCode: 'INF_LOUM' },
  { nom: 'NASSIF BAS',        infCode: 'INF_LOUM' },
  // INF_MANTEM (1 secteur)
  { nom: 'MANTEM',            infCode: 'INF_MANTEM' },
  // INF_COFRUCA (3 secteurs)
  { nom: 'MBOME',             infCode: 'INF_COFRUCA' },
  { nom: 'CFP',               infCode: 'INF_COFRUCA' },
  { nom: 'PEPINIERE',         infCode: 'INF_COFRUCA' },
  // INF_DIADIA (2 secteurs)
  { nom: 'DIADIA',            infCode: 'INF_DIADIA' },
  { nom: 'DJOUNGO',           infCode: 'INF_DIADIA' },
  // INF_MBONJO (1 secteur)
  { nom: 'MBONJO',            infCode: 'INF_MBONJO' },
  // INF_DEHANE (1 secteur)
  { nom: 'DEHANE',            infCode: 'INF_DEHANE' },
];

const seedPHPData = async () => {
  try {
    // Vérifier si les données existent déjà
    const countInf = await Infirmerie.count();
    if (countInf > 0) {
      console.log('ℹ️  Données de référence PHP déjà présentes, skip seeder.');
      return;
    }

    console.log('🌱 Seeder PHP : insertion des infirmeries et secteurs...');

    // Créer les infirmeries
    const infirmeriesCreees = {};
    for (const inf of INFIRMERIES) {
      const created = await Infirmerie.create(inf);
      infirmeriesCreees[inf.code] = created.id;
    }
    console.log(`  ✅ ${INFIRMERIES.length} infirmeries créées.`);

    // Créer les secteurs
    let secteursCount = 0;
    for (const s of SECTEURS_DATA) {
      const infId = infirmeriesCreees[s.infCode];
      if (!infId) {
        console.warn(`  ⚠️ Infirmerie ${s.infCode} introuvable pour secteur ${s.nom}`);
        continue;
      }
      const code = s.nom.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
      await Secteur.create({
        code: `SEC_${code}`,
        nom: s.nom,
        infirmerieId: infId
      });
      secteursCount++;
    }
    console.log(`  ✅ ${secteursCount} secteurs créés.`);
    console.log('🌱 Seeder PHP terminé avec succès !');
  } catch (err) {
    console.error('❌ Erreur seeder PHP:', err.message);
  }
};

export default seedPHPData;
