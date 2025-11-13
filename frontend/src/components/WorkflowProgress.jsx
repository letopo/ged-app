// frontend/src/components/WorkflowProgress.jsx - VERSION 100% COMPLÈTE AVEC SUPPORT DARK MODE (CORRIGÉ)
import React from 'react';
import { CheckCircle, Clock, User, XCircle } from 'lucide-react';

const WorkflowProgress = ({ workflows = [], documentStatus }) => {
  if (!workflows || workflows.length === 0) {
    // Message "Aucun workflow" - Support Dark Mode
    return <div className="text-sm text-gray-500 dark:text-dark-text-secondary">Aucun workflow initié.</div>;
  }

  const totalSteps = workflows.length;
  let completedSteps = workflows.filter(w => w.status === 'approved').length;
  
  if (documentStatus === 'approved') {
    completedSteps = totalSteps;
  } else if (documentStatus === 'rejected') {
    const rejectedStep = workflows.find(w => w.status === 'rejected');
    if (rejectedStep) {
        completedSteps = rejectedStep.step - 1;
    }
  }

  const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  const getStatusIcon = (status) => {
    // Icônes - Support Dark Mode
    switch (status) {
      case 'approved': return <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400 flex-shrink-0" />;
      case 'pending': return <Clock className="w-5 h-5 text-yellow-500 dark:text-yellow-400 animate-pulse flex-shrink-0" />;
      case 'rejected': return <XCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0" />;
      default: return <User className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />;
    }
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2 text-sm">
        {/* Textes de progression - Support Dark Mode */}
        <span className="font-medium text-gray-700 dark:text-dark-text">Progression</span>
        <span className="font-bold text-blue-600 dark:text-blue-400">{completedSteps} / {totalSteps}</span>
      </div>
      {/* Barre de progression - Support Dark Mode */}
      <div className="w-full bg-gray-200 dark:bg-dark-bg rounded-full h-2.5">
        <div 
          className={`h-2.5 rounded-full transition-all duration-500 ${documentStatus === 'rejected' ? 'bg-red-500 dark:bg-red-600' : 'bg-blue-600 dark:bg-blue-500'}`} 
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
      
      <div className="mt-3 space-y-2 text-xs">
        {workflows.sort((a, b) => a.step - b.step).map((step) => (
          <div key={step.id} className="flex items-center gap-3">
            {getStatusIcon(step.status)}
            <div className="flex-1 truncate">
              {/* Nom du validateur - Support Dark Mode */}
              <span className="font-medium text-gray-800 dark:text-dark-text">{step.validator?.firstName} {step.validator?.lastName}</span>
              {/* Statut de l'étape - Support Dark Mode */}
              <span className="text-gray-500 dark:text-dark-text-secondary ml-2">({step.status})</span>
            </div>
            {/* CORRECTION DE LA SYNTAXE ICI: On renvoie la balise <span> entière ou null */}
            {step.validatedAt && (
              <span className="text-gray-400 dark:text-gray-500 text-nowrap">
                {new Date(step.validatedAt).toLocaleDateString('fr-FR')}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkflowProgress;