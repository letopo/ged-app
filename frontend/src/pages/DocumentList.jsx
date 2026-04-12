// frontend/src/pages/DocumentList.jsx - VERSION 100% COMPLÈTE AVEC SUPPORT DARK MODE

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { documentsAPI, workflowAPI, usersAPI, templatePermissionsAPI } from '../services/api';
import DocumentViewer from '../components/DocumentViewer';
import WorkflowProgress from '../components/WorkflowProgress';
import { DocumentGridSkeleton, DocumentTableSkeleton } from '../components/SkeletonLoader';
import { StatusBadge } from '../utils/statusHelpers.jsx';
import { useConfirm } from '../components/ConfirmModal';
import { FileText, Search, Eye, Calendar, User, Trash2, Send, LayoutGrid, LayoutList, X, Check, Loader, AlertCircle, FilePlus, Archive, Star, Download, Shield, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import EmptyState from '../components/EmptyState';
import { useFavorites } from '../hooks/useFavorites';
import TemplatePermissionsModal from '../components/TemplatePermissionsModal';

const DocumentList = () => {
  const { user } = useAuth();
  const { confirm, ConfirmModalRenderer } = useConfirm();
  const { toggle: toggleFav, isFav } = useFavorites();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [documentToSubmit, setDocumentToSubmit] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedValidators, setSelectedValidators] = useState([]);
  const [submitComment, setSubmitComment] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [searchValidatorTerm, setSearchValidatorTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', dir: 'desc' });
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAll = () => setSelectedIds(prev => prev.length === pagedDocuments.length ? [] : pagedDocuments.map(d => d.id));
  const clearSelection = () => setSelectedIds([]);

  const handleBulkDelete = async () => {
    const ok = await confirm({ title: `Supprimer ${selectedIds.length} documents ?`, message: 'Cette action est irréversible.', confirmLabel: 'Supprimer', variant: 'danger' });
    if (!ok) return;
    setBulkLoading(true);
    try {
      await Promise.all(selectedIds.map(id => documentsAPI.delete(id)));
      toast.success(`${selectedIds.length} documents supprimés.`);
      clearSelection();
      loadDocuments();
    } catch { toast.error('Erreur lors de la suppression.'); }
    finally { setBulkLoading(false); }
  };

  const handleBulkArchive = async () => {
    const ok = await confirm({ title: `Archiver ${selectedIds.length} documents ?`, message: 'Ils seront déplacés dans les archives.', confirmLabel: 'Archiver', variant: 'warning' });
    if (!ok) return;
    setBulkLoading(true);
    try {
      await Promise.all(selectedIds.map(id => documentsAPI.archive(id)));
      toast.success(`${selectedIds.length} documents archivés.`);
      clearSelection();
      loadDocuments();
    } catch { toast.error('Erreur lors de l\'archivage.'); }
    finally { setBulkLoading(false); }
  };

  const handleSort = (key) => {
    setSortConfig(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
    setCurrentPage(1);
  }; 

  const [accessibleTemplates, setAccessibleTemplates] = useState([]);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

  // Mapping icones par template
  const TEMPLATE_ICONS = {
    'Demande de permission': '📄',
    'Pièce de caisse': '💰',
    'Demande de travaux': '🔧',
    'Ordre de mission': '🚗',
    'Demande de permutation': '🔄',
    'Bon de sortie': '📦',
    "Certificat d'aptitude": '🩺',
    'Bon de commande': '🛒',
    'Bon de commande interne': '📋',
    "Demande d'explication": '❓',
    'Planning Opératoire': '🏥',
    'Attestation de départ en congé annuel': '🏖️',
    'Demande de besoin': '📝',
    'Fiche de suivi d\'équipements': '🔩',
  };

  // Templates par défaut (fallback si API non disponible)
  const DEFAULT_TEMPLATES = [
    { templateName: 'Demande de permission', hasAccess: true, isRestricted: false },
    { templateName: 'Pièce de caisse', hasAccess: true, isRestricted: false },
    { templateName: 'Demande de travaux', hasAccess: true, isRestricted: false },
    { templateName: 'Ordre de mission', hasAccess: true, isRestricted: false },
    { templateName: 'Demande de permutation', hasAccess: true, isRestricted: false },
    { templateName: 'Bon de sortie', hasAccess: true, isRestricted: false },
    { templateName: "Certificat d'aptitude", hasAccess: true, isRestricted: false },
    { templateName: 'Bon de commande', hasAccess: true, isRestricted: false },
    { templateName: 'Bon de commande interne', hasAccess: true, isRestricted: false },
    { templateName: "Demande d'explication", hasAccess: true, isRestricted: false },
    { templateName: 'Planning Opératoire', hasAccess: true, isRestricted: false },
    { templateName: 'Attestation de départ en congé annuel', hasAccess: true, isRestricted: false },
  ];

  const sidebarTemplates = permissionsLoaded && accessibleTemplates.length > 0
    ? accessibleTemplates
    : DEFAULT_TEMPLATES;

  useEffect(() => {
    loadDocuments();
    loadTemplatePermissions();
  }, []);

  const loadTemplatePermissions = async () => {
    try {
      const res = await templatePermissionsAPI.getMyTemplates();
      setAccessibleTemplates(res.data.data || []);
      setPermissionsLoaded(true);
    } catch (err) {
      console.error('Erreur chargement permissions templates:', err);
      setPermissionsLoaded(false);
    }
  };

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await documentsAPI.getAll();
      if (response.data && Array.isArray(response.data.data)) {
        setDocuments(response.data.data);
      } else {
        setDocuments([]);
      }
    } catch (err) {
      setError('Erreur lors du chargement des documents');
      setDocuments([]);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await usersAPI.getAll();
      const usersList = response.data?.users || [];
      const validators = usersList.filter(user => 
        ['validator', 'director', 'admin'].includes(user.role)
      );
      setAvailableUsers(validators);
    } catch (err) {
      setError('Impossible de charger les utilisateurs pour la validation.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleOpenSubmitModal = async (document) => {
    setDocumentToSubmit(document);
    setShowSubmitModal(true);
    setSelectedValidators([]);
    setSubmitComment('');
    setSearchValidatorTerm('');
    await loadAvailableUsers();
  };

  const handleCloseSubmitModal = () => {
    setShowSubmitModal(false);
    setDocumentToSubmit(null);
  };

  const addValidator = (userId) => {
    if (!selectedValidators.includes(userId)) {
      setSelectedValidators([...selectedValidators, userId]);
    }
  };

  const removeValidator = (userId) => {
    setSelectedValidators(selectedValidators.filter(id => id !== userId));
  };

  const moveValidator = (index, direction) => {
    const newValidators = [...selectedValidators];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < newValidators.length) {
      [newValidators[index], newValidators[newIndex]] = [newValidators[newIndex], newValidators[index]];
      setSelectedValidators(newValidators);
    }
  };

  const handleSubmitWorkflow = async () => {
    if (selectedValidators.length === 0) {
      toast('Veuillez sélectionner au moins un validateur.');
      return;
    }
    try {
      setSubmitLoading(true);
      const workflowData = {
        documentId: documentToSubmit.id,
        validatorIds: selectedValidators,
        comment: submitComment
      };
      await workflowAPI.create(workflowData);
      toast.success('Document soumis au workflow avec succès !');
      handleCloseSubmitModal();
      loadDocuments();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Erreur lors de la soumission';
      toast.error(`${errorMessage}`);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleArchive = async (doc) => {
    const ok = await confirm({
      title: 'Archiver ce document ?',
      message: `"${doc.title}" sera déplacé dans les archives.`,
      confirmLabel: 'Archiver',
      cancelLabel: 'Annuler',
      variant: 'warning',
    });
    if (!ok) return;
    try {
      await documentsAPI.archive(doc.id);
      toast.success('Document archivé.');
      loadDocuments();
    } catch (err) {
      console.error('Erreur archivage:', err);
      toast.error('Erreur lors de l\'archivage.');
    }
  };

  const handleDelete = async (docId) => {
    if (!docId) {
      toast.error('Erreur : ID du document manquant.');
      return;
    }
    const ok = await confirm({
      title: 'Supprimer ce document ?',
      message: 'Cette action est irréversible. Le document sera définitivement supprimé.',
      confirmLabel: 'Supprimer',
      cancelLabel: 'Annuler',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await documentsAPI.delete(docId);
      toast.success('Document supprimé avec succès.');
      loadDocuments();
    } catch (err) {
      console.error("Erreur suppression:", err);
      toast.error('Erreur lors de la suppression du document.');
    }
  };

  const getUserNameById = (userId) => {
    const user = availableUsers.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : 'Utilisateur inconnu';
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredAvailableUsers = useMemo(() => {
    if (!searchValidatorTerm) {
      return availableUsers;
    }
    const lowerCaseSearch = searchValidatorTerm.toLowerCase();
    return availableUsers.filter(user =>
      (user.firstName + ' ' + user.lastName).toLowerCase().includes(lowerCaseSearch) ||
      user.role.toLowerCase().includes(lowerCaseSearch) ||
      user.email?.toLowerCase().includes(lowerCaseSearch)
    );
  }, [availableUsers, searchValidatorTerm]);

  const categories = useMemo(() => {
    const cats = new Set(documents.map(d => d.category).filter(Boolean));
    return [...cats].sort();
  }, [documents]);

  const setQuickPeriod = (period) => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    if (period === 'week') {
      const day = now.getDay() || 7;
      const mon = new Date(now); mon.setDate(now.getDate() - day + 1);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      setFilterDateFrom(fmt(mon)); setFilterDateTo(fmt(sun));
    } else if (period === 'month') {
      setFilterDateFrom(`${now.getFullYear()}-${pad(now.getMonth()+1)}-01`);
      const last = new Date(now.getFullYear(), now.getMonth()+1, 0);
      setFilterDateTo(fmt(last));
    } else if (period === 'year') {
      setFilterDateFrom(`${now.getFullYear()}-01-01`);
      setFilterDateTo(`${now.getFullYear()}-12-31`);
    }
  };

  const clearDateFilter = () => { setFilterDateFrom(''); setFilterDateTo(''); };

  const activeFilterCount = [
    filterStatus !== 'all',
    filterCategory !== 'all',
    !!filterDateFrom || !!filterDateTo,
    !!searchTerm,
  ].filter(Boolean).length;

  const resetAllFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterCategory('all');
    setFilterDateFrom('');
    setFilterDateTo('');
    setCurrentPage(1);
  };

  const exportCSV = () => {
    const statusLabels = { draft: 'Brouillon', pending_validation: 'En validation', approved: 'Approuvé', rejected: 'Rejeté' };
    const header = ['Titre', 'Catégorie', 'Statut', 'Auteur', 'Date', 'Taille'];
    const rows = sortedDocuments.map(doc => [
      doc.title || '',
      doc.category || '',
      statusLabels[doc.status] || doc.status || '',
      doc.uploadedBy ? `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}` : '',
      formatDate(doc.createdAt),
      formatSize(doc.fileSize),
    ]);
    const bom = '\uFEFF';
    const csv = bom + [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `documents_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV téléchargé');
  };

  const filteredDocuments = documents.filter(doc => {
    const searchTermLower = searchTerm.toLowerCase();
    const matchSearch = doc.title?.toLowerCase().includes(searchTermLower) ||
                       doc.originalName?.toLowerCase().includes(searchTermLower);
    const matchStatus = filterStatus === 'all' || doc.status === filterStatus;
    const matchCategory = filterCategory === 'all' || doc.category === filterCategory;
    let matchDate = true;
    if (filterDateFrom || filterDateTo) {
      const docDate = new Date(doc.createdAt);
      if (filterDateFrom) matchDate = matchDate && docDate >= new Date(filterDateFrom);
      if (filterDateTo) {
        const to = new Date(filterDateTo); to.setHours(23, 59, 59);
        matchDate = matchDate && docDate <= to;
      }
    }
    return matchSearch && matchStatus && matchCategory && matchDate;
  });

  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    // Favoris toujours en premier
    const aFav = isFav(a.id) ? 0 : 1;
    const bFav = isFav(b.id) ? 0 : 1;
    if (aFav !== bFav) return aFav - bFav;

    const { key, dir } = sortConfig;
    let aVal = a[key] ?? '';
    let bVal = b[key] ?? '';
    if (key === 'createdAt') { aVal = new Date(aVal); bVal = new Date(bVal); }
    else { aVal = String(aVal).toLowerCase(); bVal = String(bVal).toLowerCase(); }
    if (aVal < bVal) return dir === 'asc' ? -1 : 1;
    if (aVal > bVal) return dir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sortedDocuments.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedDocuments = sortedDocuments.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  if (loading) return (
    <div className="max-w-screen-xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded w-48 h-8 mb-2" />
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded w-72 h-4" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <main className="lg:col-span-3 space-y-6">
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm border border-gray-200 dark:border-dark-border p-4">
          <div className="flex gap-4">
            <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg flex-1 h-10" />
            <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg w-40 h-10" />
          </div>
        </div>
        {viewMode === 'grid' ? <DocumentGridSkeleton count={6} /> : <DocumentTableSkeleton count={8} />}
      </main>
      </div>
    </div>
  );

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text mb-2">Mes Documents</h1>
        <p className="text-gray-600 dark:text-dark-text-secondary">Gérez vos documents et leurs validations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <main className="lg:col-span-3">

        <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-sm dark:shadow-none mb-6 border border-gray-200 dark:border-dark-border overflow-hidden">
          {/* Ligne 1 : Recherche + Statut + Vue */}
          <div className="flex items-center gap-3 p-4">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Rechercher par titre ou nom de fichier..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-dark-bg dark:text-dark-text transition-all"
                />
              </div>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-dark-bg dark:text-dark-text"
            >
              <option value="all">Tous les statuts</option>
              <option value="draft">Brouillon</option>
              <option value="pending_validation">En validation</option>
              <option value="approved">Approuvé</option>
              <option value="rejected">Rejeté</option>
            </select>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-dark-bg dark:text-dark-text"
            >
              <option value="all">Tous les types</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <div className="flex gap-1 bg-gray-100 dark:bg-dark-bg rounded-lg p-0.5">
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}><LayoutGrid size={16} /></button>
              <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}><LayoutList size={16} /></button>
            </div>
          </div>

          {/* Ligne 2 : Filtres date + raccourcis */}
          <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-gray-50/80 dark:bg-dark-bg/50 border-t border-gray-100 dark:border-dark-border">
            <Calendar size={14} className="text-gray-400 shrink-0" />
            <span className="text-xs text-gray-400 font-medium mr-1">Période</span>
            <input
              type="date"
              value={filterDateFrom}
              onChange={e => setFilterDateFrom(e.target.value)}
              className="px-2.5 py-1 text-xs border border-gray-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-bg dark:text-dark-text"
              title="Date de début"
            />
            <span className="text-gray-300 dark:text-gray-600 text-xs">→</span>
            <input
              type="date"
              value={filterDateTo}
              min={filterDateFrom || undefined}
              onChange={e => setFilterDateTo(e.target.value)}
              className="px-2.5 py-1 text-xs border border-gray-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-bg dark:text-dark-text"
              title="Date de fin"
            />
            <div className="flex gap-1 ml-1">
              <button onClick={() => setQuickPeriod('week')} className="px-2 py-1 text-[11px] font-medium bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border hover:border-blue-400 hover:text-blue-600 dark:text-dark-text-secondary dark:hover:border-blue-500 dark:hover:text-blue-400 rounded-lg transition">Cette sem.</button>
              <button onClick={() => setQuickPeriod('month')} className="px-2 py-1 text-[11px] font-medium bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border hover:border-blue-400 hover:text-blue-600 dark:text-dark-text-secondary dark:hover:border-blue-500 dark:hover:text-blue-400 rounded-lg transition">Ce mois</button>
              <button onClick={() => setQuickPeriod('year')} className="px-2 py-1 text-[11px] font-medium bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border hover:border-blue-400 hover:text-blue-600 dark:text-dark-text-secondary dark:hover:border-blue-500 dark:hover:text-blue-400 rounded-lg transition">Cette année</button>
              {(filterDateFrom || filterDateTo) && (
                <button onClick={clearDateFilter} className="px-2 py-1 text-[11px] font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-700/50 rounded-lg transition flex items-center gap-1"><X size={10} />Effacer</button>
              )}
            </div>
          </div>
        </div>

        {/* Barre résultats + reset filtres */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
            <span className="font-semibold text-gray-700 dark:text-dark-text">{filteredDocuments.length}</span>
            {' '}document{filteredDocuments.length !== 1 ? 's' : ''} trouvé{filteredDocuments.length !== 1 ? 's' : ''}
            {documents.length !== filteredDocuments.length && (
              <span className="ml-1 text-gray-400">sur {documents.length}</span>
            )}
          </p>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <button
                onClick={resetAllFilters}
                className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 dark:text-red-400 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 px-3 py-1.5 rounded-full transition"
              >
                <X size={12} />
                Effacer les filtres
                <span className="bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-200 text-[10px] font-bold rounded-full px-1.5 py-0.5 ml-0.5">{activeFilterCount}</span>
              </button>
            )}
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 bg-gray-100 hover:bg-blue-50 dark:bg-gray-800 dark:hover:bg-blue-900/20 px-3 py-1.5 rounded-full transition"
              title="Exporter en CSV"
            >
              <Download size={12} />
              Export CSV
            </button>
          </div>
        </div>

        {error && <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4">{error}</div>}

        {/* Barre d'actions en lot */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 mb-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg animate-fadeIn">
            <span className="text-sm font-medium text-blue-800 dark:text-blue-300">{selectedIds.length} sélectionné{selectedIds.length > 1 ? 's' : ''}</span>
            <div className="flex gap-2 ml-auto">
              <button onClick={handleBulkArchive} disabled={bulkLoading} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition disabled:opacity-50">
                <Archive size={13} /> Archiver
              </button>
              <button onClick={handleBulkDelete} disabled={bulkLoading} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50">
                <Trash2 size={13} /> Supprimer
              </button>
              <button onClick={clearSelection} className="px-3 py-1.5 text-xs font-medium bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 text-gray-700 rounded-lg transition">
                <X size={13} />
              </button>
            </div>
          </div>
        )}

        {filteredDocuments.length === 0 ? (
          <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm border border-gray-200 dark:border-dark-border">
            <EmptyState
              icon={FileText}
              title="Aucun document trouvé"
              description={activeFilterCount > 0 ? "Aucun document ne correspond à vos filtres. Essayez d'élargir votre recherche." : "Vous n'avez pas encore de documents. Commencez par en uploader un."}
              action={activeFilterCount > 0
                ? { label: 'Effacer les filtres', onClick: resetAllFilters }
                : { label: 'Uploader un document', to: '/upload' }
              }
            />
          </div>
        ) : (
          <>
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {pagedDocuments.map((doc) => (
                  <div key={doc.id} onClick={() => toggleSelect(doc.id)} className={`group bg-white dark:bg-dark-surface rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-1 dark:shadow-none border flex flex-col cursor-pointer transition-all duration-200 ${selectedIds.includes(doc.id) ? 'border-blue-500 ring-2 ring-blue-400 dark:ring-blue-600' : 'border-gray-200 dark:border-dark-border'}`}>
                    <div className="p-4 border-b border-gray-200 dark:border-dark-border">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={selectedIds.includes(doc.id)} onChange={() => toggleSelect(doc.id)} onClick={e => e.stopPropagation()} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                          <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                            <FileText size={20} className="text-blue-600 dark:text-blue-400" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={(e) => { e.stopPropagation(); toggleFav(doc.id); }} className="p-1 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition" title={isFav(doc.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}>
                            <Star size={16} className={isFav(doc.id) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'} />
                          </button>
                          <StatusBadge status={doc.status} />
                        </div>
                      </div>
                      <h3 className="font-medium text-gray-900 dark:text-dark-text truncate">{doc.title}</h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        {doc.category && <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">{doc.category}</span>}
                        {doc.fileSize && <span className="text-[10px] text-gray-400 dark:text-gray-500">{formatSize(doc.fileSize)}</span>}
                      </div>
                    </div>
                    <div className="p-4 space-y-2 flex-grow">
                      <div className="flex items-center text-sm text-gray-600 dark:text-dark-text-secondary gap-2"><User size={16} /><span>{doc.uploadedBy ? `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}` : 'Inconnu'}</span></div>
                      <div className="flex items-center text-sm text-gray-600 dark:text-dark-text-secondary gap-2"><Calendar size={16} /><span>{formatDate(doc.createdAt)}</span></div>
                      {doc.originalName && <div className="text-[11px] text-gray-400 dark:text-gray-500 truncate opacity-0 group-hover:opacity-100 transition-opacity">{doc.originalName}</div>}
                    </div>
                    {['pending_validation', 'in_progress', 'approved', 'rejected'].includes(doc.status) && (
                      <div className="p-4 border-t border-gray-200 dark:border-dark-border"><WorkflowProgress workflows={doc.workflows} documentStatus={doc.status} /></div>
                    )}
                    <div className="p-4 border-t border-gray-200 dark:border-dark-border flex gap-2">
                        <button onClick={() => setViewingDocument(doc)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"><Eye size={16} /><span>Voir</span></button>
                        <button onClick={() => handleOpenSubmitModal(doc)} className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50" title={doc.status !== 'draft' ? "Ce document ne peut plus être soumis" : "Soumettre"} disabled={doc.status !== 'draft'}><Send size={16} /></button>
                        <button
                          onClick={() => handleArchive(doc)}
                          className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded transition"
                          title="Archiver"
                        >
                          <Archive size={16} />
                        </button>
                        <button onClick={() => handleDelete(doc.id)} className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700" title="Supprimer"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {viewMode === 'list' && (
              <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm dark:shadow-none overflow-hidden border border-gray-200 dark:border-dark-border">
                <table className="min-w-full">
                  <thead className="bg-gray-50 dark:bg-dark-bg">
                    <tr>
                      {[
                        { key: 'title', label: 'Document' },
                        { key: 'status', label: 'Statut' },
                        { key: 'createdAt', label: 'Date' },
                      ].map(col => (
                        <th key={col.key} onClick={() => handleSort(col.key)} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 select-none group">
                          <span className="flex items-center gap-1">
                            {col.label}
                            <span className="text-gray-300 dark:text-gray-600 group-hover:text-blue-400 transition-colors">
                              {sortConfig.key === col.key ? (sortConfig.dir === 'asc' ? '↑' : '↓') : '↕'}
                            </span>
                          </span>
                        </th>
                      ))}
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase">Actions</th>
                      <th className="px-3 py-3">
                        <input type="checkbox" checked={pagedDocuments.length > 0 && selectedIds.length === pagedDocuments.length} onChange={toggleSelectAll} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" title="Tout sélectionner" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
                    {pagedDocuments.map((doc) => (
                      <React.Fragment key={doc.id}>
                        <tr className={`hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${selectedIds.includes(doc.id) ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`} onClick={() => toggleSelect(doc.id)}>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <input type="checkbox" checked={selectedIds.includes(doc.id)} onChange={() => toggleSelect(doc.id)} onClick={e => e.stopPropagation()} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer mr-3" />
                              <button onClick={(e) => { e.stopPropagation(); toggleFav(doc.id); }} className="mr-2 p-0.5" title={isFav(doc.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}>
                                <Star size={14} className={isFav(doc.id) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600 hover:text-yellow-400'} />
                              </button>
                              <FileText className="text-blue-600 mr-3" size={20} />
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-dark-text">{doc.title}</div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-500 dark:text-dark-text-secondary">{formatSize(doc.fileSize)}</span>
                                  {doc.category && <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">{doc.category}</span>}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={doc.status} />
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-dark-text-secondary">{formatDate(doc.createdAt)}</td>
                          <td className="px-6 py-4 text-right text-sm font-medium">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => setViewingDocument(doc)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300" title="Visualiser"><Eye size={18} /></button>
                              <button onClick={() => handleOpenSubmitModal(doc)} className="text-green-600 hover:text-green-900 disabled:opacity-50 dark:text-green-400 dark:hover:text-green-300" title={doc.status !== 'draft' ? "Ce document ne peut plus être soumis" : "Soumettre"} disabled={doc.status !== 'draft'}><Send size={18} /></button>
                              <button
                                onClick={() => handleArchive(doc)}
                                className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded transition"
                                title="Archiver"
                              >
                                <Archive size={16} />
                              </button>
                              <button onClick={() => handleDelete(doc.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" title="Supprimer"><Trash2 size={18} /></button>
                            </div>
                          </td>
                        </tr>
                        {['pending_validation', 'approved', 'rejected'].includes(doc.status) && (
                          <tr className="bg-gray-50 dark:bg-dark-bg"><td colSpan="4" className="px-6 py-2"><WorkflowProgress workflows={doc.workflows} documentStatus={doc.status} /></td></tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
              Page <span className="font-semibold">{safePage}</span> sur <span className="font-semibold">{totalPages}</span>
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={safePage === 1}
                className="px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >«</button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === '…' ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-gray-400">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition ${
                        p === safePage
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >{p}</button>
                  )
                )}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >›</button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={safePage === totalPages}
                className="px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >»</button>
            </div>
          </div>
        )}
      </main>

      <aside className="lg:col-span-1 self-start">
        <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-sm dark:shadow-none border border-gray-200 dark:border-dark-border sticky top-20 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-dark-border flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2 text-gray-900 dark:text-dark-text"><FilePlus size={16} />Créer un document</h3>
              {user?.role === 'admin' && (
                <button
                  onClick={() => setShowPermissionsModal(true)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                  title="Gérer les permissions"
                >
                  <Settings size={14} />
                </button>
              )}
            </div>
            <ul className="p-2 space-y-0.5 max-h-[calc(100vh-160px)] overflow-y-auto">
                {sidebarTemplates
                  .filter(t => t.hasAccess)
                  .map(t => {
                    const name = t.templateName;
                    const icon = TEMPLATE_ICONS[name] || '📄';
                    // Cas spécial : "Demande de travaux" pointe vers /create-work-request
                    if (name === 'Demande de travaux') {
                      return (
                        <li key={name}>
                          <Link to="/create-work-request" className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition">
                            {icon} {name}
                          </Link>
                        </li>
                      );
                    }
                    // Template restreint → style spécial (visible car l'utilisateur y a accès)
                    if (t.isRestricted) {
                      return (
                        <li key={name}>
                          <Link to="/create-from-template" state={{ templateName: name }}
                            className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-purple-700 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-900/10 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-xl transition border border-purple-200/50 dark:border-purple-700/30">
                            {icon} {name}
                          </Link>
                        </li>
                      );
                    }
                    // Template normal
                    return (
                      <li key={name}>
                        <Link to="/create-from-template" state={{ templateName: name }}
                          className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 dark:text-dark-text hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition">
                          {icon} {name}
                        </Link>
                      </li>
                    );
                  })}
            </ul>
        </div>
      </aside>
      </div>

      {showSubmitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-dark-surface rounded-lg shadow-xl dark:shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-dark-border flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Soumettre au workflow</h2>
                <button onClick={handleCloseSubmitModal} className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto">
                <p className="text-sm text-gray-700 dark:text-dark-text">Document : <span className="font-medium">{documentToSubmit?.title}</span></p>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-3">Sélectionnez les validateurs (dans l'ordre)</label>
                    {loadingUsers ? <div className="flex justify-center py-8"><Loader className="animate-spin text-blue-600" /></div> : availableUsers.length === 0 && !searchValidatorTerm ? <div className="text-center py-8 bg-gray-50 dark:bg-dark-bg rounded-lg"><AlertCircle className="mx-auto text-gray-400 mb-2" size={32} /><p className='text-gray-700 dark:text-dark-text'>Aucun validateur disponible</p></div> : 
                    <>
                      <div className="relative mb-3">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                          <input
                              type="text"
                              placeholder="Rechercher par nom, rôle ou email..."
                              value={searchValidatorTerm}
                              onChange={(e) => setSearchValidatorTerm(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border dark:bg-dark-bg dark:text-dark-text rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          />
                      </div>
                      
                      <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 dark:border-dark-border rounded-lg p-3">
                          {filteredAvailableUsers.length > 0 ? (
                              filteredAvailableUsers.map((user) => (
                                  <div 
                                      key={user.id} 
                                      onClick={() => addValidator(user.id)} 
                                      className={`p-3 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${selectedValidators.includes(user.id) ? 'bg-blue-100 border-2 border-blue-500 dark:bg-blue-900/30' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200 dark:bg-dark-bg dark:hover:bg-gray-700 dark:border-dark-border'}`}
                                  >
                                      <div className="flex items-center text-gray-900 dark:text-dark-text">
                                          <User size={20} className="mr-3" />
                                          <div>
                                              <div className="font-medium">{user.firstName} {user.lastName}</div>
                                              <div className="text-xs text-gray-500 dark:text-dark-text-secondary">{user.role}</div>
                                          </div>
                                      </div>
                                      {selectedValidators.includes(user.id) && <Check size={20} className="text-blue-600" />}
                                  </div>
                              ))
                          ) : (
                              <div className="text-center py-4 text-gray-500 dark:text-dark-text-secondary">
                                  {searchValidatorTerm 
                                      ? "Aucun validateur trouvé pour cette recherche." 
                                      : "Aucun validateur disponible."}
                              </div>
                          )}
                      </div>
                    </>}
                </div>
                {selectedValidators.length > 0 && <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-3">Ordre de validation</label>
                    <div className="space-y-2">
                        <div className="text-sm text-gray-600 dark:text-dark-text-secondary mb-2">Le premier validateur est celui qui doit agir en premier.</div>
                        {selectedValidators.map((userId, index) => (
                        <div key={userId} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-700">
                            <div className="flex items-center text-gray-900 dark:text-dark-text"><span className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold mr-3">{index + 1}</span><div><div className="font-medium">{getUserNameById(userId)}</div></div></div>
                            <div className="flex gap-2">
                            <button onClick={() => moveValidator(index, 'up')} disabled={index === 0} className="p-1 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded disabled:opacity-30">↑</button>
                            <button onClick={() => moveValidator(index, 'down')} disabled={index === selectedValidators.length - 1} className="p-1 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded disabled:opacity-30">↓</button>
                            <button onClick={() => removeValidator(userId)} className="p-1 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30 rounded"><X size={16} /></button>
                            </div>
                        </div>
                        ))}
                    </div>
                </div>}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">Commentaire (optionnel)</label>
                    <textarea value={submitComment} onChange={(e) => setSubmitComment(e.target.value)} rows="3" placeholder="Ajoutez un message..." className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-bg dark:text-dark-text dark:border-dark-border" />
                </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-dark-border flex justify-end gap-3">
              <button onClick={handleCloseSubmitModal} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 dark:text-dark-text rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600" disabled={submitLoading}>Annuler</button>
              <button onClick={handleSubmitWorkflow} disabled={selectedValidators.length === 0 || submitLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600">
                {submitLoading ? <><Loader className="animate-spin w-4 h-4 mr-2" />Soumission...</> : <><Send size={16} />Soumettre</>}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {viewingDocument && (
        <DocumentViewer
          document={viewingDocument}
          onClose={() => setViewingDocument(null)}
        />
      )}

      {ConfirmModalRenderer}

      <TemplatePermissionsModal
        isOpen={showPermissionsModal}
        onClose={() => { setShowPermissionsModal(false); loadTemplatePermissions(); }}
      />
    </div>
  );
};

export default DocumentList;