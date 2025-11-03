import React, { useState, useEffect } from 'react';
import { X, UserPlus, Search } from 'lucide-react';
import { usersAPI } from '../services/api';

const AddMemberModal = ({ service, fonctions, onAdd, onClose }) => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedFonction, setSelectedFonction] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await usersAPI.getAll();

        console.log("Réponse complète de l'API /api/users:", response.data);

        // =======================================================
        // ===            LA CORRECTION EST ICI                ===
        // =======================================================
        // Avant : setUsers(response.data.data || []);
        // Après : Nous utilisons 'response.data.users' car c'est la structure probable.
        const usersData = response.data.users || response.data.data || [];
        setUsers(usersData);
        // =======================================================
        
        console.log("Utilisateurs définis dans l'état:", usersData);

        setError('');
      } catch (err) {
        console.error('Erreur chargement utilisateurs:', err);
        setError('Impossible de charger les utilisateurs');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedUser || !selectedFonction) {
      setError('Veuillez sélectionner un utilisateur et une fonction');
      return;
    }
    onAdd(service.id, {
      userId: selectedUser,
      fonction: selectedFonction,
    });
  };

  const filteredUsers = users.filter((user) => {
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
    const email = user.email.toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || email.includes(query);
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* En-tête */}
        <div className="bg-blue-600 p-6 text-white flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-3">
            <UserPlus size={24} />
            <div>
              <h2 className="text-xl font-bold">Ajouter un membre</h2>
              <p className="text-blue-100 text-sm">{service.name}</p>
            </div>
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
          {/* Recherche utilisateur */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rechercher un utilisateur
            </label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nom, prénom ou email..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Sélection utilisateur */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Utilisateur *
            </label>
            {loading ? (
              <p className="text-sm text-gray-500">Chargement...</p>
            ) : (
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">-- Sélectionnez un utilisateur --</option>
                {filteredUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} ({user.email})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Sélection fonction */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fonction *
            </label>
            <select
              value={selectedFonction}
              onChange={(e) => setSelectedFonction(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">-- Sélectionnez une fonction --</option>
              {fonctions.map((fonction) => (
                <option key={fonction} value={fonction}>
                  {fonction}
                </option>
              ))}
            </select>
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
              Ajouter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMemberModal;