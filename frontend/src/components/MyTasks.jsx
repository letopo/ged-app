// frontend/src/components/MyTasks.jsx - VERSION COMPLÈTE AVEC WORKFLOW COMPTABLE, ACTION COMBINÉE DG ET SUPPORT DARK MODE

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import ReactDOM from 'react-dom';
import { workflowAPI, listsAPI, documentsAPI, missionMealAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import DocumentViewer from './DocumentViewer';
import WorkflowProgress from './WorkflowProgress';
import BulkValidationBar from './BulkValidationBar';
import QuickPreviewModal from './QuickPreviewModal';
import DemandeBesoin from '../pages/templates/DemandeBesoin';
import FicheSuiviEquipements from '../pages/templates/FicheSuiviEquipements';
import PieceDeCaisse from '../pages/templates/PieceDeCaisse';
import { 
  Clock, CheckCircle, XCircle, User, Calendar, Loader, Eye, Edit, 
  ShieldCheck, Filter, ThumbsUp, CalendarPlus, FileText, Send, AlertCircle,
  AlertTriangle, ListChecks, X, ZoomIn, UserCheck // ✅ AJOUT DE UserCheck
} from 'lucide-react';
import html2canvas from 'html2canvas';
import EmptyState from './EmptyState';
import jsPDF from 'jspdf';
import { pdf } from '@react-pdf/renderer';
import { PermissionPdfDocument } from '../pdf-templates/PermissionPdf';
import toast from 'react-hot-toast';

const MAX_SELECTION = 20;
const COMPTABLE_EMAIL = 'raoulwouapi2017@yahoo.com';
const DG_EMAIL = 'hopitalcameroun@ordredemaltefrance.org'; 

const MyTasks = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const dbPdfRef = useRef(null);
  const fsPdfRef = useRef(null);
  const piecePdfRef = useRef(null);
  
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('pending');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [taskToProcess, setTaskToProcess] = useState(null);
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [remplacantName, setRemplacantName] = useState(''); 
  
  const [showDemandeBesoins, setShowDemandeBesoins] = useState(false);
  const [demandeBesoinsData, setDemandeBesoinsData] = useState({
    date_demande: new Date().toLocaleDateString('fr-FR'),
    service: '',
    reference: '',
    justification: '',
    lines: [{ designation: '', quantite: '', prixUnitaire: '', montantTotal: '' }]
  });
  const [submittingDB, setSubmittingDB] = useState(false);
  
  const [showFicheSuivi, setShowFicheSuivi] = useState(false);
  const [ficheSuiviData, setFicheSuiviData] = useState({
    date: new Date().toLocaleDateString('fr-FR'),
    service: '',
    equipement: '',
    marque: '',
    ns: '',
    heureDebut: '',
    heureFin: '',
    motifs: [],
    situations: [],
    probleme: '',
    panne: '',
    travail: '',
    pieces: [{ designation: '', reference: '', quantite: '' }],
    conclusion: ''
  });
  const [submittingFS, setSubmittingFS] = useState(false);
  
  const [showPieceDeCaisseFromOM, setShowPieceDeCaisseFromOM] = useState(false);
  const [pieceDeCaisseData, setPieceDeCaisseData] = useState({
    nom: '',
    date: new Date().toLocaleDateString('fr-FR'),
    concerne: '',
    lines: [{ refCompta: '', libelle: '', refGage: '', entrees: '', sorties: '' }],
    totalEnLettres: ''
  });
  // Calcul des indemnités missionnaire/conducteur pour l'OM en cours de traitement,
  // et suivi de quel(s) bénéficiaire(s) ont déjà eu leur pièce de caisse créée cette session
  // (une pièce de caisse par bénéficiaire — l'OM n'est validé qu'une fois qu'elle le décide).
  const [pcMealCalc, setPcMealCalc] = useState(null);
  const [pcCreatedFor, setPcCreatedFor] = useState(new Set());
  const [pcTargetRole, setPcTargetRole] = useState(null); // 'missionnaire' | 'conducteur'
  
  const [showDBFromFS, setShowDBFromFS] = useState(false);
  const [showValidatorsSelection, setShowValidatorsSelection] = useState(false);
  const [dbValidators, setDbValidators] = useState([]);
  const [selectedDbValidators, setSelectedDbValidators] = useState([]);
  const [createdDBDocumentId, setCreatedDBDocumentId] = useState(null);
  
  const [services, setServices] = useState([]);
  const [isInSelectionMode, setIsInSelectionMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [taskForPreview, setTaskForPreview] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });

  useEffect(() => {
    loadTasks(1);
    loadServices();
  }, []);

  const loadTasks = async (page = currentPage) => {
    try {
      setLoading(true);
      setError('');
      const response = await workflowAPI.getMyTasks('all', { page, limit: 20 });
      setTasks(response.data.tasks || []);
      if (response.data.pagination) {
        setPagination(response.data.pagination);
        setCurrentPage(response.data.pagination.page);
      }
    } catch (err) {
      setError(t('Erreur lors du chargement des tâches.'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const goToPage = (page) => {
    if (page < 1 || page > pagination.totalPages) return;
    loadTasks(page);
  };

  const loadServices = async () => {
    try {
      const response = await listsAPI.getServices();
      setServices(response.data.data || []);
    } catch (err) {
      console.error('Erreur chargement services:', err);
    }
  };

  const isTaskOverdue = (task) => {
    if (task.status !== 'pending') return false;
    const now = new Date();
    if (task.deadlineAt) return now > new Date(task.deadlineAt);
    if (!task.assignedAt) return false;
    const hoursDiff = (now - new Date(task.assignedAt)) / (1000 * 60 * 60);
    return hoursDiff > 8;
  };

  const getDaysOverdue = (task) => {
    if (task.daysOverdue != null) return task.daysOverdue;
    if (!task.deadlineAt || task.status !== 'pending') return 0;
    const now = new Date();
    const diff = (now - new Date(task.deadlineAt)) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(diff));
  };

  const getHoursOverdue = (task) => {
    if (!task.assignedAt || task.status !== 'pending') return 0;
    const now = new Date();
    const assigned = new Date(task.assignedAt);
    const hoursDiff = (now - assigned) / (1000 * 60 * 60);
    return Math.max(0, Math.floor(hoursDiff - 8));
  };

  const canBypassValidation = (task) => {
    // bypassInfo est calculé côté serveur : étape précédente pending la plus proche
    if (!task.bypassInfo) return false;
    return isTaskOverdue(task.bypassInfo);
  };

  const isTaskSelectable = (task) => {
    return task.status === 'pending' || (task.status === 'queued' && canBypassValidation(task));
  };

  const handleToggleSelectionMode = () => {
    setIsInSelectionMode(prev => !prev);
    setSelectedTaskIds([]);
  };

  const handleTaskSelection = (taskId) => {
    setSelectedTaskIds(prev => {
      if (prev.includes(taskId)) {
        return prev.filter(id => id !== taskId);
      }
      if (prev.length < MAX_SELECTION) {
        return [...prev, taskId];
      }
      toast(t('Vous ne pouvez pas sélectionner plus de {{max}} documents à la fois.', { max: MAX_SELECTION }));
      return prev;
    });
  };

  const handleSelectAll = () => {
    const idsToSelect = filteredAndSortedTasks.filter(isTaskSelectable).slice(0, MAX_SELECTION).map(task => task.id);
    setSelectedTaskIds(idsToSelect);
  };

  const handleDeselectAll = () => {
    setSelectedTaskIds([]);
  };
  
  const handleBulkAction = async (action) => {
    const confirmMessage = t('Vous êtes sur le point de {{action}} {{count}} document(s).\n\nÊtes-vous sûr de vouloir continuer ?', { action: action === 'approve' ? t('approuver') : t('rejeter'), count: selectedTaskIds.length });
    if (!window.confirm(confirmMessage)) return;

    const comment = prompt(t('Ajoutez un commentaire global (optionnel, mais requis si rejet) :'), "");
    if (action === 'reject' && (!comment || comment.trim() === '')) {
      toast(t('Un commentaire est requis pour rejeter en masse.'));
      return;
    }

    let applySignature = false;
    if (action === 'approve' && user?.signaturePath) {
      applySignature = window.confirm(t('Appliquer votre signature sur tous les documents PDF applicables ?'));
    }

    setBulkActionLoading(true);
    setError('');
    
    try {
      const payload = { taskIds: selectedTaskIds, action, comment: comment || '', applySignature };
      const response = await workflowAPI.bulkValidate(payload);
      
      const { summary, errors } = response.data;
      let resultMessage = t('{{count}} document(s) traité(s) avec succès.', { count: summary.succeeded });
      if (summary.failed > 0) {
        resultMessage += '\n' + t('{{count}} échec(s). Détails dans la console.', { count: summary.failed });
        console.error("Erreurs de validation en masse :", errors);
      }
      toast(resultMessage);

      setSelectedTaskIds([]);
      setIsInSelectionMode(false);
      loadTasks(1);

    } catch (err) {
      const errorMessage = err.response?.data?.message || t('Une erreur serveur est survenue.');
      setError(t('Erreur lors de la validation en masse : {{error}}', { error: errorMessage }));
      toast(t('Erreur lors de la validation en masse : {{error}}', { error: errorMessage }));
    } finally {
      setBulkActionLoading(false);
    }
  };

  const filteredAndSortedTasks = useMemo(() => {
    let tempTasks = [...tasks];

    if (filter !== 'all') {
      tempTasks = tempTasks.filter(task => task.status === filter);
    }
    if (serviceFilter !== 'all') {
      tempTasks = tempTasks.filter(task => task.document?.metadata?.service === serviceFilter);
    }
    
    tempTasks.sort((a, b) => {
      let aValue = (sortConfig.key === 'service') ? a.document.metadata?.service || '' : new Date(a.createdAt);
      let bValue = (sortConfig.key === 'service') ? b.document.metadata?.service || '' : new Date(b.createdAt);
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return tempTasks;
  }, [filter, serviceFilter, tasks, sortConfig]);

  const isWorkRequest = (task) => task.document?.category === 'Demande de travaux';
  const isMG = () => user?.email === 'hsjm.moyengeneraux@gmail.com';
  const isBiomedical = () => user?.email === 'hsjm.cellulebiomedicale@gmail.com';
  const isComptable = () => user?.email === COMPTABLE_EMAIL;
  const isDG = () => user?.email === DG_EMAIL;
  const isCaissier = () => user?.role === 'caissier';
  const needsPayerAction = (task) =>
    task.status === 'pending' && isCaissier() && task.document?.category === 'Pièce de caisse';
  const isBeneficiaireOfPC = (task) =>
    task.document?.category === 'Pièce de caisse' && task.document?.metadata?.beneficiaire_id === user?.id;
  
  const ROLES_FOR_COMBINED_ACTION = ['admin', 'director', 'validator'];
  const canUseCombinedAction = () => {
    const isAuthorizedRole = user?.role && ROLES_FOR_COMBINED_ACTION.includes(user.role);
    const hasSignatureAndStamp = user?.signaturePath && user?.stampPath;
    return isAuthorizedRole && hasSignatureAndStamp;
  };

  const debugCombinedAction = canUseCombinedAction();
  const isDirectorOrAdmin = user?.role === 'admin' || user?.role === 'director';
  const hasSignatureAndStamp = user?.signaturePath && user?.stampPath;

  const needsPieceDeCaisse = (task) => {
    return task.status === 'pending' && isComptable()
      && task.document?.category === 'Ordre de mission'
      && task.document?.metadata?.frais_mission === true;
  };

  const MEAL_LABELS = {
    petitDejeuner: t('Petit-déjeuner'), dejeuner: t('Déjeuner'), diner: t('Dîner'),
    primeSecurite: t('Prime de sécurité'), hebergement: t('Hébergement'), peage: t('Péage'),
  };
  const linesFromMealCalc = (calc, fallbackLabel) => {
    if (!calc) {
      return [{ refCompta: '', libelle: fallbackLabel, refGage: '', entrees: '', sorties: '' }];
    }
    // Le péage est indépendant de la catégorie (montant fixe si un conducteur
    // est désigné) : il reste affiché même si la catégorie de la personne est
    // inconnue et que les repas/prime/hébergement ne peuvent pas être calculés.
    const keys = calc.categorieInconnue
      ? ['peage']
      : ['petitDejeuner', 'dejeuner', 'diner', 'primeSecurite', 'hebergement', 'peage'];
    const lines = keys
      .filter(key => calc[key])
      .map(key => ({
        refCompta: '', libelle: MEAL_LABELS[key], refGage: '',
        entrees: '', sorties: String(calc[`montant${key[0].toUpperCase()}${key.slice(1)}`] || 0),
      }));
    return lines.length ? lines : [{ refCompta: '', libelle: fallbackLabel, refGage: '', entrees: '', sorties: '' }];
  };

  const openProcessingModal = async (task) => {
    setTaskToProcess(task);
    // Charger les workflows du document à la demande (lazy) pour WorkflowProgress
    // On évite ainsi de les inclure dans chaque tâche de la liste
    if (!task.document?.workflows) {
      try {
        const res = await workflowAPI.getDocumentWorkflow(task.document.id);
        const wfs = res.data?.data || res.data?.workflows || [];
        setTaskToProcess(prev => prev ? {
          ...prev,
          document: { ...prev.document, workflows: wfs }
        } : null);
      } catch (_) {}
    }
    setComment(task.comment || '');
    setRemplacantName(''); // ✅ AJOUT : Reset du champ
    const metadata = task.document?.metadata || {};
    
    if (isWorkRequest(task) && isMG()) {
      setDemandeBesoinsData(prev => ({ 
        ...prev, 
        service: metadata.service || '', 
        reference: `DT-${task.document.id.slice(0, 8)}`,
        justification: t('Suite à la demande de travaux concernant: {{motif}}', { motif: metadata.motif || '' })
      }));
    }
    
    if (isWorkRequest(task) && isBiomedical()) {
      setFicheSuiviData(prev => ({ 
        ...prev, 
        service: metadata.service || '', 
        equipement: metadata.motif || '' 
      }));
    }
    
    if (needsPieceDeCaisse(task)) {
      setPcCreatedFor(new Set());
      setPcTargetRole(null);
      setPcMealCalc(null);
      missionMealAPI.calculate({
        missionnaireId: metadata.missionnaire_id, missionnaireSource: metadata.missionnaire_source,
        conducteurId: metadata.conducteur_id, conducteurSource: metadata.conducteur_source,
        heureDepart: metadata.heure_depart, heureRetour: metadata.heure_retour,
        dateDepart: metadata.date_depart, dateRetour: metadata.date_retour,
      }).then(res => setPcMealCalc(res.data.data)).catch(() => setPcMealCalc(null));
    }
  };

  const closeProcessingModal = () => {
    setTaskToProcess(null);
    setComment('');
    setRemplacantName(''); // ✅ AJOUT : Reset du champ
    setShowDemandeBesoins(false);
    setShowFicheSuivi(false);
    setShowDBFromFS(false);
    setShowValidatorsSelection(false);
    setShowPieceDeCaisseFromOM(false);
    setSelectedDbValidators([]);
    setCreatedDBDocumentId(null);
    loadTasks(1);
  };

  const handleAction = async (action) => {
    if (!taskToProcess) return;
    if (action === 'reject' && !comment.trim()) {
      toast(t('Un commentaire est requis pour rejeter.'));
      return;
    }

    /*
    if (
      taskToProcess.document.category === 'Demande de permission' &&
      ['approve', 'simple_approve', 'approve_sign_stamp'].includes(action) &&
      !remplacantName.trim()
    ) {
      toast("Veuillez saisir le nom de la personne assurant l'intérim avant de valider.");
      return;
    }
    */
    const isBypass = taskToProcess.status === 'queued' && canBypassValidation(taskToProcess);
    if (isBypass && ['approve', 'simple_approve', 'approve_sign_stamp'].includes(action)) {
      const pendingTask = taskToProcess.bypassInfo || null;
      const hoursOverdue = pendingTask ? getHoursOverdue(pendingTask) : 0;
      
      const confirm = window.confirm(
        t('⚠️ VALIDATION EN BYPASS\n\nLe validateur précédent est en retard de {{hours}}h.\nVoulez-vous valider ce document à sa place ?\n\nNote : Cette action sera enregistrée dans l\'historique.', { hours: hoursOverdue })
      );
      if (!confirm) return;
    }
    
    setActionLoading(action);
    setError('');
    

    try {
      let payload = { comment, remplacantName };
      
      if (isBypass) {
        payload.isBypass = true;
        payload.comment = (comment || '') + '\n' + t('[VALIDATION EN BYPASS - Retard du validateur précédent]');
      }
      
      if (action === 'approve') {
        payload.status = 'approved';
        payload.validationType = 'signature';
      } else if (action === 'approve_sign_stamp') {
        payload.validationType = 'approve_sign_stamp';
      } else if (action === 'reject') {
        payload.status = 'rejected';
      } else if (action === 'stamp') {
        payload.validationType = 'stamp';
      } else if (action === 'dater') {
        payload.validationType = 'dater';
      } else if (action === 'simple_approve') {
        payload.status = 'approved';
      } else if (action === 'payer') {
        payload.status = 'approved';
        payload.validationType = 'payer';
      }
      
      const response = await workflowAPI.validateTask(taskToProcess.id, payload);

      setTasks(currentTasks => 
        currentTasks.map(task =>
          task.id === taskToProcess.id ? response.data.data : task
        )
      );
      
      setTaskToProcess(response.data.data);
      
      if (action === 'stamp') {
        toast(t('Cachet apposé avec succès !'));
        closeProcessingModal();
      } else if (action === 'approve_sign_stamp') {
        toast.success(t('Document approuvé, signé et cacheté avec succès !'));
        closeProcessingModal();
      } else if (['reject', 'simple_approve'].includes(action) || action === 'dater') {
        toast(t('Tâche traitée avec succès !'));
        closeProcessingModal();
      } else if (action === 'approve') {
        toast(t('Document signé avec succès !'));
      }

    } catch (err) {
      const errorMessage = err.response?.data?.message || t("Erreur lors de l'action '{{action}}'.", { action });
      setError(errorMessage);
      toast(errorMessage);
      console.error(`Erreur lors de l'action '${action}':`, err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleInitiateDB = () => setShowDemandeBesoins(true);
  const handleInitiateFicheSuivi = () => setShowFicheSuivi(true);
  
  // role = 'missionnaire' | 'conducteur' — pré-remplit la PC pour ce bénéficiaire précis
  // de l'OM en cours de traitement (une pièce de caisse par bénéficiaire).
  const handleCreatePieceDeCaisseFromOM = (role) => {
    const metadata = taskToProcess?.document?.metadata || {};
    const docTitle = taskToProcess.document.title || t('Document');
    const nom = role === 'conducteur' ? metadata.nom_conducteur : metadata.nom_missionnaire;
    const calc = role === 'conducteur' ? pcMealCalc?.conducteur : pcMealCalc?.missionnaire;
    const objet = metadata.objet_mission ? ` — ${metadata.objet_mission}` : '';
    const dates = metadata.date_depart && metadata.date_retour ? ` (${metadata.date_depart} → ${metadata.date_retour})` : '';
    const beneficiaireId = role === 'conducteur' ? metadata.conducteur_id : metadata.missionnaire_id;
    const beneficiaireSource = role === 'conducteur' ? metadata.conducteur_source : metadata.missionnaire_source;

    setPcTargetRole(role);
    setPieceDeCaisseData({
      nom: nom || '',
      date: new Date().toLocaleDateString('fr-FR'),
      concerne: t('Frais de mission{{objet}}{{dates}} - {{docTitle}}', { objet, dates, docTitle }),
      lines: linesFromMealCalc(calc, t('Frais de mission - {{service}}', { service: metadata.service_demandeur || '' })),
      totalEnLettres: '',
      beneficiaire_id: beneficiaireId || null,
      beneficiaire_source: beneficiaireSource || null,
    });
    setShowPieceDeCaisseFromOM(true);
  };

  const handleSubmitPieceDeCaisseFromOM = async () => {
    setSubmittingDB(true);
    setError('');

    try {
      if (!piecePdfRef.current) throw new Error(t('Référence PDF introuvable'));

      const nonPrintableElements = piecePdfRef.current.querySelectorAll('.not-printable');
      nonPrintableElements?.forEach(el => el.style.display = 'none');
      const canvas = await html2canvas(piecePdfRef.current, { scale: 2, logging: false, useCORS: true });
      nonPrintableElements?.forEach(el => el.style.display = 'block');

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
      const pdfBlob = pdf.output('blob');

      const uploadData = new FormData();
      const fileName = `Piece_Caisse_${taskToProcess.document.category.replace(/\s/g, '_')}_${pcTargetRole || 'beneficiaire'}_${taskToProcess.document.id.slice(0, 8)}_${Date.now()}.pdf`;
      uploadData.append('file', pdfBlob, fileName);
      uploadData.append('title', t('Pièce de caisse - {{concerne}}', { concerne: pieceDeCaisseData.concerne }));
      uploadData.append('category', 'Pièce de caisse');

      uploadData.append('linkedOrdreMissionId', taskToProcess.document.id);

      uploadData.append('metadata', JSON.stringify({
        nom: pieceDeCaisseData.nom,
        concerne: pieceDeCaisseData.concerne,
        beneficiaireRole: pcTargetRole,
        beneficiaire_id: pieceDeCaisseData.beneficiaire_id,
        beneficiaire_source: pieceDeCaisseData.beneficiaire_source,
        lines: pieceDeCaisseData.lines,
      }));

      const uploadResponse = await documentsAPI.upload(uploadData);

      // Démarre immédiatement le circuit DG → Comptable → Bénéficiaire (si compte) → Caissière.
      try {
        await workflowAPI.create({ documentId: uploadResponse.data.data.id });
      } catch (wfErr) {
        toast(t('⚠️ Pièce de caisse créée mais circuit non démarré : {{message}}. Utilisez "Soumettre" depuis Documents.', { message: wfErr.response?.data?.message || t('erreur inconnue') }));
      }

      setPcCreatedFor(prev => new Set(prev).add(pcTargetRole));

      toast(uploadResponse.data.data.metadata?.fusionné
          ? t('✅ Pièce de caisse créée et fusionnée avec {{category}}!', { category: taskToProcess.document.category })
          : t('✅ Pièce de caisse créée avec succès pour {{nom}}.', { nom: pieceDeCaisseData.nom }));
      setShowPieceDeCaisseFromOM(false);

    } catch (err) {
      setError(err.response?.data?.message || t('Erreur lors de la création de la Pièce de caisse.'));
      console.error('❌ Erreur Pièce de caisse:', err);
      toast(t('Erreur: {{message}}', { message: err.response?.data?.message || t('Impossible de créer la Pièce de caisse') }));
    } finally {
      setSubmittingDB(false);
    }
  };

  // Clôture l'étape de la comptable sur l'OM — une fois qu'elle a créé la ou les
  // pièces de caisse nécessaires (au moins une), c'est cette action qui valide sa tâche.
  const handleFinalizeOMWithPC = async () => {
    setActionLoading('finalize_pc');
    try {
      await workflowAPI.validateTask(taskToProcess.id, {
        status: 'approved',
        comment: t('Pièce(s) de caisse créée(s) pour : {{list}}. Processus complété.', { list: [...pcCreatedFor].join(', ') }),
        validationType: 'simple_approve',
      });
      toast(t('✅ Ordre de mission finalisé.'));
      closeProcessingModal();
    } catch (err) {
      toast(t('Erreur: {{message}}', { message: err.response?.data?.message || t("Impossible de finaliser l'OM") }));
    } finally {
      setActionLoading(null);
    }
  };
  
  const handleSubmitDemandeBesoins = async () => {
    setSubmittingDB(true);
    setError('');
    try {
      if (!dbPdfRef.current) throw new Error(t('Référence PDF introuvable'));
      const nonPrintableElements = dbPdfRef.current.querySelectorAll('.not-printable');
      nonPrintableElements?.forEach(el => el.style.display = 'none');
      const canvas = await html2canvas(dbPdfRef.current, { scale: 2, logging: false, useCORS: true });
      nonPrintableElements?.forEach(el => el.style.display = 'block');
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
      const pdfBlob = pdf.output('blob');
      const uploadData = new FormData();
      const fileName = `Demande_Besoin_${demandeBesoinsData.service.replace(/\s/g, '_')}_${Date.now()}.pdf`;
      uploadData.append('file', pdfBlob, fileName);
      uploadData.append('title', t('Demande de besoin - {{service}}', { service: demandeBesoinsData.service }));
      uploadData.append('category', 'Demande de besoin');
      uploadData.append('metadata', JSON.stringify({
        service: demandeBesoinsData.service,
        reference: demandeBesoinsData.reference,
        linkedWorkRequestId: taskToProcess.document.id
      }));
      const uploadResponse = await documentsAPI.upload(uploadData);
      const dbDocumentId = uploadResponse.data.data.id;
      setCreatedDBDocumentId(dbDocumentId);
      await workflowAPI.validateTask(taskToProcess.id, {
        status: 'en_pause',
        comment: t('En attente de la validation de la Demande de Besoin ({{ref}})', { ref: demandeBesoinsData.reference }),
        validationType: 'pause'
      });
      const validatorsResponse = await workflowAPI.getValidators();
      const allValidators = validatorsResponse.data.data || [];
      const dbValidatorsList = allValidators.filter(v =>
        v.email === 'hsjm.econome@gmail.com' || v.email === 'hsjm.achat@gmail.com' || v.email === 'hsjm.pharma@gmail.com'
      );
      if (dbValidatorsList.length === 0) throw new Error(t('Aucun validateur trouvé.'));
      setDbValidators(dbValidatorsList);
      setShowDemandeBesoins(false);
      setShowDBFromFS(false);
      setShowValidatorsSelection(true);
    } catch (err) {
      setError(err.response?.data?.message || t('Erreur lors de la création de la Demande de Besoin.'));
      console.error('Erreur DB:', err);
    } finally {
      setSubmittingDB(false);
    }
  };

  const handleSubmitDBWorkflow = async () => {
    if (selectedDbValidators.length === 0) {
      setError(t('Veuillez sélectionner au moins un validateur.'));
      return;
    }
    setSubmittingDB(true);
    setError('');
    try {
      await workflowAPI.submitWorkflow({
        documentId: createdDBDocumentId,
        validatorIds: selectedDbValidators
      });
      toast.success(t('Demande de Besoin créée et soumise avec succès !'));
      closeProcessingModal();
    } catch (err) {
      setError(err.response?.data?.message || t('Erreur lors de la soumission.'));
      console.error('Erreur soumission DB:', err);
    } finally {
      setSubmittingDB(false);
    }
  };

  const toggleDbValidator = (validatorId) => {
    setSelectedDbValidators(prev => 
      prev.includes(validatorId) 
        ? prev.filter(id => id !== validatorId) 
        : [...prev, validatorId]
    );
  };

  const handleSubmitFicheSuivi = async () => {
    setSubmittingFS(true);
    setError('');
    try {
      if (!fsPdfRef.current) throw new Error(t('Référence PDF introuvable'));
      const nonPrintableElements = fsPdfRef.current.querySelectorAll('.not-printable');
      nonPrintableElements?.forEach(el => el.style.display = 'none');
      const canvas = await html2canvas(fsPdfRef.current, { scale: 2, logging: false, useCORS: true });
      nonPrintableElements?.forEach(el => el.style.display = 'block');
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
      const pdfBlob = pdf.output('blob');
      const uploadData = new FormData();
      const fileName = `Fiche_Suivi_${ficheSuiviData.service.replace(/\s/g, '_')}_${Date.now()}.pdf`;
      uploadData.append('file', pdfBlob, fileName);
      uploadData.append('title', t('Fiche de suivi - {{equipement}}', { equipement: ficheSuiviData.equipement }));
      uploadData.append('category', 'Fiche de suivi d\'équipements');
      uploadData.append('metadata', JSON.stringify({
        service: ficheSuiviData.service,
        equipement: ficheSuiviData.equipement,
        linkedWorkRequestId: taskToProcess.document.id
      }));
      await documentsAPI.upload(uploadData);
      await workflowAPI.validateTask(taskToProcess.id, {
        status: 'en_pause',
        comment: t('Fiche de suivi créée. En attente de résolution.'),
        validationType: 'pause'
      });
      toast.success(t('Fiche de Suivi créée !'));
      if (ficheSuiviData.pieces.some(p => p.designation)) {
        if (window.confirm(t('Des pièces sont nécessaires. Créer une Demande de Besoin ?'))) {
          setShowDBFromFS(true);
          setDemandeBesoinsData({
            date_demande: new Date().toLocaleDateString('fr-FR'),
            service: ficheSuiviData.service,
            reference: `FS-${taskToProcess.document.id.slice(0, 8)}`,
            justification: t('Pièces nécessaires suite à : {{equipement}}', { equipement: ficheSuiviData.equipement }),
            lines: ficheSuiviData.pieces.map(p => ({
              designation: p.designation,
              quantite: p.quantite,
              prixUnitaire: '',
              montantTotal: ''
            }))
          });
        } else {
          closeProcessingModal();
        }
      } else {
        closeProcessingModal();
      }
    } catch (err) {
      setError(err.response?.data?.message || t('Erreur lors de la création.'));
      console.error('Erreur FS:', err);
    } finally {
      setSubmittingFS(false);
    }
  };
  
  const formatDate = (date) => new Date(date).toLocaleString('fr-FR');
  
  const getStatusBadge = (status) => {
    const styleMap = {
      pending:  { background: 'var(--warning-soft)', color: 'var(--warning)' },
      approved: { background: 'var(--success-soft)', color: 'var(--success)' },
      rejected: { background: 'var(--danger-soft)',  color: 'var(--danger)'  },
      en_pause: { background: 'rgba(139,92,246,0.12)', color: '#7c3aed'      },
      queued:   { background: 'var(--surface-2)',    color: 'var(--fg-muted)' },
      expired:  { background: 'var(--surface-2)',    color: 'var(--fg-subtle)'},
    };
    const icons = {
      pending: Clock, approved: CheckCircle, rejected: XCircle,
      en_pause: AlertCircle, queued: Clock, expired: XCircle,
    };
    const Icon = icons[status] || Clock;
    const labels = {
      pending: t('En attente'), approved: t('Approuvé'), rejected: t('Rejeté'),
      en_pause: t('En pause'), queued: t("File d'attente"), expired: t('Expiré'),
    };
    const s = styleMap[status] || { background: 'var(--surface-2)', color: 'var(--fg-muted)' };
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500, ...s }}>
        <Icon size={12} />
        {labels[status] || status}
      </span>
    );
  };

  const getOverdueBadge = (task) => {
    if (!isTaskOverdue(task)) return null;
    const days = getDaysOverdue(task);
    const label = days > 0 ? t('⏰ Retard +{{days}}j', { days }) : t('⏰ Retard +{{hours}}h', { hours: getHoursOverdue(task) });
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid var(--danger)' }}>
        <AlertTriangle size={12} />
        {label}
      </span>
    );
  };

  const getBypassBadge = (task) => {
    if (task.status !== 'queued' || !canBypassValidation(task)) return null;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: 'rgba(249,115,22,0.12)', color: '#f97316', border: '1px solid rgba(249,115,22,0.4)' }}>
        <AlertTriangle size={12} />
        🚀 {t('Validation possible (bypass)')}
      </span>
    );
  };

  const STATUS_CFG = {
    pending:  { dot: 'var(--warning)', label: t('En attente'),    cls: 'ged-badge-warning' },
    approved: { dot: 'var(--success)', label: t('Approuvé'),      cls: 'ged-badge-success' },
    rejected: { dot: 'var(--danger)',  label: t('Rejeté'),        cls: 'ged-badge-danger'  },
    en_pause: { dot: 'var(--brand)',   label: t('En pause'),      cls: 'ged-badge-brand'   },
    queued:   { dot: 'var(--fg-muted)', label: t("File d'attente"), cls: 'ged-badge-neutral' },
    expired:  { dot: 'var(--fg-muted)', label: t('Expiré'),      cls: 'ged-badge-neutral' },
  };
  const btnOutline = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 'var(--radius-2)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 12, border: '1px solid var(--border)', cursor: 'pointer' };
  const iconBtn    = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 6, borderRadius: 'var(--radius-2)', background: 'var(--surface-2)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--fg-muted)' };
  const thStyle    = { padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' };
  const tdStyle    = { padding: '10px 14px', verticalAlign: 'middle' };
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
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg)', margin: 0, letterSpacing: '-0.3px' }}>{t('Mes tâches')}</h1>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 3 }}>
            {t('{{pending}} en attente · {{overdue}} en retard', { pending: tasks.filter(task => task.status === 'pending').length, overdue: tasks.filter(task => isTaskOverdue(task)).length })}
          </div>
        </div>
        {(user?.role === 'director' || user?.role === 'admin') && (
          <button onClick={handleToggleSelectionMode} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 'var(--radius-2)',
            background: isInSelectionMode ? 'var(--danger-soft)' : 'var(--surface)',
            color: isInSelectionMode ? 'var(--danger)' : 'var(--fg)',
            border: `1px solid ${isInSelectionMode ? 'var(--danger-soft)' : 'var(--border)'}`,
            cursor: 'pointer', fontSize: 13, fontWeight: 500,
          }}>
            {isInSelectionMode ? <X size={14} /> : <ListChecks size={14} />}
            {isInSelectionMode ? t('Annuler') : t('Validation en masse')}
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '10px 14px', marginBottom: 16, background: 'var(--danger-soft)', color: 'var(--danger)', borderRadius: 'var(--radius-3)', fontSize: 13 }}>{error}</div>
      )}

      {/* Tabs + filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { key: 'pending',  label: t('En attente') },
          { key: 'approved', label: t('Approuvées') },
          { key: 'rejected', label: t('Rejetées')   },
          { key: 'expired',  label: t('Expirées')   },
          { key: 'all',      label: t('Toutes')     },
        ].map(tab => {
          const count = tab.key === 'all' ? tasks.length : tasks.filter(task => task.status === tab.key).length;
          const active = filter === tab.key;
          return (
            <button key={tab.key} onClick={() => setFilter(tab.key)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 14px',
              background: 'none', border: 'none', borderBottom: `2px solid ${active ? 'var(--brand)' : 'transparent'}`,
              cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 500,
              color: active ? 'var(--fg)' : 'var(--fg-muted)',
              marginBottom: -1,
            }}>
              {tab.label}
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 'var(--radius-full)',
                background: active ? 'var(--brand-soft)' : 'var(--surface-3)',
                color: active ? 'var(--brand)' : 'var(--fg-muted)',
              }}>{count}</span>
            </button>
          );
        })}
        {/* Spacer + right-aligned filter */}
        <div style={{ flex: 1 }} />
        <select value={serviceFilter} onChange={e => setServiceFilter(e.target.value)} style={{
          height: 32, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-2)',
          background: 'var(--surface)', color: 'var(--fg)', fontSize: 12, outline: 'none', marginBottom: 8,
        }}>
          <option value="all">{t('Tous les services')}</option>
          {services.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>
      </div>

      {/* Bulk selection info bar */}
      {isInSelectionMode && (
        <div style={{ padding: '10px 14px', marginBottom: 12, background: 'var(--brand-soft)', borderRadius: 'var(--radius-3)', border: '1px solid var(--brand-soft-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: 'var(--brand-fg)', fontWeight: 600 }}>{t('{{count}} / {{max}} sélectionné(s)', { count: selectedTaskIds.length, max: MAX_SELECTION })}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleSelectAll} style={btnOutline}>{t('Tout sélectionner')}</button>
            <button onClick={handleDeselectAll} style={btnOutline}>{t('Tout désélectionner')}</button>
          </div>
        </div>
      )}

      {/* Table */}
      {filteredAndSortedTasks.length === 0 ? (
        <div className="ged-card" style={{ padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <CheckCircle size={32} color="var(--success)" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>
            {filter === 'pending' ? t('Tout est traité.') : t('Aucune tâche ici.')}
          </p>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
            {filter === 'pending' ? t('Aucune tâche en attente de validation.') : t('Aucune tâche ne correspond à ce filtre.')}
          </p>
        </div>
      ) : (
        <div className="ged-card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)' }}>
                {isInSelectionMode && <th style={thStyle}></th>}
                <th style={thStyle}>{t('Document')}</th>
                <th style={thStyle}>{t('Type')}</th>
                <th style={thStyle}>{t('Soumis par')}</th>
                <th style={thStyle}>{t('Statut')}</th>
                <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => setSortConfig(c => ({ key: 'createdAt', direction: c.direction === 'asc' ? 'desc' : 'asc' }))}>
                  {t('Date')} {sortConfig.key === 'createdAt' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th style={thStyle}>{t('Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedTasks.map(task => {
                const isSelected = selectedTaskIds.includes(task.id);
                const selectable = isTaskSelectable(task);
                const isDisabled = !selectable || (selectedTaskIds.length >= MAX_SELECTION && !isSelected);
                const isOverdue = isTaskOverdue(task);
                const isBypassable = task.status === 'queued' && canBypassValidation(task);
                const st = STATUS_CFG[task.status] || STATUS_CFG.pending;

                return (
                  <React.Fragment key={task.id}>
                    <tr
                      style={{
                        background: isSelected ? 'var(--brand-soft)' : isOverdue ? 'var(--danger-soft)' : isBypassable ? 'var(--warning-soft)' : 'var(--surface)',
                        borderBottom: '1px solid var(--surface-3)',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { if (!isSelected && !isOverdue) e.currentTarget.style.background = 'var(--surface-2)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'var(--brand-soft)' : isOverdue ? 'var(--danger-soft)' : isBypassable ? 'var(--warning-soft)' : 'var(--surface)'; }}
                    >
                      {isInSelectionMode && (
                        <td style={tdStyle}>
                          <input type="checkbox" checked={isSelected} disabled={isDisabled} onChange={() => handleTaskSelection(task.id)} style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }} />
                        </td>
                      )}
                      <td style={{ ...tdStyle, maxWidth: 280 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {task.document?.title || '—'}
                        </div>
                        <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                          {isOverdue && (
                            <span className="ged-badge ged-badge-danger" style={{ fontSize: 10 }}>
                              <AlertTriangle size={9} /> {t('Retard +{{value}}', { value: getDaysOverdue(task) > 0 ? getDaysOverdue(task) + 'j' : getHoursOverdue(task) + 'h' })}
                            </span>
                          )}
                          {isBypassable && (
                            <span className="ged-badge ged-badge-warning" style={{ fontSize: 10 }}>{t('Bypass dispo')}</span>
                          )}
                          {needsPieceDeCaisse(task) && (
                            <span className="ged-badge ged-badge-warning" style={{ fontSize: 10 }}>{t('Pièce de caisse')}</span>
                          )}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        {task.document?.category && (
                          <span className="ged-badge ged-badge-neutral" style={{ fontSize: 11 }}>{task.document.category}</span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, fontSize: 12, color: 'var(--fg-muted)' }}>
                        {task.document?.uploadedBy?.firstName ? `${task.document.uploadedBy.firstName} ${task.document.uploadedBy.lastName?.[0] || ''}.` : '—'}
                        {task.document?.metadata?.service && (
                          <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{task.document.metadata.service}</div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <span className={`ged-badge ${st.cls}`} style={{ fontSize: 11 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.dot, display: 'inline-block', flexShrink: 0 }} />
                          {st.label}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, fontSize: 12, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                        {formatDate(task.createdAt)}
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => setTaskForPreview(task)} style={iconBtn} title={t('Aperçu rapide')}><ZoomIn size={13} /></button>
                          <button onClick={() => setViewingDocument(task.document)} style={iconBtn} title={t('Voir le document')}><Eye size={13} /></button>
                          {(task.status === 'pending' || isBypassable) && (
                            <button onClick={() => openProcessingModal(task)} style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              padding: '5px 12px', borderRadius: 'var(--radius-2)',
                              background: needsPieceDeCaisse(task) ? 'var(--warning)' : isBypassable ? 'var(--warning)' : 'var(--brand)',
                              color: '#fff', border: 'none', cursor: 'pointer',
                              fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                            }}>
                              <CheckCircle size={12} />
                              {needsPieceDeCaisse(task) ? t('Pièce caisse') : isBypassable ? t('Bypass') : t('Traiter')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {/* Inline workflow progress for this task (collapsed by default) */}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, fontSize: 12, color: 'var(--fg-muted)' }}>
          <span>{t('Page')} <b style={{ color: 'var(--fg)' }}>{pagination.page}</b> {t('sur')} <b style={{ color: 'var(--fg)' }}>{pagination.totalPages}</b> · {t('{{count}} tâche(s)', { count: pagination.total })}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => goToPage(1)} disabled={currentPage === 1} style={pageBtn}>«</button>
            <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} style={pageBtn}>‹</button>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === pagination.totalPages || Math.abs(p - currentPage) <= 1)
              .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx-1] > 1) acc.push('…'); acc.push(p); return acc; }, [])
              .map((p, i) => p === '…'
                ? <span key={`e-${i}`} style={{ ...pageBtn, border: 'none', cursor: 'default' }}>…</span>
                : <button key={p} onClick={() => goToPage(p)} style={{ ...pageBtn, background: p === currentPage ? 'var(--brand)' : 'var(--surface)', color: p === currentPage ? '#fff' : 'var(--fg-muted)', borderColor: p === currentPage ? 'var(--brand)' : 'var(--border)' }}>{p}</button>
              )}
            <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === pagination.totalPages} style={pageBtn}>›</button>
            <button onClick={() => goToPage(pagination.totalPages)} disabled={currentPage === pagination.totalPages} style={pageBtn}>»</button>
          </div>
        </div>
      )}

      <BulkValidationBar
        selectedCount={selectedTaskIds.length}
        maxSelection={MAX_SELECTION}
        onApprove={() => handleBulkAction('approve')}
        onReject={() => handleBulkAction('reject')}
        onCancel={handleToggleSelectionMode}
        disabled={bulkActionLoading}
      />

      {taskForPreview && (
        <QuickPreviewModal task={taskForPreview} onClose={() => setTaskForPreview(null)} />
      )}

      {/* === ALL MODALS BELOW — KEPT VERBATIM === */}
      {/* Modal de traitement principal */}
      {taskToProcess && !showDemandeBesoins && !showFicheSuivi && !showDBFromFS && !showValidatorsSelection && !showPieceDeCaisseFromOM && ReactDOM.createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-4)', boxShadow: 'var(--shadow-3)', width: '100%', maxWidth: 672, display: 'flex', maxHeight: '90vh', overflow: 'hidden' }}>
            {/* Colonne Gauche (Actions) */}
            <div style={{ width: '50%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
              <div style={{ position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 10, padding: '24px 24px 16px', borderBottom: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)', margin: '0 0 4px' }}>{t('Traiter le document')}</h2>
                <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={taskToProcess.document.title}>
                  {taskToProcess.document.title}
                </p>
              </div>
              <div style={{ padding: '16px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>

              {needsPieceDeCaisse(taskToProcess) && (
                <div style={{ marginBottom: 16, padding: 14, background: 'rgba(234,179,8,0.08)', border: '2px solid rgba(234,179,8,0.4)', borderRadius: 'var(--radius-3)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <FileText size={20} style={{ color: '#ca8a04', flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <p style={{ fontWeight: 700, color: '#92400e', fontSize: 13, margin: '0 0 6px' }}>💰 {t('Créer la Pièce de caisse')}</p>
                      <p style={{ fontSize: 13, color: '#92400e', margin: 0 }}>
                        {t("Cet Ordre de mission nécessite une Pièce de caisse par bénéficiaire ayant des frais (missionnaire et/ou conducteur). L'OM sera automatiquement joint comme pièce justificative. Finalisez une fois toutes les pièces créées.")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isBeneficiaireOfPC(taskToProcess) && (
                <div style={{ marginBottom: 16, padding: 14, background: 'var(--brand-soft)', border: '2px solid var(--brand)', borderRadius: 'var(--radius-3)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <FileText size={20} style={{ color: 'var(--brand)', flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <p style={{ fontWeight: 700, color: 'var(--brand)', fontSize: 13, margin: '0 0 6px' }}>{t('Cette pièce de caisse vous concerne')}</p>
                      <p style={{ fontSize: 13, color: 'var(--fg)', margin: 0 }}>
                        {t('Validez-la pour la transmettre à la caissière, qui vous remettra le montant.')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {needsPayerAction(taskToProcess) && (
                <div style={{ marginBottom: 16, padding: 14, background: 'var(--success-soft)', border: '2px solid var(--success)', borderRadius: 'var(--radius-3)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <FileText size={20} style={{ color: 'var(--success)', flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <p style={{ fontWeight: 700, color: 'var(--success)', fontSize: 13, margin: '0 0 6px' }}>{t('Pièce de caisse à payer')}</p>
                      <p style={{ fontSize: 13, color: 'var(--fg)', margin: 0 }}>
                        {taskToProcess.document?.metadata?.beneficiaire_id
                          ? t('Le DG, la comptabilité et le bénéficiaire ont déjà validé. Cliquez "Payer" une fois le montant remis en main propre.')
                          : t('Le DG et la comptabilité ont déjà validé. Cliquez "Payer" une fois le montant remis en main propre.')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {taskToProcess.status === 'queued' && canBypassValidation(taskToProcess) && (
                <div style={{ marginBottom: 16, padding: 14, background: 'rgba(249,115,22,0.08)', border: '2px solid rgba(249,115,22,0.4)', borderRadius: 'var(--radius-3)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <AlertTriangle size={20} style={{ color: '#f97316', flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <p style={{ fontWeight: 700, color: '#9a3412', fontSize: 13, margin: '0 0 6px' }}>🚀 {t('Validation en Bypass')}</p>
                      <p style={{ fontSize: 13, color: '#9a3412', margin: 0 }}>
                        {t('Le validateur précédent est en retard de')}{' '}
                        <strong>
                          {t('{{hours}}h', { hours: getHoursOverdue(taskToProcess.bypassInfo || null) })}
                        </strong>
                        . {t('Vous pouvez valider ce document à sa place.')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {taskToProcess.document.category === 'Demande de permission' && (
                <div style={{ marginBottom: 16, padding: 12, background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius-3)' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#92400e', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <UserCheck size={14} /> {t('Intérim assuré par')}
                  </label>
                  <input
                    type="text"
                    value={remplacantName}
                    onChange={(e) => setRemplacantName(e.target.value)}
                    placeholder={t('Nom du remplaçant...')}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 'var(--radius-2)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                    autoFocus
                  />
                  <p style={{ fontSize: 11, color: '#b45309', margin: '6px 0 0' }}>{t('Inscrit automatiquement sur le PDF')}</p>
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>{t('Commentaire')}</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t('Ajouter un commentaire (requis si rejet)...')}
                  rows={2}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>{t('Actions')}</p>

                {canUseCombinedAction() && taskToProcess.document.fileType === 'application/pdf' && (
                  <>
                    <button
                      onClick={() => handleAction('approve_sign_stamp')}
                      disabled={!!actionLoading}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 14, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 'var(--radius-3)', cursor: !!actionLoading ? 'not-allowed' : 'pointer', textAlign: 'left', opacity: !!actionLoading ? 0.6 : 1 }}
                      onMouseEnter={e => { if (!actionLoading) e.currentTarget.style.background = 'rgba(139,92,246,0.15)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.08)'; }}
                    >
                      <div style={{ padding: 8, background: 'rgba(139,92,246,0.15)', borderRadius: 'var(--radius-2)', flexShrink: 0 }}>
                        {actionLoading === 'approve_sign_stamp' ? <Loader size={18} style={{ color: '#7c3aed' }} className="animate-spin" /> : <ShieldCheck size={18} style={{ color: '#7c3aed' }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#4c1d95', margin: '0 0 2px' }}>{t('Approuver, Signer et Cacheter')}</p>
                        <p style={{ fontSize: 11, color: '#7c3aed', margin: 0 }}>{t('Action rapide — Signature + Cachet')}</p>
                      </div>
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
                      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                      <span style={{ fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase' }}>{t('ou individuellement')}</span>
                      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    </div>
                  </>
                )}

                {!needsPieceDeCaisse(taskToProcess) && !needsPayerAction(taskToProcess) && (
                  <>
                    <button
                      onClick={() => handleAction('simple_approve')}
                      disabled={!!actionLoading}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-3)', cursor: !!actionLoading ? 'not-allowed' : 'pointer', textAlign: 'left' }}
                      onMouseEnter={e => { if (!actionLoading) e.currentTarget.style.background = 'var(--surface-2)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{ padding: 6, background: 'var(--surface-2)', borderRadius: 'var(--radius-2)', flexShrink: 0 }}>
                        {actionLoading === 'simple_approve' ? <Loader size={16} className="animate-spin" /> : <CheckCircle size={16} style={{ color: 'var(--fg-muted)' }} />}
                      </div>
                      <span style={{ fontSize: 13, color: 'var(--fg)' }}>{t('Validation simple')}</span>
                    </button>

                    {user?.signaturePath && (
                      <button
                        onClick={() => handleAction('approve')}
                        disabled={!!actionLoading}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'transparent', border: '1px solid var(--brand)', borderRadius: 'var(--radius-3)', cursor: !!actionLoading ? 'not-allowed' : 'pointer', textAlign: 'left' }}
                        onMouseEnter={e => { if (!actionLoading) e.currentTarget.style.background = 'var(--brand-soft)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div style={{ padding: 6, background: 'var(--brand-soft)', borderRadius: 'var(--radius-2)', flexShrink: 0 }}>
                          {actionLoading === 'approve' ? <Loader size={16} style={{ color: 'var(--brand)' }} className="animate-spin" /> : <Edit size={16} style={{ color: 'var(--brand)' }} />}
                        </div>
                        <span style={{ fontSize: 13, color: 'var(--brand)' }}>{t('Approuver et Signer')}</span>
                      </button>
                    )}

                    {user?.stampPath && (
                      <button
                        onClick={() => handleAction('stamp')}
                        disabled={!!actionLoading}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'transparent', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 'var(--radius-3)', cursor: !!actionLoading ? 'not-allowed' : 'pointer', textAlign: 'left' }}
                        onMouseEnter={e => { if (!actionLoading) e.currentTarget.style.background = 'rgba(99,102,241,0.06)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div style={{ padding: 6, background: 'rgba(99,102,241,0.1)', borderRadius: 'var(--radius-2)', flexShrink: 0 }}>
                          {actionLoading === 'stamp' ? <Loader size={16} style={{ color: '#6366f1' }} className="animate-spin" /> : <ShieldCheck size={16} style={{ color: '#6366f1' }} />}
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 13, color: '#4338ca' }}>{t('Apposer le cachet')}</span>
                          {taskToProcess.document.category === 'Ordre de mission' && (
                            <span style={{ fontSize: 10, color: '#6366f1', background: 'rgba(99,102,241,0.1)', padding: '2px 6px', borderRadius: 999 }}>{t('{{count}} cachets', { count: 4 })}</span>
                          )}
                        </div>
                      </button>
                    )}

                    {user?.email === 'hsjm.rh@gmail.com' && (
                      <button
                        onClick={() => handleAction('dater')}
                        disabled={!!actionLoading}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'transparent', border: '1px solid rgba(20,184,166,0.4)', borderRadius: 'var(--radius-3)', cursor: !!actionLoading ? 'not-allowed' : 'pointer', textAlign: 'left' }}
                        onMouseEnter={e => { if (!actionLoading) e.currentTarget.style.background = 'rgba(20,184,166,0.06)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div style={{ padding: 6, background: 'rgba(20,184,166,0.1)', borderRadius: 'var(--radius-2)', flexShrink: 0 }}>
                          {actionLoading === 'dater' ? <Loader size={16} style={{ color: '#14b8a6' }} className="animate-spin" /> : <CalendarPlus size={16} style={{ color: '#14b8a6' }} />}
                        </div>
                        <span style={{ fontSize: 13, color: '#0f766e' }}>{t('Apposer le Dateur')}</span>
                      </button>
                    )}

                    {isWorkRequest(taskToProcess) && isMG() && (
                      <>
                        <div style={{ borderTop: '1px solid var(--border)', margin: '8px 0' }} />
                        <button
                          onClick={handleInitiateDB}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 'var(--radius-3)', cursor: 'pointer', textAlign: 'left' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.12)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.06)'; }}
                        >
                          <FileText size={16} style={{ color: '#7c3aed' }} />
                          <span style={{ fontSize: 13, color: '#4c1d95' }}>{t('Initier une Demande de Besoin')}</span>
                        </button>
                        <p style={{ fontSize: 12, color: 'var(--fg-muted)', paddingLeft: 12, margin: 0 }}>
                          {t('La DT sera mise en pause en attendant la validation de la DB')}
                        </p>
                      </>
                    )}

                    {isWorkRequest(taskToProcess) && isBiomedical() && (
                      <>
                        <div style={{ borderTop: '1px solid var(--border)', margin: '8px 0' }} />
                        <button
                          onClick={handleInitiateFicheSuivi}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'rgba(20,184,166,0.06)', border: '1px solid rgba(20,184,166,0.3)', borderRadius: 'var(--radius-3)', cursor: 'pointer', textAlign: 'left' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(20,184,166,0.12)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(20,184,166,0.06)'; }}
                        >
                          <FileText size={16} style={{ color: '#14b8a6' }} />
                          <span style={{ fontSize: 13, color: '#0f766e' }}>{t("Créer Fiche de Suivi d'Équipements")}</span>
                        </button>
                        <p style={{ fontSize: 12, color: 'var(--fg-muted)', paddingLeft: 12, margin: 0 }}>
                          {t('La DT sera mise en pause. Vous pourrez ensuite initier une DB si nécessaire.')}
                        </p>
                      </>
                    )}
                  </>
                )}

                {needsPieceDeCaisse(taskToProcess) && (() => {
                  const meta = taskToProcess.document.metadata || {};
                  const beneficiaries = [
                    meta.nom_missionnaire ? { role: 'missionnaire', label: meta.nom_missionnaire } : null,
                    meta.nom_conducteur ? { role: 'conducteur', label: meta.nom_conducteur } : null,
                  ].filter(Boolean);
                  return (
                    <>
                      {beneficiaries.map(b => {
                        const done = pcCreatedFor.has(b.role);
                        return (
                          <button
                            key={b.role}
                            onClick={() => handleCreatePieceDeCaisseFromOM(b.role)}
                            disabled={done}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 16, marginBottom: 8, background: done ? 'var(--success-soft)' : 'rgba(234,179,8,0.08)', border: `2px solid ${done ? 'var(--success)' : 'rgba(234,179,8,0.5)'}`, borderRadius: 'var(--radius-3)', cursor: done ? 'default' : 'pointer', textAlign: 'left' }}
                            onMouseEnter={e => { if (!done) e.currentTarget.style.background = 'rgba(234,179,8,0.15)'; }}
                            onMouseLeave={e => { if (!done) e.currentTarget.style.background = 'rgba(234,179,8,0.08)'; }}
                          >
                            {done ? <CheckCircle size={22} style={{ color: 'var(--success)' }} /> : <FileText size={22} style={{ color: '#ca8a04' }} />}
                            <div>
                              <p style={{ fontWeight: 600, color: done ? 'var(--success)' : '#78350f', fontSize: 13, margin: '0 0 2px' }}>
                                {done ? t('Pièce de caisse créée — {{label}}', { label: b.label }) : t('Créer Pièce de caisse — {{label}}', { label: b.label })}
                              </p>
                              <p style={{ fontSize: 12, color: done ? 'var(--success)' : '#b45309', margin: 0 }}>
                                {b.role === 'missionnaire' ? t('Missionnaire') : t('Conducteur')}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                      <button
                        onClick={handleFinalizeOMWithPC}
                        disabled={pcCreatedFor.size === 0 || !!actionLoading}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 14, background: pcCreatedFor.size === 0 ? 'var(--surface-2)' : 'var(--success-soft)', border: `1px solid ${pcCreatedFor.size === 0 ? 'var(--border)' : 'var(--success)'}`, borderRadius: 'var(--radius-3)', cursor: pcCreatedFor.size === 0 ? 'not-allowed' : 'pointer', textAlign: 'left', opacity: pcCreatedFor.size === 0 ? 0.6 : 1 }}
                      >
                        {actionLoading === 'finalize_pc' ? <Loader size={18} className="animate-spin" /> : <ShieldCheck size={18} style={{ color: 'var(--success)' }} />}
                        <div>
                          <p style={{ fontWeight: 600, fontSize: 13, margin: '0 0 2px', color: pcCreatedFor.size === 0 ? 'var(--fg-muted)' : 'var(--success)' }}>{t("Finaliser l'Ordre de mission")}</p>
                          <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0 }}>
                            {pcCreatedFor.size === 0 ? t("Créez au moins une pièce de caisse ci-dessus d'abord") : t('Valide définitivement cette étape')}
                          </p>
                        </div>
                      </button>
                      <div style={{ borderTop: '1px solid var(--border)', margin: '8px 0' }} />
                    </>
                  );
                })()}

                {needsPayerAction(taskToProcess) && (
                  <>
                    <button
                      onClick={() => handleAction('payer')}
                      disabled={!!actionLoading}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: 'var(--success-soft)', border: '2px solid var(--success)', borderRadius: 'var(--radius-3)', cursor: actionLoading ? 'not-allowed' : 'pointer', textAlign: 'left' }}
                    >
                      {actionLoading === 'payer' ? <Loader size={22} className="animate-spin" style={{ color: 'var(--success)' }} /> : <CheckCircle size={22} style={{ color: 'var(--success)' }} />}
                      <div>
                        <p style={{ fontWeight: 600, color: 'var(--success)', fontSize: 13, margin: '0 0 2px' }}>{t('Payer')}</p>
                        <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0 }}>{t("Marque la pièce de caisse comme payée et l'archive")}</p>
                      </div>
                    </button>
                    <div style={{ borderTop: '1px solid var(--border)', margin: '8px 0' }} />
                  </>
                )}
              </div>

              <>
                  <div style={{ borderTop: '1px solid var(--border)', margin: '12px 0 8px' }} />
                  <button
                    onClick={() => handleAction('reject')}
                    disabled={!!actionLoading}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-3)', cursor: !!actionLoading ? 'not-allowed' : 'pointer', textAlign: 'left' }}
                    onMouseEnter={e => { if (!actionLoading) e.currentTarget.style.background = 'var(--danger-soft)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ padding: 6, background: 'var(--danger-soft)', borderRadius: 'var(--radius-2)', flexShrink: 0 }}>
                      {actionLoading === 'reject' ? <Loader size={16} style={{ color: 'var(--danger)' }} className="animate-spin" /> : <XCircle size={16} style={{ color: 'var(--danger)' }} />}
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--danger)' }}>{t('Rejeter le document')}</span>
                  </button>
              </>
              </div>

              <div style={{ position: 'sticky', bottom: 0, background: 'var(--surface)', padding: '16px 24px', borderTop: '1px solid var(--border)' }}>
                <button
                  onClick={closeProcessingModal}
                  style={{ width: '100%', padding: '10px 20px', background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 'var(--radius-3)', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-active)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--brand)'}
                >
                  <ThumbsUp size={15} /> {t('Fermer')}
                </button>
              </div>
            </div>

            {/* Colonne Droite (Progression) */}
            <div style={{ width: '50%', padding: 24, background: 'var(--surface-2)', borderLeft: '1px solid var(--border)', overflowY: 'auto' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>{t('Suivi de Validation')}</p>
              <WorkflowProgress
                workflows={taskToProcess.document.workflows}
                documentStatus={taskToProcess.document.status}
                documentId={taskToProcess.document.id}
                submittedBy={taskToProcess.document.userId}
                onRelanced={() => loadTasks(currentPage)}
              />
            </div>
          </div>
        </div>
      , document.body)}

      {/* Modals Création de Document (Pièce de caisse, DB, Fiche Suivi) - Support Dark Mode */}
      {/* Note : Le contenu interne (les templates) devra être adapté séparément si nécessaire, 
         mais le conteneur du modal est adapté ici. */}
      {/* Modal Pièce de caisse */}
      {(showPieceDeCaisseFromOM || showDemandeBesoins || showDBFromFS || showFicheSuivi) && ReactDOM.createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16, overflowY: 'auto' }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-3)', boxShadow: 'var(--shadow-3)', width: '100%', maxWidth: 896, margin: '32px 0' }}>
            <div style={{ padding: 24, borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg)', margin: '0 0 8px' }}>
                {showPieceDeCaisseFromOM && `💰 ${t('Créer Pièce de caisse')}`}
                {(showDemandeBesoins || showDBFromFS) && t('Créer une Demande de Besoin')}
                {showFicheSuivi && t("Créer une Fiche de Suivi d'Équipements")}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: 0 }}>
                {showPieceDeCaisseFromOM ? t('Document source : {{title}}', { title: taskToProcess?.document?.title }) : showDBFromFS ? t("Suite à la Fiche de Suivi d'Équipements") : showFicheSuivi ? t("Documentation de l'intervention biomédicale") : t('Cette demande sera liée à la Demande de Travaux en cours')}
              </p>
              {showPieceDeCaisseFromOM && (
                <p style={{ fontSize: 12, padding: '8px 10px', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.4)', borderRadius: 'var(--radius-2)', marginTop: 8, color: '#b45309' }}>
                  📌 {t('Ce document sera automatiquement joint comme pièce justificative (au-dessus de la PC)')}
                </p>
              )}
            </div>
            <div style={{ padding: 24, maxHeight: '70vh', overflowY: 'auto' }}>
              {showPieceDeCaisseFromOM && <PieceDeCaisse formData={pieceDeCaisseData} setFormData={setPieceDeCaisseData} pdfContainerRef={piecePdfRef} showOrdreMissionSelector={false} />}
              {(showDemandeBesoins || showDBFromFS) && <DemandeBesoin formData={demandeBesoinsData} setFormData={setDemandeBesoinsData} pdfContainerRef={dbPdfRef} />}
              {showFicheSuivi && <FicheSuiviEquipements formData={ficheSuiviData} setFormData={setFicheSuiviData} pdfContainerRef={fsPdfRef} />}
            </div>
            {error && <p style={{ color: 'var(--danger)', padding: '0 24px 8px', fontWeight: 600, fontSize: 13 }}>{error}</p>}
            <div style={{ padding: 24, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <button
                onClick={() => {
                  if (showPieceDeCaisseFromOM) setShowPieceDeCaisseFromOM(false);
                  if (showDemandeBesoins) setShowDemandeBesoins(false);
                  if (showDBFromFS) setShowDBFromFS(false);
                  if (showFicheSuivi) setShowFicheSuivi(false);
                }}
                style={{ padding: '12px 24px', background: 'var(--surface-2)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-3)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-2)'}
              >
                {t('Annuler')}
              </button>
              <button
                onClick={showPieceDeCaisseFromOM ? handleSubmitPieceDeCaisseFromOM : showFicheSuivi ? handleSubmitFicheSuivi : handleSubmitDemandeBesoins}
                disabled={submittingDB || submittingFS}
                style={{ padding: '12px 32px', background: showFicheSuivi ? '#14b8a6' : 'var(--success)', color: '#fff', border: 'none', borderRadius: 'var(--radius-3)', fontSize: 14, fontWeight: 600, cursor: (submittingDB || submittingFS) ? 'not-allowed' : 'pointer', opacity: (submittingDB || submittingFS) ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 8 }}
              >
                {submittingDB || submittingFS ? (
                  <><Loader size={18} className="animate-spin" /> {t('Création en cours...')}</>
                ) : (
                  <><Send size={18} /> {showPieceDeCaisseFromOM ? t('Créer la pièce de caisse') : showFicheSuivi ? t('Créer la Fiche') : t('Créer et Soumettre')}</>
                )}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Modal Sélection des validateurs pour DB - Support Dark Mode */}
      {showValidatorsSelection && ReactDOM.createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-3)', boxShadow: 'var(--shadow-3)', width: '100%', maxWidth: 640 }}>
            <div style={{ padding: 24, borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg)', margin: '0 0 8px' }}>{t('Sélectionner les validateurs')}</h2>
              <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: 0 }}>
                {t('Choisissez les personnes qui doivent valider cette Demande de Besoin')}
              </p>
            </div>
            <div style={{ padding: 24, maxHeight: '60vh', overflowY: 'auto' }}>
              {error && (
                <div style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 'var(--radius-2)', marginBottom: 16, fontSize: 13 }}>
                  {error}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {dbValidators.length === 0 ? (
                  <p style={{ color: 'var(--fg-muted)', textAlign: 'center', padding: '16px 0', fontSize: 13 }}>
                    {t("Aucun validateur disponible. Contactez l'administrateur.")}
                  </p>
                ) : (
                  dbValidators.map(validator => {
                    const selected = selectedDbValidators.includes(validator.id);
                    return (
                      <label
                        key={validator.id}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, border: `2px solid ${selected ? 'var(--brand)' : 'var(--border)'}`, background: selected ? 'var(--brand-soft)' : 'var(--surface)', borderRadius: 'var(--radius-3)', cursor: 'pointer' }}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleDbValidator(validator.id)}
                          style={{ width: 18, height: 18 }}
                        />
                        <div>
                          <p style={{ fontWeight: 600, color: 'var(--fg)', margin: '0 0 2px', fontSize: 14 }}>
                            {validator.firstName} {validator.lastName}
                          </p>
                          <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: 0 }}>
                            {validator.position || validator.email}
                          </p>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
            <div style={{ padding: 24, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <button
                onClick={() => { setShowValidatorsSelection(false); setSelectedDbValidators([]); closeProcessingModal(); }}
                style={{ padding: '12px 24px', background: 'var(--surface-2)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-3)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-2)'}
              >
                {t('Annuler')}
              </button>
              <button
                onClick={handleSubmitDBWorkflow}
                disabled={submittingDB || selectedDbValidators.length === 0}
                style={{ padding: '12px 32px', background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 'var(--radius-3)', fontSize: 14, fontWeight: 600, cursor: (submittingDB || selectedDbValidators.length === 0) ? 'not-allowed' : 'pointer', opacity: (submittingDB || selectedDbValidators.length === 0) ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 8 }}
              >
                {submittingDB ? (
                  <><Loader size={18} className="animate-spin" /> {t('Soumission...')}</>
                ) : (
                  <><Send size={18} /> {t('Soumettre la Demande de Besoin')}</>
                )}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Modal Viewer de document */}
      {viewingDocument && (
        <DocumentViewer
          document={viewingDocument}
          onClose={() => setViewingDocument(null)}
        />
      )}
    </div>
  );
};

export default MyTasks;