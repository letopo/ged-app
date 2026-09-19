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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #111827 0%, #1f2937 50%, #111827 100%)', color: '#fff', padding: 32 }}>
      {/* Audio pour notification */}
      <audio ref={audioRef} src="/notification.mp3" preload="auto" />

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 60, fontWeight: 700, marginBottom: 16, background: 'linear-gradient(to right, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          🏥 Hôpital Saint Jean de Malte
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, fontSize: 22, color: '#d1d5db' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock style={{ width: 24, height: 24 }} />
            <span>{formatTime(currentTime)}</span>
          </div>
          <div>•</div>
          <div>{formatDate(currentTime)}</div>
        </div>
      </div>

      {/* Animation d'appel (plein écran) */}
      {showAnimation && lastCalled && (
        <div className="animate-fade-in" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="animate-scale-in" style={{ textAlign: 'center' }}>
            <div style={{
              display: 'inline-block',
              padding: '24px 48px',
              borderRadius: 24,
              marginBottom: 32,
              background: lastCalled.queueType === 'accueil_php'
                ? 'linear-gradient(to right, #3b82f6, #2563eb)'
                : 'linear-gradient(to right, #22c55e, #16a34a)'
            }}>
              <p style={{ fontSize: 28, fontWeight: 600, marginBottom: 8, opacity: 0.9 }}>
                {getQueueLabel(lastCalled.queueType)}
              </p>
            </div>

            <div style={{ marginBottom: 32 }}>
              <p style={{ fontSize: 60, fontWeight: 700, marginBottom: 16, color: '#d1d5db' }}>Ticket appelé :</p>
              <p className="animate-pulse" style={{ fontSize: 180, fontWeight: 900, lineHeight: 1, letterSpacing: '-2px' }}>
                {lastCalled.ticketNumber}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, fontSize: 48, fontWeight: 700 }}>
              <span style={{ color: '#9ca3af' }}>Présentez-vous à</span>
              <ArrowRight className="animate-bounce-horizontal" style={{ width: 64, height: 64, color: '#fbbf24' }} />
              <span style={{
                padding: '16px 32px',
                borderRadius: 16,
                background: lastCalled.queueType === 'accueil_php' ? '#2563eb' : '#16a34a'
              }}>
                Position {lastCalled.positionNumber}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Grille des files d'attente */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 32, marginBottom: 32 }}>

        {/* File Accueil PHP */}
        <div style={{ background: 'linear-gradient(135deg, #1f2937, #111827)', borderRadius: 24, boxShadow: '0 25px 50px rgba(0,0,0,0.5)', border: '4px solid #3b82f6', padding: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <h2 style={{ fontSize: 36, fontWeight: 700, color: '#60a5fa', margin: 0 }}>🔵 ACCUEIL PHP</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#60a5fa' }}>
              <Activity className="animate-pulse" style={{ width: 32, height: 32 }} />
              <span style={{ fontSize: 22, fontWeight: 600 }}>EN DIRECT</span>
            </div>
          </div>

          {/* Ticket actuel */}
          <div style={{ background: 'linear-gradient(to right, #3b82f6, #2563eb)', borderRadius: 16, padding: 32, marginBottom: 24 }}>
            <p style={{ fontSize: 22, fontWeight: 600, marginBottom: 16, opacity: 0.9 }}>Ticket actuel :</p>
            {displayData.accueil_php.current ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 96, fontWeight: 900, margin: 0 }}>{displayData.accueil_php.current.ticketNumber}</p>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 20, opacity: 0.9, marginBottom: 8 }}>Position</p>
                  <p style={{ fontSize: 60, fontWeight: 700, margin: 0 }}>{displayData.accueil_php.current.positionNumber}</p>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 48, fontWeight: 700, textAlign: 'center', opacity: 0.7, margin: 0 }}>- - -</p>
            )}
          </div>

          {/* File d'attente */}
          <div style={{ background: 'rgba(31,41,55,0.5)', borderRadius: 16, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                <Users style={{ width: 24, height: 24 }} />
                En attente
              </h3>
              <span style={{ padding: '6px 16px', background: '#eab308', color: '#111827', borderRadius: 9999, fontSize: 20, fontWeight: 700 }}>
                {displayData.accueil_php.stats.waiting || 0}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {displayData.accueil_php.waiting.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#6b7280', fontSize: 20, padding: '16px 0', margin: 0 }}>Aucun ticket en attente</p>
              ) : (
                displayData.accueil_php.waiting.map((ticket, index) => (
                  <div
                    key={ticket.id}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(55,65,81,0.5)', borderRadius: 12, padding: 16, border: '2px solid #4b5563' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 48, height: 48, background: '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 20, fontWeight: 700 }}>{index + 1}</span>
                      </div>
                      <p style={{ fontSize: 36, fontWeight: 700, margin: 0 }}>{ticket.ticketNumber}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* File Accueil Normal */}
        <div style={{ background: 'linear-gradient(135deg, #1f2937, #111827)', borderRadius: 24, boxShadow: '0 25px 50px rgba(0,0,0,0.5)', border: '4px solid #22c55e', padding: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <h2 style={{ fontSize: 36, fontWeight: 700, color: '#4ade80', margin: 0 }}>🟢 ACCUEIL NORMAL</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4ade80' }}>
              <Activity className="animate-pulse" style={{ width: 32, height: 32 }} />
              <span style={{ fontSize: 22, fontWeight: 600 }}>EN DIRECT</span>
            </div>
          </div>

          {/* Ticket actuel */}
          <div style={{ background: 'linear-gradient(to right, #22c55e, #16a34a)', borderRadius: 16, padding: 32, marginBottom: 24 }}>
            <p style={{ fontSize: 22, fontWeight: 600, marginBottom: 16, opacity: 0.9 }}>Ticket actuel :</p>
            {displayData.accueil_normal.current ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 96, fontWeight: 900, margin: 0 }}>{displayData.accueil_normal.current.ticketNumber}</p>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 20, opacity: 0.9, marginBottom: 8 }}>Position</p>
                  <p style={{ fontSize: 60, fontWeight: 700, margin: 0 }}>{displayData.accueil_normal.current.positionNumber}</p>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 48, fontWeight: 700, textAlign: 'center', opacity: 0.7, margin: 0 }}>- - -</p>
            )}
          </div>

          {/* File d'attente */}
          <div style={{ background: 'rgba(31,41,55,0.5)', borderRadius: 16, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                <Users style={{ width: 24, height: 24 }} />
                En attente
              </h3>
              <span style={{ padding: '6px 16px', background: '#eab308', color: '#111827', borderRadius: 9999, fontSize: 20, fontWeight: 700 }}>
                {displayData.accueil_normal.stats.waiting || 0}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {displayData.accueil_normal.waiting.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#6b7280', fontSize: 20, padding: '16px 0', margin: 0 }}>Aucun ticket en attente</p>
              ) : (
                displayData.accueil_normal.waiting.map((ticket, index) => (
                  <div
                    key={ticket.id}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(55,65,81,0.5)', borderRadius: 12, padding: 16, border: '2px solid #4b5563' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 48, height: 48, background: '#22c55e', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 20, fontWeight: 700 }}>{index + 1}</span>
                      </div>
                      <p style={{ fontSize: 36, fontWeight: 700, margin: 0 }}>{ticket.ticketNumber}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer avec statistiques globales */}
      <div style={{ background: 'linear-gradient(to right, #1f2937, #111827)', borderRadius: 24, boxShadow: '0 25px 50px rgba(0,0,0,0.5)', border: '2px solid #374151', padding: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, textAlign: 'center' }}>
          <div>
            <p style={{ color: '#9ca3af', fontSize: 18, marginBottom: 8 }}>PHP - En attente</p>
            <p style={{ fontSize: 48, fontWeight: 700, color: '#60a5fa', margin: 0 }}>{displayData.accueil_php.stats.waiting || 0}</p>
          </div>
          <div>
            <p style={{ color: '#9ca3af', fontSize: 18, marginBottom: 8 }}>Normal - En attente</p>
            <p style={{ fontSize: 48, fontWeight: 700, color: '#4ade80', margin: 0 }}>{displayData.accueil_normal.stats.waiting || 0}</p>
          </div>
          <div>
            <p style={{ color: '#9ca3af', fontSize: 18, marginBottom: 8 }}>Total traités (PHP)</p>
            <p style={{ fontSize: 48, fontWeight: 700, color: '#c084fc', margin: 0 }}>{displayData.accueil_php.stats.completed || 0}</p>
          </div>
          <div>
            <p style={{ color: '#9ca3af', fontSize: 18, marginBottom: 8 }}>Total traités (Normal)</p>
            <p style={{ fontSize: 48, fontWeight: 700, color: '#c084fc', margin: 0 }}>{displayData.accueil_normal.stats.completed || 0}</p>
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
