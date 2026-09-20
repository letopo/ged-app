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
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--brand)' }}></div>
          <p style={{ color: 'var(--fg-muted)' }}>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ background: 'var(--surface-2)' }}>
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="rounded-lg shadow-lg p-6 mb-6" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-2)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--fg)' }}>
                👥 {queueLabel}
              </h1>
              <p style={{ color: 'var(--fg-muted)' }}>
                Agent : {user?.firstName} {user?.lastName}
              </p>
            </div>

            {/* Sélection de position */}
            <div className="flex items-center gap-4">
              {!selectedPosition ? (
                <>
                  <div className="text-right mr-4">
                    <p className="text-sm mb-2" style={{ color: 'var(--fg-muted)' }}>Choisissez votre position :</p>
                  </div>
                  {[1, 2].map((posNum) => {
                    const position = positions.find(p => p.positionNumber === posNum);
                    const isOccupied = position && position.status !== 'offline' && position.userId !== user?.id;

                    return (
                      <button
                        key={posNum}
                        onClick={() => handleAssignPosition(posNum)}
                        disabled={isOccupied}
                        className="px-6 py-3 rounded-lg font-bold transition-all"
                        style={{
                          background: isOccupied ? 'var(--fg-subtle)' : 'var(--brand)',
                          color: '#fff',
                          cursor: isOccupied ? 'not-allowed' : 'pointer'
                        }}
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
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Position actuelle</p>
                    <p className="text-2xl font-bold" style={{ color: 'var(--brand)' }}>Position {selectedPosition}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {positionStatus === 'available' && (
                        <>
                          <Wifi className="w-4 h-4" style={{ color: 'var(--success)' }} />
                          <span className="text-sm font-semibold" style={{ color: 'var(--success)' }}>Disponible</span>
                        </>
                      )}
                      {positionStatus === 'busy' && (
                        <>
                          <UserCheck className="w-4 h-4" style={{ color: 'var(--warning)' }} />
                          <span className="text-sm font-semibold" style={{ color: 'var(--warning)' }}>Occupé</span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleUnassign}
                    className="px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
                    style={{ background: 'var(--danger)', color: '#fff' }}
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
                className="px-12 py-6 rounded-2xl font-bold text-2xl flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'var(--success)', color: '#fff', boxShadow: 'var(--shadow-3)' }}
              >
                <Phone className="w-8 h-8" />
                Appeler le prochain patient
              </button>
            </div>
          )}
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="rounded-lg shadow p-4" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-1)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>En attente</p>
                <p className="text-3xl font-bold" style={{ color: 'var(--warning)' }}>{queueData.stats.waiting || 0}</p>
              </div>
              <Clock className="w-12 h-12 opacity-20" style={{ color: 'var(--warning)' }} />
            </div>
          </div>

          <div className="rounded-lg shadow p-4" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-1)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>En cours</p>
                <p className="text-3xl font-bold" style={{ color: 'var(--brand)' }}>{queueData.stats.inProgress || 0}</p>
              </div>
              <UserCheck className="w-12 h-12 opacity-20" style={{ color: 'var(--brand)' }} />
            </div>
          </div>

          <div className="rounded-lg shadow p-4" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-1)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Complétés</p>
                <p className="text-3xl font-bold" style={{ color: 'var(--success)' }}>{queueData.stats.completed || 0}</p>
              </div>
              <CheckCircle className="w-12 h-12 opacity-20" style={{ color: 'var(--success)' }} />
            </div>
          </div>

          <div className="rounded-lg shadow p-4" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-1)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Total</p>
                <p className="text-3xl font-bold" style={{ color: '#7c3aed' }}>{queueData.stats.total || 0}</p>
              </div>
              <TrendingUp className="w-12 h-12 opacity-20" style={{ color: '#7c3aed' }} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* File d'attente */}
          <div className="rounded-lg shadow-lg p-6" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-2)' }}>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--fg)' }}>
              <Users className="w-6 h-6" />
              File d'attente ({queueData.tickets.filter(t => t.status === 'waiting').length})
            </h2>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {queueData.tickets.filter(t => t.status === 'waiting').length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--border)' }} />
                  <p style={{ color: 'var(--fg-muted)' }}>Aucun patient en attente</p>
                </div>
              ) : (
                queueData.tickets
                  .filter(t => t.status === 'waiting')
                  .map((ticket, index) => (
                    <div
                      key={ticket.id}
                      className="flex items-center justify-between p-4 rounded-lg"
                      style={{ background: 'var(--surface-2)', border: '2px solid var(--border)' }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--brand-soft)' }}>
                            <span className="text-xl font-bold" style={{ color: 'var(--brand)' }}>
                              {index + 1}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>
                            {ticket.ticketNumber}
                          </p>
                          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                            {getVisitTypeLabel(ticket.visitType)}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-4 h-4" style={{ color: 'var(--warning)' }} />
                            <span className="text-xs font-semibold" style={{ color: 'var(--warning)' }}>
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
          <div className="rounded-lg shadow-lg p-6" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-2)' }}>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--fg)' }}>
              <UserCheck className="w-6 h-6" />
              Patient actuel
            </h2>

            {!currentTicket ? (
              <div className="text-center py-12">
                <UserX className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--border)' }} />
                <p style={{ color: 'var(--fg-muted)' }}>Aucun patient en cours</p>
                <p className="text-sm mt-2" style={{ color: 'var(--fg-subtle)' }}>
                  Cliquez sur "Appeler le prochain patient" pour commencer
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Numéro de ticket */}
                <div className="rounded-xl p-8 text-center" style={{ background: 'var(--brand)', color: '#fff' }}>
                  <p className="text-sm opacity-90 mb-2">Numéro de ticket</p>
                  <p className="text-6xl font-bold">{currentTicket.ticketNumber}</p>
                </div>

                {/* Informations */}
                <div className="rounded-lg p-4 space-y-2" style={{ background: 'var(--surface-2)' }}>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--fg-muted)' }}>Type de visite :</span>
                    <span className="font-semibold" style={{ color: 'var(--fg)' }}>
                      {getVisitTypeLabel(currentTicket.visitType)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--fg-muted)' }}>Temps d'attente :</span>
                    <span className="font-semibold" style={{ color: 'var(--warning)' }}>
                      {getWaitingTime(currentTicket.createdAt)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--fg-muted)' }}>Position :</span>
                    <span className="font-semibold" style={{ color: 'var(--fg)' }}>
                      {currentTicket.positionNumber}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--fg-muted)' }}>Statut :</span>
                    <span className="font-semibold" style={{
                      color: currentTicket.status === 'called' ? 'var(--brand)' :
                             currentTicket.status === 'in_progress' ? 'var(--success)' :
                             'var(--fg-muted)'
                    }}>
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
                      className="w-full px-6 py-4 rounded-lg font-bold flex items-center justify-center gap-2"
                      style={{ background: 'var(--success)', color: '#fff' }}
                    >
                      <Play className="w-5 h-5" />
                      Démarrer le traitement
                    </button>
                  )}

                  {currentTicket.status === 'in_progress' && (
                    <button
                      onClick={handleTransferToCaisse}
                      className="w-full px-6 py-4 rounded-lg font-bold flex items-center justify-center gap-2"
                      style={{ background: 'var(--brand)', color: '#fff' }}
                    >
                      <DollarSign className="w-5 h-5" />
                      Transférer à la caisse
                    </button>
                  )}

                  <button
                    onClick={handleCancelTicket}
                    className="w-full px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
                    style={{ background: 'var(--danger)', color: '#fff' }}
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
