// frontend/src/pages/ScheduleDetail.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import scheduleService from '../services/scheduleService';

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
      alert('Erreur lors du chargement du planning');
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
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const scheduleTypeLabels = scheduleService.getScheduleTypeLabels();
  const statusLabels = scheduleService.getStatusLabels();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Barre d'actions (non imprimée) */}
      <div className="no-print bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate('/schedules')}
            className="flex items-center text-gray-600 hover:text-gray-800"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Retour
          </button>

          <div className="flex items-center gap-3">
            {schedule.status === 'draft' && (
              <button
                onClick={() => navigate(`/schedules/${id}/edit`)}
                className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors"
              >
                Modifier
              </button>
            )}
            
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimer
            </button>
          </div>
        </div>
      </div>

      {/* Contenu imprimable */}
      <div ref={printRef} className="bg-white">
        {/* En-tête du planning */}
        <div className="border-b-2 border-gray-800 p-6">
          <div className="flex items-start justify-between mb-4">
            {/* Logo et informations hôpital */}
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">
                HOPITAL ST-JEAN DE MALTE
              </h1>
              <p className="text-sm text-gray-600">ORDRE DE MALTE</p>
              <p className="text-sm text-gray-600">BP 56 NJOMBE</p>
            </div>

            {/* Date du document */}
            <div className="text-right">
              <p className="text-sm text-gray-600">
                {new Date().toLocaleDateString('fr-FR', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  year: 'numeric' 
                })}
              </p>
            </div>
          </div>

          {/* Titre du planning */}
          <div className="text-center mt-4">
            <h2 className="text-lg font-bold text-gray-900 uppercase mb-2">
              {scheduleTypeLabels[schedule.scheduleType]}
            </h2>
            <h3 className="text-base font-semibold text-gray-800">
              MOIS DE {scheduleService.getMonthName(schedule.month).toUpperCase()} {schedule.year}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              ROT/{schedule.scheduleType.toUpperCase()}/{schedule.month}-{schedule.year.toString().slice(-2)}
            </p>
          </div>

          {/* Statut */}
          <div className="text-center mt-3">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${scheduleService.getStatusColor(schedule.status)}`}>
              {statusLabels[schedule.status]}
            </span>
          </div>
        </div>

        {/* Tableau du planning */}
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border-2 border-gray-800">
              {/* En-tête avec les jours */}
              <thead>
                <tr className="bg-gray-100">
                  <th className="border-2 border-gray-800 px-3 py-2 text-left font-bold text-sm">
                    Noms
                  </th>
                  {dates.map((dateInfo, index) => (
                    <th
                      key={index}
                      className={`border-2 border-gray-800 px-1 py-2 text-center text-xs font-bold ${
                        dateInfo.dayOfWeek === 0 || dateInfo.dayOfWeek === 6
                          ? 'bg-gray-200'
                          : ''
                      }`}
                    >
                      <div className="font-bold text-gray-900">{dateInfo.day}</div>
                      <div className="text-gray-600 text-xs">{dateInfo.dayName}</div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Corps du tableau avec les affectations */}
              <tbody>
                {employeeAssignments.map((employee, empIndex) => (
                  <tr
                    key={employee.id}
                    className={empIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  >
                    {/* Nom de l'employé */}
                    <td className="border-2 border-gray-800 px-3 py-2 font-semibold text-sm text-gray-900">
                      {employee.name}
                    </td>

                    {/* Cellules d'affectation */}
                    {dates.map((dateInfo, dateIndex) => {
                      const shiftCode = employee.assignments[dateInfo.date];
                      const isWeekend = dateInfo.dayOfWeek === 0 || dateInfo.dayOfWeek === 6;

                      return (
                        <td
                          key={dateIndex}
                          className={`border-2 border-gray-800 p-0 text-center ${
                            isWeekend ? 'bg-gray-100' : ''
                          }`}
                        >
                          {shiftCode ? (
                            <div
                              className="w-full h-full px-2 py-3 font-bold text-sm"
                              style={{
                                backgroundColor: getShiftColor(shiftCode),
                                color: getShiftTextColor(shiftCode)
                              }}
                            >
                              {shiftCode}
                            </div>
                          ) : (
                            <div className="px-2 py-3 text-gray-400 text-sm">
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
          <div className="mt-6 p-4 border-2 border-gray-300 rounded">
            <h4 className="font-bold text-sm text-gray-900 mb-3">Légende:</h4>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {shiftTypes.map(shift => (
                <div key={shift.id} className="flex items-center gap-2 text-xs">
                  <div
                    className="w-8 h-8 rounded flex items-center justify-center font-bold border border-gray-400"
                    style={{
                      backgroundColor: shift.color,
                      color: getShiftTextColor(shift.code)
                    }}
                  >
                    {shift.code}
                  </div>
                  <span className="text-gray-700">{shift.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {schedule.notes && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-xs font-semibold text-gray-700 mb-1">Notes:</p>
              <p className="text-xs text-gray-600 whitespace-pre-wrap">{schedule.notes}</p>
            </div>
          )}

          {/* Workflow de validation */}
          {schedule.validations && Array.isArray(schedule.validations) && schedule.validations.length > 0 && (
            <div className="mt-6 border-t-2 border-gray-300 pt-4">
              <h4 className="font-bold text-sm text-gray-900 mb-3">Validations:</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {schedule.validations
                  .filter(validation => validation != null)
                  .map((validation, index) => (
                    <div key={validation.id} className="border border-gray-300 rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-700">
                          {validation.validatorRole === 'dds' && 'Directrice des Soins'}
                          {validation.validatorRole === 'medical_chief' && 'Médecin Chef'}
                          {validation.validatorRole === 'dg' && 'Directeur Général'}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          validation.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : validation.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {validation.status === 'approved' && '✓ Approuvé'}
                          {validation.status === 'rejected' && '✗ Rejeté'}
                          {validation.status === 'pending' && 'En attente'}
                        </span>
                      </div>
                      
                      {validation.validator && (
                        <p className="text-xs text-gray-600">
                          {validation.validator.firstName} {validation.validator.lastName}
                        </p>
                      )}
                      
                      {validation.validatedAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Le {new Date(validation.validatedAt).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                      
                      {validation.comments && (
                        <p className="text-xs text-gray-600 mt-2 italic">
                          "{validation.comments}"
                        </p>
                      )}

                      {/* Signature et cachet */}
                      {validation.status === 'approved' && validation.validator && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-500 mb-2">Signature:</p>
                          
                          {/* ✅ Afficher la signature si elle existe */}
                          {validation.validator.signaturePath ? (
                            <div className="flex items-end justify-between gap-2">
                              <img
                                src={`/api/${validation.validator.signaturePath}`}
                                alt="Signature"
                                className="h-16 object-contain"
                                onError={(e) => {
                                  console.warn('Erreur chargement signature:', validation.validator.signaturePath);
                                  e.target.style.display = 'none';
                                }}
                              />
                              
                              {/* ✅ Afficher le cachet si il existe */}
                              {validation.validator.stampPath && (
                                <img
                                  src={`/api/${validation.validator.stampPath}`}
                                  className="h-16 object-contain"
                                  onError={(e) => {
                                    console.warn('Erreur chargement cachet:', validation.validator.stampPath);
                                    e.target.style.display = 'none';
                                  }}
                                />
                              )}
                            </div>
                          ) : (
                            <div className="h-12 border-b border-gray-400"></div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Pied de page avec signatures */}
          <div className="mt-8 pt-6 border-t-2 border-gray-800">
            <div className="grid grid-cols-2 gap-8">
              {/* Directrice des Soins */}
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  La Directrice des Soins
                </p>
                {(() => {
                  const ddsValidation = schedule.validations?.find(v => 
                    v.validatorRole === 'dds' && v.status === 'approved' && v.validator
                  );
                  
                  return ddsValidation?.validator ? (
                    <div className="mt-4">
                      <p className="text-sm text-gray-700">
                        {ddsValidation.validator.firstName} {ddsValidation.validator.lastName}
                      </p>
                      <div className="mt-2 flex items-center gap-4">
                        {ddsValidation.validator.signaturePath && (
                          <img
                            src={`/api/${ddsValidation.validator.signaturePath}`}
                            alt="Signature DDS"
                            className="h-16 object-contain"
                            onError={(e) => e.target.style.display = 'none'}
                          />
                        )}
                        {ddsValidation.validator.stampPath && (
                          <img
                            src={`/api/${ddsValidation.validator.stampPath}`}
                            alt="Cachet DDS"
                            className="h-16 object-contain"
                            onError={(e) => e.target.style.display = 'none'}
                          />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-8 pt-12 border-t border-gray-400"></div>
                  );
                })()}
              </div>

              {/* Directeur Général */}
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  Le Directeur Général
                </p>
                {(() => {
                  const dgValidation = schedule.validations?.find(v => 
                    v.validatorRole === 'dg' && v.status === 'approved' && v.validator
                  );
                  
                  return dgValidation?.validator ? (
                    <div className="mt-2">
                      <p className="text-sm text-gray-700">
                        {dgValidation.validator.firstName} {dgValidation.validator.lastName}
                      </p>
                      <p className="text-xs text-gray-600">BP 56 NJOMBE - C.MEROUN Tél: (237)657.593.103</p>
                      <p className="text-xs text-gray-600">Directeur Général HSJM</p>
                      <p className="text-xs text-gray-600">{dgValidation.validator.email}</p>
                      <div className="mt-2 flex items-center gap-4">
                        {dgValidation.validator.signaturePath && (
                          <img
                            src={`/api/${dgValidation.validator.signaturePath}`}
                            className="h-20 object-contain"
                            onError={(e) => e.target.style.display = 'none'}
                          />
                        )}
                        {dgValidation.validator.stampPath && (
                          <img
                            src={`/api/${dgValidation.validator.stampPath}`}
                            alt="Cachet DG"
                            className="h-20 object-contain"
                            onError={(e) => e.target.style.display = 'none'}
                          />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-8">
                      <p className="text-sm text-gray-700">Michel VAUTROT</p>
                      <p className="text-xs text-gray-600">BP 56 NJOMBE - C.MEROUN Tél: (237)657.593.103</p>
                      <p className="text-xs text-gray-600">Directeur Général HSJM</p>
                      <p className="text-xs text-gray-600">hopitalcameroun@ordredemaltefrance.org</p>
                      <div className="mt-4 border-t border-gray-400"></div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Note de bas de page */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              (1 heure de pause par jour)
            </p>
            {schedule.publishedAt && (
              <p className="text-xs text-gray-500 mt-2">
                Document publié le {new Date(schedule.publishedAt).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Statistiques (non imprimées) */}
      <div className="no-print max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistiques du planning</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">
                {employeeAssignments.length}
              </div>
              <div className="text-sm text-gray-600 mt-1">Employés</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">
                {schedule.assignments?.length || 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">Affectations</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-3xl font-bold text-purple-600">
                {dates.length}
              </div>
              <div className="text-sm text-gray-600 mt-1">Jours</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-3xl font-bold text-orange-600">
                {employeeAssignments.length > 0 
                  ? Math.round((schedule.assignments?.length || 0) / (employeeAssignments.length * dates.length) * 100)
                  : 0}%
              </div>
              <div className="text-sm text-gray-600 mt-1">Complété</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleDetail;