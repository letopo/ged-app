// frontend/src/pages/SchedulesList.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import scheduleService from '../services/scheduleService';
import { useAuth } from '../contexts/AuthContext';
import { CalendarDays, Tag, User, Loader, Plus, Trash2, Edit3, Eye, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_CFG = {
  draft:            { cls: 'ged-badge ged-badge-neutral', dot: 'var(--fg-subtle)' },
  pending_dds:      { cls: 'ged-badge ged-badge-warning', dot: 'var(--warning)' },
  pending_medical:  { cls: 'ged-badge ged-badge-warning', dot: 'var(--warning)' },
  pending_dg:       { cls: 'ged-badge ged-badge-warning', dot: 'var(--warning)' },
  approved:         { cls: 'ged-badge ged-badge-success', dot: 'var(--success)' },
  rejected:         { cls: 'ged-badge ged-badge-danger',  dot: 'var(--danger)'  },
};

const getValidationStatus = (t) => ({
  approved: { bg: 'var(--success-soft)', color: 'var(--success)', label: t('Approuvé'), symbol: '✓' },
  rejected: { bg: 'var(--danger-soft)',  color: 'var(--danger)',  label: t('Rejeté'),   symbol: '✗' },
  pending:  { bg: 'var(--surface-2)',    color: 'var(--fg-muted)',label: t('En attente'), symbol: '·' },
});

const getRoleLabels = (t) => ({ dds: 'DDS', medical_chief: t('Médecin Chef'), dg: 'DG' });

// ── Style constants ───────────────────────────────────────────────────────────
const selectStyle = {
  width: '100%', height: 34, padding: '0 8px',
  border: '1px solid var(--border)', borderRadius: 'var(--radius-2)',
  background: 'var(--surface)', color: 'var(--fg)', fontSize: 12, outline: 'none',
};
const labelStyle = { fontSize: 11, fontWeight: 500, color: 'var(--fg-muted)', display: 'block', marginBottom: 4 };
const btnText = (color) => ({
  display: 'inline-flex', alignItems: 'center', gap: 4,
  height: 28, padding: '0 10px', borderRadius: 'var(--radius-2)',
  border: 'none', background: 'transparent',
  color, fontSize: 12, fontWeight: 500, cursor: 'pointer',
  transition: 'background .12s',
});

export default function SchedulesList() {
  const { t } = useTranslation();
  const VALIDATION_STATUS = getValidationStatus(t);
  const ROLE_LABELS = getRoleLabels(t);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    scheduleType: '', year: new Date().getFullYear(), month: '', status: '',
  });

  const scheduleTypeLabels = scheduleService.getScheduleTypeLabels();
  const statusLabels = scheduleService.getStatusLabels();

  useEffect(() => { loadSchedules(); }, [filters]);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const data = await scheduleService.getSchedules(filters);
      setSchedules(data);
    } catch (err) {
      console.error('Erreur chargement plannings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => setFilters(prev => ({ ...prev, [field]: value }));

  const canDeleteSchedule = (schedule) => {
    if (!user) return false;
    if (['admin', 'dg'].includes(user.role)) return true;
    return schedule.createdBy === user.id && schedule.status === 'draft';
  };

  const handleDelete = async (schedule) => {
    const warn = schedule.status !== 'draft' ? `\n\n⚠️ ${t("Ce planning n'est plus en brouillon !")}` : '';
    if (!window.confirm(`${t('Supprimer "{{title}}" ?', { title: schedule.title })}${warn}\n\n${t('Cette action est irréversible.')}`)) return;
    try {
      await scheduleService.deleteSchedule(schedule.id);
      toast(t('Planning supprimé avec succès'));
      loadSchedules();
    } catch (err) {
      toast(err.response?.data?.message || t('Erreur lors de la suppression'));
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px 40px' }} className="animate-pageFade">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingTop: 4 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg)', margin: 0, letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarDays size={20} color="var(--brand)" /> {t('Plannings Hospitaliers')}
          </h1>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 3 }}>
            {t('Gestion des plannings de rotation du personnel')}
          </div>
        </div>
        <Link
          to="/schedules/create"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            height: 34, padding: '0 14px', borderRadius: 'var(--radius-2)',
            background: 'var(--brand)', color: '#fff',
            fontSize: 13, fontWeight: 500, textDecoration: 'none',
          }}
        >
          <Plus size={14} /> {t('Nouveau Planning')}
        </Link>
      </div>

      {/* Filters */}
      <div className="ged-card" style={{ padding: '12px 16px', marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <div>
            <label style={labelStyle}>{t('Type de planning')}</label>
            <select style={selectStyle} value={filters.scheduleType} onChange={e => handleFilterChange('scheduleType', e.target.value)}>
              <option value="">{t('Tous les types')}</option>
              {Object.entries(scheduleTypeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>{t('Année')}</label>
            <select style={selectStyle} value={filters.year} onChange={e => handleFilterChange('year', e.target.value)}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>{t('Mois')}</label>
            <select style={selectStyle} value={filters.month} onChange={e => handleFilterChange('month', e.target.value)}>
              <option value="">{t('Tous les mois')}</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{scheduleService.getMonthName(m)}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>{t('Statut')}</label>
            <select style={selectStyle} value={filters.status} onChange={e => handleFilterChange('status', e.target.value)}>
              <option value="">{t('Tous les statuts')}</option>
              {Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
          <Loader size={24} color="var(--fg-muted)" className="animate-spin" />
        </div>
      ) : schedules.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <CalendarDays size={40} color="var(--border-strong)" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg-muted)', marginBottom: 4 }}>{t('Aucun planning trouvé')}</div>
          <div style={{ fontSize: 12, color: 'var(--fg-subtle)', marginBottom: 14 }}>{t('Commencez par créer un nouveau planning.')}</div>
          <Link
            to="/schedules/create"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              height: 32, padding: '0 14px', borderRadius: 'var(--radius-2)',
              background: 'var(--brand)', color: '#fff',
              fontSize: 12, fontWeight: 500, textDecoration: 'none',
            }}
          >
            <Plus size={12} /> {t('Nouveau Planning')}
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {schedules.map(schedule => {
            const cfg = STATUS_CFG[schedule.status] || STATUS_CFG.draft;
            return (
              <div
                key={schedule.id}
                className="ged-card"
                style={{ padding: '14px 16px', transition: 'box-shadow .15s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-2)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow-1)'}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Title + status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>{schedule.title}</span>
                      <span className={cfg.cls}>{statusLabels[schedule.status]}</span>
                    </div>

                    {/* Meta */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 14px', fontSize: 12, color: 'var(--fg-muted)', marginBottom: 6 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Tag size={11} /> {scheduleTypeLabels[schedule.scheduleType]}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CalendarDays size={11} /> {scheduleService.getMonthName(schedule.month)} {schedule.year}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <User size={11} /> {schedule.creator?.firstName} {schedule.creator?.lastName}
                      </span>
                    </div>

                    {/* Validations chain */}
                    {schedule.validations && schedule.validations.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{t('Validations')} :</span>
                        {schedule.validations.map((v, i) => {
                          const vs = VALIDATION_STATUS[v.status] || VALIDATION_STATUS.pending;
                          return (
                            <React.Fragment key={v.id}>
                              {i > 0 && <span style={{ color: 'var(--fg-subtle)', fontSize: 11 }}>→</span>}
                              <span style={{
                                fontSize: 11, padding: '2px 7px', borderRadius: 999,
                                background: vs.bg, color: vs.color, fontWeight: 500,
                              }}>
                                {ROLE_LABELS[v.validatorRole] || v.validatorRole} {vs.symbol}
                              </span>
                            </React.Fragment>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <button
                      onClick={() => navigate(`/schedules/${schedule.id}/view`)}
                      style={btnText('var(--brand)')}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-soft)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <Eye size={13} /> {t('Voir')}
                    </button>

                    {schedule.status === 'draft' && (
                      <button
                        onClick={() => navigate(`/schedules/${schedule.id}/edit`)}
                        style={btnText('var(--fg-muted)')}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <Edit3 size={13} /> {t('Modifier')}
                      </button>
                    )}

                    {schedule.status.startsWith('pending_') && (
                      <button
                        onClick={() => navigate(`/schedules/${schedule.id}/validate`)}
                        style={btnText('var(--success)')}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--success-soft)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <CheckCircle size={13} /> {t('Valider')}
                      </button>
                    )}

                    {canDeleteSchedule(schedule) && (
                      <button
                        onClick={() => handleDelete(schedule)}
                        style={btnText('var(--danger)')}
                        title={schedule.status !== 'draft' ? t('Admin uniquement') : t('Supprimer')}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-soft)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
