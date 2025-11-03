// frontend/src/components/AddServiceModal.jsx

import React, { useState } from 'react';
import { X, Building2 } from 'lucide-react';

const AddServiceModal = ({ onAdd, onClose }) => {
  const [serviceName, setServiceName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!serviceName.trim()) {
      setError('Veuillez entrer un nom de service');
      return;
    }
    onAdd(serviceName.trim());
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* En-tête */}
        <div className="bg-blue-600 p-6 text-white flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-3">
            <Building2 size={24} />
            <h2 className="text-xl font-bold">Créer un nouveau service</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Corps */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom du service *
            </label>
            <input
              type="text"
              value={serviceName}
              onChange={(e) => {
                setServiceName(e.target.value);
                setError('');
              }}
              placeholder="Ex: Chirurgie, Urgences, Laboratoire..."
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              autoFocus
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-300 text-red-700 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Boutons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Créer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddServiceModal;