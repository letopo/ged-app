// frontend/src/components/FormBuilder/Designer/DesignerToolbar.jsx
// Barre d'outils du designer — sauvegarde, prévisualisation, publication

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Save, Eye, Globe, CheckCircle, Loader2, MoreVertical, FileEdit, Archive, Undo2, Redo2, GitBranch, ChevronDown, Grid3x3 } from 'lucide-react';
import { useFormBuilderStore } from '../../../store/formBuilderStore';
import { formsAPI, workflowTemplatesAPI } from '../../../services/api';
import toast from 'react-hot-toast';

export default function DesignerToolbar({ mode, onToggleMode }) {
  const navigate  = useNavigate();
  const { t } = useTranslation();
  const { form, isDirty, isSaving, setIsSaving, setIsDirty, setForm, undo, redo, _history, _future, snapEnabled, toggleSnap } = useFormBuilderStore();
  const [menuOpen, setMenuOpen]       = useState(false);
  const [wfDropOpen, setWfDropOpen]   = useState(false);
  const [wfTemplates, setWfTemplates] = useState([]);
  const [wfSaving, setWfSaving]       = useState(false);

  useEffect(() => {
    workflowTemplatesAPI.getAll().then(r => setWfTemplates(r.data?.data || [])).catch(() => {});
  }, []);

  if (!form) return null;

  const STATUS_LABELS = {
    draft:     { label: t('Brouillon'),  color: '#94a3b8', icon: FileEdit },
    published: { label: t('Publié'),     color: '#10b981', icon: CheckCircle },
    archived:  { label: t('Archivé'),    color: '#f59e0b', icon: Archive },
  };
  const StatusIcon = STATUS_LABELS[form.status]?.icon || FileEdit;

  const handleChangeWorkflow = async (templateId) => {
    setWfDropOpen(false);
    if (templateId === (form.workflowTemplateId || '')) return;
    setWfSaving(true);
    try {
      const res = await formsAPI.update(form.id, { workflowTemplateId: templateId || null });
      setForm({ ...form, workflowTemplateId: templateId || null });
      toast.success(templateId ? t('Workflow lié') : t('Workflow retiré'));
    } catch (e) {
      toast.error(t('Erreur lors de la mise à jour du workflow'));
    } finally {
      setWfSaving(false);
    }
  };

  const handleSave = async () => {
    if (!isDirty) return;
    setIsSaving(true);
    try {
      const res = await formsAPI.update(form.id, {
        title:    form.title,
        schema:   form.schema,
        settings: form.settings,
      });
      setForm(res.data.data);
      setIsDirty(false);
      toast.success(t('Sauvegardé'));
    } catch (e) {
      toast.error(e?.response?.data?.message || t('Erreur lors de la sauvegarde'));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    setMenuOpen(false);
    // Sauvegarder d'abord si dirty
    if (isDirty) await handleSave();
    try {
      const res = await formsAPI.publish(form.id);
      setForm(res.data.data);
      toast.success(t('Formulaire publié !'));
    } catch (e) {
      toast.error(e?.response?.data?.message || t('Erreur lors de la publication'));
    }
  };

  const handleUnpublish = async () => {
    setMenuOpen(false);
    try {
      const res = await formsAPI.unpublish(form.id);
      setForm(res.data.data);
      toast.success(t('Formulaire dépublié'));
    } catch (e) {
      toast.error(t('Erreur'));
    }
  };

  return (
    <div style={{
      height: 52,
      borderBottom: '1.5px solid var(--border)',
      background: 'var(--surface)',
      display: 'flex', alignItems: 'center',
      padding: '0 12px', gap: 8,
      flexShrink: 0, zIndex: 10,
    }}>
      {/* Retour */}
      <button
        onClick={() => navigate('/forms')}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 10px', borderRadius: 8,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, color: 'var(--fg-muted)',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
      >
        <ArrowLeft size={15} />
        <span style={{ display: 'none' }} className="md-show">{t('Formulaires')}</span>
      </button>

      <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

      {/* Undo / Redo */}
      <button onClick={undo} disabled={!_history?.length} title={t('Annuler (Ctrl+Z)')} style={{ padding: '5px 7px', background: 'none', border: '1.5px solid var(--border)', borderRadius: 7, cursor: _history?.length ? 'pointer' : 'default', color: _history?.length ? 'var(--fg)' : 'var(--fg-muted)', opacity: _history?.length ? 1 : .4, display: 'flex' }}>
        <Undo2 size={14} />
      </button>
      <button onClick={redo} disabled={!_future?.length} title={t('Rétablir (Ctrl+Y)')} style={{ padding: '5px 7px', background: 'none', border: '1.5px solid var(--border)', borderRadius: 7, cursor: _future?.length ? 'pointer' : 'default', color: _future?.length ? 'var(--fg)' : 'var(--fg-muted)', opacity: _future?.length ? 1 : .4, display: 'flex' }}>
        <Redo2 size={14} />
      </button>

      {/* Bascule grille / magnétisme */}
      <button
        onClick={toggleSnap}
        title={snapEnabled ? t('Désactiver la grille et le magnétisme') : t('Activer la grille et le magnétisme')}
        style={{
          padding: '5px 9px', borderRadius: 7,
          border: `1.5px solid ${snapEnabled ? 'var(--brand)' : 'var(--border)'}`,
          background: snapEnabled ? 'var(--brand)' : 'var(--bg)',
          color: snapEnabled ? '#fff' : 'var(--fg-muted)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 11, fontWeight: 600,
        }}
      >
        <Grid3x3 size={13} />
        {snapEnabled ? t('Grille ON') : t('Grille OFF')}
      </button>

      <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

      {/* Titre + statut */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {form.title}
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 600,
            color: STATUS_LABELS[form.status]?.color,
            background: `${STATUS_LABELS[form.status]?.color}18`,
            padding: '2px 8px', borderRadius: 10,
          }}>
            <StatusIcon size={10} />
            {STATUS_LABELS[form.status]?.label}
          </span>
          {isDirty && (
            <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>
              • {t('Non sauvegardé')}
            </span>
          )}
        </div>

        {/* Workflow lié */}
        <div style={{ position: 'relative', marginTop: 2 }}>
          <button
            onClick={() => setWfDropOpen(!wfDropOpen)}
            disabled={wfSaving}
            title={t('Workflow de validation lié')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '2px 8px', borderRadius: 10,
              background: form.workflowTemplateId ? '#eff6ff' : 'var(--surface-2)',
              border: `1.5px solid ${form.workflowTemplateId ? '#93c5fd' : 'var(--border)'}`,
              color: form.workflowTemplateId ? '#1d4ed8' : 'var(--fg-muted)',
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
              opacity: wfSaving ? 0.6 : 1,
            }}
          >
            {wfSaving
              ? <Loader2 size={10} style={{ animation: 'spin .7s linear infinite' }} />
              : <GitBranch size={10} />
            }
            {form.workflowTemplateId
              ? (wfTemplates.find(wft => wft.id === form.workflowTemplateId)?.name || t('Workflow lié'))
              : t('Aucun workflow')
            }
            <ChevronDown size={10} />
          </button>
          {wfDropOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 198 }} onClick={() => setWfDropOpen(false)} />
              <div style={{
                position: 'absolute', left: 0, top: 28, zIndex: 199,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 10, boxShadow: 'var(--shadow-3)',
                minWidth: 220, overflow: 'hidden',
              }}>
                <button
                  onClick={() => handleChangeWorkflow('')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '9px 14px',
                    background: !form.workflowTemplateId ? 'var(--surface-2)' : 'none',
                    border: 'none', cursor: 'pointer',
                    fontSize: 12, color: 'var(--fg-muted)', textAlign: 'left',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = !form.workflowTemplateId ? 'var(--surface-2)' : 'none'}
                >
                  {t('Aucun workflow')}
                </button>
                {wfTemplates.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--border)' }}>
                    {wfTemplates.map(wft => (
                      <button
                        key={wft.id}
                        onClick={() => handleChangeWorkflow(wft.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          width: '100%', padding: '9px 14px',
                          background: form.workflowTemplateId === wft.id ? '#eff6ff' : 'none',
                          border: 'none', cursor: 'pointer',
                          fontSize: 12, color: 'var(--fg)', textAlign: 'left',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                        onMouseLeave={e => e.currentTarget.style.background = form.workflowTemplateId === wft.id ? '#eff6ff' : 'none'}
                      >
                        <GitBranch size={12} style={{ color: '#3b82f6', flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wft.name}</span>
                        {form.workflowTemplateId === wft.id && <CheckCircle size={12} style={{ color: '#10b981', marginLeft: 'auto', flexShrink: 0 }} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Boutons à droite */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>

        {/* Remplir + Réponses (si publié) */}
        {form.status === 'published' && (
          <>
            <button onClick={() => navigate(`/forms/${form.id}/fill`)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, background: '#dcfce7', color: '#16a34a', border: '1.5px solid #86efac', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              {t('Remplir')}
            </button>
            <button onClick={() => navigate(`/forms/${form.id}/responses`)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, background: 'var(--surface-2)', color: 'var(--fg)', border: '1.5px solid var(--border)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              {t('Réponses')}
            </button>
          </>
        )}

        {/* Aperçu / Conception */}
        <button
          onClick={onToggleMode}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 8,
            background: mode === 'preview' ? 'var(--brand)' : 'var(--surface-2)',
            color: mode === 'preview' ? '#fff' : 'var(--fg)',
            border: '1.5px solid var(--border)', cursor: 'pointer',
            fontSize: 13, fontWeight: 600,
          }}
        >
          <Eye size={14} />
          {mode === 'preview' ? t('Conception') : t('Aperçu')}
        </button>

        {/* Sauvegarder */}
        <button
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 8,
            background: isDirty ? 'var(--surface-2)' : 'none',
            color: isDirty ? 'var(--fg)' : 'var(--fg-muted)',
            border: '1.5px solid var(--border)', cursor: isDirty ? 'pointer' : 'default',
            fontSize: 13, fontWeight: 600,
            opacity: isSaving ? .7 : 1,
          }}
        >
          {isSaving ? <Loader2 size={14} style={{ animation: 'spin .7s linear infinite' }} /> : <Save size={14} />}
          {t('Sauvegarder')}
        </button>

        {/* Publier */}
        {form.status !== 'published' && (
          <button
            onClick={handlePublish}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 16px', borderRadius: 8,
              background: 'var(--brand)', color: '#fff',
              border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 700,
              boxShadow: '0 2px 8px rgba(27,58,107,.25)',
            }}
          >
            <Globe size={14} />
            {t('Publier')}
          </button>
        )}

        {/* Menu secondaire */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              padding: '7px 10px', borderRadius: 8,
              background: 'none', border: '1.5px solid var(--border)',
              cursor: 'pointer', color: 'var(--fg-muted)',
            }}
          >
            <MoreVertical size={15} />
          </button>
          {menuOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 98 }} onClick={() => setMenuOpen(false)} />
              <div style={{
                position: 'absolute', right: 0, top: 40, zIndex: 99,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 10, boxShadow: 'var(--shadow-3)',
                minWidth: 180, overflow: 'hidden',
              }}>
                {form.status === 'published' && (
                  <button onClick={handleUnpublish} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '10px 14px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 13, color: '#f59e0b', textAlign: 'left',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <FileEdit size={14} /> {t('Repasser en brouillon')}
                  </button>
                )}
                <button
                  onClick={() => { setMenuOpen(false); navigate(`/forms/${form.id}/responses`); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '10px 14px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 13, color: 'var(--fg)', textAlign: 'left',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <CheckCircle size={14} /> {t('Voir les réponses')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
