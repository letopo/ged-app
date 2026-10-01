// backend/scripts/test-cachet-taille-reelle.mjs
// Vérifie qu'un cachet est apposé à sa taille réelle (utils/stampSize.js) :
// génère un PDF A4 avec un cachet PNG de 2000 px, transparent, au ratio 58/22,
// puis relit dans le flux du PDF la taille réellement dessinée.
//   docker exec ged-backend node scripts/test-cachet-taille-reelle.mjs
import { PNG } from 'pngjs';
import { PDFDocument, PDFName, PDFArray, PDFRawStream, decodePDFRawStream } from 'pdf-lib';
import { centeredStampRect } from '../src/utils/stampSize.js';

const W = 2000, H = Math.round(W * 22 / 58);
const png = new PNG({ width: W, height: H });
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = (W * y + x) << 2;
  png.data.set([20, 40, 160, x < 12 || y < 12 || x >= W - 12 || y >= H - 12 ? 255 : 0], i); // fond transparent
}
const pdf = await PDFDocument.create();
const page = pdf.addPage([595.28, 841.89]);
const img = await pdf.embedPng(PNG.sync.write(png));
page.drawImage(img, centeredStampRect(img, 58, 297.65, 136.1));
const doc = await PDFDocument.load(await pdf.save());

// Relecture : matrices `cm` cumulées jusqu'au `Do` de l'image
const p = doc.getPages()[0];
const c = p.node.Contents();
const streams = c instanceof PDFArray ? c.asArray().map(r => doc.context.lookup(r)) : [c];
const text = streams.map(s => Buffer.from(s instanceof PDFRawStream ? decodePDFRawStream(s).decode() : s.getContents()).toString('latin1')).join('\n');
const mul = (m, n) => [m[0]*n[0]+m[1]*n[2], m[0]*n[1]+m[1]*n[3], m[2]*n[0]+m[3]*n[2], m[2]*n[1]+m[3]*n[3], m[4]*n[0]+m[5]*n[2]+n[4], m[4]*n[1]+m[5]*n[3]+n[5]];
let ctm = [1, 0, 0, 1, 0, 0]; const stack = []; const nums = []; let size = null;
for (const tk of text.match(/\/[^\s/[\]()<>]+|[-+]?\d*\.?\d+|[A-Za-z'"*]+/g)) {
  if (/^[-+]?\d*\.?\d+$/.test(tk)) { nums.push(Number(tk)); continue; }
  if (tk === 'q') stack.push(ctm);
  else if (tk === 'Q') ctm = stack.pop();
  else if (tk === 'cm') ctm = mul(nums.slice(-6), ctm);
  else if (tk === 'Do') size = { widthMm: ctm[0] * 25.4 / 72, heightMm: ctm[3] * 25.4 / 72 };
  nums.length = 0;
}
const xobj = doc.context.lookup(p.node.Resources().lookup(PDFName.of('XObject')).values()[0]);
const transparent = xobj.dict.has(PDFName.of('SMask'));
const ok = Math.abs(size.widthMm - 58) < 0.05 && Math.abs(size.heightMm - 22) < 0.1 && transparent;
console.log(`Cachet ${W}×${H} px posé à ${size.widthMm.toFixed(2)} × ${size.heightMm.toFixed(2)} mm, transparence : ${transparent ? 'oui' : 'non'} → ${ok ? 'OK' : 'ÉCHEC'}`);
process.exit(ok ? 0 : 1);
