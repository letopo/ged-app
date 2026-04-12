// frontend/src/components/TemplatePermissionsModal.jsx
import React, { useState, useEffect } from 'react';
import { templatePermissionsAPI } from '../services/api';
import { X, Shield, Users, Lock, Unlock, Save, Loader, Search, ChevronDown, ChevronUp, Plus, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'validator', label: 'Validateur' },
  { value: 'user', label: 'Utilisateur' },
];

const TemplatePermissionsModal = ({ isOpen, onClose }) => {
  const [permissions, setPermissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [permRes, usersRes] = await Promise.all([
        templatePermissionsAPI.getAll(),
        templatePermissionsAPI.getUsers(),
      ]);
      setPermissions(permRes.data.data || []);
      setUsers(usersRes.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Erreur chargement des permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    try {
      const res = await templatePermissionsAPI.seed();
      toast.success(res.data.message);
      loadData();
    } catch (err) {
      toast.error('Erreur lors du seed');
    }
  };

  const toggleRestricted = async (perm) => {
    setSaving(perm.id);
    try {
      await templatePermissionsAPI.update(perm.id, {
        isRestricted: !perm.isRestricted,
      });
      setPermissions(prev =>
        prev.map(p => p.id === perm.id ? { ...p, isRestricted: !p.isRestricted } : p)
      );
      toast.success(`${perm.templateName} : ${!perm.isRestricted ? 'restreint' : 'accessible a tous'}`);
    } catch (err) {
      toast.error('Erreur mise a jour');
    } finally {
      setSaving(null);
    }
  };

  const toggleRole = async (perm, role) => {
    const currentRoles = perm.allowedRoles || [];
    const newRoles = currentRoles.includes(role)
      ? currentRoles.filter(r => r !== role)
      : [...currentRoles, role];
    // Auto-restreindre si on ajoute un role
    const shouldRestrict = newRoles.length > 0 || (perm.allowedUserIds?.length > 0);
    setSaving(perm.id);
    try {
      await templatePermissionsAPI.update(perm.id, { allowedRoles: newRoles, isRestricted: shouldRestrict });
      setPermissions(prev =>
        prev.map(p => p.id === perm.id ? { ...p, allowedRoles: newRoles, isRestricted: shouldRestrict } : p)
      );
    } catch (err) {
      toast.error('Erreur mise a jour des roles');
    } finally {
      setSaving(null);
    }
  };

  const toggleUser = async (perm, userId) => {
    const currentUsers = perm.allowedUserIds || [];
    const newUsers = currentUsers.includes(userId)
      ? currentUsers.filter(u => u !== userId)
      : [...currentUsers, userId];
    // Auto-restreindre si on ajoute un utilisateur
    const shouldRestrict = newUsers.length > 0 || (perm.allowedRoles?.length > 0);
    setSaving(perm.id);
    try {
      await templatePermissionsAPI.update(perm.id, { allowedUserIds: newUsers, isRestricted: shouldRestrict });
      setPermissions(prev =>
        prev.map(p => p.id === perm.id ? { ...p, allowedUserIds: newUsers, isRestricted: shouldRestrict } : p)
      );
    } catch (err) {
      toast.error('Erreur mise a jour des utilisateurs');
    } finally {
      setSaving(null);
    }
  };

  const filteredPermissions = permissions.filter(p =>
    p.templateName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-fadeIn">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Shield className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-dark-text">Permissions des templates</h2>
              <p className="text-xs text-gray-500 dark:text-dark-text-secondary">Gerez l'acces aux modeles de documents</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-gray-100 dark:border-dark-border flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Rechercher un template..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-dark-border dark:bg-dark-bg dark:text-dark-text rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
          {!loading && (
            <button
              onClick={handleSeed}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition whitespace-nowrap"
            >
              <RefreshCw size={16} /> {permissions.length === 0 ? 'Initialiser' : 'Synchroniser'}
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader className="animate-spin text-blue-600 mb-3" size={32} />
              <p className="text-sm text-gray-500">Chargement...</p>
            </div>
          ) : filteredPermissions.length === 0 ? (
            <div className="text-center py-16">
              <Shield className="mx-auto text-gray-300 mb-3" size={48} />
              <p className="text-gray-500 dark:text-dark-text-secondary">
                {permissions.length === 0
                  ? 'Aucun template configure. Cliquez sur "Initialiser" pour commencer.'
                  : 'Aucun resultat pour cette recherche.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPermissions.map(perm => {
                const isExpanded = expandedId === perm.id;
                const isSaving = saving === perm.id;

                return (
                  <div
                    key={perm.id}
                    className={`border rounded-xl transition-all ${
                      perm.isRestricted
                        ? 'border-amber-200 dark:border-amber-700/50 bg-amber-50/50 dark:bg-amber-900/10'
                        : 'border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface'
                    }`}
                  >
                    {/* Template row */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <button
                        onClick={() => toggleRestricted(perm)}
                        disabled={isSaving}
                        className={`p-2 rounded-lg transition ${
                          perm.isRestricted
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 hover:bg-amber-200'
                            : 'bg-green-100 dark:bg-green-900/30 text-green-600 hover:bg-green-200'
                        }`}
                        title={perm.isRestricted ? 'Restreint — cliquez pour ouvrir a tous' : 'Accessible a tous — cliquez pour restreindre'}
                      >
                        {isSaving ? (
                          <Loader className="animate-spin" size={16} />
                        ) : perm.isRestricted ? (
                          <Lock size={16} />
                        ) : (
                          <Unlock size={16} />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 dark:text-dark-text truncate">
                          {perm.templateName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
                          {perm.isRestricted
                            ? `${(perm.allowedRoles?.length || 0)} role(s), ${(perm.allowedUserIds?.length || 0)} utilisateur(s)`
                            : 'Accessible a tous les utilisateurs'}
                        </p>
                      </div>

                      <button
                        onClick={() => setExpandedId(isExpanded ? null : perm.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition"
                      >
                        <Users size={14} />
                        Configurer
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>

                    {/* Expanded config */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-100 dark:border-dark-border pt-3 space-y-4">
                        {/* Roles */}
                        <div>
                          <p className="text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider mb-2">
                            Roles autorises
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {ROLE_OPTIONS.map(role => {
                              const isActive = (perm.allowedRoles || []).includes(role.value);
                              return (
                                <button
                                  key={role.value}
                                  onClick={() => toggleRole(perm, role.value)}
                                  disabled={isSaving}
                                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                                    isActive
                                      ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                                      : 'bg-white dark:bg-dark-bg border-gray-200 dark:border-dark-border text-gray-500 dark:text-dark-text-secondary hover:border-blue-300'
                                  }`}
                                >
                                  {isActive ? '✓ ' : ''}{role.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Users */}
                        <div>
                          <p className="text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider mb-2">
                            Utilisateurs autorises
                          </p>
                          <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-dark-border rounded-xl divide-y divide-gray-100 dark:divide-dark-border">
                            {users.map(u => {
                              const isActive = (perm.allowedUserIds || []).includes(u.id);
                              return (
                                <label
                                  key={u.id}
                                  className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition ${
                                    isActive ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isActive}
                                    onChange={() => toggleUser(perm, u.id)}
                                    disabled={isSaving}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-dark-text truncate">
                                      {u.firstName} {u.lastName}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary truncate">{u.email}</p>
                                  </div>
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    u.role === 'admin' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                    u.role === 'validator' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                                    'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                  }`}>
                                    {u.role}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 dark:border-dark-border flex items-center justify-between">
          <p className="text-xs text-gray-400 dark:text-dark-text-secondary">
            {permissions.length} template(s) — Les admins ont toujours acces a tout
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-dark-text bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplatePermissionsModal;
