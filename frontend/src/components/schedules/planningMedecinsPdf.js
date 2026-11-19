// frontend/src/components/schedules/planningMedecinsPdf.js
// « ASTREINTES ET CONSULTATIONS DES MEDECINS » au format du planning papier :
// en-tête de l'hôpital, titre / mois / ROT/AST MED/MM-AA, date du jour à droite ;
// tableau Services* | Superviseurs services (lundi-vendredi) | jours du mois,
// cases sur plusieurs jours (noms « Dr A/Dr B » sur des lignes), cases grisées ;
// notes en bas ; signatures Directeur médical (gauche) et Directeur Général (droite).
import jsPDF from 'jspdf';
import scheduleService from '../../services/scheduleService';
import { moisTitre } from './planningMensuelPdf';

const W = 841.89; const H = 595.28; const M = 24;
const GRIS = [191, 191, 191];
const SIGNATAIRES = { medical_chief: 'Le Directeur médical', dg: 'Le Directeur Général', dds: 'La Directrice des Soins' };

const nomsEnLignes = (t) => String(t || '').split('/').map((x) => x.trim()).filter(Boolean);

export function construirePlanningMedecinsPdf(schedule, tableau) {
  const pdf = new jsPDF({ orientation: 'l', unit: 'pt', format: 'a4' });
  const jours = scheduleService.joursDuMois(schedule.year, schedule.month);
  pdf.setLineWidth(0.6);
  const texte = (s, x, y, { taille = 9, gras = false, align = 'left' } = {}) => {
    pdf.setFont('helvetica', gras ? 'bold' : 'normal');
    pdf.setFontSize(taille);
    pdf.text(String(s ?? ''), x, y, { align, baseline: 'middle' });
  };
  // Lignes de texte centrées dans une case, taille réduite si besoin
  const lignesDansCase = (lignes, x, y, w, h, { taille = 7.5, gras = false } = {}) => {
    if (!lignes.length) return;
    pdf.setFont('helvetica', gras ? 'bold' : 'normal');
    let t = taille; pdf.setFontSize(t);
    const trop = () => lignes.some((l) => pdf.getTextWidth(l) > w - 3) || lignes.length * t * 1.15 > h - 2;
    while (t > 4.5 && trop()) { t -= 0.5; pdf.setFontSize(t); }
    const pas = t * 1.15;
    let yy = y + h / 2 - ((lignes.length - 1) * pas) / 2;
    for (const l of lignes) { pdf.text(l, x + w / 2, yy, { align: 'center', baseline: 'middle' }); yy += pas; }
  };

  // En-tête
  ['HOPITAL ST-JEAN DE MALTE', 'ORDRE DE MALTE', 'BP 56 NJOMBE'].forEach((l, i) => texte(l, M + 6, M + 12 + i * 12, { taille: 9 }));
  texte('ASTREINTES ET CONSULTATIONS DES MEDECINS', W / 2, M + 12, { taille: 10.5, gras: true, align: 'center' });
  texte(moisTitre(schedule.month, schedule.year), W / 2, M + 25, { taille: 10.5, gras: true, align: 'center' });
  texte(`ROT/AST MED/${String(schedule.month).padStart(2, '0')}-${String(schedule.year).slice(-2)}`, W / 2, M + 38, { taille: 10.5, gras: true, align: 'center' });
  texte(new Date().toLocaleDateString('fr-FR'), W - M - 150, M + 12, { taille: 9 });

  // Colonnes
  const colService = 92; const colSup = 74;
  const xJours = M + colService + colSup;
  const colJ = (W - M - xJours) / jours.length;
  const xJ = (j) => xJours + (j - 1) * colJ;
  const top = M + 56;
  const hTete = 15;

  // Hauteur des lignes : selon le nombre de noms, dans la place disponible
  const lignes = tableau?.lignes || [];
  const notes = tableau?.notes || [];
  const besoin = lignes.map((l) => Math.max(2, ...l.cases.map((c) => nomsEnLignes(c.texte).length), 3 * (l.nom.length > 22 ? 1 : 0)) * 9.5 + 6);
  const dispo = H - M - (top + 2 * hTete) - (notes.length * 12 + 44);
  const facteur = Math.min(1.25, dispo / (besoin.reduce((a, b) => a + b, 0) || 1));
  const hauteurs = besoin.map((b) => b * facteur);

  // En-têtes : Services* | Superviseurs services Lundi - vendredi | jours
  pdf.rect(M, top, colService, 2 * hTete);
  lignesDansCase(['Services*'], M, top, colService, 2 * hTete, { taille: 11, gras: true });
  pdf.rect(M + colService, top, colSup, 2 * hTete);
  lignesDansCase(['Superviseurs', 'services', 'Lundi - vendredi'], M + colService, top, colSup, 2 * hTete, { taille: 6.5, gras: true });
  for (const j of jours) {
    pdf.rect(xJ(j.jour), top, colJ, hTete);
    lignesDansCase([j.lettre], xJ(j.jour), top, colJ, hTete, { taille: 8, gras: true });
    pdf.rect(xJ(j.jour), top + hTete, colJ, hTete);
    lignesDansCase([String(j.jour)], xJ(j.jour), top + hTete, colJ, hTete, { taille: 8, gras: true });
  }

  let y = top + 2 * hTete;
  lignes.forEach((l, i) => {
    const h = hauteurs[i];
    pdf.rect(M, y, colService, h);
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7);
    lignesDansCase(pdf.splitTextToSize(l.nom, colService - 6), M, y, colService, h, { taille: 7, gras: true });
    if (l.superviseurGrise) { pdf.setFillColor(...GRIS); pdf.rect(M + colService, y, colSup, h, 'FD'); } else pdf.rect(M + colService, y, colSup, h);
    lignesDansCase(nomsEnLignes(l.superviseur), M + colService, y, colSup, h, { taille: 7.5, gras: true });
    for (const c of l.cases) {
      const x = xJ(c.debut); const w = (c.fin - c.debut + 1) * colJ;
      if (c.grise) { pdf.setFillColor(...GRIS); pdf.rect(x, y, w, h, 'FD'); } else pdf.rect(x, y, w, h);
      lignesDansCase(nomsEnLignes(c.texte), x, y, w, h, { taille: 7.5 });
    }
    y += h;
  });

  // Notes, puis signatures
  let yn = y + 10;
  notes.forEach((n, i) => { texte(n, M, yn, { taille: 8.5, gras: i > 0 || /^N\.?B/i.test(n) }); yn += 12; });
  const roles = (schedule.validations?.length
    ? [...schedule.validations].sort((a, b) => a.validationOrder - b.validationOrder).map((v) => v.validatorRole)
    : schedule.validationWorkflow?.roles || ['medical_chief', 'dg']);
  const yLabel = Math.min(yn + 4, H - M);
  const largeur = 180; const hauteur = 46;
  const signatureZones = roles.map((role, k) => {
    // Premier signataire à gauche, dernier (DG) à droite
    const xz = roles.length === 1 ? W - M - largeur : M + k * ((W - 2 * M - largeur) / (roles.length - 1));
    texte(SIGNATAIRES[role] || role, k === roles.length - 1 && roles.length > 1 ? xz + largeur / 2 : xz + (k === 0 ? 0 : largeur / 2), yLabel,
      { taille: 9, align: k === 0 && roles.length > 1 ? 'left' : 'center' });
    // Le cadre est au-dessus du libellé (la signature se pose sur le bas du tableau, comme sur le papier)
    return { index: k + 1, x: xz, y: H - (yLabel - 8), width: largeur, height: hauteur };
  });

  return { blob: pdf.output('blob'), signatureZones };
}
