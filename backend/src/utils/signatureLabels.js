// backend/src/utils/signatureLabels.js
// Titres des cadres de signature, déduits des validateurs choisis à la soumission.
//
// Les formulaires produisent un PDF dont les cadres de signature n'ont pas de
// libellé (emplacement réservé, cf. SignatureFrame). À la soumission, quand le
// circuit est connu, on inscrit au-dessus de chaque cadre le titre du signataire
// (son poste, sinon sa fonction dans son service) et son nom. Les titres sont
// figés dans document.metadata.signatureZones[].signer.
//
// Correspondance cadre ↔ étape : la même que pour l'apposition des signatures
// (workflowController.validateWorkflowStep) — les N derniers signataires (hors
// comptable ajouté en fin de circuit) signent les cadres 1..N dans l'ordre.
import fs from 'fs/promises';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { User, Poste, ServiceMember, Workflow } from '../models/index.js';
import { getPosteHolders } from './posteResolver.js';
import { currentCycleSteps } from './workflowEngine.js';

// Circuits imposés : leurs cadres désignent un rôle dans le document (Visa
// Bénéficiaire…), leurs libellés restent ceux du formulaire.
export const FIXED_LABEL_CATEGORIES = ['Pièce de caisse', 'Ordre de mission', "Demande d'explication", 'Demande de permutation'];

const ROLE_TITLES = { superadmin: 'Administrateur', admin: 'Administrateur', director: 'Directeur', validator: 'Validateur', user: 'Agent' };

// Titres possibles pour chaque utilisateur : postes, sinon fonctions, sinon rôle.
export async function getSignerTitleOptions(userIds) {
  const users = await User.findAll({
    where: { id: userIds },
    attributes: ['id', 'firstName', 'lastName', 'role'],
    include: [{ model: Poste, as: 'postes', attributes: ['code', 'label'], through: { attributes: [] } }],
  });
  const members = await ServiceMember.findAll({ where: { userId: userIds, isActive: true }, attributes: ['userId', 'fonction'] });
  return Object.fromEntries(users.map(u => {
    const postes = (u.postes || []).map(p => p.label).filter(Boolean);
    const fonctions = [...new Set(members.filter(m => m.userId === u.id).map(m => (m.fonction || '').trim()).filter(Boolean))];
    const options = postes.length ? postes : fonctions.length ? fonctions : [ROLE_TITLES[u.role] || 'Validateur'];
    return [u.id, { name: `${u.firstName || ''} ${u.lastName || ''}`.trim(), options }];
  }));
}

// Page qui porte les cadres (même règle que pour les signatures)
const signaturePageIndex = (document, pageCount) =>
  (Number.isInteger(document.metadata?.signaturePage) ? Math.min(document.metadata.signaturePage, pageCount - 1)
    : ['Demande de travaux', 'Demande de permutation'].includes(document.category) ? 0 : pageCount - 1);

// Texte réduit jusqu'à tenir dans la largeur du cadre
function fit(font, text, maxSize, minSize, maxWidth) {
  let size = maxSize;
  while (size > minSize && font.widthOfTextAtSize(text, size) > maxWidth) size -= 0.5;
  let t = text;
  while (t.length > 3 && font.widthOfTextAtSize(t, size) > maxWidth) t = `${t.slice(0, -2)}…`;
  return { text: t, size };
}

/**
 * Inscrit les titres des signataires au-dessus des cadres du PDF et les fige
 * dans les métadonnées. `chosenTitles` : { [userId]: titre choisi à la soumission }.
 * Sans effet pour les circuits imposés, les documents non PDF ou sans cadres.
 */
