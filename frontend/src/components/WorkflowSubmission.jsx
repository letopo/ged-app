// frontend/src/components/WorkflowSubmission.jsx - VERSION 100% COMPLÈTE AVEC SUPPORT DARK MODE
import { useState, useEffect, useMemo } from 'react'; // Ajout de useMemo
import { workflowAPI, usersAPI } from '../services/api';
import { CheckCircle, XCircle, Loader, Users, Search } from 'lucide-react'; // Ajout de Search

export default function WorkflowSubmission({ document, onSuccess, onCancel }) {
  const [users, setUsers] = useState([]);
  const [selectedValidators, setSelectedValidators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState(''); // Nouvelle: État pour le terme de recherche

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
      // Message d'erreur - Support Dark Mode
      setError('Erreur lors du chargement des utilisateurs');
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Nouvelle: Fonction de filtrage des utilisateurs
  const filteredUsers = useMemo(() => {
    if (!searchTerm) {
      return users;
    }
    const lowerCaseSearch = searchTerm.toLowerCase();
    return users.filter(user =>
      (user.fullName || user.username).toLowerCase().includes(lowerCaseSearch) ||
      user.email.toLowerCase().includes(lowerCaseSearch)
    );
  }, [users, searchTerm]);

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
    // Message de chargement - Support Dark Mode
    return (
      <div className="flex items-center justify-center p-8 text-gray-700 dark:text-dark-text">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2">Chargement des utilisateurs...</span>
      </div>
    );
  }

  return (
    // Conteneur principal - Support Dark Mode
    <div className="bg-white dark:bg-dark-surface rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        {/* Titre - Support Dark Mode */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text flex items-center">
          <Users className="w-6 h-6 mr-2 text-blue-600 dark:text-blue-400" />
          Soumettre pour validation
        </h2>
        {onCancel && (
          <button
            onClick={onCancel}
            // Bouton Fermer (X) - Support Dark Mode
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400"
          >
            <XCircle className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Infos du document - Support Dark Mode */}
      <div className="bg-gray-50 dark:bg-dark-bg rounded-lg p-4 mb-6 border border-gray-200 dark:border-dark-border">
        <h3 className="font-semibold text-gray-900 dark:text-dark-text mb-2">Document</h3>
        <p className="text-gray-700 dark:text-dark-text">{document.title}</p>
        <p className="text-sm text-gray-500 dark:text-dark-text-secondary">{document.filename}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-3">
            Sélectionner les validateurs
            <span className="text-gray-500 dark:text-dark-text-secondary ml-2">
              ({selectedValidators.length} sélectionné{selectedValidators.length > 1 ? 's' : ''})
            </span>
          </label>
          
          {/* Nouvelle: Barre de recherche des utilisateurs */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              // Style du champ de recherche - Support Dark Mode
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border dark:bg-dark-bg dark:text-dark-text rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>


          {/* Liste des validateurs */}
          <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 dark:border-dark-border rounded-lg p-2">
            {filteredUsers.length > 0 ? ( // Utiliser filteredUsers
                filteredUsers.map((user, index) => (
                    <div
                        key={user.id}
                        // Item de la liste - Support Dark Mode
                        className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            selectedValidators.includes(user.id)
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                                : 'border-gray-200 hover:border-gray-300 dark:border-dark-border dark:hover:border-gray-600 dark:bg-dark-bg'
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
                            {/* Nom et email - Support Dark Mode */}
                            <div className="font-medium text-gray-900 dark:text-dark-text">
                                {user.fullName || user.username}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-dark-text-secondary">{user.email}</div>
                        </div>
                        {/* Badge Étape - Support Dark Mode */}
                        {/* Note: L'affichage de "Étape X" n'est plus pertinent car l'ordre de la liste change avec la recherche. On le supprime pour éviter la confusion. */}
                        {/* <div className="text-xs bg-gray-100 dark:bg-gray-700 dark:text-dark-text-secondary px-2 py-1 rounded">
                            Étape {index + 1}
                        </div> */}
                    </div>
                ))
            ) : (
                <div className="text-center py-4 text-gray-500 dark:text-dark-text-secondary">
                    {searchTerm 
                      ? "Aucun utilisateur trouvé pour cette recherche." 
                      : "Aucun utilisateur disponible pour la validation"}
                </div>
            )}
          </div>
          
          {/* Ancien bloc de vérification users.length === 0, remplacé par la logique ci-dessus pour gérer la recherche */}
          {/* {users.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-dark-text-secondary">
              Aucun utilisateur disponible pour la validation
            </div>
          )} */}
        </div>

        {/* Messages d'erreur/succès - Support Dark Mode */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-700 rounded-lg flex items-start">
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2 flex-shrink-0 mt-0.5" />
            <span className="text-red-700 dark:text-red-300">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-700 rounded-lg flex items-start">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2 flex-shrink-0 mt-0.5" />
            <span className="text-green-700 dark:text-green-300">{success}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              // Bouton Annuler - Support Dark Mode
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-dark-border dark:bg-dark-bg dark:text-dark-text rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              disabled={loading}
            >
              Annuler
            </button>
          )}
          <button
            type="submit"
            disabled={loading || selectedValidators.length === 0}
            // Bouton Soumettre - Support Dark Mode
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center dark:bg-blue-700 dark:hover:bg-blue-600"
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