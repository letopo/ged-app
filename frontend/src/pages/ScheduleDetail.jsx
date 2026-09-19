// frontend/src/pages/ScheduleDetail.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import scheduleService from '../services/scheduleService';
import toast from 'react-hot-toast';

const ScheduleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const printRef = useRef();
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shiftTypes, setShiftTypes] = useState([]);
  const [dates, setDates] = useState([]);
  const [employeeAssignments, setEmployeeAssignments] = useState([]);

  useEffect(() => {
    loadSchedule();
    loadShiftTypes();
  }, [id]);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const data = await scheduleService.getScheduleById(id);

      // ✅ CORRECTION: Garantir que assignments et validations sont des tableaux
      if (!data.assignments || !Array.isArray(data.assignments)) {
        data.assignments = [];
      }
      if (!data.validations || !Array.isArray(data.validations)) {
        data.validations = [];
      }

      setSchedule(data);

      // Générer les dates
      const monthDates = scheduleService.generateMonthDates(data.year, data.month);
      setDates(monthDates);

      // Organiser les affectations par employé
      organizeAssignments(data.assignments, monthDates);
    } catch (error) {
      console.error('Erreur chargement planning:', error);
      toast('Erreur lors du chargement du planning');
      navigate('/schedules');
    } finally {
      setLoading(false);
    }
  };

  const loadShiftTypes = async () => {
    try {
      const data = await scheduleService.getShiftTypes({ isActive: true });
      setShiftTypes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erreur chargement types de shifts:', error);
      setShiftTypes([]);
    }
  };

  const organizeAssignments = (assignments, monthDates) => {
    // ✅ Protection contre les données manquantes
    if (!assignments || !Array.isArray(assignments)) {
      setEmployeeAssignments([]);
      return;
    }

    // Grouper par employé
    const employeeMap = {};

    assignments
      .filter(assignment => assignment != null)
      .forEach(assignment => {
        const empId = assignment.employeeId || assignment.userId;
        const empName = assignment.employeeName ||
                       `${assignment.user?.firstName || ''} ${assignment.user?.lastName || ''}`;

        if (!employeeMap[empId]) {
          employeeMap[empId] = {
            id: empId,
            name: empName,
            assignments: {}
          };
        }

        employeeMap[empId].assignments[assignment.assignmentDate] = assignment.shiftCode;
      });

    // Convertir en array et trier par nom
    const employeeList = Object.values(employeeMap).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    setEmployeeAssignments(employeeList);
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: schedule?.title || 'Planning',
    pageStyle: `
      @page {
        size: A4 landscape;
        margin: 10mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .no-print {
          display: none !important;
        }
      }
    `
  });

  const getShiftColor = (code) => {
    const shift = shiftTypes.find(st => st.code === code);
    return shift?.color || '#e5e7eb';
  };

  const getShiftTextColor = (code) => {
    const color = getShiftColor(code);
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#ffffff';
  };

  if (loading || !schedule) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="animate-spin" style={{ width: 48, height: 48, borderRadius: '50%', borderBottom: '2px solid var(--brand)' }}></div>
      </div>
    );
  }

  const scheduleTypeLabels = scheduleService.getScheduleTypeLabels();
  const statusLabels = scheduleService.getStatusLabels();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-2)' }}>
      {/* Barre d'actions (non imprimée) */}
      <div className="no-print" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50, boxShadow: 'var(--shadow-1)' }}>
        <div style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => navigate('/schedules')}
            style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', fontSize: 14 }}
          >
            <svg style={{ width: 20, height: 20, marginRight: 8 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Retour
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {schedule.status === 'draft' && (
              <button
                onClick={() => navigate(`/schedules/${id}/edit`)}
                style={{ padding: '7px 16px', color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-2)', fontSize: 14, fontWeight: 500 }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-soft)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                Modifier
              </button>
            )}

            <button
              onClick={handlePrint}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 16px', background: 'var(--brand)', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-2)', fontSize: 14, fontWeight: 500 }}
            >
              <svg style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimer
            </button>
          </div>
        </div>
      </div>

      {/* Contenu imprimable */}
      <div ref={printRef} style={{ background: 'var(--surface)' }}>
        {/* En-tête du planning */}
        <div style={{ borderBottom: '2px solid var(--fg)', padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            {/* Logo et informations hôpital */}
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)', marginBottom: 4 }}>
                HOPITAL ST-JEAN DE MALTE
              </h1>
              <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: 0 }}>ORDRE DE MALTE</p>
              <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: 0 }}>BP 56 NJOMBE</p>
            </div>

            {/* Date du document */}
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: 0 }}>
                {new Date().toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>

          {/* Titre du planning */}
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)', textTransform: 'uppercase', marginBottom: 8 }}>
              {scheduleTypeLabels[schedule.scheduleType]}
            </h2>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', margin: 0 }}>
              MOIS DE {scheduleService.getMonthName(schedule.month).toUpperCase()} {schedule.year}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4 }}>
              ROT/{schedule.scheduleType.toUpperCase()}/{schedule.month}-{schedule.year.toString().slice(-2)}
            </p>
          </div>

          {/* Statut */}
          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <span style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: 9999,
              fontSize: 13,
              fontWeight: 500,
              background: schedule.status === 'published' ? 'var(--success-soft)' : schedule.status === 'rejected' ? 'var(--danger-soft)' : schedule.status === 'pending_validation' ? 'var(--warning-soft)' : 'var(--surface-3)',
              color: schedule.status === 'published' ? 'var(--success)' : schedule.status === 'rejected' ? 'var(--danger)' : schedule.status === 'pending_validation' ? 'var(--warning)' : 'var(--fg-muted)',
            }}>
              {statusLabels[schedule.status]}
            </span>
          </div>
        </div>

        {/* Tableau du planning */}
        <div style={{ padding: 24 }}>
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid var(--fg)' }}>
              {/* En-tête avec les jours */}
              <thead>
                <tr style={{ background: 'var(--surface-2)' }}>
                  <th style={{ border: '2px solid var(--fg)', padding: '8px 12px', textAlign: 'left', fontWeight: 700, fontSize: 13 }}>
                    Noms
                  </th>
                  {dates.map((dateInfo, index) => (
                    <th
                      key={index}
                      style={{ border: '2px solid var(--fg)', padding: '6px 4px', textAlign: 'center', fontSize: 11, fontWeight: 700, background: (dateInfo.dayOfWeek === 0 || dateInfo.dayOfWeek === 6) ? 'var(--surface-3)' : undefined }}
                    >
                      <div style={{ fontWeight: 700, color: 'var(--fg)' }}>{dateInfo.day}</div>
                      <div style={{ color: 'var(--fg-muted)', fontSize: 10 }}>{dateInfo.dayName}</div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Corps du tableau avec les affectations */}
              <tbody>
                {employeeAssignments.map((employee, empIndex) => (
                  <tr
                    key={employee.id}
                    style={{ background: empIndex % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)' }}
                  >
                    {/* Nom de l'employé */}
                    <td style={{ border: '2px solid var(--fg)', padding: '8px 12px', fontWeight: 600, fontSize: 13, color: 'var(--fg)' }}>
                      {employee.name}
                    </td>

                    {/* Cellules d'affectation */}
                    {dates.map((dateInfo, dateIndex) => {
                      const shiftCode = employee.assignments[dateInfo.date];
                      const isWeekend = dateInfo.dayOfWeek === 0 || dateInfo.dayOfWeek === 6;

                      return (
                        <td
                          key={dateIndex}
                          style={{ border: '2px solid var(--fg)', padding: 0, textAlign: 'center', background: isWeekend ? 'var(--surface-3)' : undefined }}
                        >
                          {shiftCode ? (
                            <div
                              style={{
                                width: '100%',
                                height: '100%',
                                padding: '10px 6px',
                                fontWeight: 700,
                                fontSize: 13,
                                backgroundColor: getShiftColor(shiftCode),
                                color: getShiftTextColor(shiftCode)
                              }}
                            >
                              {shiftCode}
                            </div>
                          ) : (
                            <div style={{ padding: '10px 6px', color: 'var(--fg-subtle)', fontSize: 13 }}>
                              -
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Légende */}
          <div style={{ marginTop: 24, padding: 16, border: '2px solid var(--border)', borderRadius: 'var(--radius-2)' }}>
            <h4 style={{ fontWeight: 700, fontSize: 13, color: 'var(--fg)', marginBottom: 10 }}>Légende:</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
              {shiftTypes.map(shift => (
                <div key={shift.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 'var(--radius-2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      border: '1px solid var(--border)',
                      backgroundColor: shift.color,
                      color: getShiftTextColor(shift.code),
                      flexShrink: 0
                    }}
                  >
                    {shift.code}
                  </div>
                  <span style={{ color: 'var(--fg-muted)' }}>{shift.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {schedule.notes && (
            <div style={{ marginTop: 16, padding: 12, background: 'var(--warning-soft)', border: '1px solid var(--warning)', borderRadius: 'var(--radius-2)' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>Notes:</p>
              <p style={{ fontSize: 11, color: 'var(--fg-muted)', whiteSpace: 'pre-wrap', margin: 0 }}>{schedule.notes}</p>
            </div>
          )}

          {/* Workflow de validation */}
          {schedule.validations && Array.isArray(schedule.validations) && schedule.validations.length > 0 && (
            <div style={{ marginTop: 24, borderTop: '2px solid var(--border)', paddingTop: 16 }}>
              <h4 style={{ fontWeight: 700, fontSize: 13, color: 'var(--fg)', marginBottom: 10 }}>Validations:</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                {schedule.validations
                  .filter(validation => validation != null)
                  .map((validation, index) => (
                    <div key={validation.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', padding: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg)' }}>
                          {validation.validatorRole === 'dds' && 'Directrice des Soins'}
                          {validation.validatorRole === 'medical_chief' && 'Médecin Chef'}
                          {validation.validatorRole === 'dg' && 'Directeur Général'}
                        </span>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-2)',
                          fontSize: 11,
                          fontWeight: 500,
                          background: validation.status === 'approved' ? 'var(--success-soft)' : validation.status === 'rejected' ? 'var(--danger-soft)' : 'var(--surface-3)',
                          color: validation.status === 'approved' ? 'var(--success)' : validation.status === 'rejected' ? 'var(--danger)' : 'var(--fg-muted)'
                        }}>
                          {validation.status === 'approved' && '✓ Approuvé'}
                          {validation.status === 'rejected' && '✗ Rejeté'}
                          {validation.status === 'pending' && 'En attente'}
                        </span>
                      </div>

                      {validation.validator && (
                        <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: 0 }}>
                          {validation.validator.firstName} {validation.validator.lastName}
                        </p>
                      )}

                      {validation.validatedAt && (
                        <p style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 4 }}>
                          Le {new Date(validation.validatedAt).toLocaleDateString('fr-FR')}
                        </p>
                      )}

                      {validation.comments && (
                        <p style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 8, fontStyle: 'italic' }}>
                          "{validation.comments}"
                        </p>
                      )}

                      {/* Signature et cachet */}
                      {validation.status === 'approved' && validation.validator && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                          <p style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 8 }}>Signature:</p>

                          {validation.validator.signaturePath ? (
                            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
                              <img
                                src={`/api/${validation.validator.signaturePath}`}
                                alt="Signature"
                                style={{ height: 64, objectFit: 'contain' }}
                                onError={(e) => {
                                  console.warn('Erreur chargement signature:', validation.validator.signaturePath);
                                  e.target.style.display = 'none';
                                }}
                              />

                              {validation.validator.stampPath && (
                                <img
                                  src={`/api/${validation.validator.stampPath}`}
                                  style={{ height: 64, objectFit: 'contain' }}
                                  onError={(e) => {
                                    console.warn('Erreur chargement cachet:', validation.validator.stampPath);
                                    e.target.style.display = 'none';
                                  }}
                                />
                              )}
                            </div>
                          ) : (
                            <div style={{ height: 48, borderBottom: '1px solid var(--border)' }}></div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Pied de page avec signatures */}
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: '2px solid var(--fg)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
              {/* Directrice des Soins */}
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>
                  La Directrice des Soins
                </p>
                {(() => {
                  const ddsValidation = schedule.validations?.find(v =>
                    v.validatorRole === 'dds' && v.status === 'approved' && v.validator
                  );

                  return ddsValidation?.validator ? (
                    <div style={{ marginTop: 16 }}>
                      <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
                        {ddsValidation.validator.firstName} {ddsValidation.validator.lastName}
                      </p>
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 16 }}>
                        {ddsValidation.validator.signaturePath && (
                          <img
                            src={`/api/${ddsValidation.validator.signaturePath}`}
                            alt="Signature DDS"
                            style={{ height: 64, objectFit: 'contain' }}
                            onError={(e) => e.target.style.display = 'none'}
                          />
                        )}
                        {ddsValidation.validator.stampPath && (
                          <img
                            src={`/api/${ddsValidation.validator.stampPath}`}
                            alt="Cachet DDS"
                            style={{ height: 64, objectFit: 'contain' }}
                            onError={(e) => e.target.style.display = 'none'}
                          />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginTop: 32, paddingTop: 48, borderTop: '1px solid var(--border)' }}></div>
                  );
                })()}
              </div>

              {/* Directeur Général */}
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>
                  Le Directeur Général
                </p>
                {(() => {
                  const dgValidation = schedule.validations?.find(v =>
                    v.validatorRole === 'dg' && v.status === 'approved' && v.validator
                  );

                  return dgValidation?.validator ? (
                    <div style={{ marginTop: 8 }}>
                      <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
                        {dgValidation.validator.firstName} {dgValidation.validator.lastName}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--fg-muted)' }}>BP 56 NJOMBE - C.MEROUN Tél: (237)657.593.103</p>
                      <p style={{ fontSize: 11, color: 'var(--fg-muted)' }}>Directeur Général HSJM</p>
                      <p style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{dgValidation.validator.email}</p>
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 16 }}>
                        {dgValidation.validator.signaturePath && (
                          <img
                            src={`/api/${dgValidation.validator.signaturePath}`}
                            style={{ height: 80, objectFit: 'contain' }}
                            onError={(e) => e.target.style.display = 'none'}
                          />
                        )}
                        {dgValidation.validator.stampPath && (
                          <img
                            src={`/api/${dgValidation.validator.stampPath}`}
                            alt="Cachet DG"
                            style={{ height: 80, objectFit: 'contain' }}
                            onError={(e) => e.target.style.display = 'none'}
                          />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginTop: 32 }}>
                      <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Michel VAUTROT</p>
                      <p style={{ fontSize: 11, color: 'var(--fg-muted)' }}>BP 56 NJOMBE - C.MEROUN Tél: (237)657.593.103</p>
                      <p style={{ fontSize: 11, color: 'var(--fg-muted)' }}>Directeur Général HSJM</p>
                      <p style={{ fontSize: 11, color: 'var(--fg-muted)' }}>hopitalcameroun@ordredemaltefrance.org</p>
                      <div style={{ marginTop: 16, borderTop: '1px solid var(--border)' }}></div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Note de bas de page */}
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: 'var(--fg-subtle)', margin: 0 }}>
              (1 heure de pause par jour)
            </p>
            {schedule.publishedAt && (
              <p style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 8 }}>
                Document publié le {new Date(schedule.publishedAt).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Statistiques (non imprimées) */}
      <div className="no-print" style={{ width: '100%', padding: '24px 16px' }}>
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-3)', boxShadow: 'var(--shadow-1)', padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg)', marginBottom: 16 }}>Statistiques du planning</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <div style={{ textAlign: 'center', padding: 16, background: 'var(--brand-soft)', borderRadius: 'var(--radius-2)' }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--brand)' }}>
                {employeeAssignments.length}
              </div>
              <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4 }}>Employés</div>
            </div>
            <div style={{ textAlign: 'center', padding: 16, background: 'var(--success-soft)', borderRadius: 'var(--radius-2)' }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--success)' }}>
                {schedule.assignments?.length || 0}
              </div>
              <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4 }}>Affectations</div>
            </div>
            <div style={{ textAlign: 'center', padding: 16, background: 'var(--surface-3)', borderRadius: 'var(--radius-2)' }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--fg)' }}>
                {dates.length}
              </div>
              <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4 }}>Jours</div>
            </div>
            <div style={{ textAlign: 'center', padding: 16, background: 'var(--warning-soft)', borderRadius: 'var(--radius-2)' }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--warning)' }}>
                {employeeAssignments.length > 0
                  ? Math.round((schedule.assignments?.length || 0) / (employeeAssignments.length * dates.length) * 100)
                  : 0}%
              </div>
              <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4 }}>Complété</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleDetail;
