// frontend/src/components/EmployeeListModal.jsx
import React, { useState, useEffect } from 'react';
import { employeesAPI } from '../services/api';
import { Users, Search, X, Loader } from 'lucide-react';

const EmployeeListModal = ({ onClose, onSelectEmployee, selectedService = null }) => {
  const [employees, setEmployees] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState(selectedService || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [selectedServiceId]);

  const loadServices = async () => {
    try {
      const response = await employeesAPI.getServicesWithEmployees();
      setServices(response.data.services || []);
    } catch (err) {
      console.error('Erreur chargement services:', err);
    }
  };

  const loadEmployees = async () => {
    try {
      setLoading(true);
      let response;
      
      if (selectedServiceId) {
        response = await employeesAPI.getByService(selectedServiceId);
      } else {
        response = await employeesAPI.getAll({ limit: 100 });
      }
      
      setEmployees(response.data.employees || []);
    } catch (err) {
      console.error('Erreur chargement employés:', err);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(employee =>
    employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.matricule.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEmployeeSelect = (employee) => {
    if (onSelectEmployee) {
      onSelectEmployee(employee);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-xl dark:shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
              Liste des Employés
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Filtres */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher un employé..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-dark-bg dark:text-dark-text"
              />
            </div>
          </div>
          <div className="w-full md:w-64">
            <select
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-dark-bg dark:text-dark-text"
            >
              <option value="">Tous les services</option>
              {services.map(service => (
                <option key={service.id} value={service.id}>
                  {service.name} ({service.employees?.length || 0})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Liste des employés */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader className="animate-spin text-blue-600 w-8 h-8" />
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-dark-text">
                Aucun employé trouvé
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-dark-text-secondary">
                {searchTerm || selectedServiceId 
                  ? 'Aucun résultat pour les critères sélectionnés.' 
                  : 'Aucun employé enregistré.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredEmployees.map(employee => (
                <div
                  key={employee.id}
                  className="p-4 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  onClick={() => handleEmployeeSelect(employee)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 dark:text-blue-300 font-medium text-sm">
                              {employee.firstName[0]}{employee.lastName[0]}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-medium text-gray-900 dark:text-dark-text">
                            {employee.firstName} {employee.lastName}
                          </h4>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-dark-text-secondary">
                            <span className="font-mono">{employee.matricule}</span>
                            <span>•</span>
                            <span>{employee.service?.name}</span>
                            <span>•</span>
                            <span>
                              {employee.gender === 'M' ? 'Masculin' : 'Féminin'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500 dark:text-dark-text-secondary">
                        {employee.childrenCount} enfant(s)
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {new Date(employee.birthDate).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-dark-border">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 dark:text-dark-text rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeListModal;