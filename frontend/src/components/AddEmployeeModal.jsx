// frontend/src/components/AddEmployeeModal.jsx
import React, { useState, useEffect } from 'react';
import { employeesAPI, servicesAPI } from '../services/api';
import { Loader, X } from 'lucide-react';

const AddEmployeeModal = ({ employee, services: initialServices, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', birthDate: '', birthPlace: '',
    gender: '', childrenCount: 0, matricule: '', maritalStatus: '', serviceId: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [services, setServices] = useState(initialServices || []);

  const isEditing = !!employee;

  useEffect(() => {
    const loadServices = async () => {
      if (services.length === 0) {
        try {
          const response = await servicesAPI.getAll();
          const servicesData = response.data?.services || response.data?.data || response.data || [];
          setServices(servicesData);
        } catch (err) {
          console.error('Erreur chargement services dans modal:', err);
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
    setLoading(true); setError(null);
    try {
      if (isEditing) await employeesAPI.update(employee.id, formData);
      else await employeesAPI.create(formData);
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseInt(value) || 0 : value }));
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px',
    border: '1.5px solid var(--border)', borderRadius: 'var(--radius-3)',
    background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, outline: 'none',
    boxSizing: 'border-box',
  };
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--fg-muted)', marginBottom: 6 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
      <div style={{ background: 'var(--surface)', padding: 24, borderRadius: 'var(--radius-3)', boxShadow: 'var(--shadow-3)', width: '100%', maxWidth: 672, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg)', margin: 0 }}>
            {isEditing ? 'Modifier l\'employé' : 'Ajouter un employé'}
          </h2>
          <button onClick={onClose} disabled={loading}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', display: 'flex', padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-3)', padding: 14, marginBottom: 20 }}>
            <p style={{ color: 'var(--danger)', fontSize: 13, margin: 0 }}>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
            {/* Colonne gauche */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'Matricule *', name: 'matricule', type: 'text', placeholder: 'Ex: EMP001', required: true },
                { label: 'Nom *', name: 'lastName', type: 'text', placeholder: 'Nom de famille', required: true },
                { label: 'Prénom *', name: 'firstName', type: 'text', placeholder: 'Prénom', required: true },
                { label: 'Date de naissance *', name: 'birthDate', type: 'date', required: true },
                { label: 'Lieu de naissance *', name: 'birthPlace', type: 'text', placeholder: 'Ville, Pays', required: true },
              ].map(({ label, name, type, placeholder, required }) => (
                <div key={name}>
                  <label style={labelStyle}>{label}</label>
                  <input type={type} name={name} value={formData[name]} onChange={handleChange}
                    required={required} placeholder={placeholder} style={inputStyle} />
                </div>
              ))}
            </div>

            {/* Colonne droite */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Service *</label>
                <select name="serviceId" value={formData.serviceId} onChange={handleChange} required style={inputStyle}>
                  <option value="">Sélectionner un service</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {services.length === 0 && <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 4 }}>Chargement des services...</p>}
              </div>

              <div>
                <label style={labelStyle}>Sexe *</label>
                <select name="gender" value={formData.gender} onChange={handleChange} required style={inputStyle}>
                  <option value="">Sélectionner</option>
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Statut matrimonial *</label>
                <select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange} required style={inputStyle}>
                  <option value="">Sélectionner</option>
                  <option value="Célibataire">Célibataire</option>
                  <option value="Marié(e)">Marié(e)</option>
                  <option value="Divorcé(e)">Divorcé(e)</option>
                  <option value="Veuf(ve)">Veuf(ve)</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Nombre d'enfants</label>
                <input type="number" name="childrenCount" value={formData.childrenCount} onChange={handleChange}
                  min="0" max="20" style={inputStyle} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
            <button type="button" onClick={onClose} disabled={loading}
              style={{
                padding: '10px 24px', background: 'var(--surface-2)', color: 'var(--fg)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-3)',
                fontSize: 13, fontWeight: 500, cursor: 'pointer', opacity: loading ? 0.5 : 1,
                transition: 'background .15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-2)'}
            >
              Annuler
            </button>
            <button type="submit" disabled={loading}
              style={{
                padding: '10px 24px', background: 'var(--brand)', color: '#fff',
                border: 'none', borderRadius: 'var(--radius-3)',
                fontSize: 13, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                display: 'flex', alignItems: 'center', gap: 8, transition: 'background .15s',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--brand-active)'; }}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--brand)'}
            >
              {loading && <Loader size={14} className="animate-spin" />}
              {isEditing ? 'Modifier' : 'Créer'} l'employé
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEmployeeModal;
