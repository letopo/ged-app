// frontend/src/components/AddEmployeeModal.jsx - VERSION CORRIGÉE
import React, { useState, useEffect } from 'react';
import { employeesAPI, servicesAPI } from '../services/api'; // AJOUTER servicesAPI
import { Loader } from 'lucide-react';

const AddEmployeeModal = ({ employee, services: initialServices, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    birthDate: '',
    birthPlace: '',
    gender: '',
    childrenCount: 0,
    matricule: '',
    maritalStatus: '',
    serviceId: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [services, setServices] = useState(initialServices || []); // État local pour les services

  const isEditing = !!employee;

  // Charger les services si ils ne sont pas fournis en props
  useEffect(() => {
    const loadServices = async () => {
        if (services.length === 0) {
            try {
            console.log('🔄 Chargement des services dans le modal...');
            const response = await servicesAPI.getAll();
            console.log('📦 Réponse complète services:', response);
            console.log('📦 response.data:', response.data);
            console.log('📦 response.data.services:', response.data?.services);
            console.log('📦 response.data.data:', response.data?.data);
            
            // Essayer différentes structures de réponse
            const servicesData = response.data?.services || response.data?.data || response.data || [];
            console.log('📦 Services data final:', servicesData);
            setServices(servicesData);
            } catch (err) {
            console.error('❌ Erreur chargement services dans modal:', err);
            console.error('❌ Détails erreur:', err.response);
            setServices([]);
            }
        }
    };

    loadServices();
  }, [services.length]);

  useEffect(() => {
    if (employee) {
      setFormData({
        firstName: employee.firstName || '',
        lastName: employee.lastName || '',
        birthDate: employee.birthDate ? employee.birthDate.split('T')[0] : '',
        birthPlace: employee.birthPlace || '',
        gender: employee.gender || '',
        childrenCount: employee.childrenCount || 0,
        matricule: employee.matricule || '',
        maritalStatus: employee.maritalStatus || '',
        serviceId: employee.serviceId || ''
      });
    }
  }, [employee]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isEditing) {
        await employeesAPI.update(employee.id, formData);
      } else {
        await employeesAPI.create(formData);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-xl dark:shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
            {isEditing ? 'Modifier l\'employé' : 'Ajouter un employé'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            disabled={loading}
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Colonne gauche */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                  Matricule *
                </label>
                <input
                  type="text"
                  name="matricule"
                  value={formData.matricule}
                  onChange={handleChange}
                  required
                  className="w-full p-3 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-dark-bg dark:text-dark-text"
                  placeholder="Ex: EMP001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                  Nom *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className="w-full p-3 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-dark-bg dark:text-dark-text"
                  placeholder="Nom de famille"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                  Prénom *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="w-full p-3 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-dark-bg dark:text-dark-text"
                  placeholder="Prénom"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                  Date de naissance *
                </label>
                <input
                  type="date"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={handleChange}
                  required
                  className="w-full p-3 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-dark-bg dark:text-dark-text"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                  Lieu de naissance *
                </label>
                <input
                  type="text"
                  name="birthPlace"
                  value={formData.birthPlace}
                  onChange={handleChange}
                  required
                  className="w-full p-3 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-dark-bg dark:text-dark-text"
                  placeholder="Ville, Pays"
                />
              </div>
            </div>

            {/* Colonne droite */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                  Service *
                </label>
                <select
                  name="serviceId"
                  value={formData.serviceId}
                  onChange={handleChange}
                  required
                  className="w-full p-3 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-dark-bg dark:text-dark-text"
                >
                  <option value="">Sélectionner un service</option>
                  {services.map(service => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
                {services.length === 0 && (
                  <p className="text-sm text-gray-500 mt-1">Chargement des services...</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                  Sexe *
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  required
                  className="w-full p-3 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-dark-bg dark:text-dark-text"
                >
                  <option value="">Sélectionner</option>
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                  Statut matrimonial *
                </label>
                <select
                  name="maritalStatus"
                  value={formData.maritalStatus}
                  onChange={handleChange}
                  required
                  className="w-full p-3 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-dark-bg dark:text-dark-text"
                >
                  <option value="">Sélectionner</option>
                  <option value="Célibataire">Célibataire</option>
                  <option value="Marié(e)">Marié(e)</option>
                  <option value="Divorcé(e)">Divorcé(e)</option>
                  <option value="Veuf(ve)">Veuf(ve)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                  Nombre d'enfants
                </label>
                <input
                  type="number"
                  name="childrenCount"
                  value={formData.childrenCount}
                  onChange={handleChange}
                  min="0"
                  max="20"
                  className="w-full p-3 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-dark-bg dark:text-dark-text"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 dark:border-dark-border">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 dark:text-dark-text rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader className="animate-spin w-4 h-4" />}
              {isEditing ? 'Modifier' : 'Créer'} l'employé
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEmployeeModal;