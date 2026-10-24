// backend/src/utils/signatureRequests.js
// Signature à distance : l'agent travaille sur le PC, le patient signe sur une
// tablette posée au guichet.
//
//  - Demande de signature : jeton aléatoire à usage unique, valable 15 min,
//    gardé en mémoire (pas besoin de survivre à un redémarrage : l'agent relance
//    simplement la demande). Le jeton ne donne accès qu'à CE document et à
//    l'envoi d'UNE signature ; c'est le PC de l'agent qui l'appose ensuite.
//  - Bornes : tablettes de guichet connectées à la GED (page /borne-signature)
//    qui s'annoncent par Socket.IO et reçoivent les demandes directement.
import crypto from 'crypto';

export const REQUEST_TTL_MS = 15 * 60 * 1000;

let ioRef = null;
const requests = new Map(); // token → demande
const kiosks = new Map();   // socketId → { id, name, tenantId, userId, userName, busy }

const purge = () => {
  const now = Date.now();
  for (const [token, r] of requests) {
    if (r.expiresAt < now - 60_000) requests.delete(token);
  }
};

const emitToRequester = (r, event, payload = {}) => {
  ioRef?.to(`user:${r.requesterId}`).emit(event, { token: r.token, documentId: r.documentId, ...payload });
};

export function createRequest({ tenantId, documentId, requesterId, signerName, placement, title }) {
  purge();
  const token = crypto.randomBytes(24).toString('base64url');
  const r = {
    token, tenantId, documentId, requesterId, signerName, placement, title,
    status: 'waiting', // waiting | opened | signed | cancelled
    createdAt: Date.now(),
    expiresAt: Date.now() + REQUEST_TTL_MS,
    signature: null,
    pointerType: null,
    kioskId: null,
  };
  requests.set(token, r);
  return r;
}

// Demande valide pour ce tenant (null si inconnue, expirée ou d'un autre tenant)
export function getRequest(token, tenantId) {
  const r = requests.get(String(token || ''));
  if (!r || (tenantId && r.tenantId !== tenantId)) return null;
  if (r.expiresAt < Date.now() && r.status !== 'signed') return null;
  return r;
}

export function markOpened(r) {
  if (r.status !== 'waiting') return;
  r.status = 'opened';
  emitToRequester(r, 'signature-request:update', { status: 'opened' });
}

export function storeSignature(r, signature, pointerType) {
  r.status = 'signed';
  r.signature = signature;
  r.pointerType = pointerType;
  emitToRequester(r, 'signature-request:update', { status: 'signed', signature, pointerType });
  releaseKiosk(r);
}

export function cancelRequest(r) {
  r.status = 'cancelled';
  if (r.kioskId) ioRef?.to(r.kioskId).emit('signature-kiosk:cancel', { token: r.token });
  releaseKiosk(r);
}

// Une fois la signature récupérée par le PC, on ne garde plus l'image en mémoire
export function consumeRequest(r) {
  requests.delete(r.token);
}

function releaseKiosk(r) {
  const k = r.kioskId && kiosks.get(r.kioskId);
  if (k && k.busy === r.token) k.busy = null;
}

// ── Bornes ───────────────────────────────────────────────────────────────────
export function listKiosks(tenantId) {
  return [...kiosks.values()]
    .filter((k) => k.tenantId === tenantId)
    .map(({ id, name, userName, busy }) => ({ id, name, userName, busy: !!busy }));
}

export function sendToKiosk(r, kioskId) {
  const k = kiosks.get(kioskId);
  if (!k || k.tenantId !== r.tenantId) return false;
  k.busy = r.token;
  r.kioskId = kioskId;
  ioRef?.to(kioskId).emit('signature-kiosk:request', { token: r.token });
  return true;
}

// Branché sur chaque connexion Socket.IO (cf. socketManager.js)
export function attachSignatureKiosk(socket, io) {
  ioRef = io;
  socket.on('signature-kiosk:register', async ({ name } = {}) => {
    try {
      const { User } = await import('../models/index.js');
      const user = await User.findByPk(socket.userId, { attributes: ['id', 'firstName', 'lastName', 'tenantId'] });
      if (!user) return;
      const prev = kiosks.get(socket.id);
      kiosks.set(socket.id, {
        id: socket.id,
        name: String(name || '').trim().slice(0, 60) || 'Tablette',
        tenantId: user.tenantId,
        userId: user.id,
        userName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        busy: prev?.busy || null,
      });
      socket.emit('signature-kiosk:registered', { id: socket.id });
    } catch (err) {
      console.warn('[borne signature] enregistrement :', err.message);
    }
  });
  socket.on('signature-kiosk:unregister', () => kiosks.delete(socket.id));
  socket.on('disconnect', () => kiosks.delete(socket.id));
}
