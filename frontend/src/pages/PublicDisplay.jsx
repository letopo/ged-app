// frontend/src/pages/PublicDisplay.jsx

import { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  ArrowRight,
  Clock,
  Activity
} from 'lucide-react';
import { ticketAPI } from '../services/api';
import { 
  getSocket, 
  joinQueue, 
  onTicketCalled,
  offSocketEvent 
} from '../services/api';

export default function PublicDisplay() {
  const [displayData, setDisplayData] = useState({
    accueil_php: {
      current: null,
      waiting: [],
      stats: {}
    },
    accueil_normal: {
      current: null,
      waiting: [],
      stats: {}
    }
  });
  
  const [lastCalled, setLastCalled] = useState(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const audioRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Mettre à jour l'heure toutes les secondes
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Charger les données initiales
  useEffect(() => {
    loadAllQueues();
    
    // Actualiser toutes les 30 secondes
    const interval = setInterval(loadAllQueues, 30000);
    return () => clearInterval(interval);
  }, []);

  // Socket.IO - Écouter les appels en temps réel
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Rejoindre les deux files
    joinQueue('accueil_php');
    joinQueue('accueil_normal');

    const handleTicketCalled = (data) => {
      console.log('📢 Ticket appelé (affichage public):', data);
      
      // Afficher l'animation
      setLastCalled({
        ticketNumber: data.ticketNumber,
        queueType: data.queueType,
        positionNumber: data.positionNumber
      });
      setShowAnimation(true);

      // Jouer le son
      if (audioRef.current) {
        audioRef.current.play().catch(err => console.log('Son non disponible'));
      }

      // Masquer l'animation après 10 secondes
      setTimeout(() => {
        setShowAnimation(false);
      }, 10000);

      // Recharger les données
      loadAllQueues();
    };

    onTicketCalled(handleTicketCalled);

    return () => {
      offSocketEvent('ticket_called', handleTicketCalled);
    };
  }, []);

  // Charger toutes les files
  const loadAllQueues = async () => {
    try {
      const [phpResponse, normalResponse] = await Promise.all([
        ticketAPI.getQueue('accueil_php'),
        ticketAPI.getQueue('accueil_normal')
      ]);

      const phpData = phpResponse.data.data;
      const normalData = normalResponse.data.data;

      setDisplayData({
        accueil_php: {
          current: phpData.tickets.find(t => t.status === 'called' || t.status === 'in_progress'),
          waiting: phpData.tickets.filter(t => t.status === 'waiting').slice(0, 5),
          stats: phpData.stats
        },
        accueil_normal: {
          current: normalData.tickets.find(t => t.status === 'called' || t.status === 'in_progress'),
          waiting: normalData.tickets.filter(t => t.status === 'waiting').slice(0, 5),
          stats: normalData.stats
        }
      });
    } catch (error) {
      console.error('Erreur chargement files:', error);
    }
  };

  const getQueueLabel = (queueType) => {
    return queueType === 'accueil_php' ? 'ACCUEIL PHP' : 'ACCUEIL NORMAL';
  };

  const getQueueColor = (queueType) => {
    return queueType === 'accueil_php' ? 'blue' : 'green';
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-8">
      {/* Audio pour notification */}
      <audio ref={audioRef} src="/notification.mp3" preload="auto" />

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          🏥 Hôpital Saint Jean de Malte
        </h1>
        <div className="flex items-center justify-center gap-8 text-2xl text-gray-300">
          <div className="flex items-center gap-2">
            <Clock className="w-6 h-6" />
            <span>{formatTime(currentTime)}</span>
          </div>
          <div>•</div>
          <div>{formatDate(currentTime)}</div>
        </div>
      </div>

      {/* Animation d'appel (plein écran) */}
      {showAnimation && lastCalled && (
        <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center animate-fade-in">
          <div className="text-center animate-scale-in">
            <div className={`inline-block px-12 py-6 rounded-3xl mb-8 ${
              lastCalled.queueType === 'accueil_php' 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
                : 'bg-gradient-to-r from-green-500 to-green-600'
            }`}>
              <p className="text-3xl font-semibold mb-2 opacity-90">
                {getQueueLabel(lastCalled.queueType)}
              </p>
            </div>
            
            <div className="mb-8">
              <p className="text-6xl font-bold mb-4 text-gray-300">Ticket appelé :</p>
              <p className="text-[180px] font-black leading-none tracking-tight animate-pulse">
                {lastCalled.ticketNumber}
              </p>
            </div>

            <div className="flex items-center justify-center gap-6 text-5xl font-bold">
              <span className="text-gray-400">Présentez-vous à</span>
              <ArrowRight className="w-16 h-16 text-yellow-400 animate-bounce-horizontal" />
              <span className={`px-8 py-4 rounded-2xl ${
                lastCalled.queueType === 'accueil_php'
                  ? 'bg-blue-600'
                  : 'bg-green-600'
              }`}>
                Position {lastCalled.positionNumber}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Grille des files d'attente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        
        {/* File Accueil PHP */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl shadow-2xl border-4 border-blue-500 p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-4xl font-bold text-blue-400">🔵 ACCUEIL PHP</h2>
            <div className="flex items-center gap-2 text-blue-400">
              <Activity className="w-8 h-8 animate-pulse" />
              <span className="text-2xl font-semibold">EN DIRECT</span>
            </div>
          </div>

          {/* Ticket actuel */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-8 mb-6">
            <p className="text-2xl font-semibold mb-4 opacity-90">Ticket actuel :</p>
            {displayData.accueil_php.current ? (
              <div className="flex items-center justify-between">
                <p className="text-8xl font-black">{displayData.accueil_php.current.ticketNumber}</p>
                <div className="text-right">
                  <p className="text-xl opacity-90 mb-2">Position</p>
                  <p className="text-6xl font-bold">{displayData.accueil_php.current.positionNumber}</p>
                </div>
              </div>
            ) : (
              <p className="text-5xl font-bold text-center opacity-70">- - -</p>
            )}
          </div>

          {/* File d'attente */}
          <div className="bg-gray-800/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6" />
                En attente
              </h3>
              <span className="px-4 py-2 bg-yellow-500 text-gray-900 rounded-full text-xl font-bold">
                {displayData.accueil_php.stats.waiting || 0}
              </span>
            </div>
            
            <div className="space-y-3">
              {displayData.accueil_php.waiting.length === 0 ? (
                <p className="text-center text-gray-500 text-xl py-4">Aucun ticket en attente</p>
              ) : (
                displayData.accueil_php.waiting.map((ticket, index) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between bg-gray-700/50 rounded-xl p-4 border-2 border-gray-600"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-xl font-bold">{index + 1}</span>
                      </div>
                      <p className="text-4xl font-bold">{ticket.ticketNumber}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* File Accueil Normal */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl shadow-2xl border-4 border-green-500 p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-4xl font-bold text-green-400">🟢 ACCUEIL NORMAL</h2>
            <div className="flex items-center gap-2 text-green-400">
              <Activity className="w-8 h-8 animate-pulse" />
              <span className="text-2xl font-semibold">EN DIRECT</span>
            </div>
          </div>

          {/* Ticket actuel */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-8 mb-6">
            <p className="text-2xl font-semibold mb-4 opacity-90">Ticket actuel :</p>
            {displayData.accueil_normal.current ? (
              <div className="flex items-center justify-between">
                <p className="text-8xl font-black">{displayData.accueil_normal.current.ticketNumber}</p>
                <div className="text-right">
                  <p className="text-xl opacity-90 mb-2">Position</p>
                  <p className="text-6xl font-bold">{displayData.accueil_normal.current.positionNumber}</p>
                </div>
              </div>
            ) : (
              <p className="text-5xl font-bold text-center opacity-70">- - -</p>
            )}
          </div>

          {/* File d'attente */}
          <div className="bg-gray-800/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6" />
                En attente
              </h3>
              <span className="px-4 py-2 bg-yellow-500 text-gray-900 rounded-full text-xl font-bold">
                {displayData.accueil_normal.stats.waiting || 0}
              </span>
            </div>
            
            <div className="space-y-3">
              {displayData.accueil_normal.waiting.length === 0 ? (
                <p className="text-center text-gray-500 text-xl py-4">Aucun ticket en attente</p>
              ) : (
                displayData.accueil_normal.waiting.map((ticket, index) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between bg-gray-700/50 rounded-xl p-4 border-2 border-gray-600"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-xl font-bold">{index + 1}</span>
                      </div>
                      <p className="text-4xl font-bold">{ticket.ticketNumber}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer avec statistiques globales */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-3xl shadow-2xl border-2 border-gray-700 p-6">
        <div className="grid grid-cols-4 gap-6 text-center">
          <div>
            <p className="text-gray-400 text-lg mb-2">PHP - En attente</p>
            <p className="text-5xl font-bold text-blue-400">{displayData.accueil_php.stats.waiting || 0}</p>
          </div>
          <div>
            <p className="text-gray-400 text-lg mb-2">Normal - En attente</p>
            <p className="text-5xl font-bold text-green-400">{displayData.accueil_normal.stats.waiting || 0}</p>
          </div>
          <div>
            <p className="text-gray-400 text-lg mb-2">Total traités (PHP)</p>
            <p className="text-5xl font-bold text-purple-400">{displayData.accueil_php.stats.completed || 0}</p>
          </div>
          <div>
            <p className="text-gray-400 text-lg mb-2">Total traités (Normal)</p>
            <p className="text-5xl font-bold text-purple-400">{displayData.accueil_normal.stats.completed || 0}</p>
          </div>
        </div>
      </div>

      {/* Style pour les animations */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes scale-in {
          from { 
            transform: scale(0.8);
            opacity: 0;
          }
          to { 
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes bounce-horizontal {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(10px); }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.5s ease-out;
        }

        .animate-bounce-horizontal {
          animation: bounce-horizontal 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}