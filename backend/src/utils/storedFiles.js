// backend/src/utils/storedFiles.js
// Fichiers des documents : tout chemin enregistré (Document.filePath) est
// relatif et confiné au dossier uploads/. Vérifié à l'écriture (validateur du
// modèle) et à nouveau avant chaque lecture / suppression (défense en
// profondeur, si une ligne avait été altérée hors de l'application).
import path from 'path';

const uploadsRoot = () => path.resolve(process.cwd(), 'uploads');

/** Chemin relatif « uploads/… » sans segment vide, « . » ou « .. ». */
export function isSafeStoredPath(p) {
  if (typeof p !== 'string' || !p || p.length > 1024) return false;
  if (p.includes('\0') || p.includes('\\') || path.isAbsolute(p)) return false;
  const parts = p.split('/');
  if (parts[0] !== 'uploads' || parts.length < 2) return false;
  return parts.slice(1).every((s) => s && s !== '.' && s !== '..');
}

export class UnsafeStoredPathError extends Error {
  constructor(p) {
    super('Chemin de fichier invalide (hors du dossier uploads/).');
    this.name = 'UnsafeStoredPathError';
    this.storedPath = p;
  }
}

/** Chemin absolu d'un fichier enregistré ; lève UnsafeStoredPathError s'il sort de uploads/. */
export function resolveStoredFile(p) {
  if (!isSafeStoredPath(p)) throw new UnsafeStoredPathError(p);
  const abs = path.resolve(process.cwd(), p);
  if (!abs.startsWith(uploadsRoot() + path.sep)) throw new UnsafeStoredPathError(p);
  return abs;
}

/** Comme resolveStoredFile, mais renvoie null au lieu de lever (suppression, nettoyage). */
export function resolveStoredFileOrNull(p) {
  try { return resolveStoredFile(p); } catch { return null; }
}
