// frontend/src/components/ScheduleGrid.jsx

import React, { useState, useEffect } from 'react';
import scheduleService from '../services/scheduleService';
import toast from 'react-hot-toast';

const ScheduleGrid = ({ schedule, employees, onSave }) => {
  const [assignments, setAssignments] = useState({});
  const [shiftTypes, setShiftTypes] = useState([]);
  const [selectedShift, setSelectedShift] = useState(null);
  const [dates, setDates] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // 🆕 États pour le drag-to-fill
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartCell, setDragStartCell] = useState(null);

  useEffect(() => {
    loadShiftTypes();
    loadAssignments();
    generateDates();
  }, [schedule.id]);

  const loadShiftTypes = async () => {
    try {
      const data = await scheduleService.getShiftTypes({ isActive: true });
      setShiftTypes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erreur chargement shift types:', error);
      setShiftTypes([]);
    }
  };

  const loadAssignments = async () => {
    try {
      const data = await scheduleService.getScheduleById(schedule.id);
      const assignmentMap = {};
      
      if (data.assignments && Array.isArray(data.assignments)) {
        data.assignments.forEach(assignment => {
          const key = `${assignment.employeeId}-${assignment.assignmentDate}`;
          assignmentMap[key] = assignment.shiftCode;
        });
      }
      
      setAssignments(assignmentMap);
    } catch (error) {
      console.error('Erreur chargement affectations:', error);
    }
  };

  const generateDates = () => {
    const monthDates = scheduleService.generateMonthDates(schedule.year, schedule.month);
    setDates(monthDates);
  };

  // 🆕 Gestion du début du drag
  const handleMouseDown = (employeeId, date) => {
    if (!selectedShift) {
      toast('Veuillez d\'abord sélectionner un shift');
      return;
    }
    
    setIsDragging(true);
    setDragStartCell({ employeeId, date });
    
    // Appliquer le shift immédiatement sur la cellule de départ
    const key = `${employeeId}-${date}`;
    setAssignments(prev => ({
      ...prev,
      [key]: selectedShift
    }));
    setHasChanges(true);
  };

  // 🆕 Gestion du survol pendant le drag
  const handleMouseEnter = (employeeId, date) => {
    if (!isDragging || !selectedShift) return;
    
    const key = `${employeeId}-${date}`;
    setAssignments(prev => ({
      ...prev,
      [key]: selectedShift
    }));
  };

  // 🆕 Gestion de la fin du drag
  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragStartCell(null);
    }
  };

  // 🆕 Écouter le mouseup global
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        setDragStartCell(null);
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging]);

  // Gestion du clic simple (pour effacer ou changer)
  const handleCellClick = (employeeId, date) => {
    if (isDragging) return; // Ignorer les clics pendant le drag

    const key = `${employeeId}-${date}`;
    
    if (selectedShift) {
      // Appliquer le shift sélectionné
      setAssignments(prev => ({
        ...prev,
        [key]: selectedShift
      }));
    } else {
      // Si aucun shift sélectionné, effacer la cellule
      setAssignments(prev => {
        const newAssignments = { ...prev };
        delete newAssignments[key];
        return newAssignments;
      });
    }
    
    setHasChanges(true);
  };

  // Clic droit pour effacer
  const handleContextMenu = (e, employeeId, date) => {
    e.preventDefault();
    const key = `${employeeId}-${date}`;
    setAssignments(prev => {
      const newAssignments = { ...prev };
      delete newAssignments[key];
      return newAssignments;
    });
    setHasChanges(true);
  };

  // 🆕 Double-clic sur le nom pour remplir toute la ligne
  const handleEmployeeDoubleClick = (employeeId) => {
    if (!selectedShift) {
      toast('Veuillez d\'abord sélectionner un shift');
      return;
    }

    if (!window.confirm('Voulez-vous appliquer ce shift à tous les jours de cet employé ?')) {
      return;
    }

    const newAssignments = { ...assignments };
    
    dates.forEach(dateInfo => {
      const key = `${employeeId}-${dateInfo.date}`;
      newAssignments[key] = selectedShift;
    });

    setAssignments(newAssignments);
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const assignmentsArray = Object.entries(assignments).map(([key, shiftCode]) => {
        // Extraction Date et ID (déjà corrigé)
        const dateLength = 10;
        const assignmentDate = key.slice(-dateLength);
        const employeeId = key.slice(0, -(dateLength + 1));

        const employee = employees.find(e => e.id === employeeId);
        
        // ✅ CORRECTION ICI : Trouver le shiftTypeId à partir du shiftCode
        const shiftType = shiftTypes.find(st => st.code === shiftCode);
        const shiftTypeId = shiftType ? shiftType.id : null;

        return {
          employeeId,
          employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Inconnu',
          assignmentDate,
          shiftCode,
          shiftTypeId // ✅ On ajoute l'ID obligatoire ici
        };
      }).filter(item => item.assignmentDate && item.employeeId);

      console.log('📤 Envoi des affectations:', assignmentsArray);

      await scheduleService.updateScheduleAssignments(schedule.id, assignmentsArray);
      
      setHasChanges(false);
      toast('Affectations enregistrées avec succès !');
      
      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      toast('Erreur lors de la sauvegarde des affectations');
    } finally {
      setSaving(false);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Êtes-vous sûr de vouloir effacer toutes les affectations ?')) {
      setAssignments({});
      setHasChanges(true);
    }
  };

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

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-3)', boxShadow: 'var(--shadow-1)', padding: 24 }}>
      {/* Sélection du shift */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg)', margin: 0 }}>
            Shift sélectionné:{' '}
            {selectedShift ? (
              <span style={{ marginLeft: 8, padding: '2px 12px', borderRadius: 'var(--radius-2)', fontSize: 13, fontWeight: 700, backgroundColor: getShiftColor(selectedShift), color: getShiftTextColor(selectedShift) }}>
                {selectedShift}
              </span>
            ) : (
              <span style={{ marginLeft: 8, color: 'var(--fg-muted)', fontSize: 13 }}>Aucun</span>
            )}
          </h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleClearAll}
              style={{ padding: '8px 16px', color: 'var(--danger)', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', fontWeight: 500, cursor: 'pointer', fontSize: 13 }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-soft)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              Tout effacer
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              style={{ padding: '8px 24px', background: hasChanges && !saving ? 'var(--brand)' : 'var(--surface-3)', color: hasChanges && !saving ? '#fff' : 'var(--fg-muted)', border: 'none', borderRadius: 'var(--radius-2)', fontWeight: 500, cursor: hasChanges && !saving ? 'pointer' : 'not-allowed', fontSize: 13 }}
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>

        {/* Grille de sélection des shifts */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {shiftTypes.map(shift => (
            <button
              key={shift.id}
              onClick={() => setSelectedShift(shift.code)}
              style={{
                padding: '8px 12px', borderRadius: 'var(--radius-2)', fontWeight: 700, fontSize: 13,
                backgroundColor: shift.color, color: getShiftTextColor(shift.code),
                border: selectedShift === shift.code ? '3px solid var(--brand)' : '2px solid transparent',
                cursor: 'pointer', outline: 'none', transform: selectedShift === shift.code ? 'scale(1.05)' : 'scale(1)',
                transition: 'transform .1s',
              }}
            >
              {shift.code} - {shift.name}
            </button>
          ))}
          <button
            onClick={() => setSelectedShift(null)}
            style={{
              padding: '8px 12px', borderRadius: 'var(--radius-2)', fontWeight: 700, fontSize: 13,
              background: 'var(--surface)', color: 'var(--fg)',
              border: selectedShift === null ? '3px solid var(--brand)' : '2px solid var(--border)',
              cursor: 'pointer',
            }}
          >
            ❌ Effacer
          </button>
        </div>

        <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--brand-soft)', border: '1px solid var(--brand)', borderRadius: 'var(--radius-2)' }}>
          <p style={{ fontSize: 13, color: 'var(--fg)', margin: 0 }}>
            <strong>Instructions:</strong> Cliquez sur un shift pour le sélectionner.
            Ensuite : <strong>cliquez et glissez</strong> sur les cellules du calendrier pour remplir rapidement •
            <strong>Clic droit</strong> pour effacer une cellule •
            <strong>Double-clic sur un nom</strong> pour remplir toute la ligne de cet employé
          </p>
        </div>
      </div>

      {/* Grille du planning */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #374151' }}>
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              <th style={{ border: '2px solid #374151', padding: '8px 12px', textAlign: 'left', fontWeight: 700, position: 'sticky', left: 0, background: '#f3f4f6', zIndex: 10, fontSize: 13 }}>
                Employé
              </th>
              {dates.map((dateInfo, index) => (
                <th
                  key={index}
                  style={{ border: '2px solid #374151', padding: '8px', textAlign: 'center', fontSize: 11, background: (dateInfo.dayOfWeek === 0 || dateInfo.dayOfWeek === 6) ? '#e5e7eb' : '#f3f4f6' }}
                >
                  <div style={{ fontWeight: 700 }}>{dateInfo.day}</div>
                  <div style={{ color: '#6b7280', fontSize: 10 }}>{dateInfo.dayName}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map((employee, empIndex) => (
              <tr key={employee.id} style={{ background: empIndex % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                <td
                  style={{ border: '2px solid #374151', padding: '8px 12px', fontWeight: 600, position: 'sticky', left: 0, background: 'inherit', zIndex: 10, cursor: 'pointer', fontSize: 13 }}
                  onDoubleClick={() => handleEmployeeDoubleClick(employee.id)}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-soft)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'inherit'}
                  title="Double-cliquer pour remplir toute la ligne"
                >
                  {employee.firstName} {employee.lastName}
                </td>
                {dates.map((dateInfo, dateIndex) => {
                  const key = `${employee.id}-${dateInfo.date}`;
                  const shiftCode = assignments[key];
                  const isWeekend = dateInfo.dayOfWeek === 0 || dateInfo.dayOfWeek === 6;
                  return (
                    <td
                      key={dateIndex}
                      style={{ border: '2px solid #374151', padding: 0, textAlign: 'center', cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none', background: isWeekend ? '#f3f4f6' : 'inherit' }}
                      onMouseDown={() => handleMouseDown(employee.id, dateInfo.date)}
                      onMouseEnter={() => handleMouseEnter(employee.id, dateInfo.date)}
                      onMouseUp={handleMouseUp}
                      onClick={() => handleCellClick(employee.id, dateInfo.date)}
                      onContextMenu={(e) => handleContextMenu(e, employee.id, dateInfo.date)}
                    >
                      {shiftCode ? (
                        <div
                          style={{ width: '100%', height: '100%', padding: '10px 8px', fontWeight: 700, fontSize: 13, backgroundColor: getShiftColor(shiftCode), color: getShiftTextColor(shiftCode) }}
                        >
                          {shiftCode}
                        </div>
                      ) : (
                        <div
                          style={{ padding: '10px 8px', color: 'var(--fg-subtle)', fontSize: 13 }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-soft)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
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
        <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--fg)', marginBottom: 12 }}>Légende des shifts :</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {shiftTypes.map(shift => (
            <div key={shift.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{ width: 32, height: 32, borderRadius: 'var(--radius-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, border: '1px solid #9ca3af', backgroundColor: shift.color, color: getShiftTextColor(shift.code) }}
              >
                {shift.code}
              </div>
              <span style={{ fontSize: 13, color: 'var(--fg)' }}>{shift.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ScheduleGrid;