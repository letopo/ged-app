// backend/src/utils/stampSize.js
// Taille réelle des cachets apposés sur les PDF.
//
// Le cachet est dessiné à la largeur physique du tampon de l'utilisateur
// (users.stamp_width_mm, 58 mm par défaut), quelle que soit la résolution du
// PNG ; la hauteur suit le ratio de l'image (jamais de déformation). Le cachet
// est centré sur le cadre de signature et recouvre la signature, comme un
// tampon sur papier (PNG transparent : la signature reste lisible dessous).
//
// Interrupteur par organisation : tenant_settings.stamp_real_size (Paramètres ›
// Délais et session). Désactivé → ancien calcul (cachet ajusté au cadre).

export const DEFAULT_STAMP_WIDTH_MM = 58;
export const DEFAULT_STAMP_HEIGHT_MM = 22;
export const PT_PER_MM = 72 / 25.4;          // 1 mm = 2,8346 pt
export const STAMP_MM_MIN = 10;
export const STAMP_MM_MAX = 150;

export const mmToPt = (mm) => Number(mm) * PT_PER_MM;
export const ptToMm = (pt) => Number(pt) / PT_PER_MM;

/**
 * Dimensions en points PDF d'un cachet à taille réelle.
 * @param {{width:number,height:number}} image  image pdf-lib (taille en pixels)
 * @param {number} widthMm                      largeur physique du tampon
 */
export function realStampSize(image, widthMm = DEFAULT_STAMP_WIDTH_MM) {
  const w = Number(widthMm) > 0 ? Number(widthMm) : DEFAULT_STAMP_WIDTH_MM;
  const width = mmToPt(w);
  return { width, height: width * (image.height / image.width) };
}

/** Rectangle (x, y, largeur, hauteur) du cachet centré sur un point (coordonnées PDF). */
export function centeredStampRect(image, widthMm, centerX, centerY) {
  const { width, height } = realStampSize(image, widthMm);
  return { x: centerX - width / 2, y: centerY - height / 2, width, height };
}

/** Valide une dimension saisie (mm) : nombre entre 10 et 150, une décimale. */
export function parseStampMm(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Math.round(Number(String(value).replace(',', '.')) * 10) / 10;
  if (!Number.isFinite(n) || n < STAMP_MM_MIN || n > STAMP_MM_MAX) return null;
  return n;
}
