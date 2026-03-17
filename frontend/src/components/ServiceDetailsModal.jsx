// frontend/src/components/ServiceDetailsModal.jsx - VERSION 100% COMPLÈTE AVEC SUPPORT DARK MODE

import React from 'react';
import { X, Trash2, UserMinus, Building2 } from 'lucide-react';

const ServiceDetailsModal = ({
  service,
  onClose,
  onRemoveMember,
  onDeleteService,
}) => {
  const groupedMembers = service.members?.reduce((acc, member) => {
    if (!acc[member.fonction]) {
      acc[member.fonction] = [];
    }
    acc[member.fonction].push(member);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      {/* Conteneur principal - Support Dark Mode */}
      <div className="bg-white dark:bg-dark-surface rounded-lg shadow-xl dark:shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* En-tête (Gradients) - Support Dark Mode */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-700 dark:to-blue-800 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 size={32} />
            <div>
              <h2 className="text-2xl font-bold">{service.name}</h2>
              <p className="text-blue-100 dark:text-blue-300 text-sm">
                {service.members?.length || 0} membres
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Corps */}
        <div className="p-6">
          {!service.members || service.members.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-dark-text-secondary">Aucun membre dans ce service</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedMembers || {}).map(
                ([fonction, members]) => (
                  <div key={fonction}>
                    {/* Titre de fonction - Support Dark Mode */}
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text mb-3 flex items-center gap-2">
                      <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-lg text-sm">
                        {fonction}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-500">
                        ({members.length})
                      </span>
                    </h3>

                    <div className="space-y-2">
                      {members.map((member) => (
                        <div
                          key={member.id}
                          // Carte de membre - Support Dark Mode
                          className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-bg rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition border border-gray-200 dark:border-dark-border"
                        >
                          <div className="flex items-center gap-3">
                            {/* Avatar (garde ses couleurs vives) */}
                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                              {member.user.firstName[0]}
                              {member.user.lastName[0]}
                            </div>
                            <div>
                              {/* Nom et email - Support Dark Mode */}
                              <p className="font-medium text-gray-800 dark:text-dark-text">
                                {member.user.firstName} {member.user.lastName}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                                {member.user.email}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() =>
                              onRemoveMember(service.id, member.id)
                            }
                            // Bouton Retirer - Support Dark Mode
                            className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition"
                            title="Retirer du service"
                          >
                            <UserMinus size={20} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* Pied de page - Support Dark Mode */}
        <div className="border-t border-gray-200 dark:border-dark-border p-6 bg-gray-50 dark:bg-dark-bg flex justify-between">
          <button
            onClick={() => onDeleteService(service.id)}
            // Bouton Supprimer Service - Support Dark Mode
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition dark:bg-red-700 dark:hover:bg-red-600"
          >
            <Trash2 size={18} />
            Supprimer le service
          </button>
          <button
            onClick={onClose}
            // Bouton Fermer - Support Dark Mode
            className="px-6 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-dark-text rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetailsModal;