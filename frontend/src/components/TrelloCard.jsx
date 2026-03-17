// frontend/src/components/TrelloCard.jsx

import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Clock, User, FileText, Pencil, AlignLeft, CheckSquare } from 'lucide-react';

const TrelloCard = ({ card, index, onClick }) => {
  
  // Fonction pour les petits labels colorés en haut de la carte
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
      case 'high': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300';
      case 'medium': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
      default: return null;
    }
  };

  const priorityClass = getPriorityBadge(card.priority);

  // Gestion du clic sur le bouton d'édition rapide (le crayon)
  const handleEditClick = (e) => {
    e.stopPropagation(); // Empêche l'ouverture de la modale principale
    // Pour l'instant, on déclenche aussi l'ouverture normale ou on pourrait ouvrir un petit menu
    // Comme demandé dans le prompt, l'image 7 montre un menu contextuel, 
    // mais ici on va simplement permettre l'interaction visuelle.
    onClick(card); 
  };

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(card)}
          className={`
            group relative bg-white dark:bg-gray-700 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 mb-2 cursor-pointer
            hover:border-blue-500 dark:hover:border-blue-400
            ${snapshot.isDragging ? 'rotate-2 shadow-xl ring-2 ring-blue-500 z-50' : ''}
          `}
          style={{ ...provided.draggableProps.style }}
        >
          {/* Bouton d'édition rapide (Crayon) */}
          <button 
            onClick={handleEditClick}
            className="absolute top-1 right-1 p-1.5 bg-gray-100/90 dark:bg-gray-800/90 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white rounded transition-opacity opacity-0 group-hover:opacity-100 z-10"
            title="Modifier rapidement"
          >
            <Pencil size={14} />
          </button>

          <div className="px-3 py-2">
            {/* Labels et Priorité */}
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {priorityClass && (
                 <span className={`h-2 w-8 rounded-full ${priorityClass}`} title={`Priorité: ${card.priority}`} />
              )}
              {card.labels && card.labels.map((label, idx) => (
                <span key={idx} className="h-2 w-8 rounded-full bg-green-100 dark:bg-green-900/40" title={label} />
              ))}
            </div>

            {/* Titre */}
            <p className="text-sm text-gray-800 dark:text-gray-100 leading-snug mb-1.5 pr-4">
              {card.title}
            </p>

            {/* Indicateurs (Badges) */}
            <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                {/* Indicateur Description */}
                {card.description && card.description.length > 0 && (
                    <div className="flex items-center" title="Cette carte a une description">
                        <AlignLeft size={14} />
                    </div>
                )}

                {/* Date d'échéance */}
                {card.dueDate && (
                    <div className={`flex items-center gap-1 text-xs px-1 rounded ${new Date(card.dueDate) < new Date() ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'hover:bg-gray-100 dark:hover:bg-gray-600'}`}>
                        <Clock size={12} />
                        <span>
                            {new Date(card.dueDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                        </span>
                    </div>
                )}

                {/* Indicateur DT */}
                {card.workRequest && (
                    <div className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 font-medium" title="Demande de Travaux liée">
                        <FileText size={12} />
                    </div>
                )}
            </div>

            {/* Membres (en bas à droite s'il y en a) */}
            {card.assignee && (
                <div className="flex justify-end mt-2">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold ring-2 ring-white dark:ring-gray-700" title={`${card.assignee.firstName} ${card.assignee.lastName}`}>
                        {card.assignee.firstName.charAt(0)}
                    </div>
                </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default TrelloCard;