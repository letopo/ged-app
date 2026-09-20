// frontend/src/pages/DemandeAchatDashboard.jsx
import React, { useState, useEffect } from 'react';
import { demandeAchatAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Search, Filter, FileText, Clock, CheckCircle, XCircle, AlertCircle, Loader } from 'lucide-react';
import DemandeAchatForm from '../components/DemandeAchatForm';
import DemandeAchatCard from '../components/DemandeAchatCard';
import DemandeAchatDetail from '../components/DemandeAchatDetail';

const DemandeAchatDashboard = () => {
  const { user } = useAuth();
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // États pour la navigation
  const [view, setView] = useState('list'); // 'list', 'form', 'detail'
  const [selectedDemande, setSelectedDemande] = useState(null);

  // Filtres
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadDemandes();
  }, [statusFilter, searchQuery]);

  const loadDemandes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await demandeAchatAPI.getAll();
      setDemandes(response.data.data || []);
    } catch (err) {
      setError('Erreur lors du chargement des demandes d\'achat');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setSelectedDemande(null);
    setView('form');
  };

  const handleViewDetail = (demande) => {
    setSelectedDemande(demande);
    setView('detail');
  };

  const handleEdit = (demande) => {
    setSelectedDemande(demande);
    setView('form');
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedDemande(null);
    loadDemandes();
  };

  const getStatusConfig = (status) => {
    const configs = {
      draft: { label: 'Brouillon', icon: FileText, bgStyle: { background: 'var(--surface-2)' }, textStyle: { color: 'var(--fg-muted)' } },
      pending_approval: { label: 'En attente', icon: Clock, bgStyle: { background: 'var(--warning-soft)' }, textStyle: { color: 'var(--warning)' } },
      approved: { label: 'Approuvée', icon: CheckCircle, bgStyle: { background: 'var(--success-soft)' }, textStyle: { color: 'var(--success)' } },
      rejected: { label: 'Rejetée', icon: XCircle, bgStyle: { background: 'var(--danger-soft)' }, textStyle: { color: 'var(--danger)' } },
      in_progress: { label: 'En cours', icon: AlertCircle, bgStyle: { background: 'var(--brand-soft)' }, textStyle: { color: 'var(--brand)' } },
      completed: { label: 'Terminée', icon: CheckCircle, bgStyle: { background: 'var(--success-soft)' }, textStyle: { color: 'var(--success)' } },
    };
    return configs[status] || configs.draft;
  };

  const filteredDemandes = demandes.filter(d => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      return (
        d.daNumber?.toLowerCase().includes(search) ||
        d.domain?.toLowerCase().includes(search) ||
        d.requestDescription?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  return (
    <div className="flex h-screen" style={{ background: 'var(--surface-2)' }}>
      {/* SIDEBAR GAUCHE */}
      <div className="w-80 flex flex-col" style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
        {/* Header Sidebar */}
        <div className="p-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={handleCreateNew}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition"
            style={{ background: 'var(--brand)', color: '#fff', boxShadow: 'var(--shadow-1)' }}
          >
            <Plus size={20} />
            Nouvelle Demande d'Achat
          </button>
        </div>

        {/* Filtres */}
        <div className="p-4 space-y-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2" size={18} style={{ color: 'var(--fg-muted)' }} />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 rounded-lg"
              style={{ border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--fg)' }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg"
            style={{ border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--fg)' }}
          >
            <option value="all">Tous les statuts</option>
            <option value="draft">Brouillon</option>
            <option value="pending_approval">En attente</option>
            <option value="approved">Approuvée</option>
            <option value="rejected">Rejetée</option>
            <option value="in_progress">En cours</option>
            <option value="completed">Terminée</option>
          </select>
        </div>

        {/* Liste des Demandes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="animate-spin" size={32} style={{ color: 'var(--brand)' }} />
            </div>
          ) : filteredDemandes.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--fg-muted)' }}>
              <FileText size={48} className="mx-auto mb-3 opacity-30" />
              <p>Aucune demande trouvée</p>
            </div>
          ) : (
            filteredDemandes.map((demande) => (
              <DemandeAchatCard
                key={demande.id}
                demande={demande}
                onClick={() => handleViewDetail(demande)}
                selected={selectedDemande?.id === demande.id}
                getStatusConfig={getStatusConfig}
              />
            ))
          )}
        </div>
      </div>

      {/* ZONE PRINCIPALE DROITE */}
      <div className="flex-1 overflow-hidden">
        {error && (
          <div className="m-4 p-4 rounded-lg" style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
            {error}
          </div>
        )}

        {view === 'list' && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center" style={{ color: 'var(--fg-subtle)' }}>
              <FileText size={64} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg">Sélectionnez une demande ou créez-en une nouvelle</p>
            </div>
          </div>
        )}

        {view === 'form' && (
          <DemandeAchatForm
            demande={selectedDemande}
            onCancel={handleBackToList}
            onSuccess={handleBackToList}
          />
        )}

        {view === 'detail' && selectedDemande && (
          <DemandeAchatDetail
            demande={selectedDemande}
            onClose={handleBackToList}
            onEdit={handleEdit}
            onUpdate={loadDemandes}
          />
        )}
      </div>
    </div>
  );
};

export default DemandeAchatDashboard;
