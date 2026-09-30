// frontend/src/components/TransmitDocumentModal.jsx
// Transmettre un document validé à une ou plusieurs personnes (ex. demande d'achat
// signée → acheteur). Le destinataire le retrouve dans Documents › Reçus.
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Search, Loader, Send, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { documentsAPI } from '../services/api';

export default function TransmitDocumentModal({ document: doc, onClose, onDone }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState([]);   // [{ id, name, email }]
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Recherche des destinataires (légère temporisation pendant la frappe)
  useEffect(() => {
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      documentsAPI.getTransmissionRecipients(query)
        .then(res => { if (!cancelled) setResults(res.data.users || []); })
        .catch(() => { if (!cancelled) setResults([]); })
        .finally(() => { if (!cancelled) setSearching(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query]);

  const toggle = (u) => setSelected(s => s.some(x => x.id === u.id) ? s.filter(x => x.id !== u.id) : [...s, u]);

  const send = async () => {
    if (selected.length === 0) { toast.error(t('Choisissez au moins un destinataire.')); return; }
    setSending(true);
    try {
      const res = await documentsAPI.transmit(doc.id, { userIds: selected.map(u => u.id), message });
      toast.success(res.data.message || t('Document transmis'));
      onDone?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || t('Erreur lors de la transmission'));
    } finally {
      setSending(false);
    }
  };

  return ReactDOM.createPortal(
    <div className="rn-overlay" role="dialog" aria-modal="true" aria-labelledby="transmit-title" style={{ zIndex: 9600 }}>
      <div className="rn-modal rn-editor">
        <div className="rn-editor-head">
          <h2 id="transmit-title">{t('Transmettre le document')}</h2>
          <button type="button" onClick={onClose} className="rn-bubble-close" aria-label={t('Fermer')}><X size={16} /></button>
        </div>
        <div className="rn-modal-body">
          <p className="rn-hint" style={{ marginTop: 0 }}>
            <strong style={{ color: 'var(--fg)' }}>{doc.title}</strong><br />
            {t('Les destinataires pourront le consulter et créer un document à partir de lui (ex. bon de commande). Ils le retrouveront dans Documents › Reçus.')}
          </p>

          {selected.length > 0 && (
            <div className="tr-chips">
              {selected.map(u => (
                <span key={u.id} className="tr-chip">
                  {u.name}
                  <button type="button" onClick={() => toggle(u)} aria-label={t('Retirer')}><X size={11} /></button>
                </span>
              ))}
            </div>
          )}

          <label className="rn-field" style={{ marginBottom: 8 }}>
            <span>{t('Destinataire(s)')}</span>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)' }} />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('Nom ou e-mail…')} style={{ paddingLeft: 30 }} autoFocus />
            </div>
          </label>
          <div className="tr-results">
            {searching ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 14 }}><Loader size={16} className="animate-spin" color="var(--brand)" /></div>
            ) : results.length === 0 ? (
              <div style={{ padding: 14, fontSize: 13, color: 'var(--fg-muted)', textAlign: 'center' }}>{t('Aucun utilisateur trouvé.')}</div>
            ) : results.map(u => {
              const on = selected.some(x => x.id === u.id);
              return (
                <button type="button" key={u.id} onClick={() => toggle(u)} className={`tr-result${on ? ' is-on' : ''}`}>
                  <span className="tr-check">{on && <Check size={12} />}</span>
                  <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{u.name}</span>
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <label className="rn-field" style={{ marginTop: 14 }}>
            <span>{t('Message')} <em>{t('— facultatif')}</em></span>
            <textarea rows={3} maxLength={1000} value={message} onChange={e => setMessage(e.target.value)}
              placeholder={t('Ex. : Merci de préparer le bon de commande pour ce matériel.')} />
          </label>
        </div>
        <div className="rn-modal-foot">
          <button type="button" onClick={onClose} className="rn-btn-secondary">{t('Annuler')}</button>
          <button type="button" onClick={send} disabled={sending || selected.length === 0} className="rn-btn">
            {sending ? <Loader size={13} className="animate-spin" /> : <Send size={13} />}
            {selected.length > 1 ? t('Transmettre à {{count}} personnes', { count: selected.length }) : t('Transmettre')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
