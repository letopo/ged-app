// frontend/src/components/WorkflowProgress.jsx - VERSION 100% COMPLÈTE
import React from 'react';
import { CheckCircle, Clock, User, XCircle } from 'lucide-react';

const WorkflowProgress = ({ workflows = [], documentStatus }) => {
  if (!workflows || workflows.length === 0) {
    return <div className="text-sm text-gray-500">Aucun workflow initié.</div>;
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
    switch (status) {
      case 'approved': return <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />;
      case 'pending': return <Clock className="w-5 h-5 text-yellow-500 animate-pulse flex-shrink-0" />;
      case 'rejected': return <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />;
      default: return <User className="w-5 h-5 text-gray-400 flex-shrink-0" />;
    }
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2 text-sm">
        <span className="font-medium text-gray-700">Progression</span>
        <span className="font-bold text-blue-600">{completedSteps} / {totalSteps}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className={`h-2.5 rounded-full transition-all duration-500 ${documentStatus === 'rejected' ? 'bg-red-500' : 'bg-blue-600'}`} 
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
      
      <div className="mt-3 space-y-2 text-xs">
        {/* --- CORRECTION : AJOUT DU TRI PAR ÉTAPE --- */}
        {workflows.sort((a, b) => a.step - b.step).map((step) => (
          <div key={step.id} className="flex items-center gap-3">
            {getStatusIcon(step.status)}
            <div className="flex-1 truncate">
              <span className="font-medium">{step.validator?.firstName} {step.validator?.lastName}</span>
              <span className="text-gray-500 ml-2">({step.status})</span>
            </div>
            {step.validatedAt && (
              <span className="text-gray-400 text-nowrap">{new Date(step.validatedAt).toLocaleDateString('fr-FR')}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkflowProgress;