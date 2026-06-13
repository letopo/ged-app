// frontend/src/pages/DocumentList.jsx

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { documentsAPI, workflowAPI, usersAPI, templatePermissionsAPI, workflowTemplatesAPI } from '../services/api';
import DocumentViewer from '../components/DocumentViewer';
import WorkflowProgress from '../components/WorkflowProgress';
import { DocumentGridSkeleton, DocumentTableSkeleton } from '../components/SkeletonLoader';
import { StatusBadge } from '../utils/statusHelpers.jsx';
import { useConfirm } from '../components/ConfirmModal';
import { FileText, Search, Eye, Calendar, User, Trash2, Send, LayoutGrid, LayoutList, X, Check, Loader, AlertCircle, FilePlus, Archive, Star, Download, Shield, Settings, ChevronDown, GitBranch } from 'lucide-react';
import toast from 'react-hot-toast';
import EmptyState from '../components/EmptyState';
import { useFavorites } from '../hooks/useFavorites';
import TemplatePermissionsModal from '../components/TemplatePermissionsModal';

const DocumentList = () => {
  const { user } = useAuth();
  const { id: routeDocId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { confirm, ConfirmModalRenderer } = useConfirm();
  const { toggle: toggleFav, isFav } = useFavorites();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;
  const searchTimer = useRef(null);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [documentToSubmit, setDocumentToSubmit] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedValidators, setSelectedValidators] = useState([]);
  // Ordre de mission : circuit auto + choix du titulaire pour les postes multi-titulaires
  const [omPreview, setOmPreview] = useState(null); // { steps: [...] } | null
  const [omSelections, setOmSelections] = useState({}); // { posteCode: userId }
  const [submitComment, setSubmitComment] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [searchValidatorTerm, setSearchValidatorTerm] = useState('');
  const [workflowTemplates, setWorkflowTemplates] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', dir: 'desc' });
  // Réaffectation workflow
  const [reassignTask, setReassignTask] = useState(null);
  const [reassignValidators, setReassignValidators] = useState([]);
  const [reassignSearch, setReassignSearch] = useState('');
  const [reassignLoading, setReassignLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [allCategories, setAllCategories] = useState([]);
  const [expandedWorkflows, setExpandedWorkflows] = useState(new Set());
  const toggleWorkflow = (id, e) => { e.stopPropagation(); setExpandedWorkflows(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; }); };

  // Ouverture du document via l'URL /documents/:id (liens du dashboard, partage, rechargement).
  // Le détail s'affiche en modal ; on récupère le document par id pour ne pas dépendre
  // de la page de liste courante (paginée).
  useEffect(() => {
    if (!routeDocId) return;
    if (viewingDocument && viewingDocument.id === routeDocId) return;
    let cancelled = false;
    documentsAPI.getById(routeDocId)
      .then(res => { if (!cancelled) setViewingDocument(res.data?.data || res.data); })
      .catch(() => {
        if (cancelled) return;
        toast.error('Document introuvable ou accès refusé');
        navigate('/documents', { replace: true });
      });
    return () => { cancelled = true; };
  }, [routeDocId]);

  // Ferme le modal : remet l'état à zéro et nettoie l'URL si on était sur /documents/:id
  const closeViewer = useCallback(() => {
    setViewingDocument(null);
    if (routeDocId) navigate('/documents', { replace: true });
  }, [routeDocId, navigate]);

  // Auto-déplier les documents rejetés pour que le soumetteur puisse commenter / relancer
  useEffect(() => {
    setExpandedWorkflows(prev => {
      const s = new Set(prev);
      documents.filter(d => d.status === 'rejected').forEach(d => s.add(d.id));
      return s;
    });
  }, [documents]);

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

  // Si les permissions sont chargées (même liste vide), on les utilise.
  // On ne bascule sur DEFAULT_TEMPLATES que si le chargement a échoué (permissionsLoaded === false).
  const sidebarTemplates = permissionsLoaded ? accessibleTemplates : DEFAULT_TEMPLATES;

  useEffect(() => {
    // Nettoyer l'ancien cache sessionStorage si present (migration)
    sessionStorage.removeItem('ged-template-permissions');
    loadTemplatePermissions();
  }, []);

  // Pré-remplit la recherche depuis l'URL (?q=...) : la barre de recherche du
  // header (AppShell) redirige vers /documents?q=... ; sans ça la liste l'ignore.
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setSearchInput(q);
  }, [searchParams]);

  // Debounce recherche : attendre 400ms apres la derniere frappe
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearchTerm(searchInput);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [searchInput]);

  // Reset page 1 quand un filtre change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterCategory, filterDateFrom, filterDateTo]);

  // Recharger les documents quand les filtres ou la page changent
  useEffect(() => {
    loadDocuments(currentPage);
  }, [currentPage, searchTerm, filterStatus, filterCategory, filterDateFrom, filterDateTo]);

  const loadTemplatePermissions = async () => {
    try {
      const res = await templatePermissionsAPI.getMyTemplates();
      const data = res.data.data || [];
      setAccessibleTemplates(data);
      setPermissionsLoaded(true);
    } catch (err) {
      console.error('Erreur chargement permissions templates:', err);
      setPermissionsLoaded(false);
    }
  };

  const [totalDocuments, setTotalDocuments] = useState(0);
  const [serverTotalPages, setServerTotalPages] = useState(1);
  const categoriesLoaded = useRef(false);

  // Charger les catégories une seule fois via endpoint dédié (léger, pas de chargement de tous les docs)
  useEffect(() => {
    if (categoriesLoaded.current) return;
    categoriesLoaded.current = true;
    documentsAPI.getCategories()
      .then(res => {
        const cats = res.data?.data || [];
        setAllCategories(cats);
      })
      .catch(() => {});
  }, []);

  const loadDocuments = async (pageNum = currentPage) => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page: pageNum,
        limit: PAGE_SIZE,
      };
      if (searchTerm) params.search = searchTerm;
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterCategory !== 'all') params.category = filterCategory;
      if (filterDateFrom) params.dateFrom = filterDateFrom;
      if (filterDateTo) params.dateTo = filterDateTo;

      const response = await documentsAPI.getAll(params);
      if (response.data && Array.isArray(response.data.data)) {
        setDocuments(response.data.data);
        if (response.data.pagination) {
          setTotalDocuments(response.data.pagination.total);
          setServerTotalPages(response.data.pagination.totalPages);
        }
      } else {
        setDocuments([]);
        setTotalDocuments(0);
      }
    } catch (err) {
      setError('Erreur lors du chargement des documents');
      setDocuments([]);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSubmitModal = async (document) => {
    setDocumentToSubmit(document);
    setShowSubmitModal(true);
    setSelectedValidators([]);
    setSubmitComment('');
    setSearchValidatorTerm('');
    setOmPreview(null);
    setOmSelections({});

    // Ordre de mission : circuit construit côté serveur → on charge l'aperçu
    // (postes + titulaires) au lieu de la sélection manuelle des validateurs.
    if (document.category === 'Ordre de mission') {
      setWorkflowTemplates([]);
      setAvailableUsers([]);
      setLoadingUsers(true);
      try {
        const res = await workflowAPI.getOrdreMissionPreview(document.id);
        const steps = res.data?.steps || [];
        setOmPreview({ steps });
        // Pré-remplir les postes à 1 titulaire
        const init = {};
        steps.forEach(s => { if (s.posteCode && !s.needsSelection && s.chosenId) init[s.posteCode] = s.chosenId; });
        setOmSelections(init);
      } catch (err) {
        setError(err.response?.data?.message || 'Impossible de charger le circuit de validation.');
        setOmPreview({ steps: [], error: err.response?.data?.message });
      } finally {
        setLoadingUsers(false);
      }
      return;
    }

    // Charger users ET templates en parallèle (au lieu de séquentiel)
    setLoadingUsers(true);
    try {
      const [usersRes, templatesRes] = await Promise.all([
        usersAPI.getAll(),
        workflowTemplatesAPI.getAll(),
      ]);

      const usersList = usersRes.data?.users || [];
      setAvailableUsers(usersList.filter(u => ['validator', 'director', 'admin'].includes(u.role)));

      const templates = templatesRes.data?.data || [];
      const filtered = templates.filter(t =>
        !t.categories || t.categories.length === 0 || t.categories.includes(document.category)
      );
      setWorkflowTemplates(filtered);
    } catch (err) {
      setError('Impossible de charger les données de validation.');
      setWorkflowTemplates([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const applyWorkflowTemplate = (template) => {
    const validatorIds = (template.validators || []).map(v => v.userId);
    setSelectedValidators(validatorIds);
    toast.success(`Modele "${template.name}" applique`);
  };

  const handleOpenReassign = async (task) => {
    setReassignTask(task);
    setReassignSearch('');
    // Charger les validateurs disponibles si pas encore chargé
    if (reassignValidators.length === 0) {
      try {
        const res = await usersAPI.getAll();
        const users = res.data?.users || [];
        setReassignValidators(users.filter(u => ['validator', 'director', 'admin'].includes(u.role)));
      } catch (e) {
        toast.error('Erreur chargement des validateurs');
      }
    }
  };

  const handleConfirmReassign = async (newValidatorId) => {
    if (!reassignTask) return;
    try {
      setReassignLoading(true);
      await workflowAPI.reassignTask(reassignTask.id, newValidatorId);
      toast.success('Tâche réaffectée avec succès');
      setReassignTask(null);
      loadDocuments(currentPage);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erreur lors de la réaffectation');
    } finally {
      setReassignLoading(false);
    }
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
    const isOM = documentToSubmit?.category === 'Ordre de mission';

    let workflowData;
    if (isOM) {
      // Vérifier que chaque poste multi-titulaires a bien un titulaire choisi
      const steps = omPreview?.steps || [];
      const missing = steps.find(s => s.posteCode && !omSelections[s.posteCode]);
      if (missing) {
        toast(`Veuillez choisir le titulaire pour « ${missing.label} ».`);
        return;
      }
      workflowData = {
        documentId: documentToSubmit.id,
        posteSelections: omSelections,
        comment: submitComment,
      };
    } else {
      if (selectedValidators.length === 0) {
        toast('Veuillez sélectionner au moins un validateur.');
        return;
      }
      workflowData = {
        documentId: documentToSubmit.id,
        validatorIds: selectedValidators,
        comment: submitComment,
      };
    }

    try {
      setSubmitLoading(true);
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

  const categories = allCategories;

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
    setSearchInput('');
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
    const bom = '﻿';
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

  // Tri local (favoris en premier + tri par colonne)
  const sortedDocuments = [...documents].sort((a, b) => {
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

  // La pagination est gérée côté serveur
  const totalPages = serverTotalPages;
  const safePage = Math.min(currentPage, totalPages);
  const pagedDocuments = sortedDocuments;

  // Stats pour le header
  const stats = { pending: documents.filter(d => d.status === 'pending_validation').length };

  // ── Style constants ──
  const STATUS_CFG = {
    draft:              { dot: 'var(--fg-subtle)',  label: 'Brouillon',     cls: 'ged-badge-neutral' },
    pending:            { dot: 'var(--warning)',     label: 'En validation', cls: 'ged-badge-warning' },
    pending_validation: { dot: 'var(--warning)',     label: 'En validation', cls: 'ged-badge-warning' },
    approved:           { dot: 'var(--success)',     label: 'Approuvé',      cls: 'ged-badge-success' },
    rejected:           { dot: 'var(--danger)',      label: 'Rejeté',        cls: 'ged-badge-danger'  },
    in_progress:        { dot: 'var(--brand)',       label: 'En cours',      cls: 'ged-badge-brand'   },
  };
  const btnPrimary = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 'var(--radius-2)', background: 'var(--brand)', color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', textDecoration: 'none' };
  const btnOutline = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 'var(--radius-2)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, border: '1px solid var(--border)', cursor: 'pointer' };
  const btnDanger  = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 'var(--radius-2)', background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: 13, border: '1px solid var(--danger-soft)', cursor: 'pointer' };
  const btnSmall   = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '5px 10px', borderRadius: 'var(--radius-2)', background: 'var(--brand)', color: '#fff', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' };
  const iconBtn    = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 6, borderRadius: 'var(--radius-2)', background: 'var(--surface-2)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--fg-muted)' };
  const thStyle    = { padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' };
  const tdStyle    = { padding: '10px 14px', verticalAlign: 'middle' };
  const selectStyle = { height: 34, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, outline: 'none', cursor: 'pointer' };
  const segActive  = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 'var(--radius-2)', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg)', fontSize: 13, fontWeight: 500, cursor: 'pointer', boxShadow: 'var(--shadow-1)' };
  const segIdle    = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 'var(--radius-2)', background: 'transparent', border: '1px solid transparent', color: 'var(--fg-muted)', fontSize: 13, cursor: 'pointer' };
  const pageBtn    = { width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg-muted)', cursor: 'pointer', fontSize: 13 };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <Loader size={24} color="var(--fg-muted)" className="animate-spin" />
    </div>
  );

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 40px' }} className="animate-pageFade">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20, paddingTop: 4 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg)', margin: 0, letterSpacing: '-0.3px' }}>Documents</h1>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 3 }}>{totalDocuments} documents · {stats.pending} en validation</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportCSV} style={btnOutline}>Exporter CSV</button>
          <Link to="/upload" style={btnPrimary}>+ Nouveau document</Link>
        </div>
      </div>

      {/* Barre de filtres (une seule ligne) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {/* Segmented view switcher : Table / Grille */}
        <div style={{ display: 'flex', background: 'var(--surface-2)', borderRadius: 'var(--radius-2)', padding: 3, gap: 2 }}>
          <button onClick={() => setViewMode('list')} style={viewMode === 'list' ? segActive : segIdle}>
            <LayoutList size={13} /> Table
          </button>
          <button onClick={() => setViewMode('grid')} style={viewMode === 'grid' ? segActive : segIdle}>
            <LayoutGrid size={13} /> Grille
          </button>
        </div>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Titre, catégorie…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            style={{ width: '100%', paddingLeft: 32, paddingRight: 10, height: 34, border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          />
          {searchInput && (
            <button onClick={() => setSearchInput('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-subtle)' }}>
              <X size={12} />
            </button>
          )}
        </div>
        {/* Chip statut */}
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
          <option value="all">Statut : tous</option>
          <option value="draft">Brouillon</option>
          <option value="pending_validation">En validation</option>
          <option value="approved">Approuvé</option>
          <option value="rejected">Rejeté</option>
        </select>
        {/* Chip catégorie */}
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={selectStyle}>
          <option value="all">Type : tous</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {/* Date from - to (compact) */}
        <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} style={{ ...selectStyle, width: 130 }} />
        <span style={{ color: 'var(--fg-subtle)', fontSize: 12 }}>→</span>
        <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} style={{ ...selectStyle, width: 130 }} />
        {activeFilterCount > 0 && (
          <button onClick={resetAllFilters} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 'var(--radius-full)', background: 'var(--danger-soft)', color: 'var(--danger)', border: 'none', cursor: 'pointer', fontSize: 12 }}>
            <X size={11} /> Effacer
          </button>
        )}
      </div>

      {/* Layout 2 colonnes : main (3/4) + sidebar templates (1/4) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 20, alignItems: 'start' }}>
        <div>

          {/* Bulk action bar */}
          {selectedIds.length > 0 && (
            <div className="ged-card animate-fadeIn" style={{ padding: '10px 14px', marginBottom: 12, background: 'var(--brand-soft)', borderColor: 'var(--brand-soft-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--brand-fg)', fontWeight: 500 }}>
                  <b>{selectedIds.length}</b> sélectionné{selectedIds.length > 1 ? 's' : ''}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={handleBulkArchive} disabled={bulkLoading} style={btnOutline}>Archiver</button>
                  <button onClick={handleBulkDelete} disabled={bulkLoading} style={btnDanger}>Supprimer</button>
                  <button onClick={clearSelection} style={btnOutline}><X size={12} /></button>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ padding: '10px 14px', marginBottom: 12, background: 'var(--danger-soft)', color: 'var(--danger)', borderRadius: 'var(--radius-3)', fontSize: 13 }}>{error}</div>
          )}

          {/* TABLE VIEW */}
          {viewMode === 'list' && totalDocuments > 0 && (
            <div className="ged-card" style={{ overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)' }}>
                    <th style={thStyle}><input type="checkbox" checked={pagedDocuments.length > 0 && selectedIds.length === pagedDocuments.length} onChange={toggleSelectAll} /></th>
                    <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => handleSort('title')}>Document {sortConfig.key === 'title' ? (sortConfig.dir === 'asc' ? '↑' : '↓') : ''}</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Statut</th>
                    <th style={thStyle}>Auteur</th>
                    <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => handleSort('createdAt')}>Date {sortConfig.key === 'createdAt' ? (sortConfig.dir === 'asc' ? '↑' : '↓') : ''}</th>
                    <th style={thStyle}>Workflow</th>
                    <th style={thStyle}></th>
                  </tr>
                </thead>
                <tbody>
                  {pagedDocuments.map(doc => {
                    const st = STATUS_CFG[doc.status] || STATUS_CFG.draft;
                    const isSelected = selectedIds.includes(doc.id);
                    const wfApproved = doc.workflows?.filter(w => w.status === 'approved').length ?? 0;
                    const wfTotal = doc.workflows?.length ?? 0;
                    const hasWf = ['pending_validation', 'in_progress', 'approved', 'rejected'].includes(doc.status);
                    return (
                      <React.Fragment key={doc.id}>
                        <tr
                          style={{ background: isSelected ? 'var(--brand-soft)' : 'var(--surface)', borderBottom: '1px solid var(--surface-3)', cursor: 'pointer', transition: 'background 0.1s' }}
                          onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--surface-2)'; }}
                          onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'var(--surface)'; }}
                          onClick={() => setViewingDocument(doc)}
                        >
                          <td style={tdStyle} onClick={e => e.stopPropagation()}><input type="checkbox" checked={isSelected} onChange={() => toggleSelect(doc.id)} /></td>
                          <td style={{ ...tdStyle, maxWidth: 300 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <button onClick={e => { e.stopPropagation(); toggleFav(doc.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: isFav(doc.id) ? '#FBBF24' : 'var(--fg-subtle)' }}>
                                <Star size={13} fill={isFav(doc.id) ? '#FBBF24' : 'none'} />
                              </button>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</div>
                                {doc.fileSize ? <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{formatSize(doc.fileSize)}</div> : null}
                              </div>
                            </div>
                          </td>
                          <td style={tdStyle}>
                            {doc.category && <span className="ged-badge ged-badge-neutral" style={{ fontSize: 11 }}>{doc.category}</span>}
                          </td>
                          <td style={tdStyle}>
                            <span className={`ged-badge ${st.cls}`} style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.dot, display: 'inline-block', flexShrink: 0 }} />
                              {st.label}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, fontSize: 12, color: 'var(--fg-muted)' }}>
                            {doc.uploadedBy ? `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName[0]}.` : '—'}
                          </td>
                          <td style={{ ...tdStyle, fontSize: 12, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>
                            {formatDate(doc.createdAt)}
                          </td>
                          <td style={tdStyle}>
                            {hasWf && (
                              <button onClick={e => toggleWorkflow(doc.id, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)' }}>
                                {wfApproved}/{wfTotal}
                              </button>
                            )}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                              <button onClick={() => setViewingDocument(doc)} style={iconBtn} title="Voir"><Eye size={14} /></button>
                              <button onClick={() => handleOpenSubmitModal(doc)} disabled={doc.status !== 'draft'} style={{ ...iconBtn, opacity: doc.status !== 'draft' ? 0.3 : 1 }} title="Soumettre"><Send size={14} /></button>
                              <button onClick={() => handleArchive(doc)} style={iconBtn} title="Archiver"><Archive size={14} /></button>
                              <button onClick={() => handleDelete(doc.id)} style={{ ...iconBtn, color: 'var(--danger)' }} title="Supprimer"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                        {hasWf && expandedWorkflows.has(doc.id) && (
                          <tr style={{ background: 'var(--surface-2)' }}>
                            <td colSpan={8} style={{ padding: '12px 18px' }}>
                              <WorkflowProgress
                                workflows={doc.workflows}
                                documentStatus={doc.status}
                                documentId={doc.id}
                                submittedBy={doc.userId}
                                isAdmin={user?.role === 'admin'}
                                onReassign={user?.role === 'admin' ? handleOpenReassign : null}
                                onRelanced={() => loadDocuments(currentPage)}
                                hideDiscussion={doc.status !== 'rejected'}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* GRID VIEW */}
          {viewMode === 'grid' && totalDocuments > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {pagedDocuments.map((doc) => {
                const st = STATUS_CFG[doc.status] || STATUS_CFG.draft;
                const isSelected = selectedIds.includes(doc.id);
                const hasWf = ['pending_validation', 'in_progress', 'approved', 'rejected'].includes(doc.status);
                const wfApproved = doc.workflows?.filter(w => w.status === 'approved').length ?? 0;
                const wfTotal = doc.workflows?.length ?? 0;
                const FILE_TYPES = { 'application/pdf': 'PDF', 'application/msword': 'Word', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word', 'image/jpeg': 'JPEG', 'image/png': 'PNG' };
                const fileTypeLabel = FILE_TYPES[doc.fileType] || doc.fileType?.split('/')[1]?.toUpperCase() || 'PDF';
                return (
                  <div key={doc.id} className="ged-card" style={{ overflow: 'hidden', cursor: 'pointer', borderColor: isSelected ? 'var(--brand)' : 'var(--border)', position: 'relative' }} onClick={() => setViewingDocument(doc)}>
                    {/* Thumbnail area */}
                    <div style={{ height: 120, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--border)', position: 'relative' }}>
                      <div style={{ textAlign: 'center' }}>
                        <FileText size={32} color="var(--fg-subtle)" />
                        <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginTop: 6, fontWeight: 500 }}>
                          {fileTypeLabel}{doc.category ? ` · ${doc.category}` : ''}
                        </div>
                      </div>
                      {/* Checkbox overlay */}
                      <div
                        onClick={e => { e.stopPropagation(); toggleSelect(doc.id); }}
                        style={{
                          position: 'absolute', top: 8, left: 8,
                          width: 18, height: 18, borderRadius: 4,
                          border: `2px solid ${isSelected ? 'var(--brand)' : 'rgba(255,255,255,0.5)'}`,
                          background: isSelected ? 'var(--brand)' : 'rgba(0,0,0,0.3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', zIndex: 2,
                        }}
                      >
                        {isSelected && <Check size={11} color="#fff" />}
                      </div>
                    </div>
                    <div style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg)', marginBottom: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{doc.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 8 }}>
                        {doc.category ? `${doc.category} · ` : ''}{formatDate(doc.createdAt)}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span className={`ged-badge ${st.cls}`} style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: st.dot, display: 'inline-block' }} />
                          {st.label}
                        </span>
                        <button onClick={e => { e.stopPropagation(); toggleFav(doc.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isFav(doc.id) ? '#FBBF24' : 'var(--fg-subtle)', padding: 0 }}>
                          <Star size={13} fill={isFav(doc.id) ? '#FBBF24' : 'none'} />
                        </button>
                      </div>
                      {hasWf && (
                        <div style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>Workflow : {wfApproved}/{wfTotal}</div>
                      )}
                      {hasWf && expandedWorkflows.has(doc.id) && (
                        <div style={{ marginBottom: 8 }} onClick={e => e.stopPropagation()}>
                          <WorkflowProgress
                            workflows={doc.workflows}
                            documentStatus={doc.status}
                            documentId={doc.id}
                            submittedBy={doc.userId}
                            isAdmin={user?.role === 'admin'}
                            onReassign={user?.role === 'admin' ? handleOpenReassign : null}
                            onRelanced={() => loadDocuments(currentPage)}
                            hideDiscussion={doc.status !== 'rejected'}
                          />
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setViewingDocument(doc)} style={{ ...btnSmall, flex: 1 }}>Voir</button>
                        <button onClick={() => handleOpenSubmitModal(doc)} disabled={doc.status !== 'draft'} style={{ ...iconBtn, opacity: doc.status !== 'draft' ? 0.3 : 1 }}><Send size={13} /></button>
                        <button onClick={() => handleArchive(doc)} style={iconBtn}><Archive size={13} /></button>
                        <button onClick={() => handleDelete(doc.id)} style={{ ...iconBtn, color: 'var(--danger)' }}><Trash2 size={13} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {totalDocuments === 0 && !loading && (
            <div className="ged-card" style={{ padding: 40, textAlign: 'center' }}>
              <FileText size={32} color="var(--fg-subtle)" style={{ marginBottom: 12 }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>Aucun document trouvé</p>
              <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 16 }}>
                {activeFilterCount > 0 ? 'Aucun résultat pour ces filtres.' : 'Commencez par uploader un document.'}
              </p>
              {activeFilterCount > 0
                ? <button onClick={resetAllFilters} style={btnOutline}>Effacer les filtres</button>
                : <Link to="/upload" style={btnPrimary}>Uploader un document</Link>
              }
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, fontSize: 12, color: 'var(--fg-muted)' }}>
              <span>Page <b style={{ color: 'var(--fg)' }}>{safePage}</b> sur <b style={{ color: 'var(--fg)' }}>{totalPages}</b> · {totalDocuments} documents</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => setCurrentPage(1)} disabled={safePage === 1} style={pageBtn}>«</button>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1} style={pageBtn}>‹</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                  .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…'); acc.push(p); return acc; }, [])
                  .map((p, i) => p === '…'
                    ? <span key={`e-${i}`} style={{ ...pageBtn, cursor: 'default', border: 'none' }}>…</span>
                    : <button key={p} onClick={() => setCurrentPage(p)} style={{ ...pageBtn, background: p === safePage ? 'var(--brand)' : 'var(--surface)', color: p === safePage ? '#fff' : 'var(--fg-muted)', borderColor: p === safePage ? 'var(--brand)' : 'var(--border)' }}>{p}</button>
                  )}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} style={pageBtn}>›</button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={safePage === totalPages} style={pageBtn}>»</button>
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR — Templates */}
        <div className="ged-card" style={{ padding: 0, overflow: 'hidden', position: 'sticky', top: 72 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <FilePlus size={14} color="var(--brand)" /> Nouveau document
              </h3>
              {user?.role === 'admin' && (
                <button onClick={() => setShowPermissionsModal(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', padding: 4 }} title="Gérer les permissions">
                  <Settings size={13} />
                </button>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Rechercher un modèle…"
                value={searchValidatorTerm}
                onChange={e => setSearchValidatorTerm(e.target.value)}
                style={{ width: '100%', paddingLeft: 28, height: 32, border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: '6px 8px', maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
            {sidebarTemplates
              .filter(t => t.hasAccess && (!searchValidatorTerm || t.templateName.toLowerCase().includes(searchValidatorTerm.toLowerCase())))
              .map(t => {
                const name = t.templateName;
                const icon = TEMPLATE_ICONS[name] || '📄';
                const itemStyle = { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 'var(--radius-2)', cursor: 'pointer', textDecoration: 'none', fontSize: 12.5, color: 'var(--fg)', width: '100%', border: 'none', background: 'none', textAlign: 'left' };
                if (name === 'Demande de travaux') return (
                  <li key={name}>
                    <Link to="/create-work-request" style={{ ...itemStyle, color: 'var(--brand)', fontWeight: 500 }} onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-soft)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      <span>{icon}</span><span>{name}</span>
                    </Link>
                  </li>
                );
                if (t.isRestricted) return (
                  <li key={name}>
                    <Link to="/create-from-template" state={{ templateName: name }} style={{ ...itemStyle, color: 'var(--brand)', fontWeight: 500 }} onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-soft)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      <span>{icon}</span>
                      <span style={{ flex: 1 }}>{name}</span>
                      <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'var(--brand-soft)', color: 'var(--brand)', fontWeight: 700, letterSpacing: '0.5px' }}>PRO</span>
                    </Link>
                  </li>
                );
                return (
                  <li key={name}>
                    <Link to="/create-from-template" state={{ templateName: name }} style={itemStyle} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      <span>{icon}</span><span>{name}</span>
                    </Link>
                  </li>
                );
              })}
            {sidebarTemplates.filter(t => t.hasAccess).length === 0 && (
              <li style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: 'var(--fg-muted)' }}>Aucun modèle disponible</li>
            )}
          </ul>
        </div>
      </div>

      {/* Submit Workflow Modal */}
      {showSubmitModal && ReactDOM.createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 9000 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-3)', boxShadow: 'var(--shadow-3)', maxWidth: 640, width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg)', margin: 0 }}>Soumettre au workflow</h2>
              <button onClick={handleCloseSubmitModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)' }}><X size={24} /></button>
            </div>
            <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <p style={{ fontSize: 13, color: 'var(--fg)', margin: 0 }}>Document : <span style={{ fontWeight: 500 }}>{documentToSubmit?.title}</span></p>

              {/* Ordre de mission : circuit auto + choix du titulaire si plusieurs */}
              {documentToSubmit?.category === 'Ordre de mission' && (
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--fg)', marginBottom: 10 }}>Circuit de validation</label>
                  {loadingUsers ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}><Loader className="animate-spin" style={{ color: 'var(--brand)' }} /></div>
                  ) : omPreview?.error ? (
                    <div style={{ padding: 14, background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-2)', fontSize: 13, color: 'var(--danger)' }}>{omPreview.error}</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(omPreview?.steps || []).map((step, index) => (
                        <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-2)' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, background: 'var(--brand)', color: '#fff', borderRadius: '50%', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{index + 1}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{step.label}</div>
                            {step.posteCode && step.needsSelection ? (
                              <select
                                value={omSelections[step.posteCode] || ''}
                                onChange={e => setOmSelections(prev => ({ ...prev, [step.posteCode]: e.target.value }))}
                                style={{ marginTop: 4, width: '100%', height: 32, border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, padding: '0 8px' }}
                              >
                                <option value="">— Choisir —</option>
                                {step.holders.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                              </select>
                            ) : (
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{step.holders.find(h => h.id === (omSelections[step.posteCode] || step.chosenId))?.name || step.holders[0]?.name}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Modeles de workflow predéfinis */}
              {workflowTemplates.length > 0 && (
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--fg)', marginBottom: 8 }}>Utiliser un modele</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {workflowTemplates.map(tpl => (
                      <button
                        key={tpl.id}
                        onClick={() => applyWorkflowTemplate(tpl)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', fontSize: 12, fontWeight: 500, background: 'var(--brand-soft)', color: 'var(--brand)', border: '1px solid var(--brand-soft)', borderRadius: 'var(--radius-2)', cursor: 'pointer' }}
                        title={tpl.description || ''}
                      >
                        <LayoutGrid size={14} />
                        {tpl.name}
                        <span style={{ color: 'var(--fg-muted)' }}>({(tpl.validators || []).length})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: documentToSubmit?.category === 'Ordre de mission' ? 'none' : undefined }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--fg)', marginBottom: 10 }}>Sélectionnez les validateurs (dans l'ordre)</label>
                {loadingUsers
                  ? <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}><Loader className="animate-spin" style={{ color: 'var(--brand)' }} /></div>
                  : availableUsers.length === 0 && !searchValidatorTerm
                    ? <div style={{ textAlign: 'center', padding: '24px 0', background: 'var(--surface-2)', borderRadius: 'var(--radius-3)' }}>
                        <AlertCircle style={{ margin: '0 auto 8px', color: 'var(--fg-subtle)' }} size={32} />
                        <p style={{ color: 'var(--fg)', fontSize: 13, margin: 0 }}>Aucun validateur disponible</p>
                      </div>
                    : <>
                      <div style={{ position: 'relative', marginBottom: 10 }}>
                        <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)', pointerEvents: 'none' }} size={16} />
                        <input
                          type="text"
                          placeholder="Rechercher par nom, rôle ou email..."
                          value={searchValidatorTerm}
                          onChange={(e) => setSearchValidatorTerm(e.target.value)}
                          style={{ width: '100%', paddingLeft: 34, paddingRight: 12, height: 36, border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', padding: 10 }}>
                        {filteredAvailableUsers.length > 0
                          ? filteredAvailableUsers.map((u) => (
                            <div
                              key={u.id}
                              onClick={() => addValidator(u.id)}
                              style={{ padding: 10, borderRadius: 'var(--radius-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: selectedValidators.includes(u.id) ? 'var(--brand-soft)' : 'var(--surface-2)', border: selectedValidators.includes(u.id) ? '2px solid var(--brand)' : '1px solid var(--border)' }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--fg)' }}>
                                <User size={18} />
                                <div>
                                  <div style={{ fontWeight: 500, fontSize: 13 }}>{u.firstName} {u.lastName}</div>
                                  <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{u.role}</div>
                                </div>
                              </div>
                              {selectedValidators.includes(u.id) && <Check size={18} style={{ color: 'var(--brand)' }} />}
                            </div>
                          ))
                          : <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--fg-muted)', fontSize: 13 }}>
                              {searchValidatorTerm ? "Aucun validateur trouvé pour cette recherche." : "Aucun validateur disponible."}
                            </div>
                        }
                      </div>
                    </>
                }
              </div>
              {selectedValidators.length > 0 && (
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--fg)', marginBottom: 10 }}>Ordre de validation</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 4 }}>Le premier validateur est celui qui doit agir en premier.</div>
                    {selectedValidators.map((userId, index) => (
                      <div key={userId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 10, background: 'var(--brand-soft)', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--fg)' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, background: 'var(--brand)', color: '#fff', borderRadius: '50%', fontWeight: 700, fontSize: 13 }}>{index + 1}</span>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{getUserNameById(userId)}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => moveValidator(index, 'up')} disabled={index === 0} style={{ padding: '2px 6px', color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-2)', opacity: index === 0 ? 0.3 : 1 }}>↑</button>
                          <button onClick={() => moveValidator(index, 'down')} disabled={index === selectedValidators.length - 1} style={{ padding: '2px 6px', color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-2)', opacity: index === selectedValidators.length - 1 ? 0.3 : 1 }}>↓</button>
                          <button onClick={() => removeValidator(userId)} style={{ padding: '2px 6px', color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-2)' }}><X size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--fg)', marginBottom: 8 }}>Commentaire (optionnel)</label>
                <textarea
                  value={submitComment}
                  onChange={(e) => setSubmitComment(e.target.value)}
                  rows={3}
                  placeholder="Ajoutez un message..."
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={handleCloseSubmitModal} disabled={submitLoading} style={{ padding: '7px 16px', background: 'var(--surface-2)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', cursor: 'pointer', fontSize: 13 }}>Annuler</button>
              {(() => {
                const isOMSubmit = documentToSubmit?.category === 'Ordre de mission';
                const submitDisabled = submitLoading || (isOMSubmit ? (!omPreview || !!omPreview.error) : selectedValidators.length === 0);
                return (
              <button onClick={handleSubmitWorkflow} disabled={submitDisabled} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px', background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 'var(--radius-2)', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: submitDisabled ? 0.5 : 1 }}>
                {submitLoading ? <><Loader className="animate-spin" size={14} />Soumission...</> : <><Send size={14} />Soumettre</>}
              </button>
                );
              })()}
            </div>
          </div>
        </div>,
        document.body
      )}

      {ConfirmModalRenderer}

      {viewingDocument && (
        <DocumentViewer
          document={viewingDocument}
          onClose={closeViewer}
          onSelectDocument={setViewingDocument}
          documents={sortedDocuments}
          showActions={false}
        />
      )}

      {/* Modal réaffectation workflow */}
      {reassignTask && ReactDOM.createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 9000 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-3)', boxShadow: 'var(--shadow-3)', maxWidth: 440, width: '100%' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)', margin: 0 }}>Réaffecter la tâche</h2>
                <p style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>
                  Actuellement : <span style={{ fontWeight: 500 }}>{reassignTask.validator?.firstName} {reassignTask.validator?.lastName}</span>
                </p>
              </div>
              <button onClick={() => setReassignTask(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)', pointerEvents: 'none' }} size={14} />
                <input
                  type="text"
                  value={reassignSearch}
                  onChange={e => setReassignSearch(e.target.value)}
                  placeholder="Rechercher un validateur..."
                  style={{ width: '100%', paddingLeft: 30, paddingRight: 10, height: 34, border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-2)' }}>
                {reassignValidators
                  .filter(u => {
                    const t = reassignSearch.toLowerCase();
                    return !t || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(t);
                  })
                  .map(u => (
                    <button
                      key={u.id}
                      onClick={() => handleConfirmReassign(u.id)}
                      disabled={reassignLoading || u.id === reassignTask.validatorId}
                      style={{ width: '100%', textAlign: 'left', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: u.id === reassignTask.validatorId ? 'default' : 'pointer', opacity: (reassignLoading || u.id === reassignTask.validatorId) ? 0.4 : 1 }}
                      onMouseEnter={e => { if (u.id !== reassignTask.validatorId) e.currentTarget.style.background = 'var(--brand-soft)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                    >
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', margin: 0 }}>{u.firstName} {u.lastName}</p>
                        <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: 0 }}>{u.role}</p>
                      </div>
                      {u.id === reassignTask.validatorId && (
                        <span style={{ fontSize: 11, color: 'var(--brand)' }}>Actuel</span>
                      )}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      <TemplatePermissionsModal
        isOpen={showPermissionsModal}
        onClose={() => { setShowPermissionsModal(false); loadTemplatePermissions(); }}
      />
    </div>
  );
};

export default DocumentList;
