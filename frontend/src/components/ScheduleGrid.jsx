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
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* Sélection du shift */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Shift sélectionné: {selectedShift ? (
              <span className="ml-2 px-3 py-1 rounded text-sm font-bold" style={{
                backgroundColor: getShiftColor(selectedShift),
                color: getShiftTextColor(selectedShift)
              }}>
                {selectedShift}
              </span>
            ) : (
              <span className="ml-2 text-gray-400 text-sm">Aucun</span>
            )}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={handleClearAll}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
            >
              Tout effacer
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                hasChanges && !saving
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>

        {/* Grille de sélection des shifts */}
        <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
          {shiftTypes.map(shift => (
            <button
              key={shift.id}
              onClick={() => setSelectedShift(shift.code)}
              className={`px-3 py-2 rounded-lg font-bold text-sm transition-all ${
                selectedShift === shift.code
                  ? 'ring-4 ring-blue-500 ring-offset-2 transform scale-105'
                  : 'hover:ring-2 ring-gray-300'
              }`}
              style={{
                backgroundColor: shift.color,
                color: getShiftTextColor(shift.code)
              }}
            >
              {shift.code} - {shift.name}
            </button>
          ))}
          <button
            onClick={() => setSelectedShift(null)}
            className={`px-3 py-2 rounded-lg font-bold text-sm transition-all border-2 ${
              selectedShift === null
                ? 'ring-4 ring-blue-500 ring-offset-2 transform scale-105 border-blue-500'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            ❌ Effacer
          </button>
        </div>

        {/* 🆕 Instructions complètes */}
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Instructions:</strong> Cliquez sur un shift pour le sélectionner. 
            Ensuite : <strong>cliquez et glissez</strong> sur les cellules du calendrier pour remplir rapidement • 
            <strong>Clic droit</strong> pour effacer une cellule • 
            <strong>Double-clic sur un nom</strong> pour remplir toute la ligne de cet employé
          </p>
        </div>
      </div>

      {/* Grille du planning */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border-2 border-gray-800">
          <thead>
            <tr className="bg-gray-100">
              <th className="border-2 border-gray-800 px-3 py-2 text-left font-bold sticky left-0 bg-gray-100 z-10">
                Employé
              </th>
              {dates.map((dateInfo, index) => (
                <th
                  key={index}
                  className={`border-2 border-gray-800 px-2 py-2 text-center text-xs ${
                    dateInfo.dayOfWeek === 0 || dateInfo.dayOfWeek === 6
                      ? 'bg-gray-200'
                      : ''
                  }`}
                >
                  <div className="font-bold">{dateInfo.day}</div>
                  <div className="text-gray-600 text-xs">{dateInfo.dayName}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map((employee, empIndex) => (
              <tr
                key={employee.id}
                className={empIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
              >
                <td 
                  className="border-2 border-gray-800 px-3 py-2 font-semibold sticky left-0 bg-inherit z-10 cursor-pointer hover:bg-blue-50 transition-colors"
                  onDoubleClick={() => handleEmployeeDoubleClick(employee.id)}
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
                      className={`border-2 border-gray-800 p-0 text-center cursor-pointer select-none ${
                        isWeekend ? 'bg-gray-100' : ''
                      } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                      onMouseDown={() => handleMouseDown(employee.id, dateInfo.date)}
                      onMouseEnter={() => handleMouseEnter(employee.id, dateInfo.date)}
                      onMouseUp={handleMouseUp}
                      onClick={() => handleCellClick(employee.id, dateInfo.date)}
                      onContextMenu={(e) => handleContextMenu(e, employee.id, dateInfo.date)}
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
                        <div className="px-2 py-3 text-gray-400 text-sm hover:bg-blue-50">
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
        <h4 className="font-bold text-sm text-gray-900 mb-3">Légende des shifts:</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {shiftTypes.map(shift => (
            <div key={shift.id} className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded flex items-center justify-center font-bold text-xs border border-gray-400"
                style={{
                  backgroundColor: shift.color,
                  color: getShiftTextColor(shift.code)
                }}
              >
                {shift.code}
              </div>
              <span className="text-sm text-gray-700">{shift.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ScheduleGrid;