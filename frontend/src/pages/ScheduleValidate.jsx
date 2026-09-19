// frontend/src/pages/ScheduleValidate.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import scheduleService from '../services/scheduleService';
import { ArrowLeft, Check, X, Loader, Users, CalendarDays, User, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Style constants ───────────────────────────────────────────────────────────
const textareaStyle = {
  width: '100%', padding: '8px 10px', boxSizing: 'border-box',
  border: '1px solid var(--border)', borderRadius: 'var(--radius-2)',
  background: 'var(--surface)', color: 'var(--fg)', fontSize: 13,
  resize: 'vertical', outline: 'none', lineHeight: 1.5,
};
const dtStyle = { fontSize: 11, fontWeight: 500, color: 'var(--fg-muted)', marginBottom: 3 };
const ddStyle = { fontSize: 13, fontWeight: 500, color: 'var(--fg)' };

const VALIDATOR_ROLE_LABELS = {
  dds: 'Directrice des Soins',
  medical_chief: 'Médecin Chef',
  dg: 'Directeur Général',
};

export default function ScheduleValidate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [action, setAction] = useState('');
  const [comments, setComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => { loadSchedule(); }, [id]);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const data = await scheduleService.getScheduleById(id);
      setSchedule(data);
    } catch {
      toast('Erreur lors du chargement du planning');
      navigate('/schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (validateAction) => {
    if (validateAction === 'reject' && !rejectionReason.trim()) {
      toast('Veuillez indiquer la raison du rejet');
      return;
    }
    const confirmMsg = validateAction === 'approve'
      ? 'Êtes-vous sûr de vouloir approuver ce planning ?'
      : 'Êtes-vous sûr de vouloir rejeter ce planning ?';
    if (!window.confirm(confirmMsg)) return;

    setSubmitting(true);
    try {
      await scheduleService.validateSchedule(id, validateAction, comments, rejectionReason);
      toast(validateAction === 'approve' ? 'Planning approuvé avec succès!' : 'Planning rejeté');
      navigate('/schedules');
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur lors de la validation');
    } finally {
      setSubmitting(false);
    }
  };

  const getAssignmentsByEmployee = () => {
    if (!schedule?.assignments) return [];
    const map = {};
    schedule.assignments.forEach(a => {
      const empId = a.employeeId || a.userId;
      if (!map[empId]) {
        map[empId] = {
          name: a.employeeName || `${a.user?.firstName} ${a.user?.lastName}`,
          assignments: [],
        };
      }
      map[empId].assignments.push(a);
    });
    return Object.values(map);
  };

  if (loading || !schedule) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <Loader size={24} color="var(--fg-muted)" className="animate-spin" />
    </div>
  );

  const employeeAssignments = getAssignmentsByEmployee();
  const statusLabels = scheduleService.getStatusLabels();

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px 40px' }} className="animate-pageFade">

      {/* Back + Header */}
      <div style={{ paddingTop: 4, marginBottom: 20 }}>
        <button
          onClick={() => navigate('/schedules')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--fg-muted)', fontSize: 12, marginBottom: 10,
          }}
        >
          <ArrowLeft size={14} /> Retour à la liste
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg)', margin: 0, letterSpacing: '-0.3px' }}>
              Validation du planning
            </h1>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 3 }}>{schedule.title}</div>
          </div>
          <span className="ged-badge ged-badge-warning">{statusLabels[schedule.status]}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>

        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Details */}
          <div className="ged-card" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 14 }}>Détails du planning</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
              <div><div style={dtStyle}>Type de planning</div><div style={ddStyle}>{scheduleService.getScheduleTypeLabels()[schedule.scheduleType]}</div></div>
              <div><div style={dtStyle}>Période</div><div style={ddStyle}>{scheduleService.getMonthName(schedule.month)} {schedule.year}</div></div>
              <div><div style={dtStyle}>Créé par</div><div style={ddStyle}>{schedule.creator?.firstName} {schedule.creator?.lastName}</div></div>
              <div><div style={dtStyle}>Date de création</div><div style={ddStyle}>{new Date(schedule.createdAt).toLocaleDateString('fr-FR')}</div></div>
            </div>
            {schedule.notes && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <div style={dtStyle}>Notes</div>
                <div style={{ fontSize: 13, color: 'var(--fg)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{schedule.notes}</div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="ged-card" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 12 }}>Statistiques</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { value: employeeAssignments.length, label: 'Employés',   color: 'var(--brand)' },
                { value: schedule.assignments?.length || 0, label: 'Affectations', color: 'var(--success)' },
                { value: new Date(schedule.year, schedule.month, 0).getDate(), label: 'Jours', color: 'var(--warning)' },
              ].map(stat => (
                <div key={stat.label} className="ged-stat" style={{ textAlign: 'center', borderLeft: `3px solid ${stat.color}` }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: stat.color, marginBottom: 4 }}>{stat.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Assignments preview */}
          <div className="ged-card" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 12 }}>
              Aperçu des affectations ({employeeAssignments.length} employés)
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {employeeAssignments.map((emp, index) => (
                <div key={index} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', padding: '8px 10px' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', marginBottom: 6 }}>{emp.name}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                    {emp.assignments
                      .sort((a, b) => new Date(a.assignmentDate) - new Date(b.assignmentDate))
                      .map((assignment, idx) => {
                        const bg = assignment.shiftType?.color || '#e5e7eb';
                        const isLight = parseInt(bg.replace('#', ''), 16) > 0xffffff / 2;
                        return (
                          <span
                            key={idx}
                            style={{
                              display: 'inline-block', padding: '2px 6px',
                              borderRadius: 'var(--radius-2)', fontSize: 11,
                              background: bg, color: isLight ? '#000' : '#fff',
                            }}
                            title={`${new Date(assignment.assignmentDate).toLocaleDateString('fr-FR')} — ${assignment.shiftType?.name}`}
                          >
                            {assignment.shiftCode}
                          </span>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Validation workflow */}
          <div className="ged-card" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 12 }}>Workflow de validation</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {schedule.validations?.map((v, i) => {
                const isApproved = v.status === 'approved';
                const isRejected = v.status === 'rejected';
                const color = isApproved ? 'var(--success)' : isRejected ? 'var(--danger)' : 'var(--fg-subtle)';
                const bg    = isApproved ? 'var(--success-soft)' : isRejected ? 'var(--danger-soft)' : 'var(--surface-2)';
                return (
                  <div key={v.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flexShrink: 0, width: 28, height: 28, borderRadius: '50%', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                      {isApproved ? '✓' : isRejected ? '✗' : i + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{VALIDATOR_ROLE_LABELS[v.validatorRole] || v.validatorRole}</div>
                      {v.validator && <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{v.validator.firstName} {v.validator.lastName}</div>}
                      <div style={{ fontSize: 11, color, marginTop: 1 }}>
                        {isApproved ? 'Approuvé' : isRejected ? 'Rejeté' : 'En attente'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Decision form */}
          {schedule.status.startsWith('pending_') && (
            <div className="ged-card" style={{ padding: '16px 18px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 14 }}>Votre décision</div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ ...dtStyle, marginBottom: 5 }}>Commentaires (optionnel)</label>
                <textarea
                  value={comments}
                  onChange={e => setComments(e.target.value)}
                  rows={3}
                  style={textareaStyle}
                  placeholder="Ajoutez des commentaires…"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  onClick={() => handleValidate('approve')}
                  disabled={submitting}
                  style={{
                    width: '100%', height: 38, borderRadius: 'var(--radius-2)',
                    border: 'none', background: 'var(--success)', color: '#fff',
                    fontSize: 13, fontWeight: 500, cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  {submitting ? <Loader size={14} className="animate-spin" /> : <Check size={14} />}
                  {submitting ? 'Traitement…' : 'Approuver le planning'}
                </button>

                <button
                  onClick={() => setAction(action === 'reject' ? '' : 'reject')}
                  style={{
                    width: '100%', height: 38, borderRadius: 'var(--radius-2)',
                    border: '1px solid var(--danger)', background: action === 'reject' ? 'var(--danger-soft)' : 'transparent',
                    color: 'var(--danger)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <X size={14} /> Rejeter le planning
                </button>
              </div>

              {/* Rejection reason */}
              {action === 'reject' && (
                <div style={{ marginTop: 10, padding: '12px 14px', background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-2)' }}>
                  <label style={{ ...dtStyle, color: 'var(--danger)', marginBottom: 6 }}>
                    Raison du rejet *
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    rows={3}
                    style={{ ...textareaStyle, borderColor: 'var(--danger)' }}
                    placeholder="Expliquez pourquoi vous rejetez ce planning…"
                  />
                  <button
                    onClick={() => handleValidate('reject')}
                    disabled={submitting || !rejectionReason.trim()}
                    style={{
                      marginTop: 8, width: '100%', height: 34, borderRadius: 'var(--radius-2)',
                      border: 'none', background: 'var(--danger)', color: '#fff',
                      fontSize: 13, fontWeight: 500, cursor: (submitting || !rejectionReason.trim()) ? 'not-allowed' : 'pointer',
                      opacity: (submitting || !rejectionReason.trim()) ? 0.5 : 1,
                    }}
                  >
                    {submitting ? 'Traitement…' : 'Confirmer le rejet'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
