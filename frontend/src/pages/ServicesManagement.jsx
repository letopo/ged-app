// frontend/src/pages/ServicesManagement.jsx

import React, { useState, useEffect } from 'react';
import { Plus, Users, Building2, AlertCircle } from 'lucide-react';
import { servicesAPI } from '../services/api';
import ServiceDetailsModal from '../components/ServiceDetailsModal';
import AddMemberModal from '../components/AddMemberModal';
import AddServiceModal from '../components/AddServiceModal';

const FONCTIONS = [
  'Personnel paramédical',
  'Secrétaire',
  'Major',
  'Chef de Service',
  'Chef de Service Adjoint',
  'DDS',
  'Médecin Chef',
  'Responsable SecuLog',
  'DS',
  'DGA',
  'DG',
  'Économe',
  'Achats',
  'Pharmacie',
  'Moyens Généraux',
  'Cellule Biomédical',
];

const ServicesManagement = () => {
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [showAddService, setShowAddService] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showServiceDetails, setShowServiceDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      const response = await servicesAPI.getServicesWithMembers();
      setServices(response.data.data || []);
      setError('');
    } catch (error) {
      console.error('Erreur chargement services:', error);
      setError('Impossible de charger les services.');
    } finally {
      setLoading(false);
    }
  };

  const handleServiceClick = (service) => {
    setSelectedService(service);
    setShowServiceDetails(true);
  };

  const handleAddMemberClick = (service, e) => {
    e.stopPropagation();
    setSelectedService(service);
    setShowAddMember(true);
  };

  const handleAddService = async (serviceName) => {
    try {
      await servicesAPI.createService({ name: serviceName });
      await loadServices();
      setShowAddService(false);
      setError('');
    } catch (error) {
      console.error('Erreur création service:', error);
      setError('Impossible de créer le service.');
    }
  };

  const handleAddMember = async (serviceId, memberData) => {
    try {
      await servicesAPI.addMember(serviceId, memberData);
      await loadServices();
      setShowAddMember(false);
      setSelectedService(null);
      setError('');
    } catch (error) {
      console.error('Erreur ajout membre:', error);
      setError('Impossible d\'ajouter le membre.');
    }
  };

  const handleRemoveMember = async (serviceId, memberId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir retirer ce membre du service ?')) {
      return;
    }

    try {
      await servicesAPI.removeMember(serviceId, memberId);
      await loadServices();
      setError('');
    } catch (error) {
      console.error('Erreur suppression membre:', error);
      setError('Impossible de retirer le membre.');
    }
  };

  const handleDeleteService = async (serviceId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce service ?')) {
      return;
    }

    try {
      await servicesAPI.deleteService(serviceId);
      await loadServices();
      setShowServiceDetails(false);
      setSelectedService(null);
      setError('');
    } catch (error) {
      console.error('Erreur suppression service:', error);
      setError('Impossible de supprimer le service.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* En-tête */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Building2 className="text-blue-600" size={32} />
            Gestion des Services
          </h1>
          <p className="text-gray-600 mt-2">
            Gérez les services et leurs membres pour le système de workflow
          </p>
        </div>
        <button
          onClick={() => setShowAddService(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          Nouveau Service
        </button>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 p-4 rounded-lg mb-6 flex items-center gap-3">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Grille des services */}
      {services.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Building2 className="mx-auto text-gray-400 mb-4" size={64} />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">
            Aucun service disponible
          </h3>
          <p className="text-gray-500 mb-4">
            Commencez par créer votre premier service
          </p>
          <button
            onClick={() => setShowAddService(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Créer un service
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => {
            const chefDeService = service.members?.find(
              (m) => m.fonction === 'Chef de Service' && m.isActive
            );

            return (
              <div
                key={service.id}
                className="bg-white rounded-lg shadow-md hover:shadow-xl transition cursor-pointer overflow-hidden"
                onClick={() => handleServiceClick(service)}
              >
                {/* En-tête de la carte */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">{service.name}</h3>
                    <Users size={24} />
                  </div>
                </div>

                {/* Corps de la carte */}
                <div className="p-4">
                  {/* Chef de Service */}
                  {chefDeService ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                      <p className="text-xs font-semibold text-green-800 mb-1">
                        Chef de Service
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {chefDeService.user.firstName[0]}
                          {chefDeService.user.lastName[0]}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {chefDeService.user.firstName}{' '}
                            {chefDeService.user.lastName}
                          </p>
                          <p className="text-xs text-gray-600">
                            {chefDeService.user.email}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                      <p className="text-xs text-yellow-800">
                        ⚠️ Aucun Chef de Service assigné
                      </p>
                    </div>
                  )}

                  {/* Statistiques */}
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                    <span>
                      <strong>{service.members?.length || 0}</strong> membres
                    </span>
                    <span className="text-blue-600 hover:underline">
                      Voir détails →
                    </span>
                  </div>

                  {/* Membres (aperçu) */}
                  {service.members && service.members.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {service.members.slice(0, 2).map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-semibold text-blue-700">
                            {member.user.firstName[0]}
                            {member.user.lastName[0]}
                          </div>
                          <div className="flex-1 truncate">
                            <p className="font-medium text-gray-800 truncate">
                              {member.user.firstName} {member.user.lastName}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {member.fonction}
                            </p>
                          </div>
                        </div>
                      ))}

                      {service.members.length > 2 && (
                        <p className="text-xs text-gray-500 text-center">
                          +{service.members.length - 2} autres membres
                        </p>
                      )}
                    </div>
                  )}

                  {/* Bouton Ajouter membre */}
                  <button
                    onClick={(e) => handleAddMemberClick(service, e)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition text-sm font-medium"
                  >
                    <Plus size={16} />
                    Ajouter un membre
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Ajouter un service */}
      {showAddService && (
        <AddServiceModal
          onAdd={handleAddService}
          onClose={() => setShowAddService(false)}
        />
      )}

      {/* Modal Ajouter un membre */}
      {showAddMember && selectedService && (
        <AddMemberModal
          service={selectedService}
          fonctions={FONCTIONS}
          onAdd={handleAddMember}
          onClose={() => {
            setShowAddMember(false);
            setSelectedService(null);
          }}
        />
      )}

      {/* Modal Détails du service */}
      {showServiceDetails && selectedService && (
        <ServiceDetailsModal
          service={selectedService}
          fonctions={FONCTIONS}
          onClose={() => {
            setShowServiceDetails(false);
            setSelectedService(null);
          }}
          onRefresh={loadServices}
          onRemoveMember={handleRemoveMember}
          onDeleteService={handleDeleteService}
        />
      )}
    </div>
  );
};

export default ServicesManagement;