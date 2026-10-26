// backend/src/utils/thumbnails.js
// Miniatures des documents (vue Grille) : haut de la première page d'un PDF
// (pdftoppm, paquet poppler-utils) ou image réduite (sharp), en JPEG ~480 px.
//
// Fabriquées à la première demande puis gardées dans uploads/.thumbs/ (dossier
// « caché » : express.static ne le sert pas, l'accès passe par la route
// protégée). La clé dépend du chemin, de la taille et de la date du fichier :
// nouvelle version (cachet, signature, page ajoutée) → nouvelle miniature.
import { execFile } from 'child_process';
import { resolveStoredFile } from './storedFiles.js';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const THUMB_DIR = path.resolve(process.cwd(), 'uploads/.thumbs');
const WIDTH = 480;
const MAX_PARALLEL = 2;

const isPdf = (doc) => doc.fileType === 'application/pdf' || /\.pdf$/i.test(doc.fileName || doc.filePath || '');
const isImage = (doc) => /^image\/(jpe?g|png|webp|gif|tiff?)$/i.test(doc.fileType || '') || /\.(jpe?g|png|webp|gif|tiff?)$/i.test(doc.fileName || doc.filePath || '');

export const canHaveThumbnail = (doc) => !!doc?.filePath && (isPdf(doc) || isImage(doc));

// File d'attente : au plus 2 conversions en même temps (le serveur reste réactif
// quand une grille de 50 documents s'affiche d'un coup)
let running = 0;
const waiting = [];
async function limited(task) {
  if (running >= MAX_PARALLEL) await new Promise((resolve) => waiting.push(resolve));
  running++;
  try { return await task(); } finally {
    running--;
    waiting.shift()?.();
  }
}

const inFlight = new Map(); // clé → Promise<chemin>
const failed = new Map();   // clé → date de l'échec (fichier illisible : on ne réessaie pas à chaque affichage)
const RETRY_AFTER_MS = 10 * 60 * 1000;

const run = (cmd, args) => new Promise((resolve, reject) => {
  execFile(cmd, args, { timeout: 20000 }, (err, stdout, stderr) => (err ? reject(new Error(stderr || err.message)) : resolve()));
});

async function renderPdf(src, dest) {
  const prefix = dest.replace(/\.jpg$/, '');
  await run('pdftoppm', ['-f', '1', '-l', '1', '-singlefile', '-jpeg', '-jpegopt', 'quality=72', '-scale-to-x', String(WIDTH), '-scale-to-y', '-1', src, prefix]);
}

async function renderImage(src, dest) {
  const { default: sharp } = await import('sharp');
  await sharp(src, { failOn: 'none' })
    .rotate() // orientation EXIF des photos de téléphone
    .resize({ width: WIDTH, withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 72, mozjpeg: true })
    .toFile(dest);
}

/**
 * Chemin de la miniature du document (fabriquée si besoin), ou null si le
 * document n'en a pas (Word, Excel, formulaire, fichier absent ou illisible).
 */
export async function getThumbnail(doc) {
  if (!canHaveThumbnail(doc)) return null;
  const src = resolveStoredFile(doc.filePath);
  let stat;
  try { stat = await fs.stat(src); } catch { return null; }
  const key = crypto.createHash('sha1').update(`${doc.filePath}|${stat.size}|${stat.mtimeMs}`).digest('hex').slice(0, 16);
  const dest = path.join(THUMB_DIR, `${doc.id}-${key}.jpg`);
  try { await fs.access(dest); return { path: dest, etag: key }; } catch { /* à fabriquer */ }
  if (Date.now() - (failed.get(dest) || 0) < RETRY_AFTER_MS) return null;

  if (!inFlight.has(dest)) {
    inFlight.set(dest, limited(async () => {
      await fs.mkdir(THUMB_DIR, { recursive: true });
      const tmp = dest.replace(/\.jpg$/, `.tmp${process.pid}.jpg`);
      try {
        if (isPdf(doc)) await renderPdf(src, tmp);
        else await renderImage(src, tmp);
        await fs.rename(tmp, dest);
      } catch (err) {
        await fs.unlink(tmp).catch(() => {});
        throw err;
      }
      // Anciennes miniatures de ce document (versions précédentes du fichier)
      const old = (await fs.readdir(THUMB_DIR)).filter((f) => f.startsWith(`${doc.id}-`) && f !== path.basename(dest));
      await Promise.all(old.map((f) => fs.unlink(path.join(THUMB_DIR, f)).catch(() => {})));
      return dest;
    }).finally(() => inFlight.delete(dest)));
  }
  try {
    await inFlight.get(dest);
    return { path: dest, etag: key };
  } catch (err) {
    failed.set(dest, Date.now());
    console.warn(`[miniature] ${doc.id} : ${err.message.split('\n')[0]}`);
    return null;
  }
}

export async function deleteThumbnails(docId) {
  try {
    const files = (await fs.readdir(THUMB_DIR)).filter((f) => f.startsWith(`${docId}-`));
    await Promise.all(files.map((f) => fs.unlink(path.join(THUMB_DIR, f)).catch(() => {})));
  } catch { /* pas encore de dossier */ }
}
