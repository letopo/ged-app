// frontend/src/pages/UserManagement.jsx - VERSION COMPLÈTE
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

  // --- NOUVEAUX ÉTATS POUR LE MODAL D'UPLOAD ---
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [userToUploadFor, setUserToUploadFor] = useState(null);
  const [uploadType, setUploadType] = useState(''); // 'signature' ou 'stamp'
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
        await usersAPI.update(editingUser.id, { role: modalData.role });
        alert('Rôle mis à jour avec succès !');
      }
      handleCloseModal();
      loadUsers();
    } catch (err) {
      alert(`Erreur: ${err.response?.data?.error || 'Une erreur est survenue'}`);
    }
  };

  const handleResetPassword = async (user) => {
    if (window.confirm(`Réinitialiser le mot de passe pour ${user.username} ?`)) {
      try {
        const response = await usersAPI.resetPassword(user.id);
        setNewPassword({ username: user.username, password: response.data.newPassword });
      } catch (err) {
        alert('Erreur lors de la réinitialisation.');
      }
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
    // Le nom du champ ('signature' ou 'stamp') doit correspondre à celui attendu par Multer
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

  if (loading) return <div className="flex justify-center p-8"><Loader className="animate-spin" /></div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between gap-3 mb-8">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Utilisateurs</h1>
        </div>
        <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <PlusCircle size={20} /> Créer un utilisateur
        </button>
      </div>

      {/* MODAL pour UPLOADER une signature ou un cachet */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30 p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Uploader {uploadType === 'signature' ? 'une signature' : 'un cachet'}</h2>
            <p className="mb-4 text-sm text-gray-600">Pour l'utilisateur : <strong>{userToUploadFor?.username}</strong></p>
            <input type="file" accept="image/png, image/jpeg" onChange={handleFileChange} className="w-full p-2 border rounded mb-4" />
            {selectedFile && <p className="text-xs text-gray-500">Fichier: {selectedFile.name}</p>}
            <div className="flex justify-end gap-4 mt-6">
              <button type="button" onClick={handleCloseUploadModal} className="px-4 py-2 bg-gray-200 rounded-lg">Annuler</button>
              <button onClick={handleUpload} disabled={!selectedFile || uploading} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 flex items-center">
                {uploading && <Loader className="animate-spin w-4 h-4 mr-2" />}
                {uploading ? 'Upload...' : 'Uploader'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL pour afficher le nouveau mot de passe */}
      {newPassword && ( <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20"> <div className="bg-white p-6 rounded-lg shadow-xl text-center"> <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" /> <h3 className="text-lg font-bold">Mot de passe réinitialisé !</h3> <p className="my-2">Le nouveau mot de passe pour <strong>{newPassword.username}</strong> est :</p> <p className="bg-gray-100 p-2 rounded font-mono text-lg my-4">{newPassword.password}</p> <button onClick={() => setNewPassword(null)} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Fermer</button> </div> </div> )}

      {/* MODAL pour créer ou éditer un utilisateur */}
      {(isCreateModalOpen || editingUser) && ( <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20"> <form onSubmit={handleSave} className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md"> <h2 className="text-2xl font-bold mb-6">{isCreateModalOpen ? 'Créer un utilisateur' : 'Modifier l\'utilisateur'}</h2> {isCreateModalOpen && ( <> <input type="text" placeholder="Prénom" required value={modalData.firstName || ''} onChange={e => setModalData({...modalData, firstName: e.target.value})} className="w-full p-2 border rounded mb-3"/> <input type="text" placeholder="Nom" required value={modalData.lastName || ''} onChange={e => setModalData({...modalData, lastName: e.target.value})} className="w-full p-2 border rounded mb-3"/> <input type="text" placeholder="Nom d'utilisateur" required value={modalData.username || ''} onChange={e => setModalData({...modalData, username: e.target.value})} className="w-full p-2 border rounded mb-3"/> <input type="email" placeholder="Email" required value={modalData.email || ''} onChange={e => setModalData({...modalData, email: e.target.value})} className="w-full p-2 border rounded mb-3"/> <input type="password" placeholder="Mot de passe" required value={modalData.password || ''} onChange={e => setModalData({...modalData, password: e.target.value})} className="w-full p-2 border rounded mb-3"/> </> )} <label className="block mb-2">Rôle</label> <select value={modalData.role || 'user'} onChange={e => setModalData({...modalData, role: e.target.value})} className="w-full p-2 border rounded mb-6"> <option value="user">Utilisateur</option> <option value="validator">Validateur</option> <option value="director">Directeur</option> <option value="admin">Admin</option> </select> <div className="flex justify-end gap-4"> <button type="button" onClick={handleCloseModal} className="px-4 py-2 bg-gray-200 rounded-lg">Annuler</button> <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Sauvegarder</button> </div> </form> </div> )}

      <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom Complet</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email / Nom d'utilisateur</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rôle</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Signature / Cachet</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">{user.firstName} {user.lastName}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.email}</div>
                    <div className="text-xs text-gray-500">{user.username}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">{user.role}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2" title={user.signaturePath ? `Chemin: ${user.signaturePath}`: 'Pas de signature'}>
                      {user.signaturePath ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                      <span className="text-sm">Sign.</span>
                    </div>
                    <div className="flex items-center gap-2" title={user.stampPath ? `Chemin: ${user.stampPath}`: 'Pas de cachet'}>
                      {user.stampPath ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                      <span className="text-sm">Cachet</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end items-center gap-3">
                    <button onClick={() => handleOpenUploadModal(user, 'signature')} className="text-gray-500 hover:text-blue-700" title="Uploader Signature"><UploadCloud className="w-5 h-5" /></button>
                    <button onClick={() => handleOpenUploadModal(user, 'stamp')} className="text-gray-500 hover:text-indigo-700" title="Uploader Cachet"><Stamp className="w-5 h-5" /></button>
                    <button onClick={() => handleEdit(user)} className="text-indigo-600 hover:text-indigo-900" title="Modifier le rôle"><Edit className="w-5 h-5" /></button>
                    <button onClick={() => handleResetPassword(user)} className="text-yellow-600 hover:text-yellow-900" title="Réinitialiser le mot de passe"><KeyRound className="w-5 h-5" /></button>
                    <button onClick={() => handleDelete(user)} className="text-red-600 hover:text-red-900" title="Supprimer"><Trash2 className="w-5 h-5" /></button>
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