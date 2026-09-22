// frontend/src/pages/FormBuilder/FormResponses.jsx
// Liste et détail des réponses soumises à un formulaire

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, Eye, Download, FileText, User, Calendar,
  CheckCircle, Clock, Trash2, RefreshCw, Search, ChevronDown,
  GitBranch, ThumbsUp, ThumbsDown, X, MessageSquare,
} from 'lucide-react';
import { formsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import i18n from '../../i18n/config';

// ─── Export CSV ───────────────────────────────────────────────────────────────

function exportCSV(form, responses) {
  const fields = form.schema?.fields?.filter(f =>
    !['title','subtitle','paragraph','separator'].includes(f.type)
  ) || [];

  const headers = [i18n.t('Date soumission'), i18n.t('Soumis par'), i18n.t('Statut'), ...fields.map(f => f.label)];
  const rows = responses.map(r => [
    format(new Date(r.submittedAt || r.createdAt), 'dd/MM/yyyy HH:mm'),
    r.submitter ? `${r.submitter.firstName} ${r.submitter.lastName}` : i18n.t('Anonyme'),
    r.status,
    ...fields.map(f => {
      const val = r.data?.[f.id];
      if (val === null || val === undefined) return '';
      if (typeof val === 'boolean') return val ? i18n.t('Oui') : i18n.t('Non');
      return String(val);
    }),
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${form.title}_${i18n.t('réponses')}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Export PDF d'une réponse ─────────────────────────────────────────────────

function exportResponsePDF(form, response) {
  const fields = form.schema?.fields?.filter(f =>
    !['title','subtitle','paragraph','separator'].includes(f.type)
  ) || [];

  const html = `
    <!DOCTYPE html><html lang="fr">
    <head>
      <meta charset="UTF-8">
      <title>${form.title} — ${i18n.t('Réponse')}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #111827; }
        h1   { font-size: 20px; color: #1B3A6B; border-bottom: 2px solid #1B3A6B; padding-bottom: 8px; }
        .meta{ font-size: 12px; color: #6b7280; margin-bottom: 24px; }
        .row { margin-bottom: 14px; }
        .lbl { font-size: 11px; font-weight: bold; color: #374151; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 3px; }
        .val { font-size: 13px; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
        .empty { color: #9ca3af; font-style: italic; }
      </style>
    </head>
    <body>
      <h1>${form.title}</h1>
      <div class="meta">
        ${i18n.t('Soumis le')} : ${format(new Date(response.submittedAt || response.createdAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
        ${response.submitter ? ` &nbsp;|&nbsp; ${i18n.t('Par')} : ${response.submitter.firstName} ${response.submitter.lastName}` : ''}
      </div>
      ${fields.map(f => {
        const val = response.data?.[f.id];
        const display = (val === null || val === undefined || val === '')
          ? `<span class="empty">${i18n.t('— non renseigné —')}</span>`
          : (typeof val === 'boolean' ? (val ? i18n.t('Oui ✓') : i18n.t('Non')) : String(val));
        return `<div class="row"><div class="lbl">${f.label}</div><div class="val">${display}</div></div>`;
      }).join('')}
    </body></html>
  `;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.print();
}

// ─── Workflow timeline ────────────────────────────────────────────────────────

function WorkflowTimeline({ response }) {
  const { t } = useTranslation();
  const steps   = response.workflowData?.steps || [];
  const current = response.workflowCurrentStep || 1;
  if (!steps.length) return null;

  const SC = {
    pending:  { color: '#f59e0b', bg: '#fef9c3', label: t('En attente') },
    approved: { color: '#10b981', bg: '#d1fae5', label: t('Approuvé') },
    rejected: { color: '#ef4444', bg: '#fee2e2', label: t('Rejeté') },
  };

  return (
    <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 10 }}>
      <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '.4px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <GitBranch size={12} /> {t('Circuit — {{name}}', { name: response.workflowData?.templateName })}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.map((step, i) => {
          const sc = SC[step.status] || SC.pending;
          const isActive = (i + 1) === current && step.status === 'pending';
          return (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: sc.bg, color: sc.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, border: isActive ? `2px solid ${sc.color}` : 'none' }}>
                {step.status === 'approved' ? '✓' : step.status === 'rejected' ? '✕' : i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>{step.name}</span>
                  <span style={{ fontSize: 10, color: sc.color, background: sc.bg, padding: '1px 6px', borderRadius: 8, fontWeight: 600 }}>{sc.label}</span>
                </div>
                <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--fg-muted)' }}>{step.userLabel || step.role}</p>
                {step.comment && <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--fg)', fontStyle: 'italic' }}>"{step.comment}"</p>}
                {step.validatedAt && <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--fg-muted)' }}>{format(new Date(step.validatedAt), 'dd MMM yyyy HH:mm', { locale: fr })}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Modal détail d'une réponse ───────────────────────────────────────────────

function ResponseDetailModal({ form, response, onClose, onApprove, onReject, canAct }) {
  const { t } = useTranslation();
  if (!response) return null;
  const [action, setAction]   = useState(null); // 'approve' | 'reject'
  const [comment, setComment] = useState('');
  const [acting, setActing]   = useState(false);

  const fields = form.schema?.fields?.filter(f =>
    !['title','subtitle','paragraph','separator'].includes(f.type)
  ) || [];

  const handleAct = async () => {
    setActing(true);
    try {
      if (action === 'approve') await onApprove(response.id, comment);
      else                      await onReject(response.id, comment);
      onClose();
    } finally {
      setActing(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: 'var(--surface)', borderRadius: 14, width: '100%', maxWidth: 600, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-3)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <FileText size={16} style={{ color: 'var(--brand)' }} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>{t('Réponse détaillée')}</p>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--fg-muted)' }}>
              {format(new Date(response.submittedAt || response.createdAt), 'dd MMM yyyy à HH:mm', { locale: fr })}
            </p>
          </div>
          <button onClick={() => exportResponsePDF(form, response)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: 'var(--surface-2)', border: '1.5px solid var(--border)', cursor: 'pointer', fontSize: 12, color: 'var(--fg)' }}>
            <Download size={13} /> PDF
          </button>
          <button onClick={onClose} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        {/* Contenu */}
        <div style={{ overflowY: 'auto', padding: '16px 20px', flex: 1 }}>
          {/* Soumis par */}
          <div style={{ marginBottom: 16, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 8 }}>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--fg-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{t('Soumis par')}</p>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--fg)', fontWeight: 600 }}>
              {response.submitter ? `${response.submitter.firstName} ${response.submitter.lastName}` : t('Anonyme')}
            </p>
          </div>

          {/* Champs */}
          {fields.map(f => {
            const val = response.data?.[f.id];
            const isEmpty = val === null || val === undefined || val === '';
            return (
              <div key={f.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                <p style={{ margin: '0 0 3px', fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '.4px' }}>{f.label}</p>
                <p style={{ margin: 0, fontSize: 13, color: isEmpty ? 'var(--fg-muted)' : 'var(--fg)', fontStyle: isEmpty ? 'italic' : 'normal' }}>
                  {isEmpty ? t('— non renseigné —') : (typeof val === 'boolean' ? (val ? t('Oui ✓') : t('Non')) : String(val))}
                </p>
              </div>
            );
          })}

          {/* Workflow timeline */}
          {response.workflowData && <WorkflowTimeline response={response} />}

          {/* Actions approve/reject */}
          {canAct && response.workflowStatus === 'pending_approval' && (
            <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              {!action ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setAction('approve')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', borderRadius: 9, background: '#d1fae5', color: '#065f46', border: '1.5px solid #6ee7b7', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                    <ThumbsUp size={14} /> {t('Approuver')}
                  </button>
                  <button onClick={() => setAction('reject')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', borderRadius: 9, background: '#fee2e2', color: '#991b1b', border: '1.5px solid #fca5a5', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                    <ThumbsDown size={14} /> {t('Rejeter')}
                  </button>
                </div>
              ) : (
                <div>
                  <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>
                    {action === 'approve' ? t('✓ Approuver cette étape') : t('✕ Rejeter cette réponse')}
                  </p>
                  <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder={t('Commentaire (optionnel)...')} rows={2}
                    style={{ width: '100%', padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, resize: 'vertical', boxSizing: 'border-box', background: 'var(--bg)', color: 'var(--fg)', fontFamily: 'inherit' }} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={handleAct} disabled={acting} style={{ flex: 1, padding: '9px', borderRadius: 8, background: action === 'approve' ? '#10b981' : '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                      {acting ? '...' : (action === 'approve' ? t("Confirmer l'approbation") : t('Confirmer le rejet'))}
                    </button>
                    <button onClick={() => { setAction(null); setComment(''); }} style={{ padding: '9px 14px', borderRadius: 8, background: 'var(--surface-2)', border: '1.5px solid var(--border)', cursor: 'pointer', fontSize: 13, color: 'var(--fg)' }}>
                      {t('Annuler')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function FormResponses() {
  const { t } = useTranslation();
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { user }  = useAuth();

  const [form,        setForm]        = useState(null);
  const [responses,   setResponses]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [pagination,  setPagination]  = useState({ total: 0, pages: 1, page: 1 });
  const [selected,    setSelected]    = useState(null);
  const [search,      setSearch]      = useState('');
  const [filterStatus,setFilterStatus]= useState('all');

  const loadData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const [formRes, respRes] = await Promise.all([
        formsAPI.getById(id),
        formsAPI.getResponses(id, { page, limit: 20, ...(filterStatus !== 'all' && { status: filterStatus }) }),
      ]);
      setForm(formRes.data.data);
      setResponses(respRes.data.data || []);
      setPagination({ ...respRes.data.pagination, page });
    } catch (e) {
      toast.error(t('Erreur lors du chargement'));
    } finally {
      setLoading(false);
    }
  }, [id, filterStatus]);

  useEffect(() => { loadData(1); }, [loadData]);

  const handleStatusChange = async (responseId, status) => {
    try {
      await formsAPI.updateResponseStatus(id, responseId, status);
      setResponses(prev => prev.map(r => r.id === responseId ? { ...r, status } : r));
      toast.success(t('Statut mis à jour'));
    } catch { toast.error(t('Erreur')); }
  };

  const handleApprove = async (responseId, comment) => {
    try {
      const res = await formsAPI.approveStep(id, responseId, comment);
      setResponses(prev => prev.map(r => r.id === responseId ? { ...r, ...res.data.data } : r));
      toast.success(res.data.message || t('Étape approuvée'));
    } catch (e) { toast.error(e?.response?.data?.message || t('Erreur')); throw e; }
  };

  const handleReject = async (responseId, comment) => {
    try {
      const res = await formsAPI.rejectStep(id, responseId, comment);
      setResponses(prev => prev.map(r => r.id === responseId ? { ...r, ...res.data.data } : r));
      toast.success(res.data.message || t('Réponse rejetée'));
    } catch (e) { toast.error(e?.response?.data?.message || t('Erreur')); throw e; }
  };

  const canActOnResponse = (r) => {
    if (!r.workflowData || r.workflowStatus !== 'pending_approval') return false;
    const steps = r.workflowData?.steps || [];
    const currentIdx = (r.workflowCurrentStep || 1) - 1;
    const step = steps[currentIdx];
    if (!step) return false;
    return (
      step.userId === user?.id ||
      (step.validatorType === 'role' && step.role === user?.role) ||
      ['admin', 'superadmin'].includes(user?.role)
    );
  };

  const filteredResponses = responses.filter(r => {
    if (!search) return true;
    const name = r.submitter ? `${r.submitter.firstName} ${r.submitter.lastName}`.toLowerCase() : '';
    return name.includes(search.toLowerCase());
  });

  const STATUS_BADGE = {
    submitted: { label: t('Soumis'),  color: '#3b82f6', bg: '#dbeafe' },
    reviewed:  { label: t('Examiné'), color: '#10b981', bg: '#d1fae5' },
    archived:  { label: t('Archivé'), color: '#94a3b8', bg: '#f1f5f9' },
  };
  const WF_BADGE = {
    pending_approval: { label: t('En validation'), color: '#d97706', bg: '#fef3c7' },
    approved:         { label: t('Approuvé'),       color: '#059669', bg: '#d1fae5' },
    rejected:         { label: t('Rejeté'),          color: '#dc2626', bg: '#fee2e2' },
  };

  if (loading && !form) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <RefreshCw size={24} style={{ animation: 'spin .7s linear infinite', color: '#1B3A6B' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100, margin: '0 auto' }}>

      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/forms')} style={{ padding: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', display: 'flex', borderRadius: 8 }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--fg)', margin: 0 }}>
            {t('Réponses — {{title}}', { title: form?.title })}
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--fg-muted)' }}>
            {t('{{count}} réponse(s) au total', { count: pagination.total })}
          </p>
        </div>
        <button
          onClick={() => exportCSV(form, responses)}
          disabled={!responses.length}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 9, background: 'var(--surface)', border: '1.5px solid var(--border)', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}
        >
          <Download size={14} /> {t('Export CSV')}
        </button>
        <button
          onClick={() => navigate(`/forms/${id}/designer`)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 9, background: 'var(--brand)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
        >
          {t('Modifier le formulaire')}
        </button>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('Rechercher par nom...')} style={{ width: '100%', padding: '8px 12px 8px 30px', border: '1.5px solid var(--border)', borderRadius: 9, fontSize: 13, background: 'var(--bg)', color: 'var(--fg)', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        {['all','submitted','reviewed','archived'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} style={{ padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', background: filterStatus === s ? 'var(--brand)' : 'var(--surface-2)', color: filterStatus === s ? '#fff' : 'var(--fg-muted)' }}>
            {s === 'all' ? t('Tous') : STATUS_BADGE[s]?.label}
          </button>
        ))}
      </div>

      {/* Tableau */}
      {filteredResponses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <FileText size={40} style={{ color: 'var(--fg-muted)', opacity: .3, marginBottom: 12 }} />
          <p style={{ fontSize: 14, color: 'var(--fg-muted)' }}>
            {search ? t('Aucune réponse correspondant à la recherche.') : t('Aucune réponse pour ce formulaire.')}
          </p>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1.5px solid var(--border)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)' }}>
                {['#', t('Soumis par'), t('Date'), t('Statut'), t('Workflow'), t('Actions')].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredResponses.map((r, i) => {
                const badge   = STATUS_BADGE[r.status] || STATUS_BADGE.submitted;
                const wfBadge = WF_BADGE[r.workflowStatus];
                const actable = canActOnResponse(r);
                return (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--fg-muted)', fontFamily: 'monospace' }}>#{i + 1}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                          {r.submitter ? r.submitter.firstName?.charAt(0) : '?'}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
                          {r.submitter ? `${r.submitter.firstName} ${r.submitter.lastName}` : t('Anonyme')}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--fg-muted)' }}>
                      {format(new Date(r.submittedAt || r.createdAt), 'dd MMM yyyy HH:mm', { locale: fr })}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <select value={r.status} onChange={e => handleStatusChange(r.id, e.target.value)}
                        style={{ fontSize: 11, fontWeight: 600, color: badge.color, background: badge.bg, border: 'none', borderRadius: 20, padding: '3px 10px', cursor: 'pointer', outline: 'none' }}>
                        <option value="submitted">{t('Soumis')}</option>
                        <option value="reviewed">{t('Examiné')}</option>
                        <option value="archived">{t('Archivé')}</option>
                      </select>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {wfBadge ? (
                        <span style={{ fontSize: 11, fontWeight: 600, color: wfBadge.color, background: wfBadge.bg, padding: '3px 8px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <GitBranch size={10} /> {wfBadge.label}
                          {r.workflowStatus === 'pending_approval' && r.workflowCurrentStep
                            ? ` · ${t('ét. {{step}}', { step: r.workflowCurrentStep })}` : ''}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setSelected(r)} title={t('Voir les détails')} style={{ padding: '5px 10px', borderRadius: 7, background: 'none', border: '1.5px solid var(--border)', cursor: 'pointer', color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                          <Eye size={12} /> {t('Voir')}
                        </button>
                        {actable && (
                          <button onClick={() => setSelected(r)} title={t('Approuver / Rejeter')} style={{ padding: '5px 8px', borderRadius: 7, background: '#fef3c7', border: '1.5px solid #fbbf24', cursor: 'pointer', color: '#b45309', display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600 }}>
                            <GitBranch size={11} /> {t('Action')}
                          </button>
                        )}
                        <button onClick={() => exportResponsePDF(form, r)} title={t('Exporter en PDF')} style={{ padding: '5px 8px', borderRadius: 7, background: 'none', border: '1.5px solid var(--border)', cursor: 'pointer', color: 'var(--fg-muted)', display: 'flex' }}>
                          <Download size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16 }}>
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => loadData(p)} style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid var(--border)', background: pagination.page === p ? 'var(--brand)' : 'var(--surface)', color: pagination.page === p ? '#fff' : 'var(--fg)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>{p}</button>
          ))}
        </div>
      )}

      {/* Modal détail */}
      {selected && (
        <ResponseDetailModal
          form={form}
          response={selected}
          onClose={() => setSelected(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          canAct={canActOnResponse(selected)}
        />
      )}
    </div>
  );
}
