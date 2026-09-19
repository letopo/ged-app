// frontend/src/pages/FormBuilder/index.jsx
// Page liste des formulaires — point d'entrée du module

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, FileText, Copy, Trash2, Eye,
  Edit3, Globe, Archive, MoreVertical, BarChart2,
  ClipboardList, Filter, ChevronDown, CheckCircle,
  Clock, FileEdit, AlertCircle
} from 'lucide-react';
import { formsAPI, workflowTemplatesAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

// ── Constantes ────────────────────────────────────────────────────────────────

const FORM_TYPES = [
  { value: 'all',            label: 'Tous les types' },
  { value: 'consultation',   label: 'Consultation' },
  { value: 'admission',      label: 'Admission' },
  { value: 'satisfaction',   label: 'Satisfaction' },
  { value: 'rh',             label: 'Ressources Humaines' },
  { value: 'administratif',  label: 'Administratif' },
  { value: 'custom',         label: 'Personnalisé' },
];

const STATUS_CONFIG = {
  draft:     { label: 'Brouillon',  color: 'var(--fg-muted)',  bg: 'var(--surface-2)', icon: FileEdit },
  published: { label: 'Publié',     color: 'var(--success)',   bg: '#dcfce7',          icon: CheckCircle },
  archived:  { label: 'Archivé',    color: 'var(--warning)',   bg: '#fef9c3',          icon: Archive },
};

const TYPE_COLORS = {
  consultation:  '#3b82f6',
  admission:     '#8b5cf6',
  satisfaction:  '#f59e0b',
  rh:            '#10b981',
  administratif: '#6366f1',
  custom:        '#64748b',
};

// ── Modal Nouveau Formulaire ───────────────────────────────────────────────────

function NewFormModal({ onClose, onCreate }) {
  const [title, setTitle]               = useState('');
  const [type, setType]                 = useState('custom');
  const [description, setDesc]          = useState('');
  const [workflowTemplateId, setWfId]   = useState('');
  const [wfTemplates, setWfTemplates]   = useState([]);
  const [loading, setLoading]           = useState(false);

  const TYPES = FORM_TYPES.filter(t => t.value !== 'all');

  useEffect(() => {
    workflowTemplatesAPI.getAll().then(r => setWfTemplates(r.data?.data || [])).catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!title.trim()) { toast.error('Le titre est requis'); return; }
    setLoading(true);
    try {
      const res = await formsAPI.create({ title: title.trim(), description, type, workflowTemplateId: workflowTemplateId || null });
      onCreate(res.data.data);
      toast.success('Formulaire créé');
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 16
    }} onClick={onClose}>
      <div style={{
        background: 'var(--surface)', borderRadius: 16,
        padding: 28, width: '100%', maxWidth: 480,
        boxShadow: 'var(--shadow-3)'
      }} onClick={e => e.stopPropagation()}>

        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: 'var(--fg)' }}>
          Nouveau formulaire
        </h2>

        {/* Titre */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', display: 'block', marginBottom: 6 }}>
            Titre *
          </label>
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="Ex: Formulaire de consultation…"
            style={{
              width: '100%', padding: '10px 14px',
              border: '1.5px solid var(--border)', borderRadius: 10,
              fontSize: 14, background: 'var(--bg)', color: 'var(--fg)',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Type */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', display: 'block', marginBottom: 6 }}>
            Type de formulaire
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {TYPES.map(t => (
              <button key={t.value} onClick={() => setType(t.value)} style={{
                padding: '8px 6px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', textAlign: 'center', transition: 'all .15s',
                border: type === t.value ? `2px solid ${TYPE_COLORS[t.value] || 'var(--brand)'}` : '1.5px solid var(--border)',
                background: type === t.value ? `${TYPE_COLORS[t.value]}15` : 'var(--bg)',
                color: type === t.value ? (TYPE_COLORS[t.value] || 'var(--brand)') : 'var(--fg-muted)',
              }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Workflow */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', display: 'block', marginBottom: 6 }}>
            Circuit de validation <span style={{ color: 'var(--fg-muted)', fontWeight: 400 }}>(optionnel)</span>
          </label>
          <select
            value={workflowTemplateId}
            onChange={e => setWfId(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px',
              border: '1.5px solid var(--border)', borderRadius: 10,
              fontSize: 14, background: 'var(--bg)', color: 'var(--fg)',
              outline: 'none', cursor: 'pointer', boxSizing: 'border-box',
            }}
          >
            <option value="">— Aucun workflow (simple collecte) —</option>
            {wfTemplates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          {workflowTemplateId && (
            <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 4 }}>
              ✓ À la soumission, le circuit sélectionné sera déclenché automatiquement.
            </div>
          )}
        </div>

        {/* Description */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', display: 'block', marginBottom: 6 }}>
            Description <span style={{ color: 'var(--fg-muted)', fontWeight: 400 }}>(optionnel)</span>
          </label>
          <textarea
            value={description}
            onChange={e => setDesc(e.target.value)}
            placeholder="Décrivez l'objectif de ce formulaire…"
            rows={2}
            style={{
              width: '100%', padding: '10px 14px',
              border: '1.5px solid var(--border)', borderRadius: 10,
              fontSize: 14, background: 'var(--bg)', color: 'var(--fg)',
              outline: 'none', resize: 'vertical', boxSizing: 'border-box',
              fontFamily: 'var(--font-sans)',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '10px 18px', borderRadius: 10, border: '1.5px solid var(--border)',
            background: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--fg)',
          }}>
            Annuler
          </button>
          <button onClick={handleCreate} disabled={loading} style={{
            padding: '10px 20px', borderRadius: 10, border: 'none',
            background: 'var(--brand)', color: '#fff', cursor: 'pointer',
            fontSize: 14, fontWeight: 600, opacity: loading ? .6 : 1,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {loading ? 'Création…' : <><Plus size={16} /> Créer et concevoir</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Card Formulaire ────────────────────────────────────────────────────────────

function FormCard({ form, onDelete, onDuplicate, onStatusChange, onOpen }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const statusCfg = STATUS_CONFIG[form.status] || STATUS_CONFIG.draft;
  const StatusIcon = statusCfg.icon;
  const typeColor = TYPE_COLORS[form.type] || '#64748b';
  const fieldCount = form.schema?.fields?.length || 0;

  const handleAction = async (action) => {
    setMenuOpen(false);
    switch (action) {
      case 'duplicate': await onDuplicate(form.id); break;
      case 'archive':   await onStatusChange(form.id, 'archive'); break;
      case 'unpublish': await onStatusChange(form.id, 'unpublish'); break;
      case 'delete':    await onDelete(form.id); break;
    }
  };

  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 14,
      border: '1.5px solid var(--border)',
      overflow: 'hidden', transition: 'box-shadow .2s, transform .2s',
      cursor: 'pointer', position: 'relative',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
    >
      {/* Bande colorée selon le type */}
      <div style={{ height: 4, background: typeColor }} />

      <div style={{ padding: '16px 16px 12px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 onClick={() => onOpen(form)} style={{
              fontSize: 15, fontWeight: 700, color: 'var(--fg)',
              margin: 0, marginBottom: 4,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {form.title}
            </h3>
            {form.description && (
              <p style={{
                fontSize: 12, color: 'var(--fg-muted)', margin: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {form.description}
              </p>
            )}
          </div>

          {/* Menu actions */}
          <div style={{ position: 'relative', marginLeft: 8 }}>
            <button onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen); }} style={{
              padding: 6, background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--fg-muted)', borderRadius: 6,
            }}>
              <MoreVertical size={16} />
            </button>
            {menuOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 98 }} onClick={() => setMenuOpen(false)} />
                <div style={{
                  position: 'absolute', right: 0, top: 32, zIndex: 99,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 10, boxShadow: 'var(--shadow-3)',
                  minWidth: 180, overflow: 'hidden',
                }}>
                  {[
                    { action: 'edit',      icon: Edit3,    label: 'Modifier',    color: 'var(--fg)', onClick: () => { setMenuOpen(false); onOpen(form); } },
                    { action: 'duplicate', icon: Copy,     label: 'Dupliquer',   color: 'var(--fg)' },
                    { action: 'archive',   icon: Archive,  label: 'Archiver',    color: 'var(--warning)', show: form.status !== 'archived' },
                    { action: 'unpublish', icon: Globe,    label: 'Dépublier',   color: 'var(--warning)', show: form.status === 'published' },
                    { action: 'delete',    icon: Trash2,   label: 'Supprimer',   color: 'var(--danger)' },
                  ].filter(m => m.show !== false).map(m => (
                    <button key={m.action}
                      onClick={e => { e.stopPropagation(); m.onClick ? m.onClick() : handleAction(m.action); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        width: '100%', padding: '10px 14px',
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 13, color: m.color, textAlign: 'left',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <m.icon size={14} /> {m.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {/* Statut */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
            background: statusCfg.bg, color: statusCfg.color,
          }}>
            <StatusIcon size={11} />
            {statusCfg.label}
          </span>
          {/* Type */}
          <span style={{
            padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
            background: `${typeColor}18`, color: typeColor,
          }}>
            {FORM_TYPES.find(t => t.value === form.type)?.label || form.type}
          </span>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--fg-muted)' }}>
            <ClipboardList size={13} />
            {fieldCount} champ{fieldCount !== 1 ? 's' : ''}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--fg-muted)' }}>
            <Clock size={13} />
            {new Date(form.updatedAt || form.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
          </span>
          {form.creator && (
            <span style={{ fontSize: 12, color: 'var(--fg-muted)', marginLeft: 'auto' }}>
              {form.creator.firstName} {form.creator.lastName?.charAt(0)}.
            </span>
          )}
        </div>
      </div>

      {/* CTA Modifier */}
      <div style={{
        padding: '10px 16px', borderTop: '1px solid var(--border)',
        display: 'flex', gap: 8,
      }}>
        <button onClick={() => onOpen(form)} style={{
          flex: 1, padding: '8px 0', borderRadius: 8,
          background: 'var(--brand)', color: '#fff',
          border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <Edit3 size={13} />
          {form.status === 'draft' ? 'Concevoir' : 'Modifier'}
        </button>
        {form.status === 'published' && (
          <button onClick={() => navigate(`/forms/${form.id}/fill`)} title="Remplir le formulaire" style={{
            padding: '8px 10px', borderRadius: 8,
            background: '#dcfce7', color: '#16a34a',
            border: '1.5px solid #86efac', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600,
          }}>
            <Eye size={13} /> Remplir
          </button>
        )}
        {form.status === 'published' && (
          <button onClick={() => navigate(`/forms/${form.id}/responses`)} title="Voir les réponses" style={{
            padding: '8px 10px', borderRadius: 8,
            background: 'var(--surface-2)', color: 'var(--fg)',
            border: '1.5px solid var(--border)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600,
          }}>
            <BarChart2 size={13} /> Réponses
          </button>
        )}
      </div>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────

export default function FormsListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [forms,       setForms]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [filterType,  setFilterType]  = useState('all');
  const [filterStatus,setFilterStatus]= useState('all');
  const [showModal,   setShowModal]   = useState(false);
  const [pagination,  setPagination]  = useState({ total: 0, pages: 1 });

  const loadForms = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search)                         params.search = search;
      if (filterType   !== 'all')         params.type   = filterType;
      if (filterStatus !== 'all')         params.status = filterStatus;

      const res = await formsAPI.getAll(params);
      setForms(res.data.data || []);
      setPagination(res.data.pagination || { total: 0 });
    } catch (e) {
      toast.error('Erreur lors du chargement des formulaires');
    } finally {
      setLoading(false);
    }
  }, [search, filterType, filterStatus]);

  useEffect(() => {
    const t = setTimeout(loadForms, 300);
    return () => clearTimeout(t);
  }, [loadForms]);

  const handleCreate = (newForm) => {
    setForms(prev => [newForm, ...prev]);
    navigate(`/forms/${newForm.id}/designer`);
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce formulaire ? Cette action est irréversible.')) return;
    try {
      await formsAPI.delete(id);
      setForms(prev => prev.filter(f => f.id !== id));
      toast.success('Formulaire supprimé');
    } catch (e) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleDuplicate = async (id) => {
    try {
      const res = await formsAPI.duplicate(id);
      setForms(prev => [res.data.data, ...prev]);
      toast.success('Formulaire dupliqué');
    } catch (e) {
      toast.error('Erreur lors de la duplication');
    }
  };

  const handleStatusChange = async (id, action) => {
    try {
      let res;
      if (action === 'archive')   res = await formsAPI.archive(id);
      if (action === 'unpublish') res = await formsAPI.unpublish(id);
      setForms(prev => prev.map(f => f.id === id ? { ...f, ...res.data.data } : f));
      toast.success(action === 'archive' ? 'Formulaire archivé' : 'Formulaire dépublié');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Erreur');
    }
  };

  const handleOpen = (form) => {
    navigate(`/forms/${form.id}/designer`);
  };

  // Compteurs par statut
  const counts = {
    all:       forms.length,
    draft:     forms.filter(f => f.status === 'draft').length,
    published: forms.filter(f => f.status === 'published').length,
    archived:  forms.filter(f => f.status === 'archived').length,
  };

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1400, margin: '0 auto' }}>

      {/* ── En-tête ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--fg)', margin: 0 }}>
            Formulaires
          </h1>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: '4px 0 0' }}>
            {pagination.total} formulaire{pagination.total !== 1 ? 's' : ''} au total
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 18px', borderRadius: 10,
            background: 'var(--brand)', color: '#fff',
            border: 'none', cursor: 'pointer',
            fontSize: 14, fontWeight: 600,
            boxShadow: '0 2px 8px rgba(27,58,107,.25)',
          }}
        >
          <Plus size={16} />
          Créer un formulaire
        </button>
      </div>

      {/* ── Filtres statut ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { value: 'all',       label: `Tous (${counts.all})` },
          { value: 'published', label: `Publiés (${counts.published})` },
          { value: 'draft',     label: `Brouillons (${counts.draft})` },
          { value: 'archived',  label: `Archivés (${counts.archived})` },
        ].map(tab => (
          <button key={tab.value} onClick={() => setFilterStatus(tab.value)} style={{
            padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', transition: 'all .15s',
            background: filterStatus === tab.value ? 'var(--brand)' : 'var(--surface)',
            color: filterStatus === tab.value ? '#fff' : 'var(--fg-muted)',
            border: filterStatus === tab.value ? 'none' : '1.5px solid var(--border)',
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Barre de recherche + filtres ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un formulaire…"
            style={{
              width: '100%', padding: '10px 14px 10px 36px',
              border: '1.5px solid var(--border)', borderRadius: 10,
              fontSize: 14, background: 'var(--bg)', color: 'var(--fg)',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          style={{
            padding: '10px 14px', border: '1.5px solid var(--border)',
            borderRadius: 10, fontSize: 14, background: 'var(--bg)',
            color: 'var(--fg)', outline: 'none', cursor: 'pointer',
          }}
        >
          {FORM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {/* ── Grille de formulaires ── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--brand-soft)', borderTopColor: 'var(--brand)', animation: 'spin .7s linear infinite' }} />
        </div>
      ) : forms.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <FileText size={48} style={{ color: 'var(--fg-muted)', opacity: .4, marginBottom: 16 }} />
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg)', marginBottom: 8 }}>
            {search || filterType !== 'all' ? 'Aucun formulaire trouvé' : 'Aucun formulaire pour l\'instant'}
          </p>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 20 }}>
            {search ? 'Essayez d\'autres termes de recherche' : 'Créez votre premier formulaire en cliquant sur le bouton ci-dessus'}
          </p>
          {!search && (
            <button onClick={() => setShowModal(true)} style={{
              padding: '10px 20px', borderRadius: 10,
              background: 'var(--brand)', color: '#fff',
              border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
            }}>
              <Plus size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Créer un formulaire
            </button>
          )}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 16,
        }}>
          {forms.map(form => (
            <FormCard
              key={form.id}
              form={form}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onStatusChange={handleStatusChange}
              onOpen={handleOpen}
            />
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      {showModal && <NewFormModal onClose={() => setShowModal(false)} onCreate={handleCreate} />}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
