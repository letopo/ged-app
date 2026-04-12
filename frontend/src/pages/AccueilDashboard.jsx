// frontend/src/pages/AccueilDashboard.jsx

import { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  Phone, 
  CheckCircle, 
  XCircle,
  Clock,
  DollarSign,
  Play,
  UserX,
  Wifi,
  WifiOff,
  TrendingUp
} from 'lucide-react';
import { ticketAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  getSocket,
  joinQueue,
  joinPosition,
  leavePosition,
  onTicketCreated,
  onTicketCalled,
  onQueueUpdate,
  onPositionUpdate,
  offSocketEvent
} from '../services/api';
import toast from 'react-hot-toast';

export default function AccueilDashboard() {
  const { user } = useAuth();
  
  // Déterminer la file selon le rôle
  const queueType = user?.role === 'agent_accueil_php' ? 'accueil_php' : 'accueil_normal';
  const queueLabel = queueType === 'accueil_php' ? 'Accueil PHP' : 'Accueil Normal';
  
  // États
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [positionStatus, setPositionStatus] = useState('offline'); // offline, available, busy
  const [queueData, setQueueData] = useState({ tickets: [], stats: {} });
  const [currentTicket, setCurrentTicket] = useState(null);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Charger les données initiales
  useEffect(() => {
    loadQueueData();
    loadPositions();
    
    // Actualiser toutes les 10 secondes
    const interval = setInterval(() => {
      loadQueueData();
      loadPositions();
    }, 10000);

    return () => clearInterval(interval);
  }, [queueType]);

  // Socket.IO - Écouter les événements en temps réel
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Rejoindre la file
    joinQueue(queueType);

    // Écouter les événements
    const handleTicketCreated = (data) => {
      if (data.queueType === queueType) {
        console.log('🎫 Nouveau ticket créé:', data);
        loadQueueData();
      }
    };

    const handleTicketCalled = (data) => {
      if (data.queueType === queueType) {
        console.log('📢 Ticket appelé:', data);
        loadQueueData();
      }
    };

    const handleQueueUpdate = (data) => {
      if (data.queueType === queueType) {
        console.log('🔄 File mise à jour:', data);
        loadQueueData();
      }
    };

    onTicketCreated(handleTicketCreated);
    onTicketCalled(handleTicketCalled);
    onQueueUpdate(handleQueueUpdate);

    return () => {
      offSocketEvent('ticket_created', handleTicketCreated);
      offSocketEvent('ticket_called', handleTicketCalled);
      offSocketEvent('queue_update', handleQueueUpdate);
    };
  }, [queueType]);

  // Charger la file d'attente
  const loadQueueData = async () => {
    try {
      const response = await ticketAPI.getQueue(queueType);
      setQueueData(response.data.data);
    } catch (error) {
      console.error('Erreur chargement file:', error);
    }
  };

  // Charger les positions
  const loadPositions = async () => {
    try {
      const response = await ticketAPI.getQueuePositions(queueType);
      setPositions(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement positions:', error);
      setLoading(false);
    }
  };

  // S'assigner à une position
  const handleAssignPosition = async (positionNumber) => {
    try {
      await ticketAPI.assignToPosition({
        queueType,
        positionNumber
      });

      setSelectedPosition(positionNumber);
      setPositionStatus('available');
      
      // Rejoindre la position via Socket.IO
      joinPosition(queueType, positionNumber);
      
      loadPositions();
      toast.success(`Vous êtes maintenant en Position ${positionNumber}`);
    } catch (error) {
      toast('Erreur lors de l\'assignation: ' + (error.response?.data?.error || 'Erreur inconnue'));
    }
  };

  // Se désassigner
  const handleUnassign = async () => {
    if (!selectedPosition) return;

    try {
      const position = positions.find(p => p.positionNumber === selectedPosition);
      if (!position) return;

      await ticketAPI.unassignFromPosition(position.id);
      
      // Quitter la position via Socket.IO
      leavePosition(queueType, selectedPosition);
      
      setSelectedPosition(null);
      setPositionStatus('offline');
      setCurrentTicket(null);
      
      loadPositions();
      toast.success('Vous êtes maintenant hors ligne');
    } catch (error) {
      toast('Erreur lors de la déconnexion: ' + (error.response?.data?.error || 'Erreur inconnue'));
    }
  };

  // Appeler le prochain patient
  const handleCallNext = async () => {
    if (!selectedPosition) {
      toast('Veuillez d\'abord vous assigner à une position', { icon: '⚠️' });
      return;
    }

    try {
      setLoading(true);
      const response = await ticketAPI.callNextPatient({
        queueType,
        positionNumber: selectedPosition
      });

      const ticket = response.data.data;
      setCurrentTicket(ticket);
      setPositionStatus('busy');
      
      loadQueueData();
      toast(`📢 Ticket ${ticket.ticketNumber} appelé !`);
    } catch (error) {
      toast('Erreur: ' + (error.response?.data?.error || 'Aucun ticket en attente'));
    } finally {
      setLoading(false);
    }
  };

  // Démarrer le traitement
  const handleStartTreatment = async () => {
    if (!currentTicket) return;

    try {
      await ticketAPI.startTreatment(currentTicket.id);
      loadQueueData();
      toast.success('Traitement démarré');
    } catch (error) {
      toast('Erreur: ' + (error.response?.data?.error || 'Erreur inconnue'));
    }
  };

  // Transférer à la caisse
  const handleTransferToCaisse = async () => {
    if (!currentTicket) return;

    try {
      await ticketAPI.transferToCaisse(currentTicket.id, {
        amount: 0 // Optionnel : montant si connu
      });

      setCurrentTicket(null);
      setPositionStatus('available');
      
      loadQueueData();
      toast.success('Patient transféré à la caisse');
    } catch (error) {
      toast('Erreur: ' + (error.response?.data?.error || 'Erreur inconnue'));
    }
  };

  // Annuler le ticket
  const handleCancelTicket = async () => {
    if (!currentTicket) return;
    if (!confirm('Êtes-vous sûr de vouloir annuler ce ticket ?')) return;

    try {
      await ticketAPI.cancelTicket(currentTicket.id, {
        reason: 'Annulé par l\'agent'
      });

      setCurrentTicket(null);
      setPositionStatus('available');
      
      loadQueueData();
      toast.success('Ticket annulé');
    } catch (error) {
      toast('Erreur: ' + (error.response?.data?.error || 'Erreur inconnue'));
    }
  };

  const getVisitTypeLabel = (type) => {
    const labels = {
      consultation: 'Consultation',
      visite: 'Visite Patient',
      garde_malade: 'Garde Malade'
    };
    return labels[type] || type;
  };

  const getWaitingTime = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Moins d\'1 min';
    if (diffMins < 60) return `${diffMins} min`;
    
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}min`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                👥 {queueLabel}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Agent : {user?.firstName} {user?.lastName}
              </p>
            </div>

            {/* Sélection de position */}
            <div className="flex items-center gap-4">
              {!selectedPosition ? (
                <>
                  <div className="text-right mr-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Choisissez votre position :</p>
                  </div>
                  {[1, 2].map((posNum) => {
                    const position = positions.find(p => p.positionNumber === posNum);
                    const isOccupied = position && position.status !== 'offline' && position.userId !== user?.id;
                    
                    return (
                      <button
                        key={posNum}
                        onClick={() => handleAssignPosition(posNum)}
                        disabled={isOccupied}
                        className={`px-6 py-3 rounded-lg font-bold text-white transition-all ${
                          isOccupied
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 hover:scale-105'
                        }`}
                      >
                        Position {posNum}
                        {isOccupied && ' (Occupée)'}
                      </button>
                    );
                  })}
                </>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Position actuelle</p>
                    <p className="text-2xl font-bold text-blue-600">Position {selectedPosition}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {positionStatus === 'available' && (
                        <>
                          <Wifi className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-600 font-semibold">Disponible</span>
                        </>
                      )}
                      {positionStatus === 'busy' && (
                        <>
                          <UserCheck className="w-4 h-4 text-orange-500" />
                          <span className="text-sm text-orange-600 font-semibold">Occupé</span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleUnassign}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold flex items-center gap-2"
                  >
                    <WifiOff className="w-5 h-5" />
                    Se déconnecter
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Bouton Appeler le prochain */}
          {selectedPosition && positionStatus === 'available' && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleCallNext}
                disabled={queueData.stats.waiting === 0}
                className="px-12 py-6 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-2xl font-bold text-2xl flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all hover:scale-105 shadow-xl"
              >
                <Phone className="w-8 h-8" />
                Appeler le prochain patient
              </button>
            </div>
          )}
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">En attente</p>
                <p className="text-3xl font-bold text-yellow-600">{queueData.stats.waiting || 0}</p>
              </div>
              <Clock className="w-12 h-12 text-yellow-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">En cours</p>
                <p className="text-3xl font-bold text-blue-600">{queueData.stats.inProgress || 0}</p>
              </div>
              <UserCheck className="w-12 h-12 text-blue-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Complétés</p>
                <p className="text-3xl font-bold text-green-600">{queueData.stats.completed || 0}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                <p className="text-3xl font-bold text-purple-600">{queueData.stats.total || 0}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-purple-600 opacity-20" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* File d'attente */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Users className="w-6 h-6" />
              File d'attente ({queueData.tickets.filter(t => t.status === 'waiting').length})
            </h2>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {queueData.tickets.filter(t => t.status === 'waiting').length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Aucun patient en attente</p>
                </div>
              ) : (
                queueData.tickets
                  .filter(t => t.status === 'waiting')
                  .map((ticket, index) => (
                    <div
                      key={ticket.id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                            <span className="text-xl font-bold text-blue-600 dark:text-blue-300">
                              {index + 1}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {ticket.ticketNumber}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {getVisitTypeLabel(ticket.visitType)}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-4 h-4 text-orange-500" />
                            <span className="text-xs text-orange-600 font-semibold">
                              {getWaitingTime(ticket.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* Patient actuel */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <UserCheck className="w-6 h-6" />
              Patient actuel
            </h2>

            {!currentTicket ? (
              <div className="text-center py-12">
                <UserX className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Aucun patient en cours</p>
                <p className="text-sm text-gray-400 mt-2">
                  Cliquez sur "Appeler le prochain patient" pour commencer
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Numéro de ticket */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-8 text-center">
                  <p className="text-sm opacity-90 mb-2">Numéro de ticket</p>
                  <p className="text-6xl font-bold">{currentTicket.ticketNumber}</p>
                </div>

                {/* Informations */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Type de visite :</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {getVisitTypeLabel(currentTicket.visitType)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Temps d'attente :</span>
                    <span className="font-semibold text-orange-600">
                      {getWaitingTime(currentTicket.createdAt)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Position :</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {currentTicket.positionNumber}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Statut :</span>
                    <span className={`font-semibold ${
                      currentTicket.status === 'called' ? 'text-blue-600' : 
                      currentTicket.status === 'in_progress' ? 'text-green-600' : 
                      'text-gray-600'
                    }`}>
                      {currentTicket.status === 'called' && 'Appelé'}
                      {currentTicket.status === 'in_progress' && 'En cours'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  {currentTicket.status === 'called' && (
                    <button
                      onClick={handleStartTreatment}
                      className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold flex items-center justify-center gap-2"
                    >
                      <Play className="w-5 h-5" />
                      Démarrer le traitement
                    </button>
                  )}

                  {currentTicket.status === 'in_progress' && (
                    <button
                      onClick={handleTransferToCaisse}
                      className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-2"
                    >
                      <DollarSign className="w-5 h-5" />
                      Transférer à la caisse
                    </button>
                  )}

                  <button
                    onClick={handleCancelTicket}
                    className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-5 h-5" />
                    Annuler le ticket
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}