// frontend/src/pages/EmployeeManagement.jsx
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { employeesAPI, servicesAPI } from '../services/api';
import { Users, Edit, Trash2, PlusCircle, Search, Filter, Loader, Eye } from 'lucide-react';
import AddEmployeeModal from '../components/AddEmployeeModal.jsx';
import ImportExportEmployees from '../components/ImportExportEmployees.jsx';
import toast from 'react-hot-toast';
import { useConfirm } from '../components/ConfirmModal';

const EmployeeManagement = () => {
  const { confirm, ConfirmModalRenderer } = useConfirm();
  const [sortConfig, setSortConfig] = useState({ key: 'lastName', dir: 'asc' });
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
    const ok = await confirm({ title: 'Désactiver l\'employé', message: `Êtes-vous sûr de vouloir désactiver ${employee.firstName} ${employee.lastName} ?`, confirmLabel: 'Désactiver', variant: 'warning' });
    if (ok) {
      try {
        await employeesAPI.delete(employee.id);
        toast('Employé désactivé avec succès');
        loadEmployees();
      } catch (err) {
        toast(`Erreur: ${err.response?.data?.error || "Impossible de désactiver l'employé"}`);
      }
    }
  };

  const handleSort = (key) => {
    setSortConfig(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  };

  const sortedEmployees = [...employees].sort((a, b) => {
    const { key, dir } = sortConfig;
    let aVal = key === 'service' ? (a.Service?.name ?? '') : (a[key] ?? '');
    let bVal = key === 'service' ? (b.Service?.name ?? '') : (b[key] ?? '');
    aVal = String(aVal).toLowerCase(); bVal = String(bVal).toLowerCase();
    if (aVal < bVal) return dir === 'asc' ? -1 : 1;
    if (aVal > bVal) return dir === 'asc' ? 1 : -1;
    return 0;
  });

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
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

  const thStyle = { padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', background: 'var(--surface-2)', cursor: 'pointer', userSelect: 'none' };
  const tdStyle = { padding: '14px 20px', verticalAlign: 'middle', borderBottom: '1px solid var(--border)' };

  if (loading && employees.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
        <Loader className="animate-spin" style={{ color: 'var(--brand)' }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Users style={{ width: 32, height: 32, color: 'var(--brand)' }} />
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--fg)', margin: 0 }}>
            Gestion des Employés
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ImportExportEmployees onImportComplete={loadEmployees} />
          <button
            onClick={handleCreate}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 'var(--radius-2)', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}
          >
            <PlusCircle size={18} /> Ajouter un employé
          </button>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div style={{ background: 'var(--surface)', padding: 16, borderRadius: 'var(--radius-2)', boxShadow: 'var(--shadow-1)', border: '1px solid var(--border)', marginBottom: 24 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)', pointerEvents: 'none', width: 16, height: 16 }} />
              <input
                type="text"
                placeholder="Rechercher par nom, prénom ou matricule..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                style={{ width: '100%', paddingLeft: 34, paddingRight: 12, height: 36, border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <div style={{ width: 256 }}>
            <select
              value={filters.serviceId}
              onChange={(e) => handleFilterChange('serviceId', e.target.value)}
              style={{ width: '100%', height: 36, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, outline: 'none', cursor: 'pointer' }}
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
        <div style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-2)', padding: 16, marginBottom: 24 }}>
          <p style={{ color: 'var(--danger)', margin: 0, fontSize: 13 }}>{error}</p>
        </div>
      )}

      {/* Tableau des employés */}
      <div className="overflow-x-auto" style={{ background: 'var(--surface)', borderRadius: 'var(--radius-2)', boxShadow: 'var(--shadow-1)', border: '1px solid var(--border)' }}>
        <table style={{ minWidth: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {[
                { key: 'matricule', label: 'Matricule' },
                { key: 'lastName', label: 'Nom & Prénom' },
                { key: 'service', label: 'Service' },
                { key: 'dateNaissance', label: 'Date Naissance' },
                { key: 'sexe', label: 'Sexe' },
              ].map(col => (
                <th key={col.key} onClick={() => handleSort(col.key)} style={thStyle}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--brand)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--fg-muted)'}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {col.label}
                    <span style={{ color: 'var(--fg-subtle)' }}>
                      {sortConfig.key === col.key ? (sortConfig.dir === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </span>
                </th>
              ))}
              <th style={thStyle}>Enfants</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedEmployees.map(employee => (
              <tr
                key={employee.id}
                style={{ background: 'var(--surface)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
              >
                <td style={tdStyle}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--fg)' }}>
                    {employee.matricule}
                  </span>
                </td>
                <td style={tdStyle}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>
                    {employee.lastName} {employee.firstName}
                  </div>
                </td>
                <td style={tdStyle}>
                  <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
                    {employee.service?.name}
                  </span>
                </td>
                <td style={{ ...tdStyle, fontSize: 13, color: 'var(--fg-muted)' }}>
                  {formatDate(employee.birthDate)}
                </td>
                <td style={tdStyle}>
                  <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
                    {getGenderText(employee.gender)}
                  </span>
                </td>
                <td style={tdStyle}>
                  <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
                    {employee.childrenCount}
                  </span>
                </td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
                    <button
                      onClick={() => handleView(employee)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', padding: 4 }}
                      title="Voir détails"
                    >
                      <Eye style={{ width: 18, height: 18 }} />
                    </button>
                    <button
                      onClick={() => handleEdit(employee)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', padding: 4 }}
                      title="Modifier"
                    >
                      <Edit style={{ width: 18, height: 18 }} />
                    </button>
                    <button
                      onClick={() => handleDelete(employee)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 4 }}
                      title="Désactiver"
                    >
                      <Trash2 style={{ width: 18, height: 18 }} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {employees.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <Users style={{ margin: '0 auto 8px', width: 48, height: 48, color: 'var(--fg-subtle)' }} />
            <h3 style={{ marginTop: 8, fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>
              Aucun employé trouvé
            </h3>
            <p style={{ marginTop: 4, fontSize: 13, color: 'var(--fg-muted)' }}>
              {filters.search || filters.serviceId
                ? 'Aucun résultat pour les filtres sélectionnés.'
                : 'Commencez par ajouter votre premier employé.'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24 }}>
          <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
            Affichage de {((pagination.page - 1) * pagination.limit) + 1} à{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} sur{' '}
            {pagination.total} employés
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              style={{ padding: '6px 12px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', background: 'var(--surface)', color: 'var(--fg)', cursor: 'pointer', opacity: pagination.page === 1 ? 0.5 : 1 }}
            >
              Précédent
            </button>
            <span style={{ padding: '6px 12px', fontSize: 13, color: 'var(--fg-muted)' }}>
              Page {pagination.page} sur {pagination.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              style={{ padding: '6px 12px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', background: 'var(--surface)', color: 'var(--fg)', cursor: 'pointer', opacity: pagination.page === pagination.totalPages ? 0.5 : 1 }}
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
      {ConfirmModalRenderer}
    </div>
  );
};

// Composant Modal de visualisation
const EmployeeViewModal = ({ employee, onClose }) => {
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--fg-muted)', marginBottom: 4 };
  const valueStyle = { fontSize: 16, color: 'var(--fg)', margin: 0 };

  return ReactDOM.createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, padding: 16 }}>
      <div style={{ background: 'var(--surface)', padding: 24, borderRadius: 'var(--radius-3)', boxShadow: 'var(--shadow-3)', width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg)', margin: 0 }}>
            Détails de l'employé
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', fontSize: 18 }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>Matricule</label>
              <p style={{ ...valueStyle, fontFamily: 'var(--font-mono)' }}>{employee.matricule}</p>
            </div>
            <div>
              <label style={labelStyle}>Nom</label>
              <p style={valueStyle}>{employee.lastName}</p>
            </div>
            <div>
              <label style={labelStyle}>Prénom</label>
              <p style={valueStyle}>{employee.firstName}</p>
            </div>
            <div>
              <label style={labelStyle}>Service</label>
              <p style={valueStyle}>{employee.service?.name}</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>Date de naissance</label>
              <p style={valueStyle}>{new Date(employee.birthDate).toLocaleDateString('fr-FR')}</p>
            </div>
            <div>
              <label style={labelStyle}>Lieu de naissance</label>
              <p style={valueStyle}>{employee.birthPlace}</p>
            </div>
            <div>
              <label style={labelStyle}>Sexe</label>
              <p style={valueStyle}>{employee.gender === 'M' ? 'Masculin' : 'Féminin'}</p>
            </div>
            <div>
              <label style={labelStyle}>Statut matrimonial</label>
              <p style={valueStyle}>{employee.maritalStatus}</p>
            </div>
            <div>
              <label style={labelStyle}>Nombre d'enfants</label>
              <p style={valueStyle}>{employee.childrenCount}</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 20px', background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 'var(--radius-2)', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default EmployeeManagement;
