// frontend/src/components/DocumentWorkflow.jsx
import { useState, useEffect } from 'react';
import { workflowAPI } from '../services/api';
import { Clock, CheckCircle, XCircle, Calendar, Loader, AlertCircle } from 'lucide-react';

const STATUS_CFG = {
  pending:  { color: 'var(--warning)', bg: 'var(--warning-soft)', label: 'En attente' },
  approved: { color: 'var(--success)', bg: 'var(--success-soft)', label: 'Approuvé' },
  rejected: { color: 'var(--danger)',  bg: 'var(--danger-soft)',  label: 'Rejeté' },
};

const OVERALL_CFG = {
  pending_validation: { color: 'var(--warning)', bg: 'var(--warning-soft)', label: 'Validation en cours' },
  validated:          { color: 'var(--success)', bg: 'var(--success-soft)', label: 'Document validé' },
  rejected:           { color: 'var(--danger)',  bg: 'var(--danger-soft)',  label: 'Document rejeté' },
};

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const StatusIcon = ({ status, size = 20 }) => {
  const color = STATUS_CFG[status]?.color || 'var(--fg-subtle)';
  if (status === 'approved') return <CheckCircle size={size} color={color} />;
  if (status === 'rejected') return <XCircle size={size} color={color} />;
  return <Clock size={size} color={color} />;
};

export default function DocumentWorkflow({ documentId, onClose }) {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => { if (documentId) loadWorkflow(); }, [documentId]);

  const loadWorkflow = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await workflowAPI.getDocumentWorkflow(documentId);
      setWorkflows(res.data.workflows || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors du chargement du workflow');
    } finally {
      setLoading(false);
    }
  };

  const getOverallStatus = () => {
    if (workflows.length === 0) return null;
    if (workflows.some(w => w.status === 'rejected')) return 'rejected';
    if (workflows.every(w => w.status === 'approved')) return 'validated';
    return 'pending_validation';
  };

  const closeBtnStyle = {
    height: 32, padding: '0 14px', borderRadius: 'var(--radius-2)',
    border: '1px solid var(--border)', background: 'transparent',
    color: 'var(--fg-muted)', fontSize: 13, cursor: 'pointer',
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10, color: 'var(--fg-muted)', fontSize: 13 }}>
      <Loader size={20} color="var(--brand)" className="animate-spin" />
      Chargement du workflow…
    </div>
  );

  if (error) return (
    <div style={{ padding: 16 }}>
      <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-2)', background: 'var(--danger-soft)', border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
        <XCircle size={15} /> {error}
      </div>
      {onClose && <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}><button onClick={onClose} style={closeBtnStyle}>Fermer</button></div>}
    </div>
  );

  if (workflows.length === 0) return (
    <div style={{ padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <AlertCircle size={40} color="var(--border-strong)" style={{ marginBottom: 10 }} />
      <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 14 }}>Aucun workflow trouvé pour ce document</div>
      {onClose && <button onClick={onClose} style={closeBtnStyle}>Fermer</button>}
    </div>
  );

  const overall = getOverallStatus();
  const overallCfg = overall ? OVERALL_CFG[overall] : null;

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)' }}>Circuit de validation</div>
        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-subtle)', display: 'flex' }}>
            <XCircle size={18} />
          </button>
        )}
      </div>

      {/* Overall status */}
      {overallCfg && (
        <div style={{
          padding: '10px 14px', borderRadius: 'var(--radius-3)', marginBottom: 16,
          background: overallCfg.bg, border: `1px solid ${overallCfg.color}`,
          fontSize: 13, fontWeight: 600, color: overallCfg.color,
        }}>
          {overallCfg.label}
        </div>
      )}

      {/* Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {workflows.map((wf, index) => {
          const cfg = STATUS_CFG[wf.status] || STATUS_CFG.pending;
          return (
            <div key={wf.id} style={{ display: 'flex', gap: 14, position: 'relative' }}>
              {/* Connector line */}
              {index < workflows.length - 1 && (
                <div style={{ position: 'absolute', left: 18, top: 40, bottom: -8, width: 2, background: 'var(--border)', zIndex: 0 }} />
              )}

              {/* Step circle */}
              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: 20 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', zIndex: 1,
                  background: cfg.bg, border: `2px solid ${cfg.color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <StatusIcon status={wf.status} size={16} />
                </div>
                <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginTop: 3 }}>Étape {wf.step}</div>
              </div>

              {/* Content */}
              <div style={{
                flex: 1, border: '1px solid var(--border)', borderRadius: 'var(--radius-3)',
                padding: '12px 14px', background: 'var(--surface-2)', marginBottom: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
                    {wf.validator.fullName || wf.validator.username}
                  </div>
                  <span style={{ background: cfg.bg, color: cfg.color, padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
                    {cfg.label}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 8 }}>{wf.validator.email}</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11, color: 'var(--fg-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Calendar size={11} /> Soumis le {formatDate(wf.createdAt)}
                  </div>
                  {wf.validatedAt && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Calendar size={11} /> Traité le {formatDate(wf.validatedAt)}
                    </div>
                  )}
                </div>

                {wf.comment && (
                  <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 'var(--radius-2)', background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 12 }}>
                    <div style={{ fontWeight: 500, color: 'var(--fg-muted)', marginBottom: 3 }}>Commentaire :</div>
                    <div style={{ color: 'var(--fg)' }}>{wf.comment}</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4 }}>
        {[
          { value: workflows.length, label: 'Validateurs', color: 'var(--brand)' },
          { value: workflows.filter(w => w.status === 'approved').length, label: 'Approuvés', color: 'var(--success)' },
          { value: workflows.filter(w => w.status === 'pending').length,  label: 'En attente', color: 'var(--warning)' },
        ].map(s => (
          <div key={s.label} className="ged-stat" style={{ textAlign: 'center', borderLeft: `3px solid ${s.color}` }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {onClose && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={onClose} style={closeBtnStyle}>Fermer</button>
        </div>
      )}
    </div>
  );
}
