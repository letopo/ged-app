// Échéances des véhicules, jeton de signature à distance, image de signature.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { deadlineStatus } from '../../src/controllers/vehicleFleetController.js';
import { parseSignaturePng, isManuallySigned } from '../../src/controllers/manualSignatureController.js';
import {
  createRequest, getRequest, storeSignature, cancelRequest, consumeRequest, markOpened, REQUEST_TTL_MS,
} from '../../src/utils/signatureRequests.js';

const inDays = (n) => {
  const d = new Date(`${new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Douala' })}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

test('échéance sans date ni km : à renseigner', () => {
  assert.equal(deadlineStatus({}, 1000).status, 'a_renseigner');
});
test('échéance par date : ok / bientôt (≤ 30 j) / dépassée', () => {
  assert.deepEqual(deadlineStatus({ dueDate: inDays(31) }, null), { status: 'ok', days: 31, kmLeft: null });
  assert.equal(deadlineStatus({ dueDate: inDays(30) }, null).status, 'bientot');
  assert.equal(deadlineStatus({ dueDate: inDays(0) }, null).status, 'bientot');
  assert.equal(deadlineStatus({ dueDate: inDays(-1) }, null).status, 'depassee');
});
test('échéance par km : bientôt (≤ 1 000 km) / dépassée ; km inconnu ignoré', () => {
  assert.equal(deadlineStatus({ dueMileage: 50000 }, 48000).status, 'ok');
  assert.deepEqual(deadlineStatus({ dueMileage: 50000 }, 49000), { status: 'bientot', days: null, kmLeft: 1000 });
  assert.equal(deadlineStatus({ dueMileage: 50000 }, 50000).status, 'depassee');
  assert.equal(deadlineStatus({ dueMileage: 50000 }, null).status, 'ok');
});
test('échéance date + km : la plus urgente l\'emporte', () => {
  assert.equal(deadlineStatus({ dueDate: inDays(100), dueMileage: 50000 }, 50100).status, 'depassee');
  assert.equal(deadlineStatus({ dueDate: inDays(-2), dueMileage: 50000 }, 10000).status, 'depassee');
  assert.equal(deadlineStatus({ dueDate: inDays(10), dueMileage: 50000 }, 10000).status, 'bientot');
});

test('signature à distance : jeton lié au tenant', () => {
  const r = createRequest({ tenantId: 't1', documentId: 'd1', requesterId: 'u1', signerName: 'Patient', placement: {} });
  assert.ok(r.token.length >= 30);
  assert.equal(getRequest(r.token, 't1'), r);
  assert.equal(getRequest(r.token, 't2'), null);
  assert.equal(getRequest('inconnu', 't1'), null);
});
test('signature à distance : expire après 15 min (sauf déjà signée)', (t) => {
  const r = createRequest({ tenantId: 't1', documentId: 'd1', requesterId: 'u1' });
  const signed = createRequest({ tenantId: 't1', documentId: 'd2', requesterId: 'u1' });
  storeSignature(signed, 'data:image/png;base64,xx', 'pen');
  const realNow = Date.now;
  t.after(() => { Date.now = realNow; });
  Date.now = () => realNow() + REQUEST_TTL_MS + 1000;
  assert.equal(getRequest(r.token, 't1'), null);
  assert.equal(getRequest(signed.token, 't1')?.status, 'signed');
});
test('signature à distance : usage unique', () => {
  const r = createRequest({ tenantId: 't1', documentId: 'd1', requesterId: 'u1' });
  markOpened(r);
  assert.equal(r.status, 'opened');
  storeSignature(r, 'sig', 'touch');
  consumeRequest(r);
  assert.equal(getRequest(r.token, 't1'), null);
  const c = createRequest({ tenantId: 't1', documentId: 'd1', requesterId: 'u1' });
  cancelRequest(c);
  assert.equal(c.status, 'cancelled');
});

test('image de signature : seul un vrai PNG en data URL est accepté', async () => {
  const png = await sharp({ create: { width: 200, height: 80, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
  assert.ok(parseSignaturePng(`data:image/png;base64,${png.toString('base64')}`));
  const jpg = await sharp({ create: { width: 200, height: 80, channels: 3, background: '#fff' } }).jpeg().toBuffer();
  assert.equal(parseSignaturePng(`data:image/png;base64,${jpg.toString('base64')}`), null);
  assert.equal(parseSignaturePng('data:image/png;base64,AAAA'), null);
  assert.equal(parseSignaturePng(null), null);
  assert.equal(parseSignaturePng(`data:image/svg+xml;base64,${png.toString('base64')}`), null);
});
test('document signé à la main = verrouillé', () => {
  assert.equal(isManuallySigned({ metadata: { manualSignature: { sha256: 'x' } } }), true);
  assert.equal(isManuallySigned({ metadata: {} }), false);
  assert.equal(isManuallySigned(null), false);
});
