// frontend/src/components/MgTaskModal.jsx

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { workflowAPI } from '../services/api';
import { Loader, Check, X, FilePlus, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const MgTaskModal = ({ task, onClose, onUpdate }) => {
  const { t } = useTranslation();
  const [action, setAction] = useState(null); // 'validate' ou 'create_db'
  const [comment, setComment] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleValidateDirectly = async () => {
    setLoading(true); setError('');
    try {
      await workflowAPI.validateTask(task.id, { status: 'approved', comment });
      toast.success(t('Tâche validée avec succès.'));
      onUpdate(); onClose();
    } catch (err) {
      setError(err.response?.data?.message || t('Erreur lors de la validation.'));
      setLoading(false);
    }
  };

  const handleInitiateDB = async () => {
    if (!file) { setError(t('Veuillez joindre le fichier de la Demande de Besoin.')); return; }
    setLoading(true); setError('');
    try {
      const formData = new FormData();
      formData.append('parentDocumentId', task.documentId);
      formData.append('title', `Demande de Besoin pour DT - ${task.document.title}`);
      formData.append('category', 'Demande de Besoin');
      formData.append('file', file);
      await workflowAPI.initiateLinkedDocument(formData);
      toast.success(t('Demande de Besoin initiée. La Demande de Travaux est en pause.'));
      onUpdate(); onClose();
    } catch (err) {
      setError(err.response?.data?.message || t("Erreur lors de l'initiation."));
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', marginTop: 4, padding: '8px 12px',
    border: '1.5px solid var(--border)', borderRadius: 'var(--radius-3)',
    background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 9999 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-3)', boxShadow: 'var(--shadow-3)', width: '100%', maxWidth: 512, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg)', margin: 0 }}>{t('Traiter la Demande de Travaux')}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', display: 'flex', transition: 'color .15s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--fg)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--fg-muted)'}
          >
            <X size={22} />
          </button>
        </div>

        {task.document.status === 'en_attente_dependance' ? (
          <div style={{ background: 'var(--warning-soft)', borderLeft: '4px solid var(--warning)', padding: 16, borderRadius: 'var(--radius-2)', display: 'flex', gap: 12 }}>
            <AlertTriangle size={18} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, color: 'var(--fg)', margin: 0 }}>
              {t("Cette tâche est en attente de la finalisation d'une Demande de Besoin. Elle sera réactivée automatiquement.")}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ color: 'var(--fg)', fontSize: 14, margin: 0 }}>{t('Comment souhaitez-vous traiter cette demande ?')}</p>

            <div style={{ display: 'flex', gap: 16 }}>
              {[
                { id: 'validate', Icon: Check, label: t('Valider directement'), iconColor: 'var(--success)' },
                { id: 'create_db', Icon: FilePlus, label: t('Initier une Demande de Besoin'), iconColor: '#f97316' },
              ].map(({ id, Icon, label, iconColor }) => (
                <button key={id} onClick={() => setAction(id)}
                  style={{
                    flex: 1, padding: 16, borderRadius: 'var(--radius-3)', cursor: 'pointer',
                    border: `2px solid ${action === id ? 'var(--brand)' : 'var(--border)'}`,
                    background: action === id ? 'var(--brand-soft)' : 'var(--surface-2)',
                    transition: 'border-color .15s, background .15s',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  }}
                >
                  <Icon size={22} style={{ color: iconColor }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', textAlign: 'center' }}>{label}</span>
                </button>
              ))}
            </div>

            {action === 'validate' && (
              <div style={{ paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{t('Commentaire (optionnel)')}</label>
                <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
                  style={{ ...inputStyle, resize: 'none' }} />
                <button onClick={handleValidateDirectly} disabled={loading}
                  style={{
                    padding: '10px 16px', background: 'var(--success)', color: '#fff',
                    border: 'none', borderRadius: 'var(--radius-3)', fontSize: 13, fontWeight: 500,
                    cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'opacity .15s',
                  }}
                >
                  {loading ? <Loader size={16} className="animate-spin" /> : t('Confirmer la validation')}
                </button>
              </div>
            )}

            {action === 'create_db' && (
              <div style={{ paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{t('Joindre la Demande de Besoin (PDF)')}</label>
                <input type="file" onChange={e => setFile(e.target.files[0])} accept=".pdf"
                  style={inputStyle} />
                <button onClick={handleInitiateDB} disabled={loading}
                  style={{
                    padding: '10px 16px', background: '#f97316', color: '#fff',
                    border: 'none', borderRadius: 'var(--radius-3)', fontSize: 13, fontWeight: 500,
                    cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'opacity .15s',
                  }}
                >
                  {loading ? <Loader size={16} className="animate-spin" /> : t('Créer et Mettre en Pause')}
                </button>
              </div>
            )}

            {error && <p style={{ color: 'var(--danger)', fontSize: 13, margin: 0 }}>{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default MgTaskModal;
