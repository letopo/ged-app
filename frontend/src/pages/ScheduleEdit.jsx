// frontend/src/pages/ScheduleEdit.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import scheduleService from '../services/scheduleService';
import ScheduleGrid from '../components/ScheduleGrid';
import api from '../services/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ScheduleEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEmployeeSelector, setShowEmployeeSelector] = useState(true);

  // ✅ Charger le planning d'abord
  useEffect(() => {
    loadSchedule();
  }, [id]);

  // ✅ Charger les employés une fois que le planning est chargé
  useEffect(() => {
    if (schedule) {
      loadEmployees();
    }
  }, [schedule?.id]);

  const loadSchedule = async () => {
    try {
      const data = await scheduleService.getScheduleById(id);
      
      // ✅ CORRECTION CRITIQUE: S'assurer que assignments et validations sont toujours des tableaux
      if (!data.assignments || !Array.isArray(data.assignments)) {
        data.assignments = [];
      }
      if (!data.validations || !Array.isArray(data.validations)) {
        data.validations = [];
      }
      
      setSchedule(data);
      
      // Si des affectations existent, extraire les employés uniques
      if (data.assignments.length > 0) {
        const uniqueEmployeeIds = [...new Set(
          data.assignments
            .filter(a => a && a.employeeId)
            .map(a => a.employeeId)
        )];
        setSelectedEmployees(uniqueEmployeeIds);
        setShowEmployeeSelector(false);
      }
    } catch (error) {
      console.error('Erreur chargement planning:', error);
      alert('Erreur lors du chargement du planning');
      navigate('/schedules');
    }
  };

  const loadEmployees = async () => {
    try {
      setLoading(true);
      // ✅ Utiliser la nouvelle route /all au lieu de /employees
      const response = await api.get('/employees/all');
      
      const employeesData = Array.isArray(response.data) ? response.data : [];
      
      console.log(`👥 Total employés chargés: ${employeesData.length}`);
      if (employeesData.length > 0) {
        console.log('📋 Exemple d\'employé:', employeesData[0]);
      }
      
      // ✅ FILTRER selon le service et le type de planning
      let filteredByScheduleType = employeesData;
      
      if (schedule) {
        console.log(`📊 Planning type: ${schedule.scheduleType}`);
        
        // Récupérer tous les noms de services uniques pour debug
        const allServices = [...new Set(employeesData.map(e => e.service?.name).filter(Boolean))];
        console.log(`📋 Services disponibles:`, allServices);
        
        switch (schedule.scheduleType) {
          case 'administrative':
            // Personnel Administratif = service "Direction" ou contenant "Admin"
            filteredByScheduleType = employeesData.filter(emp => 
              emp.service && (
                emp.service.name.toLowerCase().includes('direction') ||
                emp.service.name.toLowerCase().includes('administration') ||
                emp.service.name.toLowerCase().includes('admin')
              )
            );
            console.log(`✅ Employés administratifs: ${filteredByScheduleType.length}`);
            break;
            
          case 'paramedical_services':
            // Paramédical - Services Hospitaliers
            // Exclure Direction et Administration
            filteredByScheduleType = employeesData.filter(emp => 
              emp.service && 
              !emp.service.name.toLowerCase().includes('direction') &&
              !emp.service.name.toLowerCase().includes('administration')
            );
            console.log(`✅ Employés paramédicaux: ${filteredByScheduleType.length}`);
            break;
            
          case 'medical':
            // Médical = services médicaux
            filteredByScheduleType = employeesData.filter(emp => 
              emp.service && (
                emp.service.name.toLowerCase().includes('médical') ||
                emp.service.name.toLowerCase().includes('medical') ||
                emp.service.name.toLowerCase().includes('médecin') ||
                emp.service.name.toLowerCase().includes('chirurgie') ||
                emp.service.name.toLowerCase().includes('urgence')
              )
            );
            console.log(`✅ Employés médicaux: ${filteredByScheduleType.length}`);
            break;
            
          default:
            // Par défaut, tous les employés
            filteredByScheduleType = employeesData;
            console.log(`✅ Tous les employés: ${filteredByScheduleType.length}`);
        }
        
        // Afficher les services des employés filtrés
        const filteredServices = [...new Set(filteredByScheduleType.map(e => e.service?.name))];
        console.log(`📋 Services après filtrage:`, filteredServices);
      }
      
      setEmployees(filteredByScheduleType);
      
    } catch (error) {
      console.error('Erreur chargement employés:', error);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleEmployee = (employeeId) => {
    setSelectedEmployees(prev => {
      if (prev.includes(employeeId)) {
        return prev.filter(id => id !== employeeId);
      } else {
        return [...prev, employeeId];
      }
    });
  };

  const handleContinue = () => {
    if (selectedEmployees.length === 0) {
      alert('Veuillez sélectionner au moins un employé');
      return;
    }
    setShowEmployeeSelector(false);
  };

  const handleGenerateAndSubmit = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir générer le PDF et soumettre ce planning pour validation ?')) {
      return;
    }

    try {
      setLoading(true);

      // 1. Créer un élément temporaire avec le planning
      const printElement = document.createElement('div');
      printElement.innerHTML = generateScheduleHTML();
      printElement.style.position = 'absolute';
      printElement.style.left = '-9999px';
      printElement.style.width = '1400px';
      printElement.style.background = 'white';
      printElement.style.padding = '20px';
      document.body.appendChild(printElement);

      // Petit délai pour s'assurer que le DOM est rendu
      await new Promise(resolve => setTimeout(resolve, 100));

      // 2. Capturer en image
      const canvas = await html2canvas(printElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // 3. Créer le PDF
      const pdf = new jsPDF('l', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      
      const finalWidth = imgWidth * ratio;
      const finalHeight = imgHeight * ratio;
      const xOffset = (pdfWidth - finalWidth) / 2;
      const yOffset = (pdfHeight - finalHeight) / 2;
      
      pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight);
      
      // 4. Convertir en Blob
      const pdfBlob = pdf.output('blob');
      
      // 5. Upload
      const formData = new FormData();
      const filename = `planning-${schedule.scheduleType}-${schedule.month}-${schedule.year}-${Date.now()}.pdf`;
      formData.append('file', pdfBlob, filename);
      formData.append('title', schedule.title);
      formData.append('description', `Planning ${scheduleService.getScheduleTypeLabels()[schedule.scheduleType]} - ${scheduleService.getMonthName(schedule.month)} ${schedule.year}`);
      formData.append('type', 'planning');
      
      // 🆕 AJOUTER LES ZONES DE SIGNATURE
      formData.append('metadata', JSON.stringify({
        scheduleId: schedule.id,
        scheduleType: schedule.scheduleType,
        month: schedule.month,
        year: schedule.year,
        signatureZones: [
          {
            role: 'dds',
            label: 'Directrice des Soins',
            x: 50,
            y: 180,
            width: 100,
            height: 30
          },
          {
            role: 'dg',
            label: 'Directeur Général',
            x: 200,
            y: 180,
            width: 100,
            height: 30
          }
        ]
      }));

      const response = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // 6. Nettoyer
      document.body.removeChild(printElement);

      // 7. Marquer comme soumis
      await scheduleService.submitForValidation(schedule.id);

      alert('PDF généré et uploadé avec succès !');
      
      if (response.data.document?.id) {
        navigate(`/documents/${response.data.document.id}`);
      } else {
        navigate('/schedules');
      }

    } catch (error) {
      console.error('❌ Erreur:', error);
      alert('Erreur lors de la génération du PDF');
    } finally {
      setLoading(false);
    }
  };

  const generateScheduleHTML = () => {
    const dates = scheduleService.generateMonthDates(schedule.year, schedule.month);
    const employeeAssignments = {};
    
    if (schedule.assignments && Array.isArray(schedule.assignments)) {
      schedule.assignments.forEach(assignment => {
        const empId = assignment.employeeId;
        if (!employeeAssignments[empId]) {
          employeeAssignments[empId] = {
            name: assignment.employeeName,
            assignments: {}
          };
        }
        employeeAssignments[empId].assignments[assignment.assignmentDate] = assignment.shiftCode;
      });
    }

    return `
      <div style="font-family: Arial, sans-serif; font-size: 11px; color: #000; background: white; padding: 20px;">
        <!-- En-tête -->
        <div style="border-bottom: 3px solid #000; padding-bottom: 15px; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
            <div>
              <h1 style="margin: 0; font-size: 18px; font-weight: bold;">HÔPITAL ST-JEAN DE MALTE</h1>
              <p style="margin: 3px 0; font-size: 11px;">ORDRE DE MALTE</p>
              <p style="margin: 3px 0; font-size: 11px;">BP 56 NJOMBE</p>
            </div>
            <div><p style="margin: 0;">${new Date().toLocaleDateString('fr-FR')}</p></div>
          </div>
          <h2 style="text-align: center; margin: 10px 0; font-size: 16px; text-transform: uppercase;">
            ${scheduleService.getScheduleTypeLabels()[schedule.scheduleType]}
          </h2>
          <h3 style="text-align: center; margin: 10px 0; font-size: 14px;">
            MOIS DE ${scheduleService.getMonthName(schedule.month).toUpperCase()} ${schedule.year}
          </h3>
          <p style="text-align: center; margin: 5px 0; font-size: 10px;">
            ROT/${schedule.scheduleType.toUpperCase()}/${schedule.month}-${schedule.year.toString().slice(-2)}
          </p>
        </div>

        <!-- Tableau -->
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f0f0f0;">
              <th style="border: 2px solid #000; padding: 8px; text-align: left; width: 150px;">Noms</th>
              ${dates.map(d => `
                <th style="border: 2px solid #000; padding: 6px 2px; text-align: center; background-color: ${d.dayOfWeek === 0 || d.dayOfWeek === 6 ? '#e5e5e5' : '#f0f0f0'};">
                  <div style="font-weight: bold;">${d.day}</div>
                  <div style="font-size: 7px;">${d.dayName}</div>
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            ${selectedEmployeesList.map((emp, index) => {
              const empData = employeeAssignments[emp.id] || { 
                name: `${emp.firstName} ${emp.lastName}`, 
                assignments: {} 
              };
              return `
                <tr style="background-color: ${index % 2 === 0 ? '#fff' : '#f9f9f9'};">
                  <td style="border: 2px solid #000; padding: 8px; font-weight: 600;">${empData.name}</td>
                  ${dates.map(d => {
                    const shift = empData.assignments[d.date];
                    return `<td style="border: 2px solid #000; padding: 10px 2px; font-weight: bold; background-color: ${d.dayOfWeek === 0 || d.dayOfWeek === 6 ? '#f5f5f5' : 'transparent'};">${shift || '-'}</td>`;
                  }).join('')}
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <!-- Légende -->
        <div style="margin-top: 15px; padding: 10px; border: 2px solid #ccc; border-radius: 4px;">
          <h4 style="margin: 0 0 10px 0; font-size: 12px; font-weight: bold;">Légende:</h4>
          <div style="display: flex; flex-wrap: wrap; gap: 15px;">
            <div style="display: flex; align-items: center; gap: 5px;">
              <div style="width: 30px; height: 30px; border: 1px solid #000; display: flex; align-items: center; justify-content: center; font-weight: bold; background: #10b981; color: white;">P</div>
              <span style="font-size: 10px;">Présent</span>
            </div>
            <div style="display: flex; align-items: center; gap: 5px;">
              <div style="width: 30px; height: 30px; border: 1px solid #000; display: flex; align-items: center; justify-content: center; font-weight: bold; background: #1e293b; color: white;">N</div>
              <span style="font-size: 10px;">Nuit</span>
            </div>
            <div style="display: flex; align-items: center; gap: 5px;">
              <div style="width: 30px; height: 30px; border: 1px solid #000; display: flex; align-items: center; justify-content: center; font-weight: bold; background: #94a3b8; color: white;">R</div>
              <span style="font-size: 10px;">Repos</span>
            </div>
            <div style="display: flex; align-items: center; gap: 5px;">
              <div style="width: 30px; height: 30px; border: 1px solid #000; display: flex; align-items: center; justify-content: center; font-weight: bold; background: #8b5cf6; color: white;">CA</div>
              <span style="font-size: 10px;">Congé Annuel</span>
            </div>
            <div style="display: flex; align-items: center; gap: 5px;">
              <div style="width: 30px; height: 30px; border: 1px solid #000; display: flex; align-items: center; justify-content: center; font-weight: bold; background: #ef4444; color: white;">CM</div>
              <span style="font-size: 10px;">Congé Maladie</span>
            </div>
          </div>
        </div>

        <!-- 🆕 ZONES DE SIGNATURE AVEC MARQUEURS -->
        <div style="margin-top: 40px; border-top: 3px solid #000; padding-top: 20px;">
          <div style="display: flex; justify-content: space-between; gap: 40px;">
            
            <!-- Zone Directrice des Soins -->
            <div style="width: 45%;">
              <p style="font-weight: bold; margin-bottom: 5px; font-size: 12px;">La Directrice des Soins</p>
              
              <!-- 🎯 ZONE DE SIGNATURE DDS -->
              <div id="signature-zone-dds" style="
                width: 100%;
                height: 80px;
                border: 1px dashed #ccc;
                margin: 10px 0;
                display: flex;
                align-items: center;
                justify-content: center;
                background-color: #f9f9f9;
              ">
                <span style="color: #999; font-size: 9px;">[Signature DDS]</span>
              </div>
              
              <div style="margin-top: 5px;">
                <p style="font-size: 9px; color: #666; margin: 2px 0;">Validé par:</p>
                <p style="font-size: 9px; color: #666; margin: 2px 0;">Date:</p>
              </div>
            </div>

            <!-- Zone Directeur Général -->
            <div style="width: 45%;">
              <p style="font-weight: bold; margin-bottom: 5px; font-size: 12px;">Le Directeur Général</p>
              
              <!-- 🎯 ZONE DE SIGNATURE DG -->
              <div id="signature-zone-dg" style="
                width: 100%;
                height: 80px;
                border: 1px dashed #ccc;
                margin: 10px 0;
                display: flex;
                align-items: center;
                justify-content: center;
                background-color: #f9f9f9;
              ">
                <span style="color: #999; font-size: 9px;">[Signature DG]</span>
              </div>
              
              <div style="margin-top: 5px;">
                <p style="font-size: 10px; margin: 2px 0;">Michel VAUTROT</p>
                <p style="font-size: 9px; color: #666; margin: 2px 0;">BP 56 NJOMBE - C.MEROUN</p>
                <p style="font-size: 9px; color: #666; margin: 2px 0;">Tél: (237)657.593.103</p>
                <p style="font-size: 9px; color: #666; margin: 2px 0;">Directeur Général HSJM</p>
                <p style="font-size: 9px; color: #666; margin: 2px 0;">hopitalcameroun@ordredemaltefrance.org</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Pied de page -->
        <div style="text-align: center; margin-top: 20px; font-size: 9px; color: #666;">
          <p style="margin: 5px 0;">(1 heure de pause par jour)</p>
          <p style="margin: 5px 0;">Document généré le ${new Date().toLocaleDateString('fr-FR')}</p>
        </div>
      </div>
    `;
  };

  // ✅ CORRECTION: Filtrage sécurisé des employés
  const filteredEmployees = Array.isArray(employees) 
    ? employees.filter(emp =>
        emp && emp.firstName && emp.lastName &&
        `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  // ✅ CORRECTION: Sélection sécurisée des employés
  const selectedEmployeesList = Array.isArray(employees)
    ? employees.filter(emp => emp && selectedEmployees.includes(emp.id))
    : [];

  if (loading || !schedule) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/schedules')}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour à la liste
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{schedule.title}</h1>
            <p className="text-gray-600 mt-1">
              {scheduleService.getMonthName(schedule.month)} {schedule.year}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${scheduleService.getStatusColor(schedule.status)}`}>
            {scheduleService.getStatusLabels()[schedule.status]}
          </span>
        </div>
      </div>

      {/* Sélection des employés */}
      {showEmployeeSelector ? (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Sélection des employés ({selectedEmployees.length} sélectionné{selectedEmployees.length > 1 ? 's' : ''})
            </h2>
            <button
              onClick={handleContinue}
              disabled={selectedEmployees.length === 0}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                selectedEmployees.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              Continuer →
            </button>
          </div>

          {/* Recherche */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Rechercher un employé..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Info sur le filtrage */}
          {employees.length > 0 && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>ℹ️ Filtre actif:</strong> {employees.length} employé{employees.length > 1 ? 's' : ''} correspond{employees.length > 1 ? 'ent' : ''} au type de planning "{schedule.scheduleType}"
              </p>
            </div>
          )}

          {/* Liste des employés */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
            {filteredEmployees.map(employee => (
              <label
                key={employee.id}
                className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedEmployees.includes(employee.id)}
                  onChange={() => toggleEmployee(employee.id)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <div className="ml-3 flex-1">
                  <span className="text-sm font-medium text-gray-900 block">
                    {employee.firstName} {employee.lastName}
                  </span>
                  {employee.service && (
                    <span className="text-xs text-gray-500">
                      {employee.service.name}
                    </span>
                  )}
                </div>
              </label>
            ))}
          </div>

          {filteredEmployees.length === 0 && (
            <div className="text-center py-8">
              {employees.length === 0 ? (
                <div className="text-gray-500">
                  <p className="font-semibold mb-2">Aucun employé disponible pour ce type de planning</p>
                  <p className="text-sm">
                    Type de planning: <strong>{schedule.scheduleType}</strong>
                  </p>
                  <p className="text-sm mt-2">
                    Vérifiez que les employés ont bien un service assigné correspondant à ce type.
                  </p>
                </div>
              ) : (
                <p className="text-gray-500">Aucun employé trouvé pour cette recherche</p>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Info bar */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowEmployeeSelector(true)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  ← Modifier la sélection d'employés
                </button>
                <span className="text-gray-600">
                  {selectedEmployeesList.length} employé{selectedEmployeesList.length > 1 ? 's' : ''} sélectionné{selectedEmployeesList.length > 1 ? 's' : ''}
                </span>
              </div>
              {schedule.status === 'draft' && (
                <button
                  onClick={handleGenerateAndSubmit}
                  disabled={loading}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Génération en cours...
                    </>
                  ) : (
                    <>
                      📄 Générer PDF et Soumettre
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Grille de planning */}
          {selectedEmployeesList.length > 0 ? (
            <ScheduleGrid
              schedule={schedule}
              employees={selectedEmployeesList}
              onSave={loadSchedule}
            />
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <p className="text-gray-500">
                Aucun employé sélectionné. Veuillez sélectionner au moins un employé pour continuer.
              </p>
              <button
                onClick={() => setShowEmployeeSelector(true)}
                className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Sélectionner des employés
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ScheduleEdit;