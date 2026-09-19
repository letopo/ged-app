// frontend/src/pages/InvoiceDashboard.jsx - VERSION AVEC SUPPRESSION DOSSIERS

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
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
            setValidators(usersList.filter(u => ['validator', 'director', 'admin', 'superadmin'].includes(u.role)));
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
                style={{
                  background: selectedDocs.includes(doc.id) ? 'var(--brand-soft)' : 'var(--surface)',
                  border: `1px solid ${selectedDocs.includes(doc.id) ? 'var(--brand)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-2)',
                  boxShadow: snapshot.isDragging ? 'var(--shadow-3)' : 'var(--shadow-1)',
                  transform: snapshot.isDragging ? 'rotate(1deg)' : 'none',
                }}
            >
                <div className="flex justify-between items-start mb-1">
                    <button onClick={(e) => { e.stopPropagation(); toggleDocSelection(doc.id); }} style={{ color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                        {selectedDocs.includes(doc.id)
                          ? <CheckSquare style={{ width: 14, height: 14, color: 'var(--brand)' }} />
                          : <Square style={{ width: 14, height: 14 }} />}
                    </button>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setPreviewDoc(doc)} style={{ padding: 3, borderRadius: 4, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--brand)' }} title="Voir"><Eye style={{ width: 12, height: 12 }} /></button>
                        <button onClick={() => { setDocToMove(doc); setShowMoveModal(true); }} style={{ padding: 3, borderRadius: 4, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--fg-muted)' }} title="Déplacer"><FolderInput style={{ width: 12, height: 12 }} /></button>
                        {['draft', 'rejected'].includes(doc.status) && (
                            <button onClick={() => setSubmittingDoc(doc)} style={{ padding: 3, borderRadius: 4, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--success)' }} title="Soumettre"><Send style={{ width: 12, height: 12 }} /></button>
                        )}
                    </div>
                </div>
                <h4 style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }} title={doc.title}>{doc.title}</h4>
                <div style={{ fontSize: 10, color: 'var(--fg-muted)', marginTop: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{new Date(doc.createdAt).toLocaleDateString(undefined, {day:'2-digit', month:'2-digit'})}</span>
                    <span style={{
                      padding: '1px 6px', borderRadius: 4, fontSize: 9, fontWeight: 500,
                      background: doc.status === 'validated' ? 'var(--success-soft)' : doc.status === 'rejected' ? 'var(--danger-soft)' : 'var(--surface-3)',
                      color: doc.status === 'validated' ? 'var(--success)' : doc.status === 'rejected' ? 'var(--danger)' : 'var(--fg-muted)',
                    }}>{doc.status}</span>
                </div>
            </div>
        )}
    </Draggable>
  );

  // ✅ MODIFICATION ICI : Ajout du bouton Trash dans l'en-tête du FolderBox
  const FolderBox = ({ folder, heightClass = "h-64" }) => (
    <div className={`flex flex-col rounded-lg shadow-sm ${heightClass}`} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
        <div className="p-2 border-b flex justify-between items-center rounded-t-lg group" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <h3 className="font-bold text-xs truncate flex items-center gap-1.5" style={{ color: 'var(--fg)' }} title={folder.name}>
                {folder.type === 'inbox' && <div className="w-2 h-2 rounded-full" style={{ background: 'var(--danger)' }}></div>}
                {folder.name}
            </h3>

            <div className="flex items-center gap-2">
                <span className="text-[10px] px-1.5 rounded-full font-medium" style={{ background: 'var(--surface-3)', color: 'var(--fg-muted)' }}>
                    {folder.documents?.length || 0}
                </span>
                {/* Bouton supprimer (caché pour Inbox) */}
                {folder.type !== 'inbox' && (
                    <button
                        onClick={() => handleDeleteFolder(folder.id, folder.name)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', padding: 2 }}
                        title="Supprimer le dossier"
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--fg-muted)'}
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
                    className="flex-1 p-1.5 overflow-y-auto transition-colors scrollbar-thin"
                    style={{ background: snapshot.isDraggingOver ? 'var(--brand-soft)' : 'transparent' }}
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
    <div style={{ background: 'var(--bg)', minHeight: '100%', paddingBottom: 80 }}>

      {/* Barre d'actions */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px', background: 'var(--surface)',
        borderBottom: '1px solid var(--border)', gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={14} style={{ color: 'var(--fg-muted)' }} />
          <input
            type="date"
            style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: 'var(--fg)' }}
            value={dateRange.start}
            onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
          />
          <span style={{ color: 'var(--fg-muted)', fontSize: 12 }}>–</span>
          <input
            type="date"
            style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: 'var(--fg)' }}
            value={dateRange.end}
            onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
          />
          {(dateRange.start || dateRange.end) && (
            <button onClick={() => setDateRange({start: '', end: ''})} style={{ padding: '2px 6px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 11 }}>
              <X size={12} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowNewFolderModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 13px', borderRadius: 'var(--radius-2)',
              border: '1px solid var(--border)',
              background: 'var(--surface)', color: 'var(--fg)',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
          >
            <Plus size={14} /> Dossier
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 13px', borderRadius: 'var(--radius-2)',
              border: 'none', background: 'var(--brand)', color: '#fff',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
          >
            <UploadIcon size={14} /> Importer
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
                            <FolderBox folder={inbox} heightClass="h-72" />
                        </div>
                    )}
                    {simpleFolders.map(folder => (
                        <FolderBox key={folder.id} folder={folder} heightClass="h-72" />
                    ))}
                </div>

                {/* 2. SECTION BASSE : Conteneurs (PHP) */}
                {containerFolders.map(container => (
                    <div key={container.id} className="rounded-lg p-3 group/container" style={{ background: 'var(--surface)', border: '1px solid var(--brand-soft)', boxShadow: 'var(--shadow-1)' }}>
                        <div className="flex items-center justify-between mb-3 pb-2" style={{ borderBottom: '1px solid var(--border)' }}>
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-md" style={{ background: 'var(--brand-soft)' }}>
                                    <FolderOpen className="w-4 h-4" style={{ color: 'var(--brand)' }} />
                                </div>
                                <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--fg)' }}>
                                    {container.name}
                                </h2>
                            </div>

                            {/* ✅ Bouton Supprimer le Groupe */}
                            <button
                                onClick={() => handleDeleteFolder(container.id, container.name)}
                                className="p-1.5 rounded-md opacity-0 group-hover/container:opacity-100 transition-opacity"
                                style={{ color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                                title="Supprimer le groupe et ses dossiers"
                                onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'var(--danger-soft)'; }}
                                onMouseLeave={e => { e.currentTarget.style.color = 'var(--fg-muted)'; e.currentTarget.style.background = 'none'; }}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                            {container.children?.map(subFolder => (
                                <FolderBox key={subFolder.id} folder={subFolder} heightClass="h-64" />
                            ))}
                        </div>
                    </div>
                ))}

            </div>
        </DragDropContext>
      </div>

      {/* BULK ACTION BAR */}
      {selectedDocs.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 px-5 py-2.5 rounded-full z-50 flex items-center gap-4 animate-bounce-in" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-3)', border: '1px solid var(--brand-soft)' }}>
            <span className="font-bold text-sm" style={{ color: 'var(--brand)' }}>{selectedDocs.length} sélectionnés</span>
            <button onClick={() => setShowBulkSubmitModal(true)} className="flex items-center gap-2 font-medium text-sm" style={{ color: 'var(--success)', background: 'none', border: 'none', cursor: 'pointer' }}><Send className="w-3.5 h-3.5" /> Soumettre</button>
            <button onClick={() => setSelectedDocs([])} style={{ color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--fg-muted)'}
            ><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* MODALS */}
      {showNewFolderModal && ReactDOM.createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,27,45,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, backdropFilter: 'blur(4px)' }}>
            <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-4)', padding: 24, width: 384, boxShadow: 'var(--shadow-3)', border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg)', marginBottom: 16 }}>Nouveau dossier</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--fg)', marginBottom: 6 }}>Nom du dossier</label>
                        <input
                          style={{ width: '100%', boxSizing: 'border-box', border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', padding: '8px 12px', fontSize: 13, color: 'var(--fg)', background: 'var(--surface)', outline: 'none' }}
                          placeholder="Ex: Assurances…"
                          value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value)}
                          autoFocus
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--fg)', marginBottom: 6 }}>Emplacement</label>
                        <select
                          style={{ width: '100%', boxSizing: 'border-box', border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', padding: '8px 12px', fontSize: 13, color: 'var(--fg)', background: 'var(--surface)', outline: 'none' }}
                          value={newFolderParentId}
                          onChange={(e) => setNewFolderParentId(e.target.value)}
                        >
                            <option value="">📁 Racine (Niveau entreprise)</option>
                            {containerFolders.map(c => (<option key={c.id} value={c.id}>↳ Dans {c.name}</option>))}
                        </select>
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
                    <button onClick={() => setShowNewFolderModal(false)} style={{ padding: '8px 16px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg-muted)', fontSize: 13, cursor: 'pointer' }}>Annuler</button>
                    <button onClick={handleCreateFolder} style={{ padding: '8px 16px', borderRadius: 'var(--radius-2)', border: 'none', background: 'var(--brand)', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Créer</button>
                </div>
            </div>
        </div>,
        document.body
      )}

      {showUploadModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
            <div className="p-6 rounded-xl w-96" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-3)' }}>
                <h3 className="font-bold mb-4" style={{ color: 'var(--fg)' }}>Importer Facture</h3>
                <form onSubmit={handleUpload} className="space-y-4">
                    <input
                      className="w-full p-2 rounded"
                      style={{ border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--fg)' }}
                      placeholder="Titre..."
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      required
                    />
                    <input
                      type="file"
                      className="w-full text-sm"
                      style={{ color: 'var(--fg-muted)' }}
                      onChange={(e) => {if(e.target.files[0]) {setSelectedFile(e.target.files[0]); if(!uploadTitle) setUploadTitle(e.target.files[0].name.split('.')[0]);}}}
                      required
                    />
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowUploadModal(false)} className="px-3 py-1" style={{ color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Annuler</button>
                        <button type="submit" className="px-3 py-1 rounded" style={{ background: 'var(--success)', color: '#fff', border: 'none', cursor: 'pointer' }}>Importer</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {showMoveModal && docToMove && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
            <div className="p-6 rounded-xl w-[400px]" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-3)', border: '1px solid var(--border)' }}>
                <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--fg)' }}><FolderInput className="w-5 h-5" style={{ color: 'var(--brand)' }} /> Déplacer vers...</h3>
                <p className="text-xs mb-4 truncate" style={{ color: 'var(--fg-muted)' }}>Doc: {docToMove.title}</p>
                <div className="max-h-64 overflow-y-auto rounded-lg scrollbar-thin" style={{ border: '1px solid var(--border)' }}>
                    {inbox && (
                      <button onClick={() => handleManualMove(inbox.id)} className="w-full text-left p-2.5 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)', background: 'none', color: 'var(--fg)', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        <div className="w-2 h-2 rounded-full" style={{ background: 'var(--danger)' }}></div>
                        <span className="text-sm font-medium">Boîte de réception</span>
                      </button>
                    )}
                    <div className="p-2 text-xs font-bold uppercase" style={{ background: 'var(--surface-2)', color: 'var(--fg-muted)' }}>Entreprises</div>
                    {simpleFolders.map(folder => (
                        <button key={folder.id} onClick={() => handleManualMove(folder.id)} className="w-full text-left p-2 pl-4 text-sm" style={{ background: 'none', border: 'none', color: 'var(--fg)', cursor: 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-soft)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >{folder.name}</button>
                    ))}
                    {containerFolders.map(container => (
                        <div key={container.id}>
                            <div className="p-2 text-xs font-bold uppercase mt-2" style={{ background: 'var(--surface-2)', color: 'var(--fg-muted)' }}>{container.name}</div>
                            {container.children?.map(sub => (
                                <button key={sub.id} onClick={() => handleManualMove(sub.id)} className="w-full text-left p-2 pl-4 text-sm flex items-center gap-2" style={{ background: 'none', border: 'none', color: 'var(--fg)', cursor: 'pointer' }}
                                  onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-soft)'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                ><ChevronRight className="w-3 h-3" style={{ color: 'var(--fg-muted)' }} /> {sub.name}</button>
                            ))}
                        </div>
                    ))}
                </div>
                <div className="flex justify-end gap-2 mt-4">
                    <button onClick={() => setShowMoveModal(false)} className="px-3 py-1.5 rounded text-sm" style={{ color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >Annuler</button>
                </div>
            </div>
        </div>
      )}

      {previewDoc && <DocumentViewer document={previewDoc} onClose={() => setPreviewDoc(null)} />}

      {submittingDoc && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div className="p-6 rounded-xl w-[600px] relative" style={{ background: 'var(--surface)' }}>
                <button onClick={() => setSubmittingDoc(null)} className="absolute top-4 right-4" style={{ color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer' }}><X className="w-6 h-6" /></button>
                <WorkflowSubmission document={submittingDoc} onClose={() => setSubmittingDoc(null)} onSuccess={() => { setSubmittingDoc(null); fetchBoard(); }} />
            </div>
        </div>
      )}

      {showBulkSubmitModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div className="p-6 rounded-xl w-[500px]" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-3)', border: '1px solid var(--border)' }}>
                <h3 className="font-bold mb-2" style={{ color: 'var(--fg)' }}>Soumission groupée</h3>
                <p className="text-sm mb-4" style={{ color: 'var(--fg-muted)' }}>{selectedDocs.length} documents à envoyer.</p>
                <div className="max-h-48 overflow-y-auto rounded p-2 mb-4" style={{ border: '1px solid var(--border)' }}>
                    {validators.map(u => (
                        <div key={u.id} className="flex items-center gap-2 p-2 cursor-pointer" style={{ borderRadius: 4 }}
                          onClick={() => setSelectedValidators(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                            <div className="w-4 h-4 border rounded flex items-center justify-center" style={{ background: selectedValidators.includes(u.id) ? 'var(--brand)' : 'transparent', borderColor: selectedValidators.includes(u.id) ? 'var(--brand)' : 'var(--border)' }}>{selectedValidators.includes(u.id) && <CheckSquare className="w-3 h-3" style={{ color: '#fff' }} />}</div>
                            <span className="text-sm" style={{ color: 'var(--fg)' }}>{u.username} ({u.role})</span>
                        </div>
                    ))}
                </div>
                <div className="flex justify-end gap-2">
                    <button onClick={() => setShowBulkSubmitModal(false)} className="px-3 py-1" style={{ color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Annuler</button>
                    <button onClick={handleBulkSubmit} disabled={isBulkSubmitting} className="px-3 py-1 rounded" style={{ background: 'var(--brand)', color: '#fff', border: 'none', cursor: isBulkSubmitting ? 'not-allowed' : 'pointer' }}>{isBulkSubmitting ? '...' : 'Envoyer'}</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default InvoiceDashboard;
