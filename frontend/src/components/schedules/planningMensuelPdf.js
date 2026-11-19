// frontend/src/components/schedules/planningMensuelPdf.js
// Planning de roulement mensuel au format du planning papier de l'hôpital
// (ex. « PLANNING DE ROULEMENT DU PERSONNEL DES MOYENS GENERAUX — MOIS D'AVRIL
// 2026 ») : NOMS / Prénoms, jours (L M Me J V S D) et dates, samedis et
// dimanches surlignés, congés regroupés en une case, lignes vides entre les
// équipes, légende des codes avec horaires, cadre(s) de signature.
// Dessiné avec jsPDF (texte net) ; zones de signature en points pdf-lib.
import jsPDF from 'jspdf';
import scheduleService from '../../services/scheduleService';

const W = 841.89; const H = 595.28; const M = 26;
const ORANGE = [246, 178, 26];
const GRIS = [217, 217, 217];
const JOURS = ['D', 'L', 'M', 'Me', 'J', 'V', 'S'];

// Modèle papier de chaque type de planning
const MODELES = {
  // Moyens Généraux (planning papier d'avril 2026)
  general_services: {
    titre: 'PLANNING DE ROULEMENT DU PERSONNEL DES MOYENS GENERAUX',
    entete: ['HOPITAL SAINT JEAN DE MALTE'],
    colonnes: 'nom-prenom',
    weekEnds: true,
  },
  // Renforcement Opérationnel SAU (planning papier d'avril 2026)
  emergency_reinforcement: {
    titre: 'ROTATION DU PERSONNEL DE RENFORCEMENT OPERATIONNEL SAU',
    reference: 'RO-SAU',
    entete: ['HOPITAL ST-JEAN DE MALTE', 'ORDRE DE MALTE', 'BP 56 NJOMBE'],
    colonnes: 'nom-complet',
    weekEnds: false,
    legendeDeuxColonnes: true, // codes composés (F/J, F/N, R/F) à droite
    note: '(1 heure de pause / j entre 12 H - 14 H)',
    signataires: { dg: 'Vu, le Directeur Général' },
  },
};
export const PLANNINGS_MODELE_PAPIER = new Set(Object.keys(MODELES));
const SIGNATAIRES = { dg: 'Le Directeur Général', dds: 'La Directrice des Soins', medical_chief: 'Le Directeur Médical' };
const CONGES = { CA: 'EN CONGE ANNUEL', CM: 'EN CONGE MALADIE' };
const AFFICHAGE = { JA: 'J.A', RA: 'R.A' };

export const moisTitre = (month, year) => {
  const nom = scheduleService.getMonthName(month).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return `MOIS ${/^[AEIOU]/.test(nom) ? `D'${nom}` : `DE ${nom}`} ${year}`;
};

const heure = (t) => {
  if (!t) return '';
  const [h, m] = String(t).split(':');
  return `${h} h${m && m !== '00' ? ` ${m}` : ''}`;
};
/** « J : Journée : 07 h - 17 h 30 » */
const legende = (st) => {
  if (!st.startTime || !st.endTime) return st.name;
  return st.startTime && st.endTime && st.startTime !== st.endTime
    ? `${st.name} : ${heure(st.startTime)} - ${heure(st.endTime)}`
    : st.startTime && st.startTime === st.endTime ? `${st.name} : ${heure(st.startTime)} à ${heure(st.endTime)}` : st.name;
};

/**
 * @param {object} p
 * @param {object} p.schedule  planning (scheduleType, month, year, validations / validationWorkflow)
 * @param {Array}  p.lignes    [{ employee } | { separation: true }] dans l'ordre d'affichage
 * @param {object} p.codes     { `${employeeId}-${date}`: code }
 * @param {Array}  p.shiftTypes types de shift (code, name, description, startTime, endTime)
 * @returns {{ blob: Blob, signatureZones: object[] }}
 */
