import React, { useState, useEffect } from 'react';
import { X, UserPlus, Search } from 'lucide-react';
import { usersAPI } from '../services/api';

const AddMemberModal = ({ service, fonctions, onAdd, onClose }) => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedFonction, setSelectedFonction] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [fonctionSearch, setFonctionSearch] = useState(''); // ← NOUVEAU : recherche de fonction
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await usersAPI.getAll();
        const usersData = response.data.users || response.data.data || [];
        setUsers(usersData);
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

  // ✨ NOUVEAU : Filtrer les fonctions selon la recherche
  const filteredFonctions = fonctions.filter((fonction) =>
    fonction.toLowerCase().includes(fonctionSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* En-tête */}
        <div className="bg-blue-600 p-6 text-white flex items-center justify-between rounded-t-lg sticky top-0 z-10">
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

          {/* ✨ NOUVEAU : Sélection fonction avec RECHERCHE */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fonction * 
              <span className="text-xs text-gray-500 font-normal ml-2">
                ({fonctions.length} fonctions disponibles)
              </span>
            </label>
            
            {/* Champ de recherche pour filtrer les fonctions */}
            <div className="relative mb-2">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="🔍 Rechercher une fonction..."
                value={fonctionSearch}
                onChange={(e) => setFonctionSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Liste scrollable des fonctions filtrées */}
            <div className="border rounded-lg max-h-60 overflow-y-auto bg-gray-50">
              {filteredFonctions.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  Aucune fonction trouvée pour "{fonctionSearch}"
                </div>
              ) : (
                filteredFonctions.map((fonction) => (
                  <div
                    key={fonction}
                    onClick={() => {
                      setSelectedFonction(fonction);
                      setFonctionSearch(''); // Réinitialiser la recherche après sélection
                    }}
                    className={`p-3 cursor-pointer border-b last:border-b-0 transition ${
                      selectedFonction === fonction
                        ? 'bg-blue-100 text-blue-900 font-semibold'
                        : 'hover:bg-blue-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{fonction}</span>
                      {selectedFonction === fonction && (
                        <span className="text-blue-600">✓</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Affichage de la sélection */}
            {selectedFonction && (
              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-green-800">
                    Sélectionné : <strong>{selectedFonction}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFonction('')}
                  className="text-red-600 hover:text-red-800 text-xs font-medium"
                >
                  ✕ Annuler
                </button>
              </div>
            )}
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
              disabled={!selectedUser || !selectedFonction}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
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