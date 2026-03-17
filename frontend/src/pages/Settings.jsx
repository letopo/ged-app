// frontend/src/pages/Settings.jsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authAPI, usersAPI } from '../services/api';
import { User, Lock, Shield, Save, AlertCircle, CheckCircle } from 'lucide-react';
import LicenseManager from '../components/LicenseManager'; // Assure-toi que ce fichier existe

const Settings = () => {
  const { user, login } = useAuth(); // On récupère login pour mettre à jour le context si le profil change
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // États pour le profil
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
  });

  // États pour le mot de passe
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Mettre à jour les données si l'utilisateur change
  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
      });
    }
  }, [user]);

  // --- GESTION DU PROFIL ---
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Appel API pour mettre à jour
      const response = await authAPI.updateProfile(profileData);
      
      // Mise à jour locale (Optionnel, dépend de ton AuthContext)
      // Idéalement, updateProfile renvoie le nouvel user, et on met à jour le context
      setMessage({ type: 'success', text: 'Profil mis à jour avec succès.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Erreur lors de la mise à jour.' });
    } finally {
      setLoading(false);
    }
  };

  // --- GESTION DU MOT DE PASSE ---
  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Les nouveaux mots de passe ne correspondent pas.' });
      return;
    }
    
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // On utilise l'endpoint resetPassword ou un endpoint dédié changePassword
      // Note: Assure-toi que ton backend gère la vérification de l'ancien mot de passe si nécessaire
      await usersAPI.resetPassword(user.id, passwordData.newPassword);
      
      setMessage({ type: 'success', text: 'Mot de passe modifié avec succès.' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Erreur lors du changement de mot de passe.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Paramètres du compte</h1>

      {/* Message de notification global */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {message.text}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        
        {/* MENU LATÉRAL (Onglets) */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'profile' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'}`}
            >
              <User size={18} /> Profil
            </button>
            
            <button
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'security' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'}`}
            >
              <Lock size={18} /> Sécurité
            </button>

            {/* ✅ ONGLET LICENCE (ADMIN SEULEMENT) */}
            {user?.role === 'admin' && (
              <button
                onClick={() => setActiveTab('license')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'license' ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400' : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'}`}
              >
                <Shield size={18} /> Licence
              </button>
            )}
          </nav>
        </aside>

        {/* CONTENU PRINCIPAL */}
        <div className="flex-1 bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-6">
          
          {/* --- PANNEAU PROFIL --- */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileUpdate} className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Informations personnelles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prénom</label>
                  <input
                    type="text"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                    className="w-full p-2 border rounded-lg dark:bg-dark-bg dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom</label>
                  <input
                    type="text"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                    className="w-full p-2 border rounded-lg dark:bg-dark-bg dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className="w-full p-2 border rounded-lg dark:bg-dark-bg dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  <Save size={18} /> Enregistrer
                </button>
              </div>
            </form>
          )}

          {/* --- PANNEAU SÉCURITÉ --- */}
          {activeTab === 'security' && (
            <form onSubmit={handlePasswordUpdate} className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Changer le mot de passe</h2>
              <div className="space-y-4 max-w-md">
                {/* 
                   Note: Si ton backend ne demande pas l'ancien mot de passe pour un admin qui reset, 
                   ce champ peut être optionnel ou décoratif selon ta logique backend. 
                   Pour l'instant je le mets.
                */}
                {/* <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mot de passe actuel</label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full p-2 border rounded-lg dark:bg-dark-bg dark:border-gray-600 dark:text-white"
                  />
                </div> */}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nouveau mot de passe</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full p-2 border rounded-lg dark:bg-dark-bg dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirmer le nouveau mot de passe</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full p-2 border rounded-lg dark:bg-dark-bg dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  <Save size={18} /> Mettre à jour
                </button>
              </div>
            </form>
          )}

          {/* --- PANNEAU LICENCE (ADMIN UNIQUEMENT) --- */}
          {activeTab === 'license' && user?.role === 'admin' && (
            <div>
                {/* Ici on charge le composant qu'on a créé précédemment */}
                <LicenseManager />
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Settings;