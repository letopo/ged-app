// frontend/src/components/DocumentThumbnail.jsx
// Miniature de la première page d'un document (vue Grille). Chargée seulement
// quand la carte approche de l'écran, gardée en mémoire pendant la session ;
// sans miniature (Word, Excel, formulaire…) → icône colorée selon le type.
import React, { useEffect, useRef, useState } from 'react';
import { FileText, FileSpreadsheet, FileType2, ClipboardList, Image as ImageIcon } from 'lucide-react';
import api from '../services/api';

const MAX_CACHE = 300;
const cache = new Map(); // clé de version → URL objet | null (pas de miniature)

const versionKey = (doc) => `${doc.id}|${doc.filePath}|${doc.fileSize || ''}|${doc.updatedAt || ''}`;

function remember(key, url) {
  cache.set(key, url);
  if (cache.size > MAX_CACHE) {
    const [oldKey, oldUrl] = cache.entries().next().value;
    cache.delete(oldKey);
    if (oldUrl) URL.revokeObjectURL(oldUrl);
  }
}

function fallbackIcon(doc) {
  const name = `${doc.fileName || doc.filePath || ''}`.toLowerCase();
  const type = doc.fileType || '';
  if (type === 'application/x-form-response' || doc.metadata?.sourceType === 'form_response') return { Icon: ClipboardList, color: '#7c3aed' };
  if (/word|msword/.test(type) || /\.docx?$/.test(name)) return { Icon: FileType2, color: '#2563eb' };
  if (/sheet|excel/.test(type) || /\.(xlsx?|csv)$/.test(name)) return { Icon: FileSpreadsheet, color: '#16a34a' };
  if (/^image\//.test(type)) return { Icon: ImageIcon, color: '#0891b2' };
  return { Icon: FileText, color: 'var(--fg-subtle)' };
}

export default function DocumentThumbnail({ doc, label }) {
  const ref = useRef(null);
  const key = versionKey(doc);
  const [url, setUrl] = useState(() => (cache.has(key) ? cache.get(key) : undefined));
  const [visible, setVisible] = useState(false);

  useEffect(() => { setUrl(cache.has(key) ? cache.get(key) : undefined); }, [key]);

  useEffect(() => {
    const el = ref.current;
    if (!el || url !== undefined) return undefined;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { rootMargin: '300px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [url]);

  useEffect(() => {
    if (!visible || url !== undefined) return undefined;
    let alive = true;
    api.get(`/documents/${doc.id}/thumbnail`, { responseType: 'blob' })
      .then((res) => {
        const obj = res.status === 200 && res.data?.size ? URL.createObjectURL(res.data) : null;
        remember(key, obj);
        if (alive) setUrl(obj);
      })
      .catch(() => { if (alive) setUrl(null); });
    return () => { alive = false; };
  }, [visible, url, key, doc.id]);

  const { Icon, color } = fallbackIcon(doc);

  return (
    <div ref={ref} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {url ? (
        <img src={url} alt="" draggable={false}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block', background: '#fff' }} />
      ) : url === undefined ? (
        <div className="ged-thumb-shimmer" style={{ position: 'absolute', inset: 0 }} />
      ) : (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={34} color={color} />
          <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginTop: 6, fontWeight: 500 }}>{label}</div>
        </div>
      )}
      {url && label && (
        <span style={{ position: 'absolute', left: 8, bottom: 8, fontSize: 10, fontWeight: 600, color: '#fff', background: 'rgba(15,23,42,.62)', borderRadius: 6, padding: '2px 7px', maxWidth: 'calc(100% - 16px)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </span>
      )}
      <style>{`
        .ged-thumb-shimmer { background: linear-gradient(100deg, var(--surface-3) 30%, var(--surface-2) 50%, var(--surface-3) 70%); background-size: 200% 100%; animation: gedThumbShimmer 1.3s ease-in-out infinite; }
        @keyframes gedThumbShimmer { from { background-position: 100% 0; } to { background-position: -100% 0; } }
      `}</style>
    </div>
  );
}