export async function applySignerLabels(document, chosenTitles = {}) {
  const zones = Array.isArray(document.metadata?.signatureZones) ? document.metadata.signatureZones : null;
  if (!zones?.length || document.fileType !== 'application/pdf' || FIXED_LABEL_CATEGORIES.includes(document.category)) return null;

  // Cycle en cours seulement (même règle que l'apposition des signatures)
  const steps = currentCycleSteps(await Workflow.findAll({ where: { documentId: document.id }, attributes: ['step', 'validatorId', 'createdAt'], order: [['step', 'ASC']] }));
  if (!steps.length) return null;

  // Même règle que l'apposition des signatures (validateWorkflowStep) :
  // S = étapes hors comptable final, N = cadres ; le cadre p reçoit l'étape S - N + p.
  const comptableIds = (await getPosteHolders('comptable')).map(u => u.id);
  const lastIsComptable = comptableIds.includes(steps[steps.length - 1].validatorId);
  const S = lastIsComptable ? steps.length - 1 : steps.length;
  const N = zones.length;
  const byStep = new Map(steps.map(w => [w.step, w.validatorId]));

  const titles = await getSignerTitleOptions([...new Set(steps.map(w => w.validatorId))]);
  const assignments = [];
  for (let p = 1; p <= N; p++) {
    const zone = zones.find(z => z.index === p) || zones[p - 1];
    const stepNo = S - N + p;
    const validatorId = stepNo >= 1 ? byStep.get(stepNo) : null;
    if (!validatorId) { assignments.push({ zone, signer: null }); continue; }   // cadre sans signataire : vierge
    const info = titles[validatorId] || { name: '', options: ['Validateur'] };
    const wanted = (chosenTitles[validatorId] || '').trim();
    const title = info.options.includes(wanted) ? wanted : info.options[0];
    assignments.push({ zone, signer: { userId: validatorId, step: stepNo, title, name: info.name } });
  }

  // ── Inscription sur le PDF ──────────────────────────────────────────────────
  // On part toujours de la version VIERGE du formulaire (sans titres ni
  // signatures), gardée à la première soumission : une nouvelle soumission
  // (après expiration ou rejet) ne laisse ainsi aucun ancien titre — même caché
  // sous du blanc, il resterait dans le texte du PDF — ni signature d'un cycle
  // précédent.
  const pdfPath = path.resolve(process.cwd(), document.filePath);
  let basePath = document.metadata?.unsignedFilePath;
  const baseExists = basePath && await fs.access(path.resolve(process.cwd(), basePath)).then(() => true, () => false);
  if (!baseExists) {
    basePath = `uploads/${path.basename(document.fileName || document.filePath, '.pdf').replace(/_v\d+$/, '')}_vierge.pdf`;
    await fs.copyFile(pdfPath, path.resolve(process.cwd(), basePath));
  }
  const pdfDoc = await PDFDocument.load(await fs.readFile(path.resolve(process.cwd(), basePath)));
  const pages = pdfDoc.getPages();
  const page = pages[signaturePageIndex(document, pages.length)];
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  // Les polices standard PDF ne couvrent que le jeu WinAnsi : on retire le reste
  const safe = (s) => String(s || '').normalize('NFC').replace(/[^ -~ -ÿ’…–—]/g, '');

  let written = 0;
  for (const { zone, signer } of assignments) {
    // Emplacement mesuré à la création du PDF (SignatureFrame data-sig-label).
    // Documents plus anciens (libellé écrit dans l'image) : on n'y touche pas.
    const box = zone.label;
    if (!box) continue;
    written++;
    if (!signer) continue;
    const title = fit(bold, safe(signer.title).toUpperCase(), Math.min(10, box.height * 0.36), 6, box.width - 4);
    page.drawText(title.text, {
      x: box.x + (box.width - bold.widthOfTextAtSize(title.text, title.size)) / 2,
      y: box.y + box.height * 0.54, size: title.size, font: bold, color: rgb(0, 0, 0),
    });
    if (signer.name) {
      const name = fit(regular, safe(signer.name), Math.min(8.5, box.height * 0.3), 6, box.width - 4);
      page.drawText(name.text, {
        x: box.x + (box.width - regular.widthOfTextAtSize(name.text, name.size)) / 2,
        y: box.y + box.height * 0.16, size: name.size, font: regular, color: rgb(0.3, 0.3, 0.3),
      });
    }
  }
  if (!written) return null;
  await fs.writeFile(pdfPath, await pdfDoc.save({ useObjectStreams: false }));

  const signatureZones = zones.map(z => {
    const a = assignments.find(x => x.zone === z);
    return { ...z, signer: a?.signer || null };
  });
  await document.update({ metadata: { ...document.metadata, signatureZones, unsignedFilePath: basePath } });
  return signatureZones;
}
