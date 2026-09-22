// frontend/src/pages/FormBuilder/FormDesigner.jsx
// Page principale du Form Designer — layout 3 colonnes

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { useFormBuilderStore, FIELD_REGISTRY } from '../../store/formBuilderStore';
import { formsAPI } from '../../services/api';

import DesignerToolbar  from '../../components/FormBuilder/Designer/DesignerToolbar';
import ComponentPanel   from '../../components/FormBuilder/Designer/ComponentPanel';
import DesignerCanvas   from '../../components/FormBuilder/Designer/DesignerCanvas';
import PropertiesPanel  from '../../components/FormBuilder/Designer/PropertiesPanel';
import FormRenderer     from '../../components/FormBuilder/Renderer/FormRenderer';

const AUTO_SAVE_DELAY = 30_000; // 30 secondes

export default function FormDesigner() {
  const { t } = useTranslation();
  const { id }    = useParams();
  const navigate  = useNavigate();

  const { form, isDirty, setForm, setIsSaving, setIsDirty } = useFormBuilderStore();

  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [mode,          setMode]          = useState('design'); // 'design' | 'preview'
  const [draggingType,  setDraggingType]  = useState(null);

  const autoSaveTimer = useRef(null);

  // ── Chargement du formulaire ──
  useEffect(() => {
    (async () => {
      try {
        const res = await formsAPI.getById(id);
        setForm(res.data.data);
      } catch (e) {
        setError(e?.response?.data?.message || t('Formulaire introuvable'));
      } finally {
        setLoading(false);
      }
    })();
    // Nettoyer le store à la sortie
    return () => setForm(null);
  }, [id]);

  // ── Auto-save ──
  useEffect(() => {
    if (!isDirty || !form) return;
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      try {
        setIsSaving(true);
        const res = await formsAPI.update(form.id, { schema: form.schema, title: form.title });
        setForm(res.data.data);
        setIsDirty(false);
      } catch { /* silencieux */ }
      finally { setIsSaving(false); }
    }, AUTO_SAVE_DELAY);
    return () => clearTimeout(autoSaveTimer.current);
  }, [isDirty, form?.schema]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      const editing = ['INPUT','TEXTAREA','SELECT'].includes(tag);

      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty) document.getElementById('btn-save-designer')?.click();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey && !editing) {
        e.preventDefault();
        useFormBuilderStore.getState().undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey)) && !editing) {
        e.preventDefault();
        useFormBuilderStore.getState().redo();
      }
      if (e.key === 'Escape') {
        useFormBuilderStore.getState().deselectField();
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !editing) {
        const { selectedFieldId, removeField } = useFormBuilderStore.getState();
        if (selectedFieldId) { e.preventDefault(); removeField(selectedFieldId); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isDirty]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--brand-soft)', borderTopColor: 'var(--brand)', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
      <p style={{ fontSize: 15, color: 'var(--danger)', fontWeight: 600 }}>{error}</p>
      <button onClick={() => navigate('/forms')} style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--brand)', color: '#fff', border: 'none', cursor: 'pointer' }}>
        {t('Retour')}
      </button>
    </div>
  );

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
      background: 'var(--bg)',
    }}>
      {/* Barre d'outils */}
      <DesignerToolbar
        mode={mode}
        onToggleMode={() => setMode(m => m === 'design' ? 'preview' : 'design')}
      />

      {/* Corps */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {mode === 'design' ? (
          <>
            {/* Panneau composants (gauche) */}
            <ComponentPanel onDragStart={(type) => setDraggingType(type)} />

            {/* Canvas (centre) */}
            <DesignerCanvas
              draggingType={draggingType}
              onDragEnd={() => setDraggingType(null)}
            />

            {/* Panneau propriétés (droite) */}
            <PropertiesPanel />
          </>
        ) : (
          /* Mode aperçu */
          <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
            <div style={{ maxWidth: 760, margin: '24px auto', padding: '0 16px' }}>
              {/* Bandeau aperçu */}
              <div style={{
                background: '#fef3c7', border: '1.5px solid #fbbf24',
                borderRadius: 10, padding: '10px 16px', marginBottom: 20,
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 13, color: '#92400e', fontWeight: 500,
              }}>
                <span>👁</span>
                {t('Mode aperçu — les champs ne sont pas interactifs')}
              </div>

              {/* Rendu du formulaire */}
              <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,.08)', padding: '28px 32px' }}>
                <FormRenderer form={form} readOnly={true} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
