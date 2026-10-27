// Appareil WebAuthn logiciel pour les tests : joue le rôle du téléphone ou du
// PC (empreinte / code PIN validés) avec une clé ECDSA P-256 en mémoire.
// Produit les réponses JSON que le navigateur envoie (format SimpleWebAuthn).
import crypto from 'crypto';

const b64url = (buf) => Buffer.from(buf).toString('base64url');
const sha256 = (data) => crypto.createHash('sha256').update(data).digest();

// ── CBOR minimal (entiers, octets, texte, tables) ────────────────────────────
function head(major, n) {
  if (n < 24) return Buffer.from([(major << 5) | n]);
  if (n < 256) return Buffer.from([(major << 5) | 24, n]);
  const b = Buffer.alloc(3); b[0] = (major << 5) | 25; b.writeUInt16BE(n, 1); return b;
}
function cbor(value) {
  if (Number.isInteger(value)) return value >= 0 ? head(0, value) : head(1, -1 - value);
  if (Buffer.isBuffer(value)) return Buffer.concat([head(2, value.length), value]);
  if (typeof value === 'string') { const b = Buffer.from(value, 'utf8'); return Buffer.concat([head(3, b.length), b]); }
  if (value instanceof Map) {
    return Buffer.concat([head(5, value.size), ...[...value].flatMap(([k, v]) => [cbor(k), cbor(v)])]);
  }
  throw new Error(`CBOR : type non géré (${typeof value})`);
}

const FLAG_UP = 0x01; // présence
const FLAG_UV = 0x04; // personne vérifiée (empreinte, visage, PIN)
const FLAG_AT = 0x40; // clé jointe (enregistrement)

export function createSoftAuthenticator({ userVerified = true } = {}) {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const jwk = publicKey.export({ format: 'jwk' });
  const credentialId = crypto.randomBytes(16);
  let signCount = 0;
  let userHandle = null;
  const flags = (extra = 0) => FLAG_UP | (userVerified ? FLAG_UV : 0) | extra;

  const counter = () => { const b = Buffer.alloc(4); b.writeUInt32BE(signCount); return b; };
  const clientData = (type, challenge, origin) => Buffer.from(JSON.stringify({ type, challenge, origin, crossOrigin: false }));

  return {
    credentialId: b64url(credentialId),

    /** Réponse à navigator.credentials.create(options). */
    register(options, origin) {
      userHandle = options.user.id;
      const coseKey = cbor(new Map([[1, 2], [3, -7], [-1, 1], [-2, Buffer.from(jwk.x, 'base64url')], [-3, Buffer.from(jwk.y, 'base64url')]]));
      const idLen = Buffer.alloc(2); idLen.writeUInt16BE(credentialId.length);
      const authData = Buffer.concat([sha256(options.rp.id), Buffer.from([flags(FLAG_AT)]), counter(), Buffer.alloc(16), idLen, credentialId, coseKey]);
      const attestationObject = cbor(new Map([['fmt', 'none'], ['attStmt', new Map()], ['authData', authData]]));
      return {
        id: b64url(credentialId), rawId: b64url(credentialId), type: 'public-key',
        response: {
          clientDataJSON: b64url(clientData('webauthn.create', options.challenge, origin)),
          attestationObject: b64url(attestationObject),
          transports: ['internal'],
        },
        clientExtensionResults: {},
      };
    },

    /** Réponse à navigator.credentials.get(options). */
    authenticate(options, origin) {
      signCount += 1;
      const authData = Buffer.concat([sha256(options.rpId), Buffer.from([flags()]), counter()]);
      const cd = clientData('webauthn.get', options.challenge, origin);
      const signature = crypto.sign('sha256', Buffer.concat([authData, sha256(cd)]), privateKey);
      return {
        id: b64url(credentialId), rawId: b64url(credentialId), type: 'public-key',
        response: { clientDataJSON: b64url(cd), authenticatorData: b64url(authData), signature: b64url(signature), userHandle },
        clientExtensionResults: {},
      };
    },
  };
}
