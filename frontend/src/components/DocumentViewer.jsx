// frontend/src/components/DocumentViewer.jsx
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  X, Check, AlertTriangle, MessageSquare, FilePlus,
  ArrowUp, ArrowDown, Loader, Download, Printer,
  ChevronRight, CheckCircle, Clock, XCircle,
  FileText, Tag, Calendar, User, Hash, Scan, Settings2, UserCheck,
} from 'lucide-react';
import { documentsAPI, getFileBaseUrl } from '../services/api';
import toast from 'react-hot-toast';
import OnlyOfficeEditor, { isOfficeFile } from './OnlyOfficeEditor';
import FormResponseViewer from './FormBuilder/Renderer/FormResponseViewer';

// ── helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    + ' · ' + dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

const fmtSize = (bytes) => {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

const timeAgo = (d) => {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `il y a ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
};

const FILE_TYPE_LABEL = {
  'application/pdf': 'PDF',
  'application/msword': 'Word',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
  'image/jpeg': 'JPEG', 'image/png': 'PNG', 'image/jpg': 'JPG',
};

const STATUS_CFG = {
  draft:              { label: 'Brouillon',     dot: 'var(--fg-subtle)',  cls: 'ged-badge-neutral'  },
  pending_validation: { label: 'En validation',  dot: 'var(--warning)',    cls: 'ged-badge-warning'  },
  approved:           { label: 'Approuvé',       dot: 'var(--success)',    cls: 'ged-badge-success'  },
  rejected:           { label: 'Rejeté',         dot: 'var(--danger)',     cls: 'ged-badge-danger'   },
  archived:           { label: 'Archivé',        dot: 'var(--fg-subtle)',  cls: 'ged-badge-neutral'  },
};

const AVATAR_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316'];
const strColor = (s) => AVATAR_COLORS[(s || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

// ── WorkflowStep ─────────────────────────────────────────────────────────────

function WorkflowStep({ stepNum, label, userName, dateStr, status, isLast, onReassign }) {
  const cfg = {
    approved: { icon: CheckCircle, color: 'var(--success)',   bg: 'var(--success-soft)', dot: 'var(--success)'  },
    rejected: { icon: XCircle,     color: 'var(--danger)',    bg: 'var(--danger-soft)',  dot: 'var(--danger)'   },
    pending:  { icon: Clock,       color: 'var(--fg-subtle)', bg: 'var(--surface-3)',    dot: 'var(--border)'   },
    active:   { icon: null,        color: 'var(--brand)',     bg: 'var(--brand-soft)',   dot: 'var(--brand)'    },
  }[status] || { icon: Clock, color: 'var(--fg-subtle)', bg: 'var(--surface-3)', dot: 'var(--border)' };
  const Icon = cfg.icon;
  return (
    <div style={{ display: 'flex', gap: 10, paddingBottom: isLast ? 0 : 18, position: 'relative' }}>
      {!isLast && <div style={{ position: 'absolute', left: 13, top: 28, bottom: 0, width: 1, background: 'var(--border)' }} />}
      <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 700, border: `2px solid ${cfg.dot}`, zIndex: 1 }}>
        {Icon ? <Icon size={13} /> : stepNum}
      </div>
      <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', lineHeight: 1.3 }}>{label}</div>
          {onReassign && (
            <button
              onClick={onReassign}
              title="Réaffecter à un autre validateur"
              style={{ padding: 3, borderRadius: 'var(--radius-2)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', flexShrink: 0, transition: 'background .15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-soft)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <UserCheck size={13} />
            </button>
          )}
        </div>
        {userName && <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 1 }}>{userName}</div>}
        <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 2 }}>
          {dateStr || (status === 'active' ? 'En cours' : status === 'pending' ? 'En attente' : '')}
        </div>
      </div>
    </div>
  );
}

// ── MetaRow ──────────────────────────────────────────────────────────────────

function MetaRow({ icon: Icon, label, value, children }) {
  if (!value && !children) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--surface-3)' }}>
      <div style={{ width: 26, height: 26, borderRadius: 'var(--radius-2)', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={12} style={{ color: 'var(--fg-subtle)' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2 }}>{label}</div>
        {children || <div style={{ fontSize: 12, color: 'var(--fg)' }}>{value}</div>}
      </div>
    </div>
  );
}

// ── DocListItem ───────────────────────────────────────────────────────────────

function DocListItem({ doc, isActive, onClick }) {
  const [hov, setHov] = useState(false);
  const st = STATUS_CFG[doc.status] || STATUS_CFG.draft;
  const uploader = doc.uploadedBy || doc.user;
  const initials = uploader
    ? `${uploader.firstName?.[0] || ''}${uploader.lastName?.[0] || ''}`.toUpperCase() || '?'
    : (doc.title?.[0] || '?').toUpperCase();
  const color = strColor(doc.title);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px',
        cursor: 'pointer', transition: 'background 0.12s',
        background: isActive ? 'var(--brand-soft)' : hov ? 'var(--surface-2)' : 'transparent',
        borderLeft: `3px solid ${isActive ? 'var(--brand)' : 'transparent'}`,
      }}
    >
      <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {doc.title}
          </span>
          <span className={`ged-badge ${st.cls}`} style={{ fontSize: 10, flexShrink: 0, marginLeft: 4, whiteSpace: 'nowrap' }}>
            {st.label}
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 3 }}>
          {[doc.service || doc.category, timeAgo(doc.createdAt)].filter(Boolean).join(' · ')}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const DocumentViewer = ({
  document: doc,
  onClose,
  onValidate,
  onReject,
  showActions = false,
  documents = [],
  onSelectDocument,
  onReassign,
}) => {
  const { user } = useAuth();
  const isAdmin = ['admin', 'superadmin'].includes(user?.role);
  const [comment, setComment]                 = useState('');
  const [rejectComment, setRejectComment]     = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [showModifInput, setShowModifInput]   = useState(false);
  const [modifComment, setModifComment]       = useState('');
  const [pdfDimensions, setPdfDimensions]     = useState({ width: 0, height: 0 });
  const [showMergeModal, setShowMergeModal]   = useState(false);
  const [selectedMergeFile, setSelectedMergeFile] = useState(null);
  const [isMerging, setIsMerging]             = useState(false);
  const [viewerKey, setViewerKey]             = useState(0);
  const [blobUrl, setBlobUrl]                 = useState(null);
  const [docListTab, setDocListTab]           = useState('pending');

  const iframeRef    = useRef(null);
  const fileInputRef = useRef(null);

  const API_URL     = getFileBaseUrl();
  const documentUrl = doc ? `${API_URL}/${doc.filePath}?v=${viewerKey}` : null;
  const iframeSrc   = window.electronAPI?.isElectron ? (blobUrl || null) : documentUrl;

  useEffect(() => {
    if (!window.electronAPI?.isElectron || !documentUrl) return;
    let objectUrl = null;
    fetch(documentUrl)
      .then(r => r.blob())
      .then(blob => { objectUrl = URL.createObjectURL(blob); setBlobUrl(objectUrl); })
      .catch(err => console.error('Erreur chargement PDF:', err));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); setBlobUrl(null); };
  }, [documentUrl]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const onLoad = () => setPdfDimensions({ width: iframe.offsetWidth, height: iframe.offsetHeight });
    iframe.addEventListener('load', onLoad);
    return () => iframe.removeEventListener('load', onLoad);
  }, [viewerKey]);

  useEffect(() => {
    setComment(''); setRejectComment(''); setModifComment('');
    setShowRejectInput(false); setShowModifInput(false);
  }, [doc?.id]);

  const handleDownload = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/documents/${doc.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      const ext = (doc.fileName || doc.originalName || '.pdf').match(/\.[^.]+$/)?.[0] || '.pdf';
      a.download = `${(doc.title || 'document').replace(/[/\\?%*:|"<>]/g, '-').trim()}${ext}`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch { toast.error('Erreur lors du téléchargement'); }
  };

  const handleValidate = () => onValidate?.({ comment });
  const handleReject = () => {
    if (!rejectComment.trim()) { toast('Le commentaire est obligatoire pour un rejet.'); return; }
    onReject?.({ comment: rejectComment });
  };
  const handleModif = () => {
    if (!modifComment.trim()) { toast('Précisez les modifications demandées.'); return; }
    onReject?.({ comment: modifComment, type: 'modif' });
  };
  const onFileSelect = (e) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') { toast('Veuillez sélectionner un fichier PDF uniquement.'); return; }
      setSelectedMergeFile(file); setShowMergeModal(true); e.target.value = null;
    }
  };
  const handleMerge = async (position) => {
    if (!selectedMergeFile) return;
    try {
      setIsMerging(true);
      const formData = new FormData();
      formData.append('file', selectedMergeFile);
      formData.append('position', position);
      await documentsAPI.addPage(doc.id, formData);
      setViewerKey(prev => prev + 1); setShowMergeModal(false); setSelectedMergeFile(null);
    } catch { toast("Erreur lors de l'ajout de la page."); }
    finally { setIsMerging(false); }
  };

  if (!doc) return null;

  // ── Derived ──────────────────────────────────────────────────────────────────
  const isFormResponse = doc.fileType === 'application/x-form-response' || doc.metadata?.sourceType === 'form_response';
  const signatureZones = doc.metadata?.signatureZones || [];
  const fileTypeLabel  = isFormResponse ? 'Formulaire' : (FILE_TYPE_LABEL[doc.fileType] || (doc.fileType?.split('/')[1]?.toUpperCase()) || 'Fichier');
  const sizeLabel      = fmtSize(doc.fileSize);
  const pageCount      = doc.pageCount || doc.metadata?.pageCount;
  const typeDisplay    = [fileTypeLabel, sizeLabel, pageCount ? `${pageCount} page${pageCount > 1 ? 's' : ''}` : null].filter(Boolean).join(' · ');
  const wfSteps        = doc.workflows || [];
  const uploader       = doc.uploadedBy || doc.user;
  const uploaderName   = uploader ? `${uploader.firstName || ''} ${uploader.lastName || ''}`.trim() || uploader.email : null;
  const st             = STATUS_CFG[doc.status] || STATUS_CFG.draft;
  const pendingDocs    = documents.filter(d => d.status === 'pending_validation');
  const listedDocs     = docListTab === 'pending' ? pendingDocs : documents;

  // ── Styles ────────────────────────────────────────────────────────────────────
  const textareaStyle = { width: '100%', padding: '8px 10px', boxSizing: 'border-box', border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 13, resize: 'vertical', outline: 'none', lineHeight: 1.5, fontFamily: 'inherit' };
  const secTitle      = { fontSize: 10, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 };

  // ── Portal render ─────────────────────────────────────────────────────────────
  return ReactDOM.createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0, minHeight: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, minWidth: 0 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', fontSize: 13, padding: '2px 4px', borderRadius: 'var(--radius-2)', fontWeight: 500 }}>Documents</button>
          <ChevronRight size={13} color="var(--fg-subtle)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</span>
          <span className={`ged-badge ${st.cls}`} style={{ fontSize: 10, flexShrink: 0, marginLeft: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: st.dot, display: 'inline-block' }} />{st.label}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
          {isFormResponse ? (
            <button onClick={() => {
              const el = document.querySelector('#form-response-print-area');
              if (!el) return;
              const clone = el.cloneNode(true);
              // Retirer le scale — canvas pleine taille pour l'impression
              const cvs = clone.querySelector('.form-response-canvas');
              if (cvs) { cvs.style.transform = 'none'; cvs.style.width = '800px'; cvs.style.margin = '0 auto'; }
              const wrap = clone.querySelector('.form-response-canvas-wrap');
              if (wrap) { wrap.style.height = 'auto'; wrap.style.overflow = 'visible'; }
              // Supprimer la balise <style> interne (CSS media print inutile dans la nouvelle fenêtre)
              clone.querySelectorAll('style').forEach(s => s.remove());
              const win = window.open('', '_blank', 'width=950,height=800');
              if (!win) return;
              win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${(doc.title || 'Formulaire').replace(/</g,'&lt;')}</title><style>*{box-sizing:border-box;}body{margin:0;padding:0;font-family:Inter,system-ui,sans-serif;background:#fff;}@page{margin:8mm;}img{max-width:100%;}</style></head><body>${clone.outerHTML}<script>window.onload=function(){window.print();}<\/script></body></html>`);
              win.document.close();
            }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 14px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg-muted)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
              <Printer size={13} /> Imprimer / PDF
            </button>
          ) : (
            <>
              <button onClick={handleDownload} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 14px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg-muted)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                <Download size={13} /> Télécharger
              </button>
              <input type="file" ref={fileInputRef} onChange={onFileSelect} accept="application/pdf" style={{ display: 'none' }} />
              <button onClick={() => fileInputRef.current.click()} title="Ajouter une page PDF" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 32, width: 32, borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg-muted)', cursor: 'pointer' }}>
                <FilePlus size={14} />
              </button>
            </>
          )}
          {showActions && (
            <button onClick={handleValidate} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 16px', borderRadius: 'var(--radius-2)', border: 'none', background: 'var(--success)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <Check size={13} /> Approuver
            </button>
          )}
          <button onClick={onClose} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 32, width: 32, borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg-muted)', cursor: 'pointer' }}>
            <X size={15} />
          </button>
        </div>
      </div>

      {/* ── 3-PANEL BODY ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── LEFT : Document List ────────────────────────────────────────── */}
        <div style={{ width: 270, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', background: 'var(--surface)', overflow: 'hidden' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', padding: '10px 14px 0', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            {[
              { key: 'pending', label: 'À traiter', count: pendingDocs.length },
              { key: 'all',     label: 'Tout',       count: documents.length  },
            ].map(tab => (
              <button key={tab.key} onClick={() => setDocListTab(tab.key)} style={{
                flex: 1, padding: '7px 4px', border: 'none', background: 'none',
                fontSize: 12, fontWeight: docListTab === tab.key ? 700 : 500,
                color: docListTab === tab.key ? 'var(--fg)' : 'var(--fg-muted)',
                borderBottom: `2px solid ${docListTab === tab.key ? 'var(--brand)' : 'transparent'}`,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: -1,
              }}>
                {tab.label}
                {tab.count > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, background: docListTab === tab.key ? 'var(--brand)' : 'var(--surface-3)', color: docListTab === tab.key ? '#fff' : 'var(--fg-muted)', borderRadius: 999, padding: '1px 6px', minWidth: 18, textAlign: 'center' }}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {listedDocs.length === 0
              ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-subtle)', fontSize: 12 }}>Aucun document</div>
              : listedDocs.map(d => (
                  <DocListItem key={d.id} doc={d} isActive={d.id === doc.id} onClick={() => onSelectDocument?.(d)} />
                ))
            }
          </div>
        </div>

        {/* ── CENTER : Formulaire HTML ou PDF ─────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: isFormResponse ? '#f8fafc' : '#f0f0f0', position: 'relative', overflow: 'hidden' }}>
          {isFormResponse ? (
            /* ── Réponse de formulaire : rendu HTML identique au canvas ── */
            <div id="form-response-portal" style={{ flex: 1, overflowY: 'auto', padding: '20px 0' }}>
              <div style={{ maxWidth: 860, margin: '0 auto', background: '#fff', borderRadius: 10, boxShadow: '0 2px 16px rgba(0,0,0,.08)', overflow: 'hidden' }}>
                <FormResponseViewer
                  form={{ schema: doc.metadata?.schema, title: doc.title }}
                  responseData={doc.metadata?.responseData || {}}
                  submittedBy={doc.metadata?.submittedBy}
                  refCode={doc.metadata?.refCode}
                  wfSteps={wfSteps}
                />
              </div>
            </div>
          ) : isOfficeFile(doc.fileName || doc.filePath) ? (
            <OnlyOfficeEditor documentId={doc.id} onClose={onClose} />
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '7px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <span style={{ fontSize: 12, color: 'var(--fg-muted)', fontWeight: 500 }}>
                  {pageCount ? `Page 1 / ${pageCount}` : fileTypeLabel}
                </span>
              </div>
              <iframe key={viewerKey} ref={iframeRef} src={iframeSrc} title={doc.title} style={{ flex: 1, width: '100%', height: '100%', border: 'none' }} />
              {signatureZones.length > 0 && pdfDimensions.width > 0 && (
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', top: 36 }}>
                  {signatureZones.map((zone, i) => {
                    const scaleX = pdfDimensions.width / 595;
                    const scaleY = pdfDimensions.height / 842;
                    if (zone.type === 'signature' || zone.type === 'stamp') return (
                      <div key={i} style={{ position: 'absolute', left: zone.x * scaleX, top: zone.y * scaleY, width: zone.width * scaleX, height: zone.height * scaleY }}>
                        <img src={`${API_URL}/${zone.imagePath}`} alt={zone.type} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      </div>
                    );
                    if (zone.type === 'dateur') return (
                      <div key={i} style={{ position: 'absolute', left: zone.x * scaleX, top: zone.y * scaleY, fontSize: zone.fontSize, color: zone.color, fontWeight: 700, background: 'rgba(255,255,255,0.85)', padding: '1px 4px', borderRadius: 3 }}>
                        📅 {zone.text}
                      </div>
                    );
                    return null;
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── RIGHT : Workflow + Meta + Actions ───────────────────────────── */}
        <div style={{ width: 270, flexShrink: 0, borderLeft: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 0' }}>

            {/* Workflow */}
            {(wfSteps.length > 0 || uploaderName) && (
              <div style={{ marginBottom: 22 }}>
                <div style={secTitle}>Workflow de validation</div>
                <WorkflowStep stepNum={1} label="Soumission" userName={uploaderName}
                  dateStr={doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' · ' + new Date(doc.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : null}
                  status="approved" isLast={wfSteps.length === 0} />
                {wfSteps.map((wf, i) => {
                  const assignee = wf.validator || wf.assignedTo || wf.user;
                  const assigneeName = assignee ? `${assignee.firstName || ''} ${assignee.lastName || ''}`.trim() || assignee.email : null;
                  const roleLabel = wf.stepName || (assignee?.role ? assignee.role.replace(/_/g, ' ') : null);
                  const stepStatus = wf.status === 'approved' ? 'approved' : wf.status === 'rejected' ? 'rejected' : i === 0 && doc.status === 'pending_validation' ? 'active' : 'pending';
                  return (
                    <WorkflowStep key={wf.id || i} stepNum={i + 2}
                      label={assigneeName || `Validation N${i + 1}`}
                      userName={`Validation N${i + 1}${roleLabel ? ` · ${roleLabel}` : ''}`}
                      dateStr={wf.updatedAt && wf.status !== 'pending' ? new Date(wf.updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' · ' + new Date(wf.updatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : null}
                      status={stepStatus} isLast={i === wfSteps.length - 1}
                      onReassign={isAdmin && onReassign && ['pending', 'queued'].includes(wf.status) ? () => onReassign(wf) : null} />
                  );
                })}
              </div>
            )}

            {/* Métadonnées */}
            <div style={{ marginBottom: 20 }}>
              <div style={secTitle}>Métadonnées</div>
              <MetaRow icon={FileText}  label="Type"      value={typeDisplay || fileTypeLabel} />
              {doc.service   && <MetaRow icon={Settings2} label="Service"   value={doc.service}   />}
              {doc.category  && <MetaRow icon={Tag}       label="Catégorie" value={doc.category}  />}
              {doc.reference && <MetaRow icon={Hash}      label="Référence" value={doc.reference} />}
              {doc.metadata?.ocrText && <MetaRow icon={Scan} label="OCR" value={`Indexé · ${doc.language || 'français'}`} />}
              <MetaRow icon={Calendar} label="Créé le"    value={fmtDate(doc.createdAt)} />
              {uploaderName && <MetaRow icon={User} label="Soumis par" value={uploaderName} />}
              {doc.tags?.length > 0 && (
                <MetaRow icon={Tag} label="Tags">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                    {doc.tags.map((t, i) => <span key={i} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'var(--surface-2)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}>{t}</span>)}
                  </div>
                </MetaRow>
              )}
            </div>

            {/* Commentaire */}
            {showActions && !showRejectInput && !showModifInput && (
              <div style={{ marginBottom: 16 }}>
                <div style={secTitle}>Commentaire</div>
                <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} placeholder="Ajouter un commentaire avant approbation..." style={textareaStyle} />
              </div>
            )}

            {showRejectInput && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--danger)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}><AlertTriangle size={12} /> Motif du rejet</div>
                <textarea value={rejectComment} onChange={e => setRejectComment(e.target.value)} rows={3} placeholder="Expliquer le motif du rejet..." style={textareaStyle} autoFocus />
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button onClick={() => setShowRejectInput(false)} style={{ flex: 1, height: 32, borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg-muted)', fontSize: 12, cursor: 'pointer' }}>Annuler</button>
                  <button onClick={handleReject} style={{ flex: 2, height: 32, borderRadius: 'var(--radius-2)', border: 'none', background: 'var(--danger)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Confirmer le rejet</button>
                </div>
              </div>
            )}

            {showModifInput && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--warning)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}><MessageSquare size={12} /> Modifications demandées</div>
                <textarea value={modifComment} onChange={e => setModifComment(e.target.value)} rows={3} placeholder="Décrire les modifications à apporter..." style={textareaStyle} autoFocus />
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button onClick={() => setShowModifInput(false)} style={{ flex: 1, height: 32, borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg-muted)', fontSize: 12, cursor: 'pointer' }}>Annuler</button>
                  <button onClick={handleModif} style={{ flex: 2, height: 32, borderRadius: 'var(--radius-2)', border: 'none', background: 'var(--warning)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Envoyer</button>
                </div>
              </div>
            )}
          </div>

          {/* Actions sticky */}
          {showActions && !showRejectInput && !showModifInput && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => { setShowRejectInput(true); setShowModifInput(false); }} style={{ flex: 1, height: 34, borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg-muted)', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>Rejeter</button>
                <button onClick={() => { setShowModifInput(true); setShowRejectInput(false); }} style={{ flex: 1, height: 34, borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg-muted)', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>Demander modifs</button>
                <button onClick={handleValidate} style={{ flex: 1, height: 34, borderRadius: 'var(--radius-2)', border: 'none', background: 'var(--brand)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <Check size={13} /> Approuver
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Merge modal */}
      {showMergeModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-4)', boxShadow: 'var(--shadow-3)', padding: 24, width: 360 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', textAlign: 'center', marginBottom: 8 }}>Où insérer le document ?</div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', textAlign: 'center', marginBottom: 20, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedMergeFile?.name}</div>
            {isMerging
              ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 0' }}><Loader size={22} color="var(--brand)" className="animate-spin" /><span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Fusion en cours…</span></div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button onClick={() => handleMerge('before')} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 40, borderRadius: 'var(--radius-2)', border: '1px solid var(--brand)', background: 'var(--brand-soft)', color: 'var(--brand)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}><ArrowUp size={16} /> Insérer au DÉBUT</button>
                  <button onClick={() => handleMerge('after')} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 40, borderRadius: 'var(--radius-2)', border: 'none', background: 'var(--brand)', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}><ArrowDown size={16} /> Insérer à la FIN</button>
                  <button onClick={() => { setShowMergeModal(false); setSelectedMergeFile(null); }} style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', fontSize: 12, cursor: 'pointer', marginTop: 4, textAlign: 'center', textDecoration: 'underline' }}>Annuler</button>
                </div>
            }
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

export default DocumentViewer;
