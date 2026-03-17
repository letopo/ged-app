// frontend/src/pages/EmployeeManagement.jsx
import React, { useState, useEffect } from 'react';
import { employeesAPI, servicesAPI } from '../services/api';
import { Users, Edit, Trash2, PlusCircle, Search, Filter, Loader, Eye } from 'lucide-react';
import AddEmployeeModal from '../components/AddEmployeeModal.jsx';
import ImportExportEmployees from '../components/ImportExportEmployees.jsx';

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [isViewModalOpen, setViewModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  
  // États pour les filtres et recherche
  const [filters, setFilters] = useState({
    serviceId: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      };
      
      const response = await employeesAPI.getAll(params);
      setEmployees(response.data.employees || []);
      setPagination(prev => ({
        ...prev,
        total: response.data.total,
        totalPages: response.data.totalPages
      }));
    } catch (err) {
      setError('Impossible de charger les employés.');
      console.error('Erreur chargement employés:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    try {
        console.log('🔄 Chargement des services...');
        const response = await servicesAPI.getAll();
        console.log('✅ Services chargés:', response.data.services);
        setServices(response.data.services || []);
        } catch (err) {
            console.error('❌ Erreur chargement services:', err);
            setServices([]);
        }
    };

  useEffect(() => {
    loadEmployees();
    loadServices();
  }, [pagination.page, filters]);

  const handleCreate = () => {
    setEditingEmployee(null);
    setCreateModalOpen(true);
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setCreateModalOpen(true);
  };

  const handleView = (employee) => {
    setSelectedEmployee(employee);
    setViewModalOpen(true);
  };

  const handleCloseModal = () => {
    setCreateModalOpen(false);
    setViewModalOpen(false);
    setEditingEmployee(null);
    setSelectedEmployee(null);
  };

  const handleSaveSuccess = () => {
    handleCloseModal();
    loadEmployees();
  };

  const handleDelete = async (employee) => {
    if (window.confirm(`Êtes-vous sûr de vouloir désactiver l'employé ${employee.firstName} ${employee.lastName} ?`)) {
      try {
        await employeesAPI.delete(employee.id);
        alert('Employé désactivé avec succès');
        loadEmployees();
      } catch (err) {
        alert(`Erreur: ${err.response?.data?.error || "Impossible de désactiver l'employé"}`);
      }
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset à la première page
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const getGenderText = (gender) => {
    return gender === 'M' ? 'Masculin' : 'Féminin';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  if (loading && employees.length === 0) {
    return <div className="flex justify-center p-8"><Loader className="animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between gap-3 mb-8">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text">
            Gestion des Employés
          </h1>
        </div>
        <div className="flex items-center gap-3">
        <ImportExportEmployees onImportComplete={loadEmployees} />
        <button 
        onClick={handleCreate}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
        >
            <PlusCircle size={20} /> Ajouter un employé
            </button>
        </div>
    </div>

      {/* Filtres et recherche */}
      <div className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow-sm border border-gray-200 dark:border-dark-border mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher par nom, prénom ou matricule..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-dark-bg dark:text-dark-text"
              />
            </div>
          </div>
          <div className="w-full md:w-64">
            <select
              value={filters.serviceId}
              onChange={(e) => handleFilterChange('serviceId', e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-dark-bg dark:text-dark-text"
            >
              <option value="">Tous les services</option>
              {services.map(service => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Tableau des employés */}
      <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm border border-gray-200 dark:border-dark-border overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
          <thead className="bg-gray-50 dark:bg-dark-bg">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase">
                Matricule
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase">
                Nom & Prénom
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase">
                Service
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase">
                Date Naissance
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase">
                Sexe
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase">
                Enfants
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-dark-surface divide-y divide-gray-200 dark:divide-dark-border">
            {employees.map(employee => (
              <tr key={employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-mono text-sm text-gray-900 dark:text-dark-text">
                    {employee.matricule}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-dark-text">
                    {employee.lastName} {employee.firstName}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-700 dark:text-dark-text">
                    {employee.service?.name}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-dark-text">
                  {formatDate(employee.birthDate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-700 dark:text-dark-text">
                    {getGenderText(employee.gender)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-700 dark:text-dark-text">
                    {employee.childrenCount}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end items-center gap-3">
                    <button 
                      onClick={() => handleView(employee)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      title="Voir détails"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleEdit(employee)}
                      className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                      title="Modifier"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDelete(employee)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      title="Désactiver"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {employees.length === 0 && !loading && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-dark-text">
              Aucun employé trouvé
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-text-secondary">
              {filters.search || filters.serviceId 
                ? 'Aucun résultat pour les filtres sélectionnés.' 
                : 'Commencez par ajouter votre premier employé.'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-700 dark:text-dark-text">
            Affichage de {((pagination.page - 1) * pagination.limit) + 1} à{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} sur{' '}
            {pagination.total} employés
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-dark-border rounded-lg disabled:opacity-50 dark:bg-dark-bg dark:text-dark-text"
            >
              Précédent
            </button>
            <span className="px-3 py-2 text-sm text-gray-700 dark:text-dark-text">
              Page {pagination.page} sur {pagination.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-dark-border rounded-lg disabled:opacity-50 dark:bg-dark-bg dark:text-dark-text"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* Modal de visualisation */}
      {isViewModalOpen && selectedEmployee && (
        <EmployeeViewModal 
          employee={selectedEmployee}
          onClose={handleCloseModal}
        />
      )}

      {/* Modal de création/édition */}
      {isCreateModalOpen && (
        <AddEmployeeModal
          employee={editingEmployee}
          services={services}
          onClose={handleCloseModal}
          onSave={handleSaveSuccess}
        />
      )}
    </div>
  );
};

// Composant Modal de visualisation
const EmployeeViewModal = ({ employee, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-xl dark:shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
            Détails de l'employé
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                Matricule
              </label>
              <p className="text-lg font-mono text-gray-900 dark:text-dark-text">
                {employee.matricule}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                Nom
              </label>
              <p className="text-lg text-gray-900 dark:text-dark-text">
                {employee.lastName}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                Prénom
              </label>
              <p className="text-lg text-gray-900 dark:text-dark-text">
                {employee.firstName}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                Service
              </label>
              <p className="text-lg text-gray-900 dark:text-dark-text">
                {employee.service?.name}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                Date de naissance
              </label>
              <p className="text-lg text-gray-900 dark:text-dark-text">
                {new Date(employee.birthDate).toLocaleDateString('fr-FR')}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                Lieu de naissance
              </label>
              <p className="text-lg text-gray-900 dark:text-dark-text">
                {employee.birthPlace}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                Sexe
              </label>
              <p className="text-lg text-gray-900 dark:text-dark-text">
                {employee.gender === 'M' ? 'Masculin' : 'Féminin'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                Statut matrimonial
              </label>
              <p className="text-lg text-gray-900 dark:text-dark-text">
                {employee.maritalStatus}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                Nombre d'enfants
              </label>
              <p className="text-lg text-gray-900 dark:text-dark-text">
                {employee.childrenCount}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeManagement;