// frontend/src/utils/scanOcr.js
// Reconnaissance du texte (OCR) des pages scannées, sur le téléphone, avec
// Tesseract (français + anglais). Moteur et langues sont servis par la GED
// (public/vendor/, cf. scripts/copy-vendor.mjs) — aucun appel à un CDN — et
// gardés ensuite en cache par le navigateur (IndexedDB pour les langues).
import { createWorker, OEM } from 'tesseract.js';

const BASE = '/vendor/tesseract-6.0.1';

let workerPromise = null;

function getWorker() {
  if (!workerPromise) {
    const abs = (p) => new URL(`${BASE}${p}`, window.location.origin).href;
    workerPromise = createWorker(['fra', 'eng'], OEM.LSTM_ONLY, {
      workerPath: abs('/worker.min.js'),
      corePath: abs('/core'),
      langPath: abs('/lang'),
      workerBlobURL: false,
    }).catch((err) => {
      workerPromise = null;
      throw err;
    });
  }
  return workerPromise;
}

// Démarre le chargement en avance (pendant que l'utilisateur cadre sa feuille)
export function preloadOcr() {
  getWorker().catch(() => { /* l'OCR est facultatif */ });
}

// File d'attente : Tesseract traite une page à la fois
let queue = Promise.resolve();

// Renvoie { text, words: [{ text, x0, y0, x1, y1 }], width, height }
// (coordonnées en pixels du canvas reconnu).
export function recognizeCanvas(canvas) {
  const job = queue.then(async () => {
    const worker = await getWorker();
    const { data } = await worker.recognize(canvas, {}, { text: true, blocks: true });
    const words = [];
    (data.blocks || []).forEach((b) => (b.paragraphs || []).forEach((p) => (p.lines || []).forEach((l) => (l.words || []).forEach((w) => {
      const text = (w.text || '').trim();
      // Ignore les traits isolés (bords de la feuille, ombres) lus comme « | » ou « _ »
      if (text && w.confidence >= 30 && !/^[|_\-—–~'"`.,:;]+$/.test(text)) words.push({ text, ...w.bbox });
    }))));
    const text = (data.text || '').split('\n').filter((l) => !/^[\s|_\-—–~'"`.,:;]*$/.test(l) || !l.trim()).join('\n').trim();
    return { text, words, width: canvas.width, height: canvas.height };
  });
  queue = job.catch(() => {});
  return job;
}

export async function terminateOcr() {
  if (!workerPromise) return;
  const p = workerPromise;
  workerPromise = null;
  try { (await p).terminate(); } catch { /* déjà arrêté */ }
}

// Devine le type de document d'après son texte (mots-clés des catégories de la GED)
const TYPE_KEYWORDS = [
  ['Facture', /\bfacture\b/i],
  ['Proforma', /\bpro\s*-?\s*forma\b/i],
  ['Devis', /\bdevis\b/i],
  ['Bon de livraison', /\bbon\s+de\s+livraison\b/i],
  ['Bon de commande', /\bbon\s+de\s+commande\b/i],
  ['Bon de sortie', /\bbon\s+de\s+sortie\b/i],
  ['Ordre de mission', /\bordre\s+de\s+mission\b/i],
  ['Pièce de caisse', /\bpi[eè]ce\s+de\s+caisse\b/i],
  ['Demande de travaux', /\bdemande\s+de\s+travaux\b/i],
  ['Demande de permission', /\bdemande\s+de\s+permission\b/i],
  ['Demande de permutation', /\bpermutation\b/i],
  ["Demande d'explication", /\bdemande\s+d['’]\s*explication\b/i],
  ["Certificat d'aptitude", /\bcertificat\s+d['’]\s*aptitude\b/i],
];

export function guessDocumentType(text) {
  if (!text) return null;
  // On regarde surtout le haut du document (titre), puis le reste
  const head = text.slice(0, 600);
  for (const zone of [head, text]) {
    for (const [type, re] of TYPE_KEYWORDS) if (re.test(zone)) return type;
  }
  return null;
}
