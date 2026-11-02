// frontend/src/components/chat/DocumentBanner.jsx
// Bandeau épinglé en haut de la discussion d'un document (page Discussion) :
// aperçu, titre, type, statut et étape de validation en cours, bouton « Ouvrir ».
// Se met à jour quand le document change (événement chat:document_updated).
// Réservé à qui peut lire le document : sinon « accès réservé », sans titre.
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Lock } from 'lucide-react';
import { getSocket } from '../../services/api';
import chatService from '../../services/chatService';
import DocumentThumbnail from '../DocumentThumbnail';

const STATUS = {
  approved: ['Approuvé', 'var(--success)', 'var(--success-soft)'],
  rejected: ['Rejeté', 'var(--danger)', 'var(--danger-soft)'],
  pending_validation: ['En validation', 'var(--warning)', 'var(--warning-soft)'],
  in_progress: ['En validation', 'var(--warning)', 'var(--warning-soft)'],
  en_attente_dependance: ['En pause', 'var(--fg-muted)', 'var(--surface-2)'],
  draft: ['Brouillon', 'var(--fg-muted)', 'var(--surface-2)'],
};

export default function DocumentBanner({ conversationId }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);

  const load = useCallback(() => {
    chatService.getConversationDocument(conversationId).then(setDoc).catch(() => {});
  }, [conversationId]);

  useEffect(() => { setDoc(null); load(); }, [load]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;
    const onUpdate = ({ conversationId: cid }) => { if (cid === conversationId) load(); };
    socket.on('chat:document_updated', onUpdate);
    return () => socket.off('chat:document_updated', onUpdate);
  }, [conversationId, load]);

  if (!doc) return null;

  const wrap = {
    display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px',
    borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0,
  };

  if (!doc.accessible) {
    return (
      <div className="chat-doc-banner" style={wrap}>
        <Lock size={16} style={{ color: 'var(--fg-muted)', flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{t('Document de la GED — accès réservé. Demandez à son auteur de vous le transmettre.')}</span>
      </div>
    );
  }

  const [label, fg, bg] = STATUS[doc.status] || [doc.status, 'var(--fg-muted)', 'var(--surface-2)'];
  const wf = doc.workflow;
  const progress = wf?.current
    ? (wf.current.isMe
      ? t('Étape {{step}}/{{total}} · c\'est à vous de valider', { step: wf.current.step, total: wf.total })
      : t('Étape {{step}}/{{total}} · au tour de {{name}}', { step: wf.current.step, total: wf.total, name: wf.current.validator || '—' }))
    : wf && doc.status === 'approved' ? t('Circuit terminé ({{total}} étape(s))', { total: wf.total }) : null;

  return (
    <div className="chat-doc-banner" style={wrap}>
      <div className="chat-doc-thumb" style={{ position: 'relative', width: 38, height: 50, flexShrink: 0, borderRadius: 4, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--surface-3)' }}>
        <DocumentThumbnail doc={doc} label="" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 8px', borderRadius: 999, color: fg, background: bg, flexShrink: 0 }}>{t(label)}</span>
        </div>
        <div className="chat-doc-meta" style={{ fontSize: 12, color: wf?.current?.isMe ? 'var(--brand)' : 'var(--fg-muted)', fontWeight: wf?.current?.isMe ? 600 : 400, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {[doc.category ? t(doc.category) : null, progress].filter(Boolean).join(' · ')}
        </div>
      </div>
      <button type="button" onClick={() => navigate(`/documents/${doc.id}`)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: 'none', background: 'var(--brand)', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
        <ExternalLink size={13} /> <span className="chat-doc-open-long">{t('Ouvrir le document')}</span><span className="chat-doc-open-short">{t('Ouvrir')}</span>
      </button>
    </div>
  );
}
