// frontend/src/components/schedules/programmeWeekendPdf.js
// PDF du programme du week-end dessiné directement (jsPDF, police Times comme le
// modèle papier) : texte net, fichier léger, cadres de signature exacts.
// (html2canvas décalait le texte des tableaux à cases fusionnées.)
import jsPDF from 'jspdf';
import scheduleService from '../../services/scheduleService';

const W = 841.89; const H = 595.28; const M = 28; // A4 paysage, points
const SIGNATAIRES = ['Directrice des Soins', 'Directeur Médical', 'Directeur général'];

/** @returns {{ blob: Blob, signatureZones: object[] }} zones en points pdf-lib (origine en bas) */
export function construireProgrammePdf(schedule, content) {
  const pdf = new jsPDF({ orientation: 'l', unit: 'pt', format: 'a4' });
  const { jours, du, au } = scheduleService.programmeJours(schedule);
  const entete = content?.entete || {};
  const services = content?.services || [];
  pdf.setLineWidth(0.7);

  const ecrire = (txt, x, y, { taille = 9, gras = false, align = 'left', souligne = false } = {}) => {
    pdf.setFont('times', gras ? 'bold' : 'normal');
    pdf.setFontSize(taille);
    pdf.text(String(txt ?? ''), x, y, { align, baseline: 'middle' });
    if (souligne) {
      const w = pdf.getTextWidth(String(txt));
      const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
      pdf.line(x0, y + taille * 0.45, x0 + w, y + taille * 0.45);
    }
  };
  // Texte centré dans une case : la taille baisse jusqu'à tenir sur une ligne
  const dansCase = (txt, x, y, w, h, { taille = 9, gras = false, majuscules = true } = {}) => {
    const s = majuscules ? String(txt || '').toUpperCase() : String(txt || '');
    if (!s) return;
    pdf.setFont('times', gras ? 'bold' : 'normal');
    let t = taille;
    pdf.setFontSize(t);
    while (t > 5.5 && pdf.getTextWidth(s) > w - 4) { t -= 0.5; pdf.setFontSize(t); }
    pdf.text(s, x + w / 2, y + h / 2, { align: 'center', baseline: 'middle' });
  };

  // Titre
  ecrire(`WEEKEND DU ${du} AU ${au}`, W / 2, M + 6, { taille: 11, gras: true, align: 'center' });

  // En-tête : Direction (gauche), responsables du week-end (droite)
  let yG = M + 26;
  ecrire('Direction :', M, yG, { taille: 9, gras: true, souligne: true });
  for (const e of entete.direction || []) {
    ecrire(`${e.label}${e.label && e.valeur ? ' : ' : ''}${e.valeur}`, M + 70, yG, { taille: 9 });
    yG += 11;
  }
  if (entete.superviseurManagement) {
    yG += 2;
    ecrire('SUPERVISEUR MANAGEMENT :', M + 70, yG, { taille: 7.5, gras: true });
    ecrire(entete.superviseurManagement, M + 70 + 118, yG, { taille: 9, gras: true });
    yG += 11;
  }
  let yD = M + 26;
  for (const e of entete.responsables || []) {
    ecrire(`${e.label}${e.label && e.valeur ? ' : ' : ''}${e.valeur}`, W - M - 120, yD, { taille: 9, align: 'center' });
    yD += 11;
  }

  // Tableau
  const top = Math.max(yG, yD) + 6;
  const colService = 128;
  const colW = (W - 2 * M - colService) / 5;
  const xCol = (i) => M + colService + i * colW;
  const hTete = 16;
  const signatures = 78; // place réservée en bas pour les cadres de signature
  // Hauteurs : la page est remplie comme le papier (15 à 20 pt par ligne) ; un
  // service dont le nom tient sur 2 lignes (ou « astreinte ») est agrandi.
  pdf.setFont('times', 'bold');
  pdf.setFontSize(9.5);
  const nomsService = services.map((s) => pdf.splitTextToSize(String(s.nom || '').toUpperCase(), colService - 6).slice(0, 2));
  const besoin = services.map((s, i) => (nomsService[i].length + (s.astreinte ? 0.8 : 0)) * 10.5 + 5);
  const dispo = H - M - signatures - (top + 2 * hTete);
  const totalPour = (hl) => services.reduce((t, s, i) => t + Math.max(s.lignes.length * hl, besoin[i]), 0);
  let hLigne = 20;
  while (hLigne > 10 && totalPour(hLigne) > dispo) hLigne -= 0.5;
  const tailleCase = hLigne >= 15 ? 10 : hLigne >= 12 ? 9 : 8;

  // Ligne 1 : jours ; ligne 2 : créneaux
  let x = xCol(0);
  for (const j of jours) {
    const w = j.creneaux.length * colW;
    pdf.rect(x, top, w, hTete);
    dansCase(`${j.nom} ${j.date}`, x, top, w, hTete, { gras: true, taille: 10 });
    j.creneaux.forEach((c, k) => {
      pdf.rect(x + k * colW, top + hTete, colW, hTete);
      dansCase(c, x + k * colW, top + hTete, colW, hTete, { gras: true, taille: 10 });
    });
    x += w;
  }

  let y = top + 2 * hTete;
  for (const s of services) {
    const si = services.indexOf(s);
    const h = Math.max(s.lignes.length * hLigne, besoin[si]);
    const hL = h / s.lignes.length;
    // Case du service (sur toutes ses lignes) ; nom sur 2 lignes si trop long
    pdf.rect(M, y, colService, h);
    pdf.setFont('times', 'bold');
    pdf.setFontSize(9.5);
    const nom = nomsService[si];
    const blocs = nom.length + (s.astreinte ? 1 : 0);
    let yy = y + h / 2 - ((blocs - 1) * 10.5) / 2;
    for (const l of nom) { pdf.text(l, M + colService / 2, yy, { align: 'center', baseline: 'middle' }); yy += 10.5; }
    if (s.astreinte) ecrire('(astreinte)', M + colService / 2, yy - 2, { taille: 7, align: 'center' });

    s.lignes.forEach((ligne, li) => {
      const yl = y + li * hL;
      ligne.forEach((c, ci) => {
        if (!(c.span > 0)) return;
        const w = c.span * colW;
        pdf.rect(xCol(ci), yl, w, hL);
        dansCase(c.texte, xCol(ci), yl, w, hL, { taille: tailleCase });
      });
    });
    y += h;
  }

  // Cadres de signature (ordre du circuit : DDS → Directeur médical → DG)
  const largeurZone = 190; const hauteurZone = 52;
  const yZone = Math.min(y + 8, H - M - 16 - hauteurZone);
  const signatureZones = SIGNATAIRES.map((label, i) => {
    const xz = M + i * ((W - 2 * M - largeurZone) / 2);
    ecrire(label, xz + largeurZone / 2, yZone + hauteurZone + 9, { taille: 9.5, gras: true, align: 'center' });
    return { index: i + 1, x: xz, y: H - (yZone + hauteurZone), width: largeurZone, height: hauteurZone };
  });

  return { blob: pdf.output('blob'), signatureZones };
}
