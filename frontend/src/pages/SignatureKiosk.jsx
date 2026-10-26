// frontend/src/pages/SignatureKiosk.jsx
// /borne-signature — tablette posée au guichet, connectée à la GED : elle
// s'annonce (Socket.IO) et apparaît dans « Sur une tablette » sur les PC ;
// une demande envoyée par l'agent s'ouvre ici directement, sans QR code.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Tablet, Wifi, WifiOff, Pencil } from 'lucide-react';
import { getSocket, initializeSocket } from '../services/api';
import RemoteSigner from '../components/RemoteSigner';

const NAME_KEY = 'ged.kiosk.name';
const readName = () => { try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; } };
const saveName = (v) => { try { localStorage.setItem(NAME_KEY, v); } catch { /* stockage indisponible */ } };

export default function SignatureKiosk() {
  const { t } = useTranslation();
  const [name, setName] = useState(() => readName() || t('Tablette du guichet'));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [connected, setConnected] = useState(false);
  const [refused, setRefused] = useState(null); // compte non autorisé comme tablette
  const [token, setToken] = useState(null);
  const tokenRef = useRef(null);
  tokenRef.current = token;
  const nameRef = useRef(name);
  nameRef.current = name;

  // Connexion + annonce de la borne (à chaque reconnexion aussi)
  useEffect(() => {
    const socket = getSocket() || initializeSocket();
    if (!socket) return undefined;
    const register = () => { setConnected(true); socket.emit('signature-kiosk:register', { name: nameRef.current }); };
    const onDisconnect = () => setConnected(false);
    const onRequest = ({ token: tk }) => setToken(tk);
    const onRefused = ({ message } = {}) => setRefused(message || t('Ce compte ne peut pas servir de tablette de signature.'));
    const onRegistered = () => setRefused(null);
    const onCancel = ({ token: tk }) => {
      if (tk === tokenRef.current) { setToken(null); toast(t('Demande annulée depuis le PC.')); }
    };
    socket.on('connect', register);
    socket.on('disconnect', onDisconnect);
    socket.on('signature-kiosk:request', onRequest);
    socket.on('signature-kiosk:cancel', onCancel);
    socket.on('signature-kiosk:refused', onRefused);
    socket.on('signature-kiosk:registered', onRegistered);
    if (socket.connected) register();
    return () => {
      socket.emit('signature-kiosk:unregister');
      socket.off('connect', register);
      socket.off('disconnect', onDisconnect);
      socket.off('signature-kiosk:request', onRequest);
      socket.off('signature-kiosk:cancel', onCancel);
      socket.off('signature-kiosk:refused', onRefused);
      socket.off('signature-kiosk:registered', onRegistered);
    };
  }, [t]);

  // Le nouveau nom est annoncé tout de suite
  useEffect(() => {
    const socket = getSocket();
    if (socket?.connected) socket.emit('signature-kiosk:register', { name });
  }, [name]);

  // Écran toujours allumé tant que la borne est ouverte (si le navigateur le permet)
  useEffect(() => {
    let lock = null;
    const acquire = () => navigator.wakeLock?.request('screen').then((l) => { lock = l; }).catch(() => {});
    acquire();
    const onVisible = () => { if (document.visibilityState === 'visible') acquire(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { document.removeEventListener('visibilitychange', onVisible); lock?.release?.().catch(() => {}); };
  }, []);

  const finished = useCallback(() => setToken(null), []);

  if (token) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
        <RemoteSigner key={token} token={token} onFinished={finished} />
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 24, background: '#f4f5f8', textAlign: 'center' }}>
      <Tablet size={64} color="#1f2a52" strokeWidth={1.5} />
      {editing ? (
        <form onSubmit={(e) => { e.preventDefault(); const v = draft.trim().slice(0, 60); if (v) { setName(v); saveName(v); } setEditing(false); }}
          style={{ display: 'flex', gap: 8 }}>
          <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={60}
            style={{ height: 44, padding: '0 12px', borderRadius: 10, border: '1px solid #cfd4de', fontSize: 18 }} />
          <button type="submit" style={{ height: 44, padding: '0 16px', borderRadius: 10, border: 'none', background: '#1f2a52', color: '#fff', fontWeight: 700 }}>{t('OK')}</button>
        </form>
      ) : (
        <button onClick={() => { setDraft(name); setEditing(true); }} title={t('Renommer cette tablette')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 26, fontWeight: 800, color: '#1f2a52' }}>
          {name} <Pencil size={16} color="#8a90a0" />
        </button>
      )}
      {refused
        ? <div style={{ fontSize: 16, color: '#b91c1c', maxWidth: 520, background: '#fee2e2', borderRadius: 10, padding: '12px 14px' }}>{t(refused)}</div>
        : <div style={{ fontSize: 18, color: '#5b6275', maxWidth: 520 }}>{t('Prête à recevoir les documents à signer.')}</div>}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: refused ? '#b91c1c' : connected ? '#16a34a' : '#d97706' }}>
        {connected ? <Wifi size={16} /> : <WifiOff size={16} />}
        {refused ? t('Tablette non autorisée') : connected ? t('Connectée à la GED') : t('Connexion en cours…')}
      </div>
      <div style={{ fontSize: 13, color: '#8a90a0', maxWidth: 520, marginTop: 12 }}>
        {t('Sur le PC : « Faire signer » → « Sur une tablette » → « {{name}} ».', { name })}
      </div>
    </div>
  );
}
