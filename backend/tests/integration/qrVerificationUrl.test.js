// QR de vérification des documents signés :
//  - adresse = domaine de l'établissement, sinon APP_URL ; jamais localhost
//    quand une vraie adresse est connue (bug du 29/10 : QR vers localhost:3001) ;
//  - remplacement du QR des documents déjà signés : même code, bonne adresse,
//    nouvelle version du fichier, ancien fichier conservé ; simulation par défaut.
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import sequelize from '../../src/config/database.js';
import { Document, Tenant } from '../../src/models/index.js';
import { generateQRCodeBuffer, resolveAppUrl, buildVerificationUrl } from '../../src/utils/qrVerification.js';
import { restampPdf, restampVerificationQrs } from '../../src/utils/qrRestamp.js';
import { createTenant, makeFactory } from '../helpers/fixtures.js';

let f, doc, oldFile;
const HASH = 'abcdef0123456789';
const savedAppUrl = process.env.APP_URL;

// PDF signé « comme en production » : QR 80 px posé en bas à droite de la dernière page
async function signedPdf(url) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.addPage([595.28, 841.89]);
  const last = pdfDoc.addPage([595.28, 841.89]);
  last.drawImage(await pdfDoc.embedPng(await generateQRCodeBuffer(url)), { x: 595.28 - 70, y: 15, width: 55, height: 55 });
  return pdfDoc.save({ useObjectStreams: false });
}

before(async () => {
  f = makeFactory(await createTenant());
  const owner = await f.user();
  oldFile = `test_qr_${Date.now()}.pdf`;
  await fs.mkdir(path.resolve('uploads'), { recursive: true });
  await fs.writeFile(path.resolve('uploads', oldFile), await signedPdf(`http://localhost:3001/verify/${HASH}`));
  doc = await Document.create({
    title: 'Test QR', fileName: oldFile, originalName: oldFile, filePath: `uploads/${oldFile}`, fileType: 'application/pdf',
    userId: owner.id, tenantId: f.tenant.id, status: 'approved',
    metadata: { verification_hash: HASH, verification_url: `http://localhost:3001/verify/${HASH}` },
  });
});
after(async () => {
  process.env.APP_URL = savedAppUrl;
  await doc.reload();
  for (const p of new Set([oldFile, doc.fileName])) await fs.rm(path.resolve('uploads', p), { force: true });
  await doc.destroy();
  await sequelize.close();
});

test('adresse du QR : domaine de l\'établissement, sinon APP_URL', async () => {
  process.env.APP_URL = 'https://ged.hsjmcam.net/';
  await Tenant.update({ domain: 'localhost' }, { where: { id: f.tenant.id } });
  assert.equal(await resolveAppUrl(f.tenant.id), 'https://ged.hsjmcam.net', 'localhost ignoré au profit d\'APP_URL');
  await Tenant.update({ domain: '192.168.1.186' }, { where: { id: f.tenant.id } });
  assert.equal(await resolveAppUrl(f.tenant.id), 'https://ged.hsjmcam.net', 'adresse IP ignorée');
  const domain = `ged-${f.tenant.id.slice(0, 8)}.exemple.org`;
  await Tenant.update({ domain }, { where: { id: f.tenant.id } });
  assert.equal(await resolveAppUrl(f.tenant.id), `https://${domain}`);
  assert.equal(buildVerificationUrl(HASH, 'https://ged.hsjmcam.net'), `https://ged.hsjmcam.net/verify/${HASH}`);
  await Tenant.update({ domain: 'localhost' }, { where: { id: f.tenant.id } });
});

test('remplacement : QR introuvable → aucun fichier produit', async () => {
  const blank = await PDFDocument.create();
  blank.addPage();
  assert.equal(await restampPdf(await blank.save(), 'https://ged.hsjmcam.net/verify/x'), null);
});

test('remplacement : simulation sans écriture, puis nouvelle version avec la bonne adresse', async () => {
  process.env.APP_URL = 'https://ged.hsjmcam.net';
  const dry = await restampVerificationQrs({ log: () => {} });
  assert.ok(dry.updated >= 1);
  await doc.reload();
  assert.equal(doc.filePath, `uploads/${oldFile}`, 'la simulation ne modifie rien');

  const applied = await restampVerificationQrs({ apply: true, log: () => {} });
  assert.ok(applied.updated >= 1);
  await doc.reload();
  assert.notEqual(doc.fileName, oldFile);
  assert.equal(doc.metadata.verification_hash, HASH, 'même code de vérification');
  assert.equal(doc.metadata.verification_url, `https://ged.hsjmcam.net/verify/${HASH}`);
  assert.equal(doc.metadata.qr_previous_file, `uploads/${oldFile}`);
  await fs.access(path.resolve('uploads', oldFile));
  const pdf = await PDFDocument.load(await fs.readFile(path.resolve('uploads', doc.fileName)));
  assert.equal(pdf.getPageCount(), 2);

  const again = await restampVerificationQrs({ apply: true, log: () => {} });
  const before = doc.fileName;
  await doc.reload();
  assert.equal(doc.fileName, before, 'déjà corrigé : pas de nouvelle version');
  assert.ok(again.ok >= 1);
});

test('remplacement refusé tant que l\'adresse de la GED est inconnue', async () => {
  delete process.env.APP_URL;
  await assert.rejects(restampVerificationQrs({ log: () => {} }), /APP_URL/);
});
