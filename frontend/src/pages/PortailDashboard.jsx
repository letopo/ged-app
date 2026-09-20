// frontend/src/pages/PortailDashboard.jsx

import { useState, useEffect } from 'react';
import {
  UserPlus,
  Users,
  Activity,
  Printer,
  Clock,
  CheckCircle
} from 'lucide-react';
import { ticketAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function PortailDashboard() {
  const [showModal, setShowModal] = useState(false);
  const [selectedVisitType, setSelectedVisitType] = useState(null);
  const [generatedTicket, setGeneratedTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [queueStats, setQueueStats] = useState({
    accueil_php: 0,
    accueil_normal: 0,
    caisse: 0
  });

  // Charger les statistiques des files
  useEffect(() => {
    loadQueueStats();
    const interval = setInterval(loadQueueStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadQueueStats = async () => {
    try {
      const [phpQueue, normalQueue, caisseQueue] = await Promise.all([
        ticketAPI.getQueue('accueil_php'),
        ticketAPI.getQueue('accueil_normal'),
        ticketAPI.getQueue('caisse')
      ]);

      setQueueStats({
        accueil_php: phpQueue.data.data.stats.total,
        accueil_normal: normalQueue.data.data.stats.total,
        caisse: caisseQueue.data.data.stats.total
      });
    } catch (error) {
      console.error('Erreur chargement statistiques:', error);
    }
  };

  const handleVisitTypeClick = (visitType) => {
    setSelectedVisitType(visitType);
    setShowModal(true);
  };

  const handlePatientTypeSelect = async (patientType) => {
    setLoading(true);
    try {
      const response = await ticketAPI.createTicket({
        visitType: selectedVisitType,
        patientType,
        patientName: '', // Optionnel
        patientPhone: '' // Optionnel
      });

      setGeneratedTicket(response.data.data);
      setShowModal(false);

      // Recharger les stats
      loadQueueStats();

      // Afficher le ticket pendant 5 secondes
      setTimeout(() => {
        setGeneratedTicket(null);
      }, 10000);

    } catch (error) {
      console.error('Erreur création ticket:', error);
      toast('Erreur lors de la création du ticket');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintTicket = () => {
    if (!generatedTicket) return;

    const printWindow = window.open('', '', 'width=300,height=400');
    printWindow.document.write(`
      <html>
        <head>
          <title>Ticket - ${generatedTicket.ticketNumber}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 20px;
            }
            h1 {
              font-size: 24px;
              margin-bottom: 10px;
            }
            .ticket-number {
              font-size: 48px;
              font-weight: bold;
              margin: 20px 0;
              border: 3px solid #000;
              padding: 20px;
            }
            .info {
              font-size: 14px;
              margin: 10px 0;
            }
            .queue {
              font-size: 18px;
              font-weight: bold;
              color: #2563eb;
              margin: 15px 0;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <h1>🏥 Hôpital Saint Jean de Malte</h1>
          <div class="ticket-number">${generatedTicket.ticketNumber}</div>
          <div class="info">Type: ${getVisitTypeLabel(generatedTicket.visitType)}</div>
          <div class="queue">${getQueueLabel(generatedTicket.queueType)}</div>
          <div class="info">Position: ${generatedTicket.positionNumber}</div>
          <div class="info">${new Date(generatedTicket.createdAt).toLocaleString('fr-FR')}</div>
          <p style="margin-top: 30px; font-size: 12px;">Merci de patienter. Votre numéro sera appelé.</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const getVisitTypeLabel = (type) => {
    const labels = {
      consultation: 'Consultation',
      visite: 'Visite Patient',
      garde_malade: 'Garde Malade'
    };
    return labels[type] || type;
  };

  const getQueueLabel = (queueType) => {
    const labels = {
      accueil_php: 'Accueil PHP',
      accueil_normal: 'Accueil Normal',
      caisse: 'Caisse'
    };
    return labels[queueType] || queueType;
  };

  return (
    <div className="min-h-screen p-6" style={{ background: 'var(--surface-2)' }}>
      <div className="max-w-6xl mx-auto">
        {/* En-tête */}
        <div className="rounded-lg p-6 mb-6" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-2)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--fg)' }}>
                🏥 Accueil Patients
              </h1>
              <p style={{ color: 'var(--fg-muted)' }}>
                Sélectionnez le type de visite du patient
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                {new Date().toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
              <div className="text-2xl font-bold" style={{ color: 'var(--brand)' }}>
                {new Date().toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Statistiques des files */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-lg p-4" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-1)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Accueil PHP</p>
                <p className="text-3xl font-bold" style={{ color: 'var(--brand)' }}>{queueStats.accueil_php}</p>
              </div>
              <Users className="w-12 h-12" style={{ color: 'var(--brand)', opacity: 0.2 }} />
            </div>
          </div>

          <div className="rounded-lg p-4" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-1)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Accueil Normal</p>
                <p className="text-3xl font-bold" style={{ color: 'var(--success)' }}>{queueStats.accueil_normal}</p>
              </div>
              <Users className="w-12 h-12" style={{ color: 'var(--success)', opacity: 0.2 }} />
            </div>
          </div>

          <div className="rounded-lg p-4" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-1)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Caisse</p>
                <p className="text-3xl font-bold" style={{ color: 'var(--fg)' }}>{queueStats.caisse}</p>
              </div>
              <Activity className="w-12 h-12" style={{ color: 'var(--fg-muted)', opacity: 0.2 }} />
            </div>
          </div>
        </div>

        {/* Boutons principaux */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Consultation */}
          <button
            onClick={() => handleVisitTypeClick('consultation')}
            className="group rounded-2xl p-8 transform transition-all duration-200 hover:scale-105"
            style={{ background: 'var(--brand)', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: 'var(--shadow-2)' }}
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <UserPlus className="w-16 h-16" />
              </div>
              <div className="text-2xl font-bold">Consultation</div>
              <div className="text-sm" style={{ opacity: 0.9 }}>Patient venant consulter</div>
            </div>
          </button>

          {/* Visite */}
          <button
            onClick={() => handleVisitTypeClick('visite')}
            className="group rounded-2xl p-8 transform transition-all duration-200 hover:scale-105"
            style={{ background: 'var(--success)', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: 'var(--shadow-2)' }}
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <Users className="w-16 h-16" />
              </div>
              <div className="text-2xl font-bold">Visite Patient</div>
              <div className="text-sm" style={{ opacity: 0.9 }}>Visiteur pour un patient</div>
            </div>
          </button>

          {/* Garde Malade */}
          <button
            onClick={() => handleVisitTypeClick('garde_malade')}
            className="group rounded-2xl p-8 transform transition-all duration-200 hover:scale-105"
            style={{ background: 'var(--fg)', color: 'var(--surface)', border: 'none', cursor: 'pointer', boxShadow: 'var(--shadow-2)' }}
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <Activity className="w-16 h-16" />
              </div>
              <div className="text-2xl font-bold">Garde Malade</div>
              <div className="text-sm" style={{ opacity: 0.9 }}>Accompagnateur de patient</div>
            </div>
          </button>
        </div>

        {/* Ticket généré */}
        {generatedTicket && (
          <div className="rounded-2xl p-8 animate-bounce-in" style={{ background: 'var(--success)', color: '#fff', boxShadow: 'var(--shadow-3)' }}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="w-8 h-8" />
                  <h3 className="text-2xl font-bold">Ticket créé avec succès !</h3>
                </div>

                <div className="rounded-xl p-6 mb-4" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <div className="text-6xl font-bold text-center mb-4">
                    {generatedTicket.ticketNumber}
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-lg">
                      Direction : <span className="font-bold">{getQueueLabel(generatedTicket.queueType)}</span>
                    </p>
                    <p className="text-lg">
                      Position dans la file : <span className="font-bold">{generatedTicket.positionNumber}</span>
                    </p>
                  </div>
                </div>

                <p className="text-center text-lg" style={{ opacity: 0.9 }}>
                  <Clock className="inline w-5 h-5 mr-2" />
                  Veuillez patienter, vous serez appelé
                </p>
              </div>

              <button
                onClick={handlePrintTicket}
                className="ml-6 px-6 py-4 rounded-xl font-bold flex items-center gap-2 transition-colors"
                style={{ background: 'var(--surface)', color: 'var(--success)', border: 'none', cursor: 'pointer', boxShadow: 'var(--shadow-2)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
              >
                <Printer className="w-6 h-6" />
                Imprimer
              </button>
            </div>
          </div>
        )}

        {/* Modal sélection PHP/Normal */}
        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div className="rounded-2xl max-w-2xl w-full p-8 animate-scale-in" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-3)' }}>
              <h2 className="text-3xl font-bold mb-6 text-center" style={{ color: 'var(--fg)' }}>
                Type de patient
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* PHP */}
                <button
                  onClick={() => handlePatientTypeSelect('php')}
                  disabled={loading}
                  className="group rounded-xl p-8 transform transition-all duration-200 hover:scale-105"
                  style={{ background: 'var(--brand)', color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}
                >
                  <div className="flex flex-col items-center space-y-4">
                    <div className="text-6xl">💼</div>
                    <div className="text-2xl font-bold">PHP</div>
                    <div className="text-sm text-center" style={{ opacity: 0.9 }}>
                      Patient avec prise en charge
                    </div>
                  </div>
                </button>

                {/* Normal */}
                <button
                  onClick={() => handlePatientTypeSelect('normal')}
                  disabled={loading}
                  className="group rounded-xl p-8 transform transition-all duration-200 hover:scale-105"
                  style={{ background: 'var(--success)', color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}
                >
                  <div className="flex flex-col items-center space-y-4">
                    <div className="text-6xl">👤</div>
                    <div className="text-2xl font-bold">Normal</div>
                    <div className="text-sm text-center" style={{ opacity: 0.9 }}>
                      Patient sans prise en charge
                    </div>
                  </div>
                </button>
              </div>

              <button
                onClick={() => setShowModal(false)}
                disabled={loading}
                className="mt-6 w-full py-3 rounded-xl font-semibold transition-colors"
                style={{ background: 'var(--surface-2)', color: 'var(--fg)', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-2)'}
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Styles pour les animations */}
      <style jsx>{`
        @keyframes bounce-in {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes scale-in {
          0% {
            opacity: 0;
            transform: scale(0.9);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-bounce-in {
          animation: bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
