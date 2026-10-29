// frontend/src/utils/certificatAptitudePdf.js
// Certificat d'aptitude dessiné en A5 paysage, sur le modèle du Bon de prise en
// charge (backend utils/bonPriseEnCharge.js) : texte vectoriel net, rubriques
// remplies en bleu « stylo » sur pointillés, au lieu d'une capture A4 de la page.
// Cadre 1 = LE MÉDECIN (à droite) ; le coin bas droit reste libre pour le QR code.
import jsPDF from 'jspdf';
import logoUrl from '../assets/logo-ordre-malte.png';

const W = 595.28;
const H = 419.53;
const M = 30;
const LINE0 = 140;
const GAP = 26;
const ROWS = { docteur: LINE0, employe: LINE0 + GAP, service: LINE0 + 2 * GAP, declare: LINE0 + 3 * GAP, lieuDate: LINE0 + 4 * GAP };
const VISA_LABEL_Y = ROWS.lieuDate + 30;
const ZONE = { width: 190, height: 72 };
const QR_SPACE = 60;
const INK = [13, 38, 140];

// Cadre de signature en points pdf-lib (origine en bas à gauche)
export const CERTIFICAT_SIGNATURE_ZONES = [
  { index: 1, x: W - M - QR_SPACE - ZONE.width, y: H - (VISA_LABEL_Y + 6 + ZONE.height), width: ZONE.width, height: ZONE.height },
];

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});

const frDate = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

/** @returns {Promise<{ blob: Blob, signatureZones: object[] }>} */
export async function buildCertificatAptitudePdf(formData) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a5', compress: true });
  doc.setProperties({ title: "Certificat d'aptitude" });

  // En-tête : logo et adresse, comme le BPC
  try {
    const img = await loadImage(logoUrl);
    const lw = 205;
    doc.addImage(img, 'PNG', M, 22, lw, lw / (img.width / img.height));
  } catch { /* logo absent : en-tête texte seul */ }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 51, 51);
  ['HÔPITAL SAINT-JEAN DE MALTE', 'BP.: 56 NJOMBE - CAMEROUN', 'Tél.: (237) 697 09 29 92', '233 21 10 22']
    .forEach((l, i) => doc.text(l, W - M, 30 + i * 11, { align: 'right' }));

  doc.setFont('times', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(0, 0, 0);
  doc.text("CERTIFICAT D'APTITUDE", W / 2, 108, { align: 'center' });

  // Libellé + pointillés jusqu'à `end`, valeur en bleu au-dessus (réduite si trop longue)
  const line = (label, x, y, end, value) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12.5);
    doc.setTextColor(0, 0, 0);
    doc.text(label, x, y);
    const start = x + doc.getTextWidth(label) + 2;
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    const dot = doc.getTextWidth('.');
    doc.text('.'.repeat(Math.max(0, Math.floor((end - start) / dot))), start, y);
    let v = String(value ?? '').trim();
    if (!v) return;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...INK);
    const room = end - start - 6;
    let size = 11;
    doc.setFontSize(size);
    while (size > 7 && doc.getTextWidth(v) > room) doc.setFontSize(size -= 0.5);
    while (v.length > 3 && doc.getTextWidth(v) > room) v = `${v.slice(0, -2)}…`;
    doc.text(v, start + 3, y - 2.5);
  };
  const box = (x, y, checked) => {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.9);
    doc.rect(x, y - 10, 12, 12);
    if (!checked) return;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text('X', x + 2.2, y);
  };

  const right = W - M;
  line('Je soussigné(e), Docteur', M, ROWS.docteur, right, formData.nom_docteur);
  line('Certifie avoir examiné ce jour', M, ROWS.employe, right, formData.nom_employe);
  line('travaillant au service', M, ROWS.service, right, formData.service);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12.5);
  doc.setTextColor(0, 0, 0);
  doc.text('et le (la) déclare :', M, ROWS.declare);
  box(160, ROWS.declare, formData.declaration === 'Apte');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Apte', 177, ROWS.declare);
  box(232, ROWS.declare, formData.declaration === 'Inapte');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Inapte', 249, ROWS.declare);
  doc.text('à son poste de travail.', 315, ROWS.declare);

  line('Njombé le', W / 2, ROWS.lieuDate, right, frDate(formData.date_certificat));

  const [z] = CERTIFICAT_SIGNATURE_ZONES;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12.5);
  doc.setTextColor(0, 0, 0);
  doc.text('LE MÉDECIN', z.x + z.width / 2, VISA_LABEL_Y, { align: 'center' });

  return { blob: doc.output('blob'), signatureZones: CERTIFICAT_SIGNATURE_ZONES.map(zone => ({ ...zone })) };
}
