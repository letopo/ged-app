// frontend/src/components/chat/ChatAttachment.jsx
// Pièce jointe d'un message de la discussion :
//  - fichier envoyé depuis l'ordinateur / le téléphone : aperçu pour les images,
//    carte « Ouvrir / Télécharger » sinon (téléchargement réservé aux membres,
//    via le cookie de session : <img> et liens directs fonctionnent) ;
//  - document de la GED : ouvert dans la GED par qui a le droit de le lire,
//    « Accès réservé » pour les autres (le titre n'est alors pas transmis).
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileText, FileSpreadsheet, FileImage, File, FileArchive, Download, ExternalLink, Lock, Loader } from 'lucide-react';
import chatService from '../../services/chatService';

const IMAGE = /\.(png|jpe?g|gif|webp)$/i;
const INLINE = /\.(pdf|png|jpe?g|gif|webp)$/i;

export const formatSize = (bytes) => {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`;
};

export const fileIcon = (name = '') => {
  if (IMAGE.test(name) || /\.heic$/i.test(name)) return FileImage;
  if (/\.(xlsx?|xlsm|ods|csv)$/i.test(name)) return FileSpreadsheet;
  if (/\.zip$/i.test(name)) return FileArchive;
  if (/\.(pdf|docx?|odt|rtf|txt|pptx?|odp)$/i.test(name)) return FileText;
  return File;
};

const card = {
  display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, padding: '8px 10px',
  maxWidth: 360, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)',
};
const linkBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6,
  fontSize: 12, fontWeight: 500, color: 'var(--brand)', textDecoration: 'none',
  border: '1px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer', whiteSpace: 'nowrap',
};

export default function ChatAttachment({ msg }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  if (msg.is_deleted || msg.isDeleted) return null;

  const documentId = msg.attachment_document_id || msg.attachmentDocumentId;
  const name = msg.attachment_name ?? msg.attachmentName;

  if (documentId) {
    const accessible = msg.document_accessible;
    if (accessible === undefined) {
      return (
        <div style={card}>
          <Loader size={16} className="animate-spin" style={{ color: 'var(--fg-muted)' }} />
          <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{t('Document de la GED…')}</span>
        </div>
      );
    }
    if (!accessible) {
      return (
        <div style={{ ...card, background: 'var(--surface-2)' }} title={t('Vous n\'avez pas le droit de lire ce document. Demandez à son auteur de vous le transmettre.')}>
          <Lock size={18} style={{ color: 'var(--fg-muted)', flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-muted)' }}>{t('Document de la GED — accès réservé')}</div>
            <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{t('Demandez à son auteur de vous le transmettre.')}</div>
          </div>
        </div>
      );
    }
    return (
      <button type="button" onClick={() => navigate(`/documents/${documentId}`)} style={{ ...card, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
        <div style={{ width: 34, height: 34, borderRadius: 6, background: 'var(--brand-soft)', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <FileText size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name || t('Document')}</div>
          <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{t('Document de la GED · ouvrir')}</div>
        </div>
        <ExternalLink size={14} style={{ color: 'var(--fg-muted)', flexShrink: 0 }} />
      </button>
    );
  }

  if (!(msg.has_file ?? msg.hasFile) || !name) return null;
  const url = chatService.attachmentUrl(msg.id);
  const downloadUrl = chatService.attachmentUrl(msg.id, true);
  const size = formatSize(msg.attachment_size ?? msg.attachmentSize);

  if (IMAGE.test(name)) {
    return (
      <div style={{ marginTop: 6 }}>
        <a href={url} target="_blank" rel="noreferrer" title={name}>
          <img src={url} alt={name} loading="lazy"
            style={{ display: 'block', maxWidth: 'min(320px, 100%)', maxHeight: 260, borderRadius: 8, border: '1px solid var(--border)', objectFit: 'cover', background: 'var(--surface-2)' }} />
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: 11, color: 'var(--fg-muted)' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{name}</span>
          {size && <span>· {size}</span>}
          <a href={downloadUrl} style={{ color: 'var(--brand)', display: 'inline-flex', alignItems: 'center', gap: 2 }}><Download size={11} /> {t('Télécharger')}</a>
        </div>
      </div>
    );
  }

  const Icon = fileIcon(name);
  return (
    <div style={card}>
      <div style={{ width: 34, height: 34, borderRadius: 6, background: 'var(--surface-2)', color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={name}>{name}</div>
        {size && <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{size}</div>}
      </div>
      {INLINE.test(name) && (
        <a href={url} target="_blank" rel="noreferrer" style={linkBtn}><ExternalLink size={12} /> {t('Ouvrir')}</a>
      )}
      <a href={downloadUrl} style={linkBtn} aria-label={t('Télécharger')}><Download size={12} /></a>
    </div>
  );
}
