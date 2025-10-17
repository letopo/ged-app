// frontend/src/components/WorkflowSubmission.jsx
import { useState, useEffect } from 'react';
import { workflowAPI, usersAPI } from '../services/api';
import { CheckCircle, XCircle, Loader, Users } from 'lucide-react';

export default function WorkflowSubmission({ document, onSuccess, onCancel }) {
  const [users, setUsers] = useState([]);
  const [selectedValidators, setSelectedValidators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await usersAPI.getAll();
      // Filtrer l'utilisateur courant
      const currentUser = JSON.parse(localStorage.getItem('user'));
      const filteredUsers = response.data.users.filter(
        user => user.id !== currentUser?.id
      );
      setUsers(filteredUsers);
    } catch (err) {
      setError('Erreur lors du chargement des utilisateurs');
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const toggleValidator = (userId) => {
    setSelectedValidators(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedValidators.length === 0) {
      setError('Veuillez sélectionner au moins un validateur');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      await workflowAPI.submitForValidation(document.id, selectedValidators);
      
      setSuccess('Document soumis pour validation avec succès !');
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1500);
      
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la soumission');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loadingUsers) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2">Chargement des utilisateurs...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Users className="w-6 h-6 mr-2 text-blue-600" />
          Soumettre pour validation
        </h2>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Infos du document */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-gray-900 mb-2">Document</h3>
        <p className="text-gray-700">{document.title}</p>
        <p className="text-sm text-gray-500">{document.filename}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Sélectionner les validateurs
            <span className="text-gray-500 ml-2">
              ({selectedValidators.length} sélectionné{selectedValidators.length > 1 ? 's' : ''})
            </span>
          </label>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {users.map((user, index) => (
              <div
                key={user.id}
                className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedValidators.includes(user.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => toggleValidator(user.id)}
              >
                <input
                  type="checkbox"
                  checked={selectedValidators.includes(user.id)}
                  onChange={() => toggleValidator(user.id)}
                  className="w-4 h-4 text-blue-600 rounded mr-3"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {user.fullName || user.username}
                  </div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                </div>
                <div className="text-xs bg-gray-100 px-2 py-1 rounded">
                  Étape {index + 1}
                </div>
              </div>
            ))}
          </div>

          {users.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Aucun utilisateur disponible pour la validation
            </div>
          )}
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <XCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
            <span className="text-green-700">{success}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Annuler
            </button>
          )}
          <button
            type="submit"
            disabled={loading || selectedValidators.length === 0}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin mr-2" />
                Soumission...
              </>
            ) : (
              'Soumettre pour validation'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}