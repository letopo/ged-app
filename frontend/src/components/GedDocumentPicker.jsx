// frontend/src/components/GedDocumentPicker.jsx
// Choisir un document de la GED à ajouter dans un autre (visionneuse →
// « Ajouter une page PDF » → « Depuis la GED »). PDF uniquement, documents
// validés par défaut, recherche par nom, filtre par type et période, tri.
import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Search, Loader, Check, FileText } from 'lucide-react';
import { documentsAPI } from '../services/api';
import DocumentThumbnail from './DocumentThumbnail';
import Pagination from './Pagination';

const PAGE_SIZE = 10;
const STATUS_LABELS = { approved: 'Approuvé', pending_validation: 'En validation', rejected: 'Rejeté', draft: 'Brouillon', in_progress: 'En cours' };
const STATUS_CLS = { approved: 'ged-badge-success', pending_validation: 'ged-badge-warning', rejected: 'ged-badge-danger' };

export default function GedDocumentPicker({ excludeId, onPick, onClose }) {
  const { t, i18n } = useTranslation();
  const locale = { fr: 'fr-FR', en: 'en-US', es: 'es-ES', ar: 'ar-SA' }[i18n.language] || 'fr-FR';
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('approved');
  const [category, setCategory] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState('date_desc');
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState([]);
  const [docs, setDocs] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const searchTimer = useRef(null);

  useEffect(() => {
    documentsAPI.getCategories().then((res) => setCategories(res.data.data || [])).catch(() => {});
  }, []);

  // Recherche par nom : on attend que la frappe s'arrête
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(query.trim()), 300);
    return () => clearTimeout(searchTimer.current);
  }, [query]);

  useEffect(() => { setPage(1); }, [search, status, category, dateFrom, dateTo, sort]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const params = { page, limit: PAGE_SIZE, fileType: 'pdf', sort, excludeId };
    if (search) params.search = search;
    if (status !== 'all') params.status = status;
    if (category !== 'all') params.category = category;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    documentsAPI.getAll(params)
      .then((res) => {
        if (!alive) return;
        setDocs(res.data.data || []);
        setTotal(res.data.pagination?.total || 0);
        setTotalPages(res.data.pagination?.totalPages || 1);
      })
      .catch(() => { if (alive) setDocs([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [page, search, status, category, dateFrom, dateTo, sort, excludeId]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const field = { height: 34, padding: '0 10px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, minWidth: 0 };
  const fmt = (d) => (d ? new Date(d).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }) : '');

  return ReactDOM.createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9600, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 760, maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: 'var(--surface)', borderRadius: 'var(--radius-4)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-3)' }}>
        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <FileText size={18} color="var(--brand)" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)' }}>{t('Ajouter un document de la GED')}</div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{t('Ses pages seront ajoutées au document ouvert ; il reste lui-même inchangé.')}</div>
          </div>
          <button onClick={onClose} aria-label={t('Fermer')} style={{ width: 32, height: 32, borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={15} />
          </button>
        </div>

        {/* Filtres */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--fg-subtle)' }} />
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Rechercher par nom…')}
              style={{ ...field, width: '100%', boxSizing: 'border-box', paddingLeft: 30 }} />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={field} aria-label={t('Statut')}>
            <option value="approved">{t('Validés')}</option>
            <option value="all">{t('Tous les statuts')}</option>
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...field, maxWidth: 200 }} aria-label={t('Type')}>
            <option value="all">{t('Tous les types')}</option>
            {categories.map((c) => <option key={c} value={c}>{t(c)}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} style={field} aria-label={t('Trier')}>
            <option value="date_desc">{t('Plus récents')}</option>
            <option value="date_asc">{t('Plus anciens')}</option>
            <option value="title_asc">{t('Nom A → Z')}</option>
            <option value="title_desc">{t('Nom Z → A')}</option>
            <option value="category_asc">{t('Par type')}</option>
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--fg-muted)' }}>
            {t('Du')}
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={field} aria-label={t('Du')} />
            {t('au')}
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={field} aria-label={t('au')} />
          </div>
        </div>

        {/* Liste */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px', minHeight: 200 }}>
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40, color: 'var(--fg-muted)' }}><Loader size={20} className="animate-spin" /></div>
          )}
          {!loading && docs.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, fontSize: 13, color: 'var(--fg-muted)' }}>
              {status === 'approved' ? t('Aucun document PDF validé ne correspond. Essayez « Tous les statuts ».') : t('Aucun document PDF ne correspond.')}
            </div>
          )}
          {!loading && docs.map((d) => {
            const active = selected?.id === d.id;
            return (
              <button key={d.id} type="button" onClick={() => setSelected(d)} onDoubleClick={() => onPick(d)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 8, marginBottom: 6, textAlign: 'left', cursor: 'pointer',
                  borderRadius: 'var(--radius-3)', border: `1.5px solid ${active ? 'var(--brand)' : 'var(--border)'}`, background: active ? 'var(--brand-soft)' : 'var(--surface)' }}>
                <div style={{ position: 'relative', width: 46, height: 60, flexShrink: 0, borderRadius: 4, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--surface-3)' }}>
                  <DocumentThumbnail doc={d} label="" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>
                    {[d.category ? t(d.category) : null, fmt(d.createdAt), d.uploadedBy ? `${d.uploadedBy.firstName || ''} ${d.uploadedBy.lastName || ''}`.trim() : null].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <span className={`ged-badge ${STATUS_CLS[d.status] || 'ged-badge-neutral'}`} style={{ fontSize: 11, flexShrink: 0 }}>{t(STATUS_LABELS[d.status] || d.status)}</span>
                {active && <Check size={16} color="var(--brand)" style={{ flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>

        {/* Bas : pagination + validation */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '4px 16px 12px' }}>
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} style={{ padding: '8px 0' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            {selected && <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('Sélectionné : {{title}}', { title: selected.title })}</span>}
            <button onClick={onClose} style={{ height: 36, padding: '0 14px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg)', fontSize: 13, cursor: 'pointer' }}>{t('Annuler')}</button>
            <button onClick={() => selected && onPick(selected)} disabled={!selected}
              style={{ height: 36, padding: '0 16px', borderRadius: 'var(--radius-2)', border: 'none', background: 'var(--brand)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: selected ? 'pointer' : 'not-allowed', opacity: selected ? 1 : 0.5 }}>
              {t('Ajouter ce document')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
