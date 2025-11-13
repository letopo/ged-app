// frontend/src/components/MyTasks.jsx - VERSION COMPLÈTE AVEC WORKFLOW COMPTABLE, ACTION COMBINÉE DG ET SUPPORT DARK MODE

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { workflowAPI, listsAPI, documentsAPI } from '../services/api';
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
  AlertTriangle, ListChecks, X, ZoomIn
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const MAX_SELECTION = 20;
const COMPTABLE_EMAIL = 'raoulwouapi2017@yahoo.com';
const DG_EMAIL = 'hopitalcameroun@ordredemaltefrance.org'; 

const MyTasks = () => {
  const { user } = useAuth();
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

  useEffect(() => { 
    loadTasks(); 
    loadServices();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await workflowAPI.getMyTasks('all');
      setTasks(response.data.tasks || []);
    } catch (err) {
      setError('Erreur lors du chargement des tâches.');
      console.error(err);
    } finally {
      setLoading(false);
    }
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
    if (!task.assignedAt || task.status !== 'pending') return false;
    const now = new Date();
    const assigned = new Date(task.assignedAt);
    const hoursDiff = (now - assigned) / (1000 * 60 * 60);
    return hoursDiff > 8;
  };

  const getHoursOverdue = (task) => {
    if (!task.assignedAt || task.status !== 'pending') return 0;
    const now = new Date();
    const assigned = new Date(task.assignedAt);
    const hoursDiff = (now - assigned) / (1000 * 60 * 60);
    return Math.max(0, Math.floor(hoursDiff - 8));
  };

  const canBypassValidation = (task) => {
    if (!task.document?.workflows) return false;
    const currentPendingTask = task.document.workflows.find(
      w => w.status === 'pending' && w.step < task.step
    );
    if (!currentPendingTask) return false;
    return isTaskOverdue(currentPendingTask);
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
      alert(`Vous ne pouvez pas sélectionner plus de ${MAX_SELECTION} documents à la fois.`);
      return prev;
    });
  };

  const handleSelectAll = () => {
    const idsToSelect = filteredAndSortedTasks.filter(isTaskSelectable).slice(0, MAX_SELECTION).map(t => t.id);
    setSelectedTaskIds(idsToSelect);
  };

  const handleDeselectAll = () => {
    setSelectedTaskIds([]);
  };
  
  const handleBulkAction = async (action) => {
    const confirmMessage = `Vous êtes sur le point de ${action === 'approve' ? 'approuver' : 'rejeter'} ${selectedTaskIds.length} document(s).\n\nÊtes-vous sûr de vouloir continuer ?`;
    if (!window.confirm(confirmMessage)) return;

    const comment = prompt("Ajoutez un commentaire global (optionnel, mais requis si rejet) :", "");
    if (action === 'reject' && (!comment || comment.trim() === '')) {
      alert("Un commentaire est requis pour rejeter en masse.");
      return;
    }

    let applySignature = false;
    if (action === 'approve' && user?.signaturePath) {
      applySignature = window.confirm("Appliquer votre signature sur tous les documents PDF applicables ?");
    }

    setBulkActionLoading(true);
    setError('');
    
    try {
      const payload = { taskIds: selectedTaskIds, action, comment: comment || '', applySignature };
      const response = await workflowAPI.bulkValidate(payload);
      
      const { summary, errors } = response.data;
      let resultMessage = `${summary.succeeded} document(s) traité(s) avec succès.`;
      if (summary.failed > 0) {
        resultMessage += `\n${summary.failed} échec(s). Détails dans la console.`;
        console.error("Erreurs de validation en masse :", errors);
      }
      alert(resultMessage);
      
      setSelectedTaskIds([]);
      setIsInSelectionMode(false);
      loadTasks();

    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Une erreur serveur est survenue.';
      setError(`Erreur lors de la validation en masse : ${errorMessage}`);
      alert(`Erreur lors de la validation en masse : ${errorMessage}`);
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
    return task.status === 'pending' && isComptable();
  };

  const openProcessingModal = (task) => {
    setTaskToProcess(task);
    setComment(task.comment || '');
    const metadata = task.document?.metadata || {};
    
    if (isWorkRequest(task) && isMG()) {
      setDemandeBesoinsData(prev => ({ 
        ...prev, 
        service: metadata.service || '', 
        reference: `DT-${task.document.id.slice(0, 8)}`, 
        justification: `Suite à la demande de travaux concernant: ${metadata.motif || ''}` 
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
      const docTitle = task.document.title || 'Document';
      const docCategory = task.document.category || 'Document';
      
      setPieceDeCaisseData({
        nom: metadata.nom_missionnaire || metadata.noms_prenoms || '',
        date: new Date().toLocaleDateString('fr-FR'),
        concerne: `Pièce justificative - ${docCategory}: ${docTitle}`,
        lines: [{ 
          refCompta: '', 
          libelle: `${docCategory} - ${metadata.service || metadata.service_demandeur || ''}`, 
          refGage: '', 
          entrees: '', 
          sorties: '' 
        }],
        totalEnLettres: ''
      });
    }
  };

  const closeProcessingModal = () => {
    setTaskToProcess(null);
    setComment('');
    setShowDemandeBesoins(false);
    setShowFicheSuivi(false);
    setShowDBFromFS(false);
    setShowValidatorsSelection(false);
    setShowPieceDeCaisseFromOM(false);
    setSelectedDbValidators([]);
    setCreatedDBDocumentId(null);
    loadTasks();
  };

  const handleAction = async (action) => {
    if (!taskToProcess) return;
    if (action === 'reject' && !comment.trim()) {
      alert('Un commentaire est requis pour rejeter.');
      return;
    }
    
    const isBypass = taskToProcess.status === 'queued' && canBypassValidation(taskToProcess);
    if (isBypass && ['approve', 'simple_approve', 'approve_sign_stamp'].includes(action)) {
      const pendingTask = taskToProcess.document.workflows.find(w => w.status === 'pending' && w.step < taskToProcess.step);
      const hoursOverdue = pendingTask ? getHoursOverdue(pendingTask) : 0;
      
      const confirm = window.confirm(
        `⚠️ VALIDATION EN BYPASS\n\n` +
        `Le validateur précédent est en retard de ${hoursOverdue}h.\n` +
        `Voulez-vous valider ce document à sa place ?\n\n` +
        `Note : Cette action sera enregistrée dans l'historique.`
      );
      if (!confirm) return;
    }
    
    setActionLoading(action);
    setError('');

    try {
      let payload = { comment };
      
      if (isBypass) {
        payload.isBypass = true;
        payload.comment = (comment || '') + `\n[VALIDATION EN BYPASS - Retard du validateur précédent]`;
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
      }
      
      const response = await workflowAPI.validateTask(taskToProcess.id, payload);

      setTasks(currentTasks => 
        currentTasks.map(t => 
          t.id === taskToProcess.id ? response.data.data : t
        )
      );
      
      setTaskToProcess(response.data.data);
      
      if (action === 'stamp') {
        alert('Cachet apposé avec succès !');
        closeProcessingModal();
      } else if (action === 'approve_sign_stamp') {
        alert('✅ Document approuvé, signé et cacheté avec succès !');
        closeProcessingModal();
      } else if (['reject', 'simple_approve'].includes(action) || action === 'dater') {
        alert('Tâche traitée avec succès !');
        closeProcessingModal();
      } else if (action === 'approve') {
        alert('Document signé avec succès !');
      }

    } catch (err) {
      const errorMessage = err.response?.data?.message || `Erreur lors de l'action '${action}'.`;
      setError(errorMessage);
      alert(errorMessage);
      console.error(`Erreur lors de l'action '${action}':`, err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleInitiateDB = () => setShowDemandeBesoins(true);
  const handleInitiateFicheSuivi = () => setShowFicheSuivi(true);
  
  const handleCreatePieceDeCaisseFromOM = () => {
    setShowPieceDeCaisseFromOM(true);
  };
  
  const handleSubmitPieceDeCaisseFromOM = async () => {
    setSubmittingDB(true);
    setError('');
    
    try {
      if (!piecePdfRef.current) throw new Error('Référence PDF introuvable');
      
      const nonPrintableElements = piecePdfRef.current.querySelectorAll('.not-printable');
      nonPrintableElements?.forEach(el => el.style.display = 'none');
      const canvas = await html2canvas(piecePdfRef.current, { scale: 2, logging: false, useCORS: true });
      nonPrintableElements?.forEach(el => el.style.display = 'block');
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
      const pdfBlob = pdf.output('blob');
      
      const uploadData = new FormData();
      const fileName = `Piece_Caisse_${taskToProcess.document.category.replace(/\s/g, '_')}_${taskToProcess.document.id.slice(0, 8)}_${Date.now()}.pdf`;
      uploadData.append('file', pdfBlob, fileName);
      uploadData.append('title', `Pièce de caisse - ${pieceDeCaisseData.concerne}`);
      uploadData.append('category', 'Pièce de caisse');
      
      uploadData.append('linkedOrdreMissionId', taskToProcess.document.id);
      
      uploadData.append('metadata', JSON.stringify({
        nom: pieceDeCaisseData.nom,
        concerne: pieceDeCaisseData.concerne
      }));
      
      const uploadResponse = await documentsAPI.upload(uploadData);
      
      await workflowAPI.validateTask(taskToProcess.id, {
        status: 'approved',
        comment: `Pièce de caisse créée et fusionnée (${fileName}). Processus complété.`,
        validationType: 'simple_approve'
      });
      
      alert(
        uploadResponse.data.data.metadata?.fusionné
          ? `✅ Pièce de caisse créée et fusionnée avec ${taskToProcess.document.category}!\n\nLe document final contient les deux documents.`
          : `✅ Pièce de caisse créée avec succès!\n\nLe processus est maintenant complet.`
      );
      closeProcessingModal();
      
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création de la Pièce de caisse.');
      console.error('❌ Erreur Pièce de caisse:', err);
      alert(`Erreur: ${err.response?.data?.message || 'Impossible de créer la Pièce de caisse'}`);
    } finally {
      setSubmittingDB(false);
    }
  };
  
  const handleSubmitDemandeBesoins = async () => {
    setSubmittingDB(true);
    setError('');
    try {
      if (!dbPdfRef.current) throw new Error('Référence PDF introuvable');
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
      uploadData.append('title', `Demande de besoin - ${demandeBesoinsData.service}`);
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
        comment: `En attente de la validation de la Demande de Besoin (${demandeBesoinsData.reference})`,
        validationType: 'pause'
      });
      const validatorsResponse = await workflowAPI.getValidators();
      const allValidators = validatorsResponse.data.data || [];
      const dbValidatorsList = allValidators.filter(v => 
        v.email === 'hsjm.econome@gmail.com' || v.email === 'hsjm.achat@gmail.com' || v.email === 'hsjm.pharma@gmail.com'
      );
      if (dbValidatorsList.length === 0) throw new Error('Aucun validateur trouvé.');
      setDbValidators(dbValidatorsList);
      setShowDemandeBesoins(false);
      setShowDBFromFS(false);
      setShowValidatorsSelection(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création de la Demande de Besoin.');
      console.error('Erreur DB:', err);
    } finally {
      setSubmittingDB(false);
    }
  };

  const handleSubmitDBWorkflow = async () => {
    if (selectedDbValidators.length === 0) {
      setError('Veuillez sélectionner au moins un validateur.');
      return;
    }
    setSubmittingDB(true);
    setError('');
    try {
      await workflowAPI.submitWorkflow({
        documentId: createdDBDocumentId,
        validatorIds: selectedDbValidators
      });
      alert('✅ Demande de Besoin créée et soumise avec succès !');
      closeProcessingModal();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la soumission.');
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
      if (!fsPdfRef.current) throw new Error('Référence PDF introuvable');
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
      uploadData.append('title', `Fiche de suivi - ${ficheSuiviData.equipement}`);
      uploadData.append('category', 'Fiche de suivi d\'équipements');
      uploadData.append('metadata', JSON.stringify({
        service: ficheSuiviData.service,
        equipement: ficheSuiviData.equipement,
        linkedWorkRequestId: taskToProcess.document.id
      }));
      await documentsAPI.upload(uploadData);
      await workflowAPI.validateTask(taskToProcess.id, {
        status: 'en_pause',
        comment: `Fiche de suivi créée. En attente de résolution.`,
        validationType: 'pause'
      });
      alert('✅ Fiche de Suivi créée !');
      if (ficheSuiviData.pieces.some(p => p.designation)) {
        if (window.confirm('Des pièces sont nécessaires. Créer une Demande de Besoin ?')) {
          setShowDBFromFS(true);
          setDemandeBesoinsData({
            date_demande: new Date().toLocaleDateString('fr-FR'),
            service: ficheSuiviData.service,
            reference: `FS-${taskToProcess.document.id.slice(0, 8)}`,
            justification: `Pièces nécessaires suite à : ${ficheSuiviData.equipement}`,
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
      setError(err.response?.data?.message || 'Erreur lors de la création.');
      console.error('Erreur FS:', err);
    } finally {
      setSubmittingFS(false);
    }
  };
  
  const formatDate = (date) => new Date(date).toLocaleString('fr-FR');
  
  const getStatusBadge = (status) => {
    // Badges de statut - Support Dark Mode
    const styles = { 
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200', 
      approved: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200', 
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200', 
      en_pause: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200',
      queued: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
    };
    const icons = { 
      pending: Clock, 
      approved: CheckCircle, 
      rejected: XCircle, 
      en_pause: AlertCircle,
      queued: Clock
    };
    const Icon = icons[status] || Clock;
    const labels = { 
      pending: 'En attente', 
      approved: 'Approuvé', 
      rejected: 'Rejeté', 
      en_pause: 'En pause',
      queued: 'File d\'attente'
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
        <Icon className="w-3 h-3 mr-1" />
        {labels[status] || status}
      </span>
    );
  };

  const getOverdueBadge = (task) => {
    if (!isTaskOverdue(task)) return null;
    const hoursOverdue = getHoursOverdue(task);
    return (
      // Badge Retard - Support Dark Mode
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700 animate-pulse">
        <AlertTriangle className="w-3 h-3 mr-1" />
        ⚠️ Retard +{hoursOverdue}h
      </span>
    );
  };

  const getBypassBadge = (task) => {
    if (task.status !== 'queued' || !canBypassValidation(task)) return null;
    return (
      // Badge Bypass - Support Dark Mode
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700">
        <AlertTriangle className="w-3 h-3 mr-1" />
        🚀 Validation possible (bypass)
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Titre - Support Dark Mode */}
      <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text mb-6">Mes tâches de validation</h1>
      
      {/* Message d'erreur - Support Dark Mode */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900/10 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 p-4 rounded-lg mb-4">
          {error}
        </div>
      )}
      
      {/* Conteneur de Filtres - Support Dark Mode */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Boutons de filtre - Support Dark Mode */}
          {['pending', 'approved','rejected', 'all'].map(status => (
            <button key={status} onClick={() => setFilter(status)} className={`px-4 py-2 text-sm font-medium rounded-md transition ${filter === status ? 'bg-blue-600 text-white shadow dark:bg-blue-700' : 'text-gray-600 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-gray-700 dark:bg-dark-bg'}`}>
              {{pending: 'En attente', approved: 'Approuvées', rejected: 'Rejetées', all: 'Toutes'}[status]} ({tasks.filter(t => status === 'all' || t.status === status).length})
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-4 flex-wrap">
          {/* Select Services - Support Dark Mode */}
          <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className="px-3 py-2 border rounded-md text-sm bg-white dark:bg-dark-bg dark:text-dark-text dark:border-dark-border">
            <option value="all">Tous les services</option>
            {services.map(s => (<option key={s.id} value={s.name}>{s.name}</option>))}
          </select>
          {/* Select Trier par - Support Dark Mode */}
          <select onChange={(e) => setSortConfig({ ...sortConfig, key: e.target.value })} value={sortConfig.key} className="px-3 py-2 border rounded-md text-sm bg-white dark:bg-dark-bg dark:text-dark-text dark:border-dark-border">
            <option value="createdAt">Trier par Date</option>
            <option value="service">Trier par Service</option>
          </select>
        </div>

        {(user?.role === 'director' || user?.role === 'admin') && (
          <button onClick={handleToggleSelectionMode} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${isInSelectionMode ? 'bg-red-500 text-white' : 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50'}`}>
            {isInSelectionMode ? <X size={18} /> : <ListChecks size={18} />}
            {isInSelectionMode ? 'Annuler' : 'Validation en masse'}
          </button>
        )}
      </div>

      {/* Barre de Sélection en Masse - Support Dark Mode */}
      {isInSelectionMode && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/10 border-l-4 border-blue-500 dark:border-blue-700 rounded-r-lg flex justify-between items-center">
          <div>
            <h3 className="font-bold text-blue-900 dark:text-blue-300">Mode Sélection Activé</h3>
            <p className="text-sm text-blue-700 dark:text-blue-400">{selectedTaskIds.length} / {MAX_SELECTION} document(s) sélectionné(s)</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleSelectAll} className="px-3 py-1 text-sm bg-white dark:bg-dark-surface dark:text-dark-text border rounded hover:bg-gray-50 dark:hover:bg-gray-700">Tout sélectionner</button>
            <button onClick={handleDeselectAll} className="px-3 py-1 text-sm bg-white dark:bg-dark-surface dark:text-dark-text border rounded hover:bg-gray-50 dark:hover:bg-gray-700">Tout désélectionner</button>
          </div>
        </div>
      )}
      
      <div className="space-y-6">
        {filteredAndSortedTasks.length === 0 ? (
          // Message aucune tâche - Support Dark Mode
          <div className="text-center py-16 bg-gray-50 dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border">
            <p className="text-gray-500 dark:text-dark-text-secondary">Aucune tâche dans cette catégorie.</p>
          </div>
        ) : (
          filteredAndSortedTasks.map((task) => {
            const isSelected = selectedTaskIds.includes(task.id);
            const selectable = isTaskSelectable(task);
            const isDisabledForSelection = !selectable || (selectedTaskIds.length >= MAX_SELECTION && !isSelected);
            const isOverdue = isTaskOverdue(task);
            const isBypassable = task.status === 'queued' && canBypassValidation(task);

            return (
              // Carte de tâche - Support Dark Mode
              <div key={task.id} className={`bg-white dark:bg-dark-surface p-4 rounded-lg shadow-md border transition-all flex items-start gap-4 
                ${isSelected ? 'border-blue-600 ring-2 ring-blue-500 dark:ring-blue-400 dark:border-blue-400' : 
                  isOverdue ? 'border-red-400 bg-red-50 dark:bg-red-900/10 dark:border-red-700' : 
                  isBypassable ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-700' : 
                  'hover:border-blue-500 dark:border-gray-700'}`
              }>
                {isInSelectionMode && (
                  <div className="flex items-center h-full pt-1">
                    <input type="checkbox" checked={isSelected} disabled={isDisabledForSelection} onChange={() => handleTaskSelection(task.id)} className="h-6 w-6 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed disabled:bg-gray-200"/>
                  </div>
                )}
                <div className="flex-grow">
                  <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3 flex-wrap">
                        {/* Titre de tâche - Support Dark Mode */}
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text">{task.document.title}</h3>
                        {getStatusBadge(task.status)}
                        {getOverdueBadge(task)}
                        {getBypassBadge(task)}
                        {/* Badges spécifiques - Support Dark Mode */}
                        {task.document.category === 'Ordre de mission' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700">
                            📋 4 signatures + Comptable
                          </span>
                        )}
                        {needsPieceDeCaisse(task) && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700 animate-pulse">
                            💰 Créer Pièce de caisse
                          </span>
                        )}
                      </div>
                      {/* Métadonnées de tâche - Support Dark Mode */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-600 dark:text-dark-text-secondary">
                        <p className="flex items-center gap-2"><User size={14} /> Soumis par: <strong>{task.document.uploadedBy?.firstName || 'Inconnu'}</strong></p>
                        <p className="flex items-center gap-2"><Calendar size={14} /> Le: <strong>{formatDate(task.createdAt)}</strong></p>
                        {task.assignedAt && task.status === 'pending' && (
                          <p className="flex items-center gap-2">
                            <Clock size={14} className={isOverdue ? 'text-red-600 dark:text-red-400' : ''} /> 
                            Assigné depuis: <strong className={isOverdue ? 'text-red-600 dark:text-red-400 font-bold' : ''}>
                              {Math.floor((new Date() - new Date(task.assignedAt)) / (1000 * 60 * 60))}h
                            </strong>
                          </p>
                        )}
                        {isWorkRequest(task) && task.document.metadata?.service && (
                          <p className="flex items-center gap-2"><Filter size={14} /> Service: <strong>{task.document.metadata.service}</strong></p>
                        )}
                      </div>
                      {/* Messages d'alerte - Support Dark Mode */}
                      {isOverdue && (
                        <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg flex items-start gap-2">
                          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-red-800 dark:text-red-300">
                            <p className="font-semibold">⚠️ Cette tâche est en retard de {getHoursOverdue(task)} heures</p>
                            <p className="text-xs mt-1">Les validateurs suivants peuvent maintenant valider ce document.</p>
                          </div>
                        </div>
                      )}
                      {isBypassable && (
                        <div className="mt-3 p-3 bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 rounded-lg flex items-start gap-2">
                          <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-orange-800 dark:text-orange-300">
                            <p className="font-semibold">🚀 Validation en bypass disponible</p>
                            <p className="text-xs mt-1">Le validateur précédent est en retard. Vous pouvez valider ce document.</p>
                          </div>
                        </div>
                      )}
                      {needsPieceDeCaisse(task) && (
                        <div className="mt-3 p-3 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg flex items-start gap-2">
                          <FileText className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-yellow-800 dark:text-yellow-300">
                            <p className="font-semibold">💰 Action comptable - Créer Pièce de caisse</p>
                            <p className="text-xs mt-1">
                              Ce document nécessite une Pièce de caisse. Le document sera joint automatiquement comme pièce justificative.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Boutons d'action - Support Dark Mode */}
                    <div className="flex items-center gap-3 flex-shrink-0 mt-4 md:mt-0">
                      <button onClick={() => setTaskForPreview(task)} className="p-2 bg-gray-100 dark:bg-dark-bg text-gray-800 dark:text-dark-text rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700" title="Aperçu rapide"><ZoomIn size={18} /></button>
                      <button onClick={() => setViewingDocument(task.document)} className="p-2 bg-gray-100 dark:bg-dark-bg text-gray-800 dark:text-dark-text rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700" title="Voir le document complet"><Eye size={18} /></button>
                      {(task.status === 'pending' || isBypassable) && (
                        <button onClick={() => openProcessingModal(task)} className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium transition shadow ${
                          needsPieceDeCaisse(task) ? 'bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-700 dark:hover:bg-yellow-600' :
                          isBypassable ? 'bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-600' : 
                          'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600'
                        }`}>
                          <CheckCircle size={16} />
                          {needsPieceDeCaisse(task) ? 'Créer Pièce de caisse' : isBypassable ? 'Valider (Bypass)' : 'Traiter'}
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Progression du Workflow - Support Dark Mode pour la bordure */}
                  <div className="border-t border-gray-200 dark:border-dark-border mt-4 pt-4">
                    <WorkflowProgress workflows={task.document.workflows} documentStatus={task.document.status} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <BulkValidationBar 
        selectedCount={selectedTaskIds.length} 
        maxSelection={MAX_SELECTION} 
        onApprove={() => handleBulkAction('approve')} 
        onReject={() => handleBulkAction('reject')} 
        onCancel={handleToggleSelectionMode} 
        disabled={bulkActionLoading} 
      />
      
      {/* QuickPreviewModal (doit être mis à jour séparément si nécessaire) */}
      {taskForPreview && (
        <QuickPreviewModal task={taskForPreview} onClose={() => setTaskForPreview(null)} />
      )}
      
      {/* Modal de traitement principal - Support Dark Mode */}
      {taskToProcess && !showDemandeBesoins && !showFicheSuivi && !showDBFromFS && !showValidatorsSelection && !showPieceDeCaisseFromOM && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-surface rounded-lg shadow-xl w-full max-w-2xl flex max-h-[90vh] overflow-hidden">
            {/* Colonne Gauche (Actions) - Support Dark Mode */}
            <div className="w-1/2 p-6 border-r border-gray-200 dark:border-dark-border flex flex-col overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-4">Traiter le document</h2>
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1 mb-4">
                Document: <strong>{taskToProcess.document.title}</strong>
              </p>
              
              {/* Message Pièce de caisse - Support Dark Mode */}
              {needsPieceDeCaisse(taskToProcess) && (
                <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/10 border-2 border-yellow-300 dark:border-yellow-700 rounded-lg">
                  <div className="flex items-start gap-3">
                    <FileText className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-yellow-900 dark:text-yellow-300 mb-2">💰 Créer la Pièce de caisse</h3>
                      <p className="text-sm text-yellow-800 dark:text-yellow-400">
                        Ce document (<strong>{taskToProcess.document.category}</strong>) nécessite une Pièce de caisse. 
                        Le document sera automatiquement joint comme pièce justificative.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Message Bypass - Support Dark Mode */}
              {taskToProcess.status === 'queued' && canBypassValidation(taskToProcess) && (
                <div className="mb-4 p-4 bg-orange-50 dark:bg-orange-900/10 border-2 border-orange-300 dark:border-orange-700 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-orange-900 dark:text-orange-300 mb-2">🚀 Validation en Bypass</h3>
                      <p className="text-sm text-orange-800 dark:text-orange-400">
                        Le validateur précédent est en retard de{' '}
                        <strong>
                          {getHoursOverdue(
                            taskToProcess.document.workflows.find(
                              w => w.status === 'pending' && w.step < taskToProcess.step
                            )
                          )}h
                        </strong>
                        . Vous pouvez valider ce document à sa place.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Commentaire - Support Dark Mode */}
              <textarea 
                value={comment} 
                onChange={(e) => setComment(e.target.value)} 
                placeholder="Ajouter un commentaire (requis si rejet)..." 
                className="w-full p-3 border border-gray-300 dark:border-dark-border dark:bg-dark-bg dark:text-dark-text rounded-lg mb-4 focus:ring-2 focus:ring-blue-500" 
                rows="3" 
              />
              
              <div className="space-y-3 flex-grow">
                <h3 className="font-semibold text-gray-700 dark:text-dark-text">Actions disponibles :</h3>
                
                {/* Action combinée DG - Support Dark Mode */}
                {canUseCombinedAction() && taskToProcess.document.fileType === 'application/pdf' && (
                <>
                  <button 
                    onClick={() => handleAction('approve_sign_stamp')} 
                    disabled={!!actionLoading} 
                    className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 rounded-lg border-2 border-purple-400 text-left transition shadow-md dark:from-dark-bg dark:to-gray-800 dark:hover:from-purple-900/50 dark:hover:to-blue-900/50 dark:border-purple-700"
                  >
                    {actionLoading === 'approve_sign_stamp' ? (
                      <Loader className="animate-spin w-6 h-6 text-purple-600 dark:text-purple-400"/>
                    ) : (
                      <ShieldCheck className="text-purple-600 dark:text-purple-400 w-6 h-6"/>
                    )}
                    <div className="flex-1">
                      <p className="font-bold text-purple-900 dark:text-purple-300">Approuver, Signer et Apposer le cachet</p>
                      <p className="text-xs text-purple-700 dark:text-purple-400 mt-0.5">Action rapide (Nécessite Signature et Cachet)</p> 
                    </div>
                  </button>
                  <div className="border-t border-gray-200 dark:border-dark-border my-3"></div>
                  <p className="text-xs text-gray-500 dark:text-dark-text-secondary italic">Ou choisissez une action individuelle :</p>
                </>
              )}
                
                {/* Actions standards - Support Dark Mode */}
                {!needsPieceDeCaisse(taskToProcess) && (
                  <>
                    <button 
                      onClick={() => handleAction('simple_approve')} 
                      disabled={!!actionLoading} 
                      className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 dark:bg-dark-bg dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-dark-border text-left transition"
                    >
                      {actionLoading === 'simple_approve' ? (
                        <Loader className="animate-spin w-5 h-5"/>
                      ) : (
                        <CheckCircle className="text-gray-600 dark:text-gray-300"/>
                      )}
                      <span className='text-gray-700 dark:text-dark-text'>Validation simple (sans signature)</span>
                    </button>
                    
                    {user?.signaturePath && (
                      <button 
                        onClick={() => handleAction('approve')} 
                        disabled={!!actionLoading} 
                        className="w-full flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/10 dark:hover:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700 text-left transition"
                      >
                        {actionLoading === 'approve' ? (
                          <Loader className="animate-spin w-5 h-5 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <Edit className="text-blue-600 dark:text-blue-400"/>
                        )}
                        <span className='text-blue-900 dark:text-blue-300'>Approuver et Signer</span>
                      </button>
                    )}
                    
                    {user?.stampPath && (
                      <button 
                        onClick={() => handleAction('stamp')} 
                        disabled={!!actionLoading} 
                        className="w-full flex items-center gap-3 p-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/10 dark:hover:bg-indigo-900/30 rounded-lg border border-indigo-200 dark:border-indigo-700 text-left transition"
                      >
                        {actionLoading === 'stamp' ? (
                          <Loader className="animate-spin w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        ) : (
                          <ShieldCheck className="text-indigo-600 dark:text-indigo-400"/>
                        )}
                        <span className='text-indigo-900 dark:text-indigo-300'>Apposer le cachet</span>
                        {taskToProcess.document.category === 'Ordre de mission' && (
                          <span className="text-xs text-indigo-600 dark:text-indigo-400 ml-auto">
                            (4 cachets possibles)
                          </span>
                        )}
                      </button>
                    )}
                    
                    {user?.email === 'hsjm.rh@gmail.com' && (
                      <button 
                        onClick={() => handleAction('dater')} 
                        disabled={!!actionLoading} 
                        className="w-full flex items-center gap-3 p-3 bg-teal-50 hover:bg-teal-100 dark:bg-teal-900/10 dark:hover:bg-teal-900/30 rounded-lg border border-teal-200 dark:border-teal-700 text-left transition"
                      >
                        {actionLoading === 'dater' ? (
                          <Loader className="animate-spin w-5 h-5 text-teal-600 dark:text-teal-400" />
                        ) : (
                          <CalendarPlus className="text-teal-600 dark:text-teal-400"/>
                        )}
                        <span className='text-teal-900 dark:text-teal-300'>Apposer le Dateur</span>
                      </button>
                    )}
                    
                    {isWorkRequest(taskToProcess) && isMG() && (
                      <>
                        <div className="border-t border-gray-200 dark:border-dark-border my-3"></div>
                        <button 
                          onClick={handleInitiateDB} 
                          className="w-full flex items-center gap-3 p-3 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/10 dark:hover:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-700 text-left transition"
                        >
                          <FileText className="text-purple-600 dark:text-purple-400"/> 
                          <span className='text-purple-900 dark:text-purple-300'>Initier une Demande de Besoin</span>
                        </button>
                        <p className="text-xs text-gray-500 dark:text-dark-text-secondary pl-3">
                          La DT sera mise en pause en attendant la validation de la DB
                        </p>
                      </>
                    )}
                    
                    {isWorkRequest(taskToProcess) && isBiomedical() && (
                      <>
                        <div className="border-t border-gray-200 dark:border-dark-border my-3"></div>
                        <button 
                          onClick={handleInitiateFicheSuivi} 
                          className="w-full flex items-center gap-3 p-3 bg-teal-50 hover:bg-teal-100 dark:bg-teal-900/10 dark:hover:bg-teal-900/30 rounded-lg border border-teal-200 dark:border-teal-700 text-left transition"
                        >
                          <FileText className="text-teal-600 dark:text-teal-400"/> 
                          <span className='text-teal-900 dark:text-teal-300'>Créer Fiche de Suivi d'Équipements</span>
                        </button>
                        <p className="text-xs text-gray-500 dark:text-dark-text-secondary pl-3">
                          La DT sera mise en pause. Vous pourrez ensuite initier une DB si nécessaire.
                        </p>
                      </>
                    )}
                  </>
                )}
                
                {/* Bouton spécial pour le comptable (Créer Pièce de caisse) - Support Dark Mode */}
                {needsPieceDeCaisse(taskToProcess) && (
                  <>
                    <button 
                      onClick={handleCreatePieceDeCaisseFromOM} 
                      className="w-full flex items-center gap-3 p-4 bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-900/10 dark:hover:bg-yellow-900/30 rounded-lg border-2 border-yellow-400 dark:border-yellow-700 text-left transition shadow-sm"
                    >
                      <FileText className="text-yellow-600 dark:text-yellow-400 w-6 h-6"/> 
                      <div>
                        <p className="font-semibold text-yellow-900 dark:text-yellow-300">Créer Pièce de caisse</p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-400">Pour finaliser cet Ordre de mission</p>
                      </div>
                    </button>
                    <div className="border-t border-gray-200 dark:border-dark-border my-3"></div>
                  </>
                )}
              </div>
              
              {!needsPieceDeCaisse(taskToProcess) && (
                <>
                  <div className="border-t border-gray-200 dark:border-dark-border my-5"></div>
                  <button 
                    onClick={() => handleAction('reject')} 
                    disabled={!!actionLoading} 
                    className="w-full flex items-center gap-3 p-3 bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-700 text-left transition"
                  >
                    {actionLoading === 'reject' ? (
                      <Loader className="animate-spin w-5 h-5 text-red-600 dark:text-red-400"/>
                    ) : (
                      <XCircle className="text-red-600 dark:text-red-400"/>
                    )}
                    <span className='text-red-900 dark:text-red-300'>Rejeter le document</span>
                  </button>
                </>
              )}
              
              <div className="mt-6 text-right">
                <button 
                  onClick={closeProcessingModal} 
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2 ml-auto transition dark:bg-blue-700 dark:hover:bg-blue-600"
                >
                  <ThumbsUp size={16} /> Terminer
                </button>
              </div>
            </div>
            
            {/* Colonne Droite (Progression) - Support Dark Mode */}
            <div className="w-1/2 p-6 bg-gray-50 dark:bg-dark-bg overflow-y-auto">
              <h3 className="font-bold text-lg text-gray-900 dark:text-dark-text mb-4">Suivi de Validation</h3>
              <WorkflowProgress 
                workflows={taskToProcess.document.workflows} 
                documentStatus={taskToProcess.document.status} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Modals Création de Document (Pièce de caisse, DB, Fiche Suivi) - Support Dark Mode */}
      {/* Note : Le contenu interne (les templates) devra être adapté séparément si nécessaire, 
         mais le conteneur du modal est adapté ici. */}
      {/* Modal Pièce de caisse */}
      {(showPieceDeCaisseFromOM || showDemandeBesoins || showDBFromFS || showFicheSuivi) && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-dark-surface rounded-lg shadow-xl w-full max-w-4xl my-8">
            <div className="p-6 border-b border-gray-200 dark:border-dark-border">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
                {showPieceDeCaisseFromOM && '💰 Créer Pièce de caisse'}
                {(showDemandeBesoins || showDBFromFS) && 'Créer une Demande de Besoin'}
                {showFicheSuivi && 'Créer une Fiche de Suivi d\'Équipements'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-2">
                {showPieceDeCaisseFromOM ? `Document source : ${taskToProcess?.document?.title}` : showDBFromFS ? 'Suite à la Fiche de Suivi d\'Équipements' : showFicheSuivi ? 'Documentation de l\'intervention biomédicale' : 'Cette demande sera liée à la Demande de Travaux en cours'}
              </p>
              {showPieceDeCaisseFromOM && (
                <p className="text-xs p-2 rounded mt-2 border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/30 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300">
                  📌 Ce document sera automatiquement joint comme pièce justificative (au-dessus de la PC)
                </p>
              )}
            </div>
            {/* Le contenu du template (PieceDeCaisse, DemandeBesoin, etc.) se charge ici. 
               Il faudrait les modifier individuellement si le contenu est toujours blanc. */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {showPieceDeCaisseFromOM && <PieceDeCaisse formData={pieceDeCaisseData} setFormData={setPieceDeCaisseData} pdfContainerRef={piecePdfRef} />}
              {(showDemandeBesoins || showDBFromFS) && <DemandeBesoin formData={demandeBesoinsData} setFormData={setDemandeBesoinsData} pdfContainerRef={dbPdfRef} />}
              {showFicheSuivi && <FicheSuiviEquipements formData={ficheSuiviData} setFormData={setFicheSuiviData} pdfContainerRef={fsPdfRef} />}
            </div>
            {error && <p className="text-red-500 dark:text-red-400 px-6 py-2 font-semibold">{error}</p>}
            <div className="p-6 border-t border-gray-200 dark:border-dark-border flex justify-between">
              <button 
                onClick={() => { 
                  if(showPieceDeCaisseFromOM) setShowPieceDeCaisseFromOM(false);
                  if(showDemandeBesoins) setShowDemandeBesoins(false);
                  if(showDBFromFS) setShowDBFromFS(false);
                  if(showFicheSuivi) setShowFicheSuivi(false);
                }} 
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 dark:text-dark-text rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-semibold"
              >
                Annuler
              </button>
              <button 
                onClick={showPieceDeCaisseFromOM ? handleSubmitPieceDeCaisseFromOM : showFicheSuivi ? handleSubmitFicheSuivi : handleSubmitDemandeBesoins} 
                disabled={submittingDB || submittingFS} 
                className={`px-8 py-3 text-white font-semibold rounded-lg disabled:bg-gray-400 flex items-center justify-center gap-2 transition shadow ${
                  showFicheSuivi ? 'bg-teal-600 hover:bg-teal-700 dark:bg-teal-700 dark:hover:bg-teal-600' : 
                  showPieceDeCaisseFromOM ? 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600' :
                  'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600'
                }`}
              >
                {submittingDB || submittingFS ? (
                  <>
                    <Loader className="animate-spin w-5 h-5" /> Création en cours...
                  </>
                ) : (
                  <>
                    <Send size={18}/> {showPieceDeCaisseFromOM ? 'Créer et Finaliser l\'OM' : showFicheSuivi ? 'Créer la Fiche' : 'Créer et Soumettre'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sélection des validateurs pour DB - Support Dark Mode */}
      {showValidatorsSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-surface rounded-lg shadow-xl w-full max-w-2xl">
            <div className="p-6 border-b border-gray-200 dark:border-dark-border">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Sélectionner les validateurs</h2>
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-2">
                Choisissez les personnes qui doivent valider cette Demande de Besoin
              </p>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {error && (
                <div className="bg-red-100 dark:bg-red-900/10 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 p-3 rounded-lg mb-4">
                  {error}
                </div>
              )}
              <div className="space-y-3">
                {dbValidators.length === 0 ? (
                  <p className="text-gray-500 dark:text-dark-text-secondary text-center py-4">
                    Aucun validateur disponible. Contactez l'administrateur.
                  </p>
                ) : (
                  dbValidators.map(validator => (
                    <label 
                      key={validator.id} 
                      className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition 
                        ${selectedDbValidators.includes(validator.id) 
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30' 
                          : 'border-gray-300 hover:border-blue-400 dark:border-dark-border dark:hover:border-blue-700 dark:bg-dark-bg'
                        }`}
                    >
                      <input 
                        type="checkbox" 
                        checked={selectedDbValidators.includes(validator.id)} 
                        onChange={() => toggleDbValidator(validator.id)} 
                        className="w-5 h-5"
                      />
                      <div className='text-gray-900 dark:text-dark-text'>
                        <p className="font-semibold">
                          {validator.firstName} {validator.lastName}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                          {validator.position || validator.email}
                        </p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-dark-border flex justify-between">
              <button 
                onClick={() => { 
                  setShowValidatorsSelection(false); 
                  setSelectedDbValidators([]); 
                  closeProcessingModal(); 
                }} 
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 dark:text-dark-text rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-semibold"
              >
                Annuler
              </button>
              <button 
                onClick={handleSubmitDBWorkflow} 
                disabled={submittingDB || selectedDbValidators.length === 0} 
                className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2 transition dark:bg-blue-700 dark:hover:bg-blue-600"
              >
                {submittingDB ? (
                  <>
                    <Loader className="animate-spin w-5 h-5" /> Soumission...
                  </>
                ) : (
                  <>
                    <Send size={18}/> Soumettre la Demande de Besoin
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Viewer de document (DocumentViewer doit être mis à jour séparément) */}
      {viewingDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-6xl h-full flex gap-4">
            <div className="flex-1 bg-gray-500 rounded-lg h-full overflow-hidden">
              <DocumentViewer 
                document={viewingDocument} 
                onClose={() => setViewingDocument(null)} 
              />
            </div>
            {/* Colonne latérale du Viewer - Support Dark Mode */}
            <div className="w-96 bg-white dark:bg-dark-surface rounded-lg p-4 overflow-y-auto h-full">
              <h3 className="font-bold text-lg text-gray-900 dark:text-dark-text mb-4">Suivi de Validation</h3>
              <WorkflowProgress 
                workflows={viewingDocument.workflows} 
                documentStatus={viewingDocument.status} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTasks;