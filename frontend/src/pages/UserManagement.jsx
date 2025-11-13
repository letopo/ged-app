// frontend/src/pages/UserManagement.jsx - VERSION COMPLÈTE AVEC SUPPORT DARK MODE
import React, { useState, useEffect } from 'react';
import { usersAPI } from '../services/api';
import { Users, Edit, KeyRound, Trash2, PlusCircle, CheckCircle, XCircle, Loader, UploadCloud, Stamp } from 'lucide-react';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [editingUser, setEditingUser] = useState(null);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  
  const [modalData, setModalData] = useState({});
  const [newPassword, setNewPassword] = useState(null);
  const [isResetModalOpen, setResetModalOpen] = useState(false);
  const [userToReset, setUserToReset] = useState(null);
  const [resetPasswordField, setResetPasswordField] = useState(''); 

  // --- NOUVEAUX ÉTATS POUR LE MODAL D'UPLOAD ---
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [userToUploadFor, setUserToUploadFor] = useState(null);
  const [uploadType, setUploadType] = useState(''); 
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await usersAPI.getAll();
      setUsers(response.data.users || []);
    } catch (err) {
      setError('Impossible de charger les utilisateurs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleEdit = (user) => {
    setModalData({ ...user });
    setEditingUser(user);
  };
  
  const handleCreate = () => {
    setModalData({ role: 'user' });
    setCreateModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingUser(null);
    setCreateModalOpen(false);
    setNewPassword(null);
    setModalData({});
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const isCreating = !editingUser;
    
    try {
      if (isCreating) {
        await usersAPI.create(modalData); 
        alert('Utilisateur créé avec succès !');
      } else {
        const dataToUpdate = {
          firstName: modalData.firstName,
          lastName: modalData.lastName,
          email: modalData.email,
          username: modalData.username,
          role: modalData.role,
        };
        await usersAPI.update(editingUser.id, dataToUpdate);
        alert('Utilisateur mis à jour avec succès !');
      }
      handleCloseModal();
      loadUsers();
    } catch (err) {
      alert(`Erreur: ${err.response?.data?.error || 'Une erreur est survenue'}`);
    }
  };

  const handleResetPassword = (user) => {
    setUserToReset(user);
    setResetPasswordField('');
    setResetModalOpen(true);
  };

  const confirmResetPassword = async () => {
    if (!userToReset) return;
    const passwordToSend = resetPasswordField.trim(); 

    try {
        const response = await usersAPI.resetPassword(userToReset.id, passwordToSend); 
        setNewPassword({ username: userToReset.username, password: response.data.newPassword });
        setResetModalOpen(false);
        setUserToReset(null);
    } catch (err) {
        alert('Erreur lors de la réinitialisation.');
        setResetModalOpen(false);
    }
  };

  const handleDelete = async (user) => {
      if (window.confirm(`Supprimer l'utilisateur ${user.username} ? Cette action est irréversible.`)) {
          try {
              await usersAPI.delete(user.id);
              alert('Utilisateur supprimé.');
              loadUsers();
          } catch(err) {
              alert(`Erreur: ${err.response?.data?.error || "Impossible de supprimer l'utilisateur"}`);
          }
      }
  };

  // --- NOUVELLES FONCTIONS POUR L'UPLOAD ---
  const handleOpenUploadModal = (user, type) => {
    setUserToUploadFor(user);
    setUploadType(type);
    setSelectedFile(null); // Reset file selection
    setUploadModalOpen(true);
  };

  const handleCloseUploadModal = () => {
    setUploadModalOpen(false);
    setUserToUploadFor(null);
    setUploadType('');
    setSelectedFile(null);
    setUploading(false);
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile || !userToUploadFor) return;

    const formData = new FormData();
    formData.append(uploadType, selectedFile); 

    setUploading(true);
    try {
      if (uploadType === 'signature') {
        await usersAPI.uploadSignature(userToUploadFor.id, formData);
      } else {
        await usersAPI.uploadStamp(userToUploadFor.id, formData);
      }
      alert(`${uploadType === 'signature' ? 'Signature' : 'Cachet'} uploadé avec succès.`);
      handleCloseUploadModal();
      loadUsers();
    } catch (err) {
      alert(`Erreur: ${err.response?.data?.message || 'Une erreur est survenue lors de l\'upload'}`);
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader className="animate-spin text-blue-600" /></div>;
  if (error) return <div className="text-red-500 dark:text-red-400 p-4">{error}</div>;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between gap-3 mb-8">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          {/* Titre - Support Dark Mode */}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text">Gestion des Utilisateurs</h1>
        </div>
        <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600">
          <PlusCircle size={20} /> Créer un utilisateur
        </button>
      </div>

      {/* MODAL pour UPLOADER une signature ou un cachet - Support Dark Mode */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-30 p-4">
          <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-xl dark:shadow-2xl w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-4">Uploader {uploadType === 'signature' ? 'une signature' : 'un cachet'}</h2>
            <p className="mb-4 text-sm text-gray-600 dark:text-dark-text-secondary">Pour l'utilisateur : <strong>{userToUploadFor?.username}</strong></p>
            <input type="file" accept="image/png, image/jpeg" onChange={handleFileChange} className="w-full p-2 border rounded mb-4 dark:bg-dark-bg dark:text-dark-text dark:border-dark-border" />
            {selectedFile && <p className="text-xs text-gray-500 dark:text-gray-500">Fichier: {selectedFile.name}</p>}
            <div className="flex justify-end gap-4 mt-6">
              <button type="button" onClick={handleCloseUploadModal} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 dark:text-dark-text rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">Annuler</button>
              <button onClick={handleUpload} disabled={!selectedFile || uploading} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 flex items-center dark:bg-blue-700 dark:hover:bg-blue-600">
                {uploading && <Loader className="animate-spin w-4 h-4 mr-2" />}
                {uploading ? 'Upload...' : 'Uploader'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL pour SAISIR le nouveau mot de passe - Support Dark Mode */}
      {isResetModalOpen && userToReset && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-30 p-4">
          <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-xl dark:shadow-2xl w-full max-w-sm">
            <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text mb-4">Réinitialiser le mot de passe</h2>
            <p className="mb-4 text-gray-700 dark:text-dark-text">Pour l'utilisateur : <strong>{userToReset.username}</strong></p>
            
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2" htmlFor="new-password-field">
                Nouveau mot de passe (min. 6 caractères) :
            </label>
            <input 
                id="new-password-field"
                type="text" 
                placeholder="Laisser vide pour générer un mot de passe aléatoire"
                value={resetPasswordField} 
                onChange={e => setResetPasswordField(e.target.value)} 
                className="w-full p-2 border rounded-lg mb-4 focus:ring-blue-500 focus:border-blue-500 dark:bg-dark-bg dark:text-dark-text dark:border-dark-border" 
            />
            
            <div className="flex justify-end gap-4 mt-4">
              <button 
                type="button" 
                onClick={() => setResetModalOpen(false)} 
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 dark:text-dark-text rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Annuler
              </button>
              <button 
                onClick={confirmResetPassword} 
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 dark:bg-yellow-700 dark:hover:bg-yellow-600"
                disabled={resetPasswordField.length > 0 && resetPasswordField.length < 6}
              >
                Confirmer la réinitialisation
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL pour afficher le nouveau mot de passe - Support Dark Mode */}
      {newPassword && ( 
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-20"> 
          <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-xl dark:shadow-2xl text-center"> 
            <CheckCircle className="w-12 h-12 text-green-500 dark:text-green-400 mx-auto mb-4" /> 
            <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text">Mot de passe réinitialisé !</h3> 
            <p className="my-2 text-gray-700 dark:text-dark-text">Le nouveau mot de passe pour <strong>{newPassword.username}</strong> est :</p> 
            <p className="bg-gray-100 dark:bg-dark-bg dark:text-green-400 p-2 rounded font-mono text-lg my-4">{newPassword.password}</p> 
            <button onClick={() => setNewPassword(null)} className="px-4 py-2 bg-blue-600 text-white rounded-lg dark:bg-blue-700 dark:hover:bg-blue-600">Fermer</button> 
          </div> 
        </div> 
      )}

      {/* MODAL pour créer ou éditer un utilisateur - Support Dark Mode */}
      {(isCreateModalOpen || editingUser) && ( 
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-20"> 
          <form onSubmit={handleSave} className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-xl dark:shadow-2xl w-full max-w-md"> 
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-dark-text">{isCreateModalOpen ? 'Créer un utilisateur' : 'Modifier l\'utilisateur'}</h2> 
            
            {/* CHAMPS COMMUNS (Input) - Support Dark Mode */}
            <input 
              type="text" 
              placeholder="Prénom" 
              required 
              value={modalData.firstName || ''} 
              onChange={e => setModalData({...modalData, firstName: e.target.value})} 
              className="w-full p-2 border rounded mb-3 dark:bg-dark-bg dark:text-dark-text dark:border-dark-border"
              disabled={!editingUser && !isCreateModalOpen} 
            /> 
            <input 
              type="text" 
              placeholder="Nom" 
              required 
              value={modalData.lastName || ''} 
              onChange={e => setModalData({...modalData, lastName: e.target.value})} 
              className="w-full p-2 border rounded mb-3 dark:bg-dark-bg dark:text-dark-text dark:border-dark-border"
              disabled={!editingUser && !isCreateModalOpen}
            /> 
            <input 
              type="text" 
              placeholder="Nom d'utilisateur" 
              required 
              value={modalData.username || ''} 
              onChange={e => setModalData({...modalData, username: e.target.value})} 
              className="w-full p-2 border rounded mb-3 dark:bg-dark-bg dark:text-dark-text dark:border-dark-border"
              disabled={!editingUser && !isCreateModalOpen}
            /> 
            <input 
              type="email" 
              placeholder="Email" 
              required 
              value={modalData.email || ''} 
              onChange={e => setModalData({...modalData, email: e.target.value})} 
              className="w-full p-2 border rounded mb-3 dark:bg-dark-bg dark:text-dark-text dark:border-dark-border"
              disabled={!editingUser && !isCreateModalOpen}
            /> 

            {/* CHAMPS SPÉCIFIQUES À LA CRÉATION */}
            {isCreateModalOpen && (
              <input 
                type="password" 
                placeholder="Mot de passe" 
                required 
                value={modalData.password || ''} 
                onChange={e => setModalData({...modalData, password: e.target.value})} 
                className="w-full p-2 border rounded mb-3 dark:bg-dark-bg dark:text-dark-text dark:border-dark-border"
              />
            )}
            
            {/* CHAMP RÔLE (Select) - Support Dark Mode */}
            <label className="block mb-2 text-gray-700 dark:text-dark-text">Rôle</label> 
            <select 
              value={modalData.role || 'user'} 
              onChange={e => setModalData({...modalData, role: e.target.value})} 
              className="w-full p-2 border rounded mb-6 dark:bg-dark-bg dark:text-dark-text dark:border-dark-border"
            > 
              <option value="user">Utilisateur</option> 
              <option value="validator">Validateur</option> 
              <option value="director">Directeur</option> 
              <option value="admin">Admin</option> 
            </select> 
            
            <div className="flex justify-end gap-4"> 
              <button type="button" onClick={handleCloseModal} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 dark:text-dark-text rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">Annuler</button> 
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg dark:bg-blue-700 dark:hover:bg-blue-600">Sauvegarder</button> 
            </div> 
          </form> 
        </div> 
      )}
      {/* TABLEAU - Support Dark Mode */}
      <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm dark:shadow-none border border-gray-200 dark:border-dark-border overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
          <thead className="bg-gray-50 dark:bg-dark-bg">
            <tr>
              {/* Entêtes de colonne - Support Dark Mode */}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase">Nom Complet</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase">Email / Nom d'utilisateur</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase">Rôle</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase">Signature / Cachet</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-dark-surface divide-y divide-gray-200 dark:divide-dark-border">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                {/* Cellules de données - Support Dark Mode */}
                <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-dark-text">{user.firstName} {user.lastName}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-dark-text">{user.email}</div>
                    <div className="text-xs text-gray-500 dark:text-dark-text-secondary">{user.username}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                    {/* Badge Rôle - Support Dark Mode */}
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">{user.role}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-4">
                    {/* Statut Signature/Cachet - Support Dark Mode */}
                    <div className="flex items-center gap-2" title={user.signaturePath ? `Chemin: ${user.signaturePath}`: 'Pas de signature'}>
                      {user.signaturePath ? <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400" /> : <XCircle className="w-5 h-5 text-red-500 dark:text-red-400" />}
                      <span className="text-sm text-gray-700 dark:text-dark-text">Sign.</span>
                    </div>
                    <div className="flex items-center gap-2" title={user.stampPath ? `Chemin: ${user.stampPath}`: 'Pas de cachet'}>
                      {user.stampPath ? <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400" /> : <XCircle className="w-5 h-5 text-red-500 dark:text-red-400" />}
                      <span className="text-sm text-gray-700 dark:text-dark-text">Cachet</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {/* Boutons d'action - Support Dark Mode */}
                  <div className="flex justify-end items-center gap-3">
                    <button onClick={() => handleOpenUploadModal(user, 'signature')} className="text-gray-500 hover:text-blue-700 dark:text-gray-400 dark:hover:text-blue-400" title="Uploader Signature"><UploadCloud className="w-5 h-5" /></button>
                    <button onClick={() => handleOpenUploadModal(user, 'stamp')} className="text-gray-500 hover:text-indigo-700 dark:text-gray-400 dark:hover:text-indigo-400" title="Uploader Cachet"><Stamp className="w-5 h-5" /></button>
                    <button onClick={() => handleEdit(user)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300" title="Modifier le rôle"><Edit className="w-5 h-5" /></button>
                    <button onClick={() => handleResetPassword(user)} className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300" title="Réinitialiser le mot de passe"><KeyRound className="w-5 h-5" /></button>
                    <button onClick={() => handleDelete(user)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" title="Supprimer"><Trash2 className="w-5 h-5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;