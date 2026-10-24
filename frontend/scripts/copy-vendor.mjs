// Copie OpenCV.js (≈10 Mo) dans public/vendor/ pour qu'il soit servi tel quel,
// sans passer par Vite/terser/legacy (trop lourd à transformer). Il n'est chargé
// qu'à l'ouverture du scanner de documents (cf. src/utils/docScanner.js).
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src  = resolve(root, 'node_modules/@techstark/opencv-js/dist/opencv.js');
const dest = resolve(root, 'public/vendor/opencv-4.10.0.js');

if (!existsSync(src)) {
  console.warn('[copy-vendor] opencv.js introuvable — le scanner fonctionnera sans détection automatique.');
} else {
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  console.log('[copy-vendor] public/vendor/opencv-4.10.0.js');
}
