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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* En-tête */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                🏥 Accueil Patients
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Sélectionnez le type de visite du patient
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {new Date().toLocaleDateString('fr-FR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Accueil PHP</p>
                <p className="text-3xl font-bold text-blue-600">{queueStats.accueil_php}</p>
              </div>
              <Users className="w-12 h-12 text-blue-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Accueil Normal</p>
                <p className="text-3xl font-bold text-green-600">{queueStats.accueil_normal}</p>
              </div>
              <Users className="w-12 h-12 text-green-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Caisse</p>
                <p className="text-3xl font-bold text-purple-600">{queueStats.caisse}</p>
              </div>
              <Activity className="w-12 h-12 text-purple-600 opacity-20" />
            </div>
          </div>
        </div>

        {/* Boutons principaux */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Consultation */}
          <button
            onClick={() => handleVisitTypeClick('consultation')}
            className="group bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl shadow-xl p-8 transform transition-all duration-200 hover:scale-105 hover:shadow-2xl"
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 bg-white/20 rounded-full group-hover:bg-white/30 transition-colors">
                <UserPlus className="w-16 h-16" />
              </div>
              <div className="text-2xl font-bold">Consultation</div>
              <div className="text-sm opacity-90">Patient venant consulter</div>
            </div>
          </button>

          {/* Visite */}
          <button
            onClick={() => handleVisitTypeClick('visite')}
            className="group bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-2xl shadow-xl p-8 transform transition-all duration-200 hover:scale-105 hover:shadow-2xl"
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 bg-white/20 rounded-full group-hover:bg-white/30 transition-colors">
                <Users className="w-16 h-16" />
              </div>
              <div className="text-2xl font-bold">Visite Patient</div>
              <div className="text-sm opacity-90">Visiteur pour un patient</div>
            </div>
          </button>

          {/* Garde Malade */}
          <button
            onClick={() => handleVisitTypeClick('garde_malade')}
            className="group bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-2xl shadow-xl p-8 transform transition-all duration-200 hover:scale-105 hover:shadow-2xl"
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 bg-white/20 rounded-full group-hover:bg-white/30 transition-colors">
                <Activity className="w-16 h-16" />
              </div>
              <div className="text-2xl font-bold">Garde Malade</div>
              <div className="text-sm opacity-90">Accompagnateur de patient</div>
            </div>
          </button>
        </div>

        {/* Ticket généré */}
        {generatedTicket && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl shadow-2xl p-8 animate-bounce-in">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="w-8 h-8" />
                  <h3 className="text-2xl font-bold">Ticket créé avec succès !</h3>
                </div>
                
                <div className="bg-white/20 rounded-xl p-6 mb-4">
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

                <p className="text-center text-lg opacity-90">
                  <Clock className="inline w-5 h-5 mr-2" />
                  Veuillez patienter, vous serez appelé
                </p>
              </div>

              <button
                onClick={handlePrintTicket}
                className="ml-6 bg-white text-green-600 hover:bg-green-50 px-6 py-4 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-lg"
              >
                <Printer className="w-6 h-6" />
                Imprimer
              </button>
            </div>
          </div>
        )}

        {/* Modal sélection PHP/Normal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full p-8 animate-scale-in">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 text-center">
                Type de patient
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* PHP */}
                <button
                  onClick={() => handlePatientTypeSelect('php')}
                  disabled={loading}
                  className="group bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl p-8 transform transition-all duration-200 hover:scale-105 disabled:opacity-50"
                >
                  <div className="flex flex-col items-center space-y-4">
                    <div className="text-6xl">💼</div>
                    <div className="text-2xl font-bold">PHP</div>
                    <div className="text-sm opacity-90 text-center">
                      Patient avec prise en charge
                    </div>
                  </div>
                </button>

                {/* Normal */}
                <button
                  onClick={() => handlePatientTypeSelect('normal')}
                  disabled={loading}
                  className="group bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl p-8 transform transition-all duration-200 hover:scale-105 disabled:opacity-50"
                >
                  <div className="flex flex-col items-center space-y-4">
                    <div className="text-6xl">👤</div>
                    <div className="text-2xl font-bold">Normal</div>
                    <div className="text-sm opacity-90 text-center">
                      Patient sans prise en charge
                    </div>
                  </div>
                </button>
              </div>

              <button
                onClick={() => setShowModal(false)}
                disabled={loading}
                className="mt-6 w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 py-3 rounded-xl font-semibold transition-colors"
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