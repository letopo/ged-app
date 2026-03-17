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
      draft: { label: 'Brouillon', icon: FileText, color: 'gray', bgColor: 'bg-gray-100 dark:bg-gray-800', textColor: 'text-gray-700 dark:text-gray-300' },
      pending_approval: { label: 'En attente', icon: Clock, color: 'yellow', bgColor: 'bg-yellow-100 dark:bg-yellow-900/20', textColor: 'text-yellow-700 dark:text-yellow-400' },
      approved: { label: 'Approuvée', icon: CheckCircle, color: 'green', bgColor: 'bg-green-100 dark:bg-green-900/20', textColor: 'text-green-700 dark:text-green-400' },
      rejected: { label: 'Rejetée', icon: XCircle, color: 'red', bgColor: 'bg-red-100 dark:bg-red-900/20', textColor: 'text-red-700 dark:text-red-400' },
      in_progress: { label: 'En cours', icon: AlertCircle, color: 'blue', bgColor: 'bg-blue-100 dark:bg-blue-900/20', textColor: 'text-blue-700 dark:text-blue-400' },
      completed: { label: 'Terminée', icon: CheckCircle, color: 'green', bgColor: 'bg-green-100 dark:bg-green-900/20', textColor: 'text-green-700 dark:text-green-400' },
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
    <div className="flex h-screen bg-gray-50 dark:bg-dark-bg">
      {/* SIDEBAR GAUCHE */}
      <div className="w-80 bg-white dark:bg-dark-surface border-r border-gray-200 dark:border-dark-border flex flex-col">
        {/* Header Sidebar */}
        <div className="p-4 border-b border-gray-200 dark:border-dark-border">
          <button
            onClick={handleCreateNew}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold transition shadow-md"
          >
            <Plus size={20} />
            Nouvelle Demande d'Achat
          </button>
        </div>

        {/* Filtres */}
        <div className="p-4 border-b border-gray-200 dark:border-dark-border space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-dark-border dark:bg-dark-bg dark:text-dark-text rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border dark:bg-dark-bg dark:text-dark-text rounded-lg focus:ring-2 focus:ring-blue-500"
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
              <Loader className="animate-spin text-blue-600" size={32} />
            </div>
          ) : filteredDemandes.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
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
          <div className="m-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded-lg">
            {error}
          </div>
        )}

        {view === 'list' && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-400 dark:text-gray-600">
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