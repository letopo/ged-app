// Copie dans public/vendor/ les gros moteurs du scanner de documents, pour
// qu'ils soient servis tels quels, sans passer par Vite/terser/legacy (trop
// lourds à transformer), et sans dépendre d'un CDN (réseau de l'hôpital) :
//   - OpenCV.js (≈10 Mo) : détection des bords de la feuille ;
//   - Tesseract (moteur + données fra/eng) : reconnaissance du texte (OCR).
// Ils ne sont chargés qu'à l'ouverture du scanner (cf. src/utils/docScanner.js
// et src/utils/scanOcr.js).
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const nm = (p) => resolve(root, 'node_modules', p);
const out = (p) => resolve(root, 'public/vendor', p);

const FILES = [
  [nm('@techstark/opencv-js/dist/opencv.js'), out('opencv-4.10.0.js')],
  [nm('tesseract.js/dist/worker.min.js'), out('tesseract-6.0.1/worker.min.js')],
  [nm('tesseract.js-core/tesseract-core-lstm.wasm.js'), out('tesseract-6.0.1/core/tesseract-core-lstm.wasm.js')],
  [nm('tesseract.js-core/tesseract-core-simd-lstm.wasm.js'), out('tesseract-6.0.1/core/tesseract-core-simd-lstm.wasm.js')],
  [nm('@tesseract.js-data/fra/4.0.0_best_int/fra.traineddata.gz'), out('tesseract-6.0.1/lang/fra.traineddata.gz')],
  [nm('@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz'), out('tesseract-6.0.1/lang/eng.traineddata.gz')],
];

for (const [src, dest] of FILES) {
  if (!existsSync(src)) {
    console.warn(`[copy-vendor] introuvable : ${src} — fonction correspondante du scanner indisponible.`);
    continue;
  }
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  console.log(`[copy-vendor] ${dest.slice(root.length + 1)}`);
}
