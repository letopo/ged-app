// frontend/src/pages/InvoiceDashboard.jsx - VERSION AVEC SUPPRESSION DOSSIERS

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { invoiceAPI, documentsAPI, usersAPI, workflowAPI } from '../services/api';
import { Eye, Upload as UploadIcon, FileText, Send, X, Filter, CheckSquare, Square, FolderOpen, FolderInput, ChevronRight, Plus, Trash2 } from 'lucide-react'; // ✅ Trash2 ajouté
import DocumentViewer from '../components/DocumentViewer';
import WorkflowSubmission from '../components/WorkflowSubmission';
import toast from 'react-hot-toast';
import { PageSkeleton } from '../components/SkeletonLoader';

const InvoiceDashboard = () => {
  const [boardData, setBoardData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtres & Sélection
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedDocs, setSelectedDocs] = useState([]);

  // Modals
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParentId, setNewFolderParentId] = useState('');

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  
  // Actions
  const [previewDoc, setPreviewDoc] = useState(null);
  const [submittingDoc, setSubmittingDoc] = useState(null);
  const [showBulkSubmitModal, setShowBulkSubmitModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [docToMove, setDocToMove] = useState(null);

  const [validators, setValidators] = useState([]);
  const [selectedValidators, setSelectedValidators] = useState([]);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

  useEffect(() => {
    fetchBoard();
    loadValidators();
  }, [dateRange]);

  const fetchBoard = async () => {
    try {
      setLoading(true);
      const res = await invoiceAPI.getBoard(dateRange.start, dateRange.end);
      setBoardData(res.data);
    } catch (error) {
      console.error("Erreur chargement board", error);
    } finally {
      setLoading(false);
    }
  };

  const loadValidators = async () => {
    try {
        const res = await usersAPI.getAll();
        const usersList = res.data.users || res.data;
        if (Array.isArray(usersList)) {
            setValidators(usersList.filter(u => ['validator', 'director', 'admin'].includes(u.role)));
        }
    } catch (err) { console.error(err); }
  };

  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    try {
      await invoiceAPI.moveDocument(draggableId, destination.droppableId);
      fetchBoard();
    } catch (error) {
      toast("Erreur lors du déplacement");
    }
  };

  // ✅ FONCTION DE SUPPRESSION DE DOSSIER
  const handleDeleteFolder = async (folderId, folderName) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer le dossier "${folderName}" ?\nLes documents à l'intérieur seront détachés (non supprimés).`)) {
        return;
    }
    try {
        await invoiceAPI.deleteFolder(folderId);
        fetchBoard();
    } catch (error) {
        console.error(error);
        toast("Erreur lors de la suppression : " + (error.response?.data?.message || "Erreur serveur"));
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await invoiceAPI.createFolder(newFolderName, newFolderParentId || null);
      setNewFolderName('');
      setNewFolderParentId('');
      setShowNewFolderModal(false);
      fetchBoard();
    } catch (error) {
      toast("Erreur lors de la création du dossier");
    }
  };

  const toggleDocSelection = (docId) => setSelectedDocs(prev => prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile || !uploadTitle) return;
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', uploadTitle);
    formData.append('category', 'Factures');

    try {
        const res = await documentsAPI.upload(formData);
        const inbox = boardData.find(f => f.type === 'inbox');
        const docId = res.data.data ? res.data.data.id : (res.data.document ? res.data.document.id : null);
        if(inbox && docId) await invoiceAPI.moveDocument(docId, inbox.id);
        setShowUploadModal(false);
        setSelectedFile(null);
        setUploadTitle('');
        fetchBoard();
    } catch (error) { toast("Erreur upload"); }
  };

  const handleBulkSubmit = async () => {
    if (selectedValidators.length === 0) return toast("Sélectionnez un validateur.");
    setIsBulkSubmitting(true);
    try {
        await Promise.all(selectedDocs.map(docId => workflowAPI.submitForValidation(docId, selectedValidators)));
        toast(`${selectedDocs.length} documents soumis !`);
        setSelectedDocs([]);
        setSelectedValidators([]);
        setShowBulkSubmitModal(false);
        fetchBoard();
    } catch (error) { toast("Erreur soumission"); } finally { setIsBulkSubmitting(false); }
  };

  const handleManualMove = async (targetFolderId) => {
    if (!docToMove) return;
    try {
        await invoiceAPI.moveDocument(docToMove.id, targetFolderId);
        setShowMoveModal(false);
        setDocToMove(null);
        fetchBoard();
    } catch (error) {
        toast("Erreur lors du déplacement");
    }
  };

  // --- COMPOSANTS INTERNES ---

  const DocumentCard = ({ doc, index }) => (
    <Draggable key={doc.id} draggableId={doc.id} index={index}>
        {(provided, snapshot) => (
            <div
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
                className={`mb-1.5 p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md transition-all group ${
                    snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500 rotate-1 z-50' : ''
                } ${selectedDocs.includes(doc.id) ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/30' : ''}`}
            >
                <div className="flex justify-between items-start mb-1">
                    <button onClick={(e) => { e.stopPropagation(); toggleDocSelection(doc.id); }} className="text-gray-400 hover:text-blue-500">
                        {selectedDocs.includes(doc.id) ? <CheckSquare className="w-3.5 h-3.5 text-blue-600" /> : <Square className="w-3.5 h-3.5" />}
                    </button>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setPreviewDoc(doc)} className="p-1 hover:bg-blue-50 dark:hover:bg-gray-600 rounded text-blue-600" title="Voir"><Eye className="w-3 h-3" /></button>
                        <button onClick={() => { setDocToMove(doc); setShowMoveModal(true); }} className="p-1 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded text-purple-600" title="Déplacer vers..."><FolderInput className="w-3 h-3" /></button>
                        {['draft', 'rejected'].includes(doc.status) && (
                            <button onClick={() => setSubmittingDoc(doc)} className="p-1 hover:bg-green-50 dark:hover:bg-green-900/30 rounded text-green-600" title="Soumettre"><Send className="w-3 h-3" /></button>
                        )}
                    </div>
                </div>
                <h4 className="text-[11px] font-medium text-gray-800 dark:text-gray-200 truncate" title={doc.title}>{doc.title}</h4>
                <div className="text-[9px] text-gray-500 dark:text-gray-400 mt-0.5 flex justify-between">
                    <span>{new Date(doc.createdAt).toLocaleDateString(undefined, {day:'2-digit', month:'2-digit'})}</span>
                    <span className={`px-1 rounded ${doc.status === 'validated' ? 'bg-green-100 text-green-800' : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300'}`}>{doc.status}</span>
                </div>
            </div>
        )}
    </Draggable>
  );

  // ✅ MODIFICATION ICI : Ajout du bouton Trash dans l'en-tête du FolderBox
  const FolderBox = ({ folder, heightClass = "h-64" }) => (
    <div className={`flex flex-col bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm ${heightClass}`}>
        <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 rounded-t-lg group">
            <h3 className="font-bold text-gray-700 dark:text-gray-200 text-xs truncate flex items-center gap-1.5" title={folder.name}>
                {folder.type === 'inbox' && <div className="w-2 h-2 rounded-full bg-red-500"></div>}
                {folder.name}
            </h3>
            
            <div className="flex items-center gap-2">
                <span className="text-[10px] bg-gray-200 dark:bg-gray-700 dark:text-gray-300 px-1.5 rounded-full font-medium">
                    {folder.documents?.length || 0}
                </span>
                {/* Bouton supprimer (caché pour Inbox) */}
                {folder.type !== 'inbox' && (
                    <button 
                        onClick={() => handleDeleteFolder(folder.id, folder.name)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                        title="Supprimer le dossier"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        </div>
        <Droppable droppableId={folder.id}>
            {(provided, snapshot) => (
                <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`flex-1 p-1.5 overflow-y-auto transition-colors scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 ${
                        snapshot.isDraggingOver ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                >
                    {folder.documents?.map((doc, index) => (
                        <DocumentCard key={doc.id} doc={doc} index={index} />
                    ))}
                    {provided.placeholder}
                </div>
            )}
        </Droppable>
    </div>
  );

  const inbox = boardData.find(f => f.type === 'inbox');
  const simpleFolders = boardData.filter(f => f.type === 'custom' && !f.parentId && f.id !== inbox?.id);
  const containerFolders = boardData.filter(f => f.type === 'container');

  if (loading) return <PageSkeleton rows={5} title />;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 pb-20"> 
      
      {/* HEADER */}
      <div className="sticky top-0 z-40 px-6 py-3 bg-white dark:bg-gray-800 shadow-sm flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2"><FileText className="text-blue-600" /> Factures Hôpital</h1>
        
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg border border-gray-200 dark:border-gray-600">
            <Filter className="w-3.5 h-3.5 text-gray-500" />
            <input type="date" className="bg-transparent text-xs border-none outline-none dark:text-white" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} />
            <span className="text-gray-400 text-xs">-</span>
            <input type="date" className="bg-transparent text-xs border-none outline-none dark:text-white" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} />
            {(dateRange.start || dateRange.end) && <button onClick={() => setDateRange({start: '', end: ''})} className="text-xs text-red-500 hover:underline px-1"><X className="w-3 h-3" /></button>}
        </div>

        <div className="flex gap-2">
            <button onClick={() => setShowNewFolderModal(true)} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded shadow-sm">
                <Plus className="w-3.5 h-3.5" /> Dossier
            </button>
            <button onClick={() => setShowUploadModal(true)} className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded shadow-sm">
                <UploadIcon className="w-3.5 h-3.5" /> Facture
            </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-4">
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="space-y-6">
                
                {/* 1. SECTION HAUTE : Inbox + Simples */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    {inbox && (
                        <div className="xl:col-span-1">
                            <FolderBox folder={inbox} heightClass="h-72 ring-2 ring-red-100 dark:ring-red-900/30" />
                        </div>
                    )}
                    {simpleFolders.map(folder => (
                        <FolderBox key={folder.id} folder={folder} heightClass="h-72" />
                    ))}
                </div>

                {/* 2. SECTION BASSE : Conteneurs (PHP) */}
                {containerFolders.map(container => (
                    <div key={container.id} className="bg-white dark:bg-gray-900 rounded-lg border border-blue-200 dark:border-blue-900 shadow-sm p-3 group/container">
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-md">
                                    <FolderOpen className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                                </div>
                                <h2 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wide">
                                    {container.name}
                                </h2>
                            </div>
                            
                            {/* ✅ Bouton Supprimer le Groupe */}
                            <button 
                                onClick={() => handleDeleteFolder(container.id, container.name)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md opacity-0 group-hover/container:opacity-100 transition-opacity"
                                title="Supprimer le groupe et ses dossiers"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                            {container.children?.map(subFolder => (
                                <FolderBox key={subFolder.id} folder={subFolder} heightClass="h-64 bg-blue-50/30 dark:bg-gray-800/30" />
                            ))}
                        </div>
                    </div>
                ))}

            </div>
        </DragDropContext>
      </div>

      {/* BULK ACTION BAR - Idem */}
      {selectedDocs.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 px-5 py-2.5 rounded-full shadow-xl border border-blue-200 dark:border-gray-700 z-50 flex items-center gap-4 animate-bounce-in">
            <span className="font-bold text-sm text-blue-600 dark:text-blue-400">{selectedDocs.length} sélectionnés</span>
            <button onClick={() => setShowBulkSubmitModal(true)} className="flex items-center gap-2 text-green-600 hover:text-green-700 font-medium text-sm"><Send className="w-3.5 h-3.5" /> Soumettre</button>
            <button onClick={() => setSelectedDocs([])} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* MODALS - Idem */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl w-96 shadow-2xl border dark:border-gray-700">
                <h3 className="text-lg font-bold mb-4 dark:text-white">Nouveau Dossier</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Nom du dossier</label>
                        <input className="w-full border p-2 rounded text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-500" placeholder="Ex: Assurances..." value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} autoFocus />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Emplacement</label>
                        <select className="w-full border p-2 rounded text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-500" value={newFolderParentId} onChange={(e) => setNewFolderParentId(e.target.value)}>
                            <option value="">📁 Racine (Nouvelle entreprise)</option>
                            {containerFolders.map(c => (<option key={c.id} value={c.id}>↳ Dans {c.name}</option>))}
                        </select>
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <button onClick={() => setShowNewFolderModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg text-sm">Annuler</button>
                    <button onClick={handleCreateFolder} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">Créer</button>
                </div>
            </div>
        </div>
      )}

      {/* Autres modals (Upload, Move, Submit...) inchangés */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl w-96 shadow-2xl">
                <h3 className="font-bold mb-4 dark:text-white">Importer Facture</h3>
                <form onSubmit={handleUpload} className="space-y-4">
                    <input className="w-full border p-2 rounded dark:bg-gray-700 dark:text-white dark:border-gray-600" placeholder="Titre..." value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} required />
                    <input type="file" className="w-full text-sm dark:text-gray-300" onChange={(e) => {if(e.target.files[0]) {setSelectedFile(e.target.files[0]); if(!uploadTitle) setUploadTitle(e.target.files[0].name.split('.')[0]);}}} required />
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowUploadModal(false)} className="px-3 py-1 text-gray-500">Annuler</button>
                        <button type="submit" className="px-3 py-1 bg-green-600 text-white rounded">Importer</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {showMoveModal && docToMove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl w-[400px] shadow-2xl border dark:border-gray-700">
                <h3 className="font-bold mb-4 text-gray-800 dark:text-white flex items-center gap-2"><FolderInput className="w-5 h-5 text-purple-600" /> Déplacer vers...</h3>
                <p className="text-xs text-gray-500 mb-4 truncate">Doc: {docToMove.title}</p>
                <div className="max-h-64 overflow-y-auto border rounded-lg dark:border-gray-600 scrollbar-thin">
                    {inbox && <button onClick={() => handleManualMove(inbox.id)} className="w-full text-left p-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 border-b dark:border-gray-700 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div><span className="text-sm font-medium dark:text-gray-200">Boîte de réception</span></button>}
                    <div className="p-2 bg-gray-50 dark:bg-gray-800/50 text-xs font-bold text-gray-500 uppercase">Entreprises</div>
                    {simpleFolders.map(folder => (
                        <button key={folder.id} onClick={() => handleManualMove(folder.id)} className="w-full text-left p-2 hover:bg-blue-50 dark:hover:bg-gray-700 pl-4 text-sm text-gray-700 dark:text-gray-300">{folder.name}</button>
                    ))}
                    {containerFolders.map(container => (
                        <div key={container.id}>
                            <div className="p-2 bg-gray-50 dark:bg-gray-800/50 text-xs font-bold text-gray-500 uppercase mt-2">{container.name}</div>
                            {container.children?.map(sub => (
                                <button key={sub.id} onClick={() => handleManualMove(sub.id)} className="w-full text-left p-2 hover:bg-blue-50 dark:hover:bg-gray-700 pl-4 text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2"><ChevronRight className="w-3 h-3 text-gray-400" /> {sub.name}</button>
                            ))}
                        </div>
                    ))}
                </div>
                <div className="flex justify-end gap-2 mt-4">
                    <button onClick={() => setShowMoveModal(false)} className="px-3 py-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm">Annuler</button>
                </div>
            </div>
        </div>
      )}

      {previewDoc && <DocumentViewer document={previewDoc} onClose={() => setPreviewDoc(null)} />}
      
      {submittingDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl w-[600px] relative">
                <button onClick={() => setSubmittingDoc(null)} className="absolute top-4 right-4 text-gray-500"><X className="w-6 h-6" /></button>
                <WorkflowSubmission document={submittingDoc} onClose={() => setSubmittingDoc(null)} onSuccess={() => { setSubmittingDoc(null); fetchBoard(); }} />
            </div>
        </div>
      )}

      {showBulkSubmitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl w-[500px] shadow-2xl border dark:border-gray-700">
                <h3 className="font-bold mb-2 dark:text-white">Soumission groupée</h3>
                <p className="text-sm text-gray-500 mb-4">{selectedDocs.length} documents à envoyer.</p>
                <div className="max-h-48 overflow-y-auto border rounded p-2 mb-4 dark:border-gray-600">
                    {validators.map(u => (
                        <div key={u.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onClick={() => setSelectedValidators(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id])}>
                            <div className={`w-4 h-4 border rounded flex items-center justify-center ${selectedValidators.includes(u.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>{selectedValidators.includes(u.id) && <CheckSquare className="w-3 h-3 text-white" />}</div>
                            <span className="text-sm dark:text-gray-200">{u.username} ({u.role})</span>
                        </div>
                    ))}
                </div>
                <div className="flex justify-end gap-2">
                    <button onClick={() => setShowBulkSubmitModal(false)} className="px-3 py-1 text-gray-500 dark:text-gray-400">Annuler</button>
                    <button onClick={handleBulkSubmit} disabled={isBulkSubmitting} className="px-3 py-1 bg-blue-600 text-white rounded">{isBulkSubmitting ? '...' : 'Envoyer'}</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default InvoiceDashboard;