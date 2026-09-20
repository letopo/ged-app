// frontend/src/components/EmployeeListModal.jsx
import React, { useState, useEffect } from 'react';
import { employeesAPI } from '../services/api';
import { Users, Search, X, Loader } from 'lucide-react';

const inputStyle = {
  width: '100%', height: 34, padding: '0 10px 0 30px', boxSizing: 'border-box',
  border: '1px solid var(--border)', borderRadius: 'var(--radius-2)',
  background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, outline: 'none',
};
const selectStyle = {
  width: '100%', height: 34, padding: '0 8px', boxSizing: 'border-box',
  border: '1px solid var(--border)', borderRadius: 'var(--radius-2)',
  background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, outline: 'none',
};

export default function EmployeeListModal({ onClose, onSelectEmployee, selectedService = null }) {
  const [employees, setEmployees]         = useState([]);
  const [services, setServices]           = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState(selectedService || '');
  const [searchTerm, setSearchTerm]       = useState('');
  const [loading, setLoading]             = useState(false);

  useEffect(() => { loadServices(); }, []);
  useEffect(() => { loadEmployees(); }, [selectedServiceId]);

  const loadServices = async () => {
    try {
      const res = await employeesAPI.getServicesWithEmployees();
      setServices(res.data.services || []);
    } catch (err) {
      console.error('Erreur chargement services:', err);
    }
  };

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const res = selectedServiceId
        ? await employeesAPI.getByService(selectedServiceId)
        : await employeesAPI.getAll({ limit: 100 });
      setEmployees(res.data.employees || []);
    } catch (err) {
      console.error('Erreur chargement employés:', err);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(e =>
    e.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.matricule.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (employee) => {
    if (onSelectEmployee) onSelectEmployee(employee);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, padding: 16,
    }}>
      <div className="animate-fadeIn" style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-4)', boxShadow: 'var(--shadow-3)',
        width: '100%', maxWidth: 720, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={18} color="var(--brand)" />
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)' }}>Liste des Employés</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        {/* Filters */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, flexShrink: 0 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)' }} />
            <input
              style={inputStyle}
              type="text"
              placeholder="Nom, prénom ou matricule…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ width: 220 }}>
            <select style={selectStyle} value={selectedServiceId} onChange={e => setSelectedServiceId(e.target.value)}>
              <option value="">Tous les services</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.employees?.length || 0})</option>
              ))}
            </select>
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <Loader size={24} color="var(--brand)" className="animate-spin" />
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Users size={36} color="var(--border-strong)" style={{ marginBottom: 10 }} />
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-muted)' }}>Aucun employé trouvé</div>
              <div style={{ fontSize: 12, color: 'var(--fg-subtle)', marginTop: 3 }}>
                {searchTerm || selectedServiceId ? 'Aucun résultat pour ces critères.' : 'Aucun employé enregistré.'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filteredEmployees.map(emp => (
                <div
                  key={emp.id}
                  onClick={() => handleSelect(emp)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-3)', cursor: 'pointer', transition: 'background .1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'var(--brand-soft)', color: 'var(--brand)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, flexShrink: 0,
                    }}>
                      {emp.firstName[0]}{emp.lastName[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
                        {emp.firstName} {emp.lastName}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>{emp.matricule}</span>
                        <span>·</span>
                        <span>{emp.service?.name}</span>
                        <span>·</span>
                        <span>{emp.gender === 'M' ? 'Masculin' : 'Féminin'}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{emp.childrenCount} enfant(s)</div>
                    <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginTop: 1 }}>
                      {new Date(emp.birthDate).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{
              height: 32, padding: '0 14px', borderRadius: 'var(--radius-2)',
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--fg-muted)', fontSize: 13, cursor: 'pointer',
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