export function construirePlanningMensuelPdf({ schedule, lignes, codes, shiftTypes = [] }) {
  const pdf = new jsPDF({ orientation: 'l', unit: 'pt', format: 'a4' });
  const modele = MODELES[schedule.scheduleType] || MODELES.general_services;
  const dates = scheduleService.generateScheduleDates(schedule);
  pdf.setLineWidth(0.6);

  const texte = (s, x, y, { taille = 8, gras = false, align = 'left' } = {}) => {
    pdf.setFont('helvetica', gras ? 'bold' : 'normal');
    pdf.setFontSize(taille);
    pdf.text(String(s ?? ''), x, y, { align, baseline: 'middle' });
  };
  const dansCase = (s, x, y, w, h, { taille = 7.5, gras = false } = {}) => {
    const str = String(s ?? '');
    if (!str) return;
    pdf.setFont('helvetica', gras ? 'bold' : 'normal');
    let t = taille; pdf.setFontSize(t);
    while (t > 5 && pdf.getTextWidth(str) > w - 2) { t -= 0.5; pdf.setFontSize(t); }
    pdf.text(str, x + w / 2, y + h / 2, { align: 'center', baseline: 'middle' });
  };
  const caseRemplie = (x, y, w, h, couleur) => { pdf.setFillColor(...couleur); pdf.rect(x, y, w, h, 'FD'); };

  // En-tête : établissement à gauche, titre, mois et référence au centre
  modele.entete.forEach((l, i) => texte(l, M + 6, M + 14 + i * 12, { taille: 9 }));
  texte(modele.titre, W / 2, M + 14, { taille: 10.5, gras: true, align: 'center' });
  texte(moisTitre(schedule.month, schedule.year), W / 2, M + 28, { taille: 10.5, gras: true, align: 'center' });
  if (modele.reference) {
    const ref = `ROT/${modele.reference}/${String(schedule.month).padStart(2, '0')}-${String(schedule.year).slice(-2)}`;
    texte(ref, W / 2, M + 42, { taille: 10.5, gras: true, align: 'center' });
  }

  // Colonnes : NOMS + Prénoms, ou une seule colonne « Prénom Nom »
  const nomComplet = modele.colonnes === 'nom-complet';
  const colNom = nomComplet ? 120 : 74; const colPrenom = nomComplet ? 0 : 62;
  const x0 = M; const xJours = x0 + colNom + colPrenom;
  const colJ = (W - M - xJours) / dates.length;
  const xJ = (i) => xJours + i * colJ;
  const top = M + (modele.reference ? 62 : 72);
  const hTete = 15;

  // Codes utilisés → légende (congés regroupés exclus)
  const utilises = new Set(Object.values(codes || {}));
  // Ordre du planning papier : J, N, R, A, J°, puis les autres
  const ORDRE_LEGENDE = ['J', 'N', 'R', 'A', 'J°', 'JA', 'RA', 'H'];
  const rang = (c) => (ORDRE_LEGENDE.includes(c) ? ORDRE_LEGENDE.indexOf(c) : 99);
  const aLegender = shiftTypes.filter((st) => utilises.has(st.code) && !CONGES[st.code])
    .sort((a, b) => rang(a.code) - rang(b.code) || a.code.localeCompare(b.code));
  const signataires = (schedule.validations?.length
    ? [...schedule.validations].sort((a, b) => a.validationOrder - b.validationOrder).map((v) => v.validatorRole)
    : schedule.validationWorkflow?.roles || ['dg']);
  const legendeDroite = modele.legendeDeuxColonnes ? aLegender.filter((st) => st.code.includes('/')) : [];
  const legendeGauche = aLegender.filter((st) => !legendeDroite.includes(st));
  const hLegende = Math.max(legendeGauche.length, legendeDroite.length) * 12 + (modele.note ? 16 : 8);
  // Légende sur 2 colonnes : la signature passe en dessous (comme sur le papier)
  const hBas = modele.legendeDeuxColonnes ? hLegende + 70 : Math.max(hLegende, 74);

  // Hauteur des lignes : remplir la page sans déborder
  const nbAgents = lignes.filter((l) => l.employee).length || 1;
  const nbSep = lignes.filter((l) => l.separation).length;
  const dispo = H - M - hBas - (top + 2 * hTete);
  const hLigne = Math.max(9, Math.min(17, (dispo - nbSep * 10) / nbAgents));
  const hSep = Math.min(10, hLigne * 0.7);

  // Ligne 1 : jours de la semaine ; ligne 2 : numéros (+ NOMS / Prénoms)
  if (nomComplet) {
    pdf.rect(x0, top + hTete, colNom, hTete);
  } else {
    pdf.rect(x0, top, colNom, hTete);
    pdf.rect(x0 + colNom, top, colPrenom, hTete);
    dansCase('Dates', x0 + colNom, top, colPrenom, hTete, { gras: true, taille: 8 });
    pdf.rect(x0, top + hTete, colNom, hTete);
    pdf.rect(x0 + colNom, top + hTete, colPrenom, hTete);
    dansCase('NOMS', x0, top + hTete, colNom, hTete, { taille: 7.5 });
    dansCase('Prénoms', x0 + colNom, top + hTete, colPrenom, hTete, { taille: 7.5 });
    pdf.line(x0 + colNom, top, x0 + colNom + colPrenom, top + 2 * hTete); // diagonale du modèle
  }
  dates.forEach((d, i) => {
    const weekEnd = modele.weekEnds && (d.dayOfWeek === 0 || d.dayOfWeek === 6);
    if (weekEnd) caseRemplie(xJ(i), top, colJ, hTete, ORANGE); else pdf.rect(xJ(i), top, colJ, hTete);
    dansCase(JOURS[d.dayOfWeek], xJ(i), top, colJ, hTete, { gras: true, taille: 8 });
    pdf.rect(xJ(i), top + hTete, colJ, hTete);
    dansCase(d.day, xJ(i), top + hTete, colJ, hTete, { gras: true, taille: 8 });
  });

  // Agents
  let y = top + 2 * hTete;
  for (const l of lignes) {
    if (l.separation) { y += hSep; continue; }
    const e = l.employee;
    pdf.rect(x0, y, colNom, hLigne);
    if (nomComplet) {
      pdf.setFont('helvetica', 'normal');
      let t = 8.5; pdf.setFontSize(t);
      const nom = `${e.firstName || ''} ${e.lastName || ''}`.trim();
      while (t > 5.5 && pdf.getTextWidth(nom) > colNom - 6) { t -= 0.5; pdf.setFontSize(t); }
      pdf.text(nom, x0 + 3, y + hLigne / 2, { baseline: 'middle' });
    } else {
      pdf.rect(x0 + colNom, y, colPrenom, hLigne);
      dansCase(String(e.lastName || '').toUpperCase(), x0, y, colNom, hLigne);
      dansCase(e.firstName || '', x0 + colNom, y, colPrenom, hLigne);
    }
    let i = 0;
    while (i < dates.length) {
      const code = codes[`${e.id}-${dates[i].date}`] || '';
      // Congé sur plusieurs jours : une seule case grise « EN CONGE ANNUEL »
      if (CONGES[code]) {
        let j = i;
        while (j + 1 < dates.length && codes[`${e.id}-${dates[j + 1].date}`] === code) j += 1;
        const w = (j - i + 1) * colJ;
        caseRemplie(xJ(i), y, w, hLigne, GRIS);
        dansCase(j > i ? CONGES[code] : code, xJ(i), y, w, hLigne, { taille: 7 });
        i = j + 1;
        continue;
      }
      pdf.rect(xJ(i), y, colJ, hLigne);
      dansCase(AFFICHAGE[code] || code, xJ(i), y, colJ, hLigne, { taille: 7 });
      i += 1;
    }
    y += hLigne;
  }

  // Légende (sous les noms) et signature(s) à droite
  const colonneLegende = (liste, xl) => {
    let yl = y + 12;
    for (const st of liste) {
      texte(AFFICHAGE[st.code] || st.code, xl, yl, { taille: 8.5 });
      texte(':', xl + 24, yl, { taille: 8.5 });
      texte(legende(st), xl + 36, yl, { taille: 8.5 });
      yl += 12;
    }
    return yl;
  };
  const finLegende = Math.max(colonneLegende(legendeGauche, xJours), colonneLegende(legendeDroite, xJours + 300));
  if (modele.note) texte(modele.note, M, finLegende + 2, { taille: 8.5, gras: true });
  const largeur = 170; const hauteur = 52;
  const yLabel = Math.min(modele.legendeDeuxColonnes ? finLegende + 64 : y + 70, H - M - 6);
  const signatureZones = signataires.map((role, k) => {
    // Le dernier signataire (le DG) à droite, les précédents vers la gauche
    const xz = W - M - largeur - (signataires.length - 1 - k) * (largeur + 40);
    texte(modele.signataires?.[role] || SIGNATAIRES[role] || role, xz + largeur / 2, yLabel, { taille: 10, gras: true, align: 'center' });
    const yHaut = yLabel - 8 - hauteur;
    return { index: k + 1, x: xz, y: H - (yHaut + hauteur), width: largeur, height: hauteur };
  });

  return { blob: pdf.output('blob'), signatureZones };
}
