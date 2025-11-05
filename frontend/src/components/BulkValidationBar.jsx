// frontend/src/components/BulkValidationBar.jsx
import React from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

const BulkValidationBar = ({ 
  selectedCount, 
  maxSelection, 
  onApprove, 
  onReject, 
  onCancel,
  disabled 
}) => {
  if (selectedCount === 0) return null;

  const isMaxReached = selectedCount >= maxSelection;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl shadow-2xl px-8 py-4 flex items-center gap-6 border-2 border-blue-400">
        {/* Compteur */}
        <div className="flex items-center gap-3">
          <div className="bg-white text-blue-600 rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg shadow-lg">
            {selectedCount}
          </div>
          <div>
            <p className="font-bold text-lg">
              {selectedCount} document{selectedCount > 1 ? 's' : ''} sélectionné{selectedCount > 1 ? 's' : ''}
            </p>
            {isMaxReached && (
              <p className="text-xs text-yellow-200">
                ⚠️ Limite de {maxSelection} documents atteinte
              </p>
            )}
          </div>
        </div>

        {/* Séparateur */}
        <div className="h-12 w-px bg-blue-400"></div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onApprove}
            disabled={disabled}
            className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 rounded-xl font-semibold transition-all transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg"
          >
            <CheckCircle size={20} />
            Approuver tout
          </button>

          <button
            onClick={onReject}
            disabled={disabled}
            className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 rounded-xl font-semibold transition-all transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg"
          >
            <XCircle size={20} />
            Rejeter tout
          </button>

          <button
            onClick={onCancel}
            disabled={disabled}
            className="flex items-center gap-2 px-4 py-3 bg-white text-blue-600 hover:bg-gray-100 rounded-xl font-semibold transition-all shadow-lg"
          >
            <X size={20} />
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkValidationBar;