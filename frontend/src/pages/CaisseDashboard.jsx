// frontend/src/pages/CaisseDashboard.jsx

import { useState, useEffect } from 'react';
import { 
  DollarSign,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Wifi,
  WifiOff,
  TrendingUp,
  Phone,
  Calculator
} from 'lucide-react';
import { ticketAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  getSocket,
  joinQueue,
  joinPosition,
  leavePosition,
  onTicketCreated,
  onQueueUpdate,
  offSocketEvent
} from '../services/api';
import toast from 'react-hot-toast';

export default function CaisseDashboard() {
  const { user } = useAuth();
  const queueType = 'caisse';
  
  // États
  const [isOnline, setIsOnline] = useState(false);
  const [queueData, setQueueData] = useState({ tickets: [], stats: {} });
  const [currentTicket, setCurrentTicket] = useState(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [positionId, setPositionId] = useState(null);

  // Charger les données initiales
  useEffect(() => {
    loadQueueData();
    loadPosition();
    
    const interval = setInterval(() => {
      loadQueueData();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Socket.IO
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    joinQueue(queueType);

    const handleTicketCreated = (data) => {
      if (data.queueType === queueType) {
        console.log('🎫 Nouveau ticket à la caisse:', data);
        loadQueueData();
      }
    };

    const handleQueueUpdate = (data) => {
      if (data.queueType === queueType) {
        console.log('🔄 File caisse mise à jour:', data);
        loadQueueData();
      }
    };

    onTicketCreated(handleTicketCreated);
    onQueueUpdate(handleQueueUpdate);

    return () => {
      offSocketEvent('ticket_created', handleTicketCreated);
      offSocketEvent('queue_update', handleQueueUpdate);
    };
  }, []);

  // Charger la file
  const loadQueueData = async () => {
    try {
      const response = await ticketAPI.getQueue(queueType);
      setQueueData(response.data.data);
    } catch (error) {
      console.error('Erreur chargement file:', error);
    }
  };

  // Charger la position caisse
  const loadPosition = async () => {
    try {
      const response = await ticketAPI.getQueuePositions(queueType);
      const position = response.data.data[0]; // Il n'y a qu'une seule position caisse
      
      if (position && position.userId === user?.id) {
        setIsOnline(true);
        setPositionId(position.id);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement position:', error);
      setLoading(false);
    }
  };

  // Se connecter
  const handleGoOnline = async () => {
    try {
      await ticketAPI.assignToPosition({
        queueType,
        positionNumber: 1
      });

      setIsOnline(true);
      joinPosition(queueType, 1);
      
      loadPosition();
      toast.success('Vous êtes maintenant en ligne');
    } catch (error) {
      toast('Erreur: ' + (error.response?.data?.error || 'Erreur inconnue'));
    }
  };

  // Se déconnecter
  const handleGoOffline = async () => {
    if (!positionId) return;

    try {
      await ticketAPI.unassignFromPosition(positionId);
      
      leavePosition(queueType, 1);
      setIsOnline(false);
      setPositionId(null);
      setCurrentTicket(null);
      
      loadPosition();
      toast.success('Vous êtes maintenant hors ligne');
    } catch (error) {
      toast('Erreur: ' + (error.response?.data?.error || 'Erreur inconnue'));
    }
  };

  // Appeler le prochain
  const handleCallNext = async () => {
    if (!isOnline) {
      toast('Veuillez d\'abord vous connecter', { icon: '⚠️' });
      return;
    }

    try {
      setLoading(true);
      const response = await ticketAPI.callNextPatient({
        queueType,
        positionNumber: 1
      });

      const ticket = response.data.data;
      setCurrentTicket(ticket);
      setAmount('');
      
      loadQueueData();
      toast(`📢 Ticket ${ticket.ticketNumber} appelé !`);
    } catch (error) {
      toast('Erreur: ' + (error.response?.data?.error || 'Aucun ticket en attente'));
    } finally {
      setLoading(false);
    }
  };

  // Compléter le paiement
  const handleCompletePayment = async () => {
    if (!currentTicket) return;
    if (!amount || parseFloat(amount) <= 0) {
      toast('Veuillez saisir un montant valide', { icon: '⚠️' });
      return;
    }

    try {
      await ticketAPI.completeTicket(currentTicket.id, {
        amount: parseFloat(amount),
        paymentMethod: 'cash' // À adapter selon vos besoins
      });

      setCurrentTicket(null);
      setAmount('');
      
      loadQueueData();
      toast.success('Paiement enregistré avec succès');
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
        reason: 'Annulé à la caisse'
      });

      setCurrentTicket(null);
      setAmount('');
      
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
                💰 Caisse
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Caissier : {user?.firstName} {user?.lastName}
              </p>
            </div>

            {/* Statut connexion */}
            <div className="flex items-center gap-4">
              {!isOnline ? (
                <button
                  onClick={handleGoOnline}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold flex items-center gap-2"
                >
                  <Wifi className="w-5 h-5" />
                  Se connecter
                </button>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Statut</p>
                    <div className="flex items-center gap-2">
                      <Wifi className="w-5 h-5 text-green-500" />
                      <span className="text-lg font-bold text-green-600">En ligne</span>
                    </div>
                  </div>
                  <button
                    onClick={handleGoOffline}
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
          {isOnline && !currentTicket && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleCallNext}
                disabled={queueData.stats.waiting === 0}
                className="px-12 py-6 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-2xl font-bold text-2xl flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all hover:scale-105 shadow-xl"
              >
                <Phone className="w-8 h-8" />
                Appeler le prochain
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
              <DollarSign className="w-12 h-12 text-blue-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Traités</p>
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
              Patients à la caisse ({queueData.tickets.filter(t => t.status === 'waiting').length})
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
                      className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/10 rounded-lg border-2 border-purple-200 dark:border-purple-700"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                            <span className="text-xl font-bold text-purple-600 dark:text-purple-300">
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

          {/* Paiement en cours */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Calculator className="w-6 h-6" />
              Paiement en cours
            </h2>

            {!currentTicket ? (
              <div className="text-center py-12">
                <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Aucun paiement en cours</p>
                <p className="text-sm text-gray-400 mt-2">
                  Cliquez sur "Appeler le prochain" pour commencer
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Numéro de ticket */}
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl p-8 text-center">
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
                    <span className="text-gray-600 dark:text-gray-400">Temps total :</span>
                    <span className="font-semibold text-orange-600">
                      {getWaitingTime(currentTicket.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Saisie du montant */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Montant à payer (FCFA)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Saisir le montant"
                    className="w-full px-4 py-4 text-2xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <button
                    onClick={handleCompletePayment}
                    disabled={!amount || parseFloat(amount) <= 0}
                    className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Valider le paiement
                  </button>

                  <button
                    onClick={handleCancelTicket}
                    className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-5 h-5" />
                    Annuler
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