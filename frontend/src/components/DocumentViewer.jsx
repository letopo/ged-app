// frontend/src/components/DocumentViewer.jsx - VERSION CORRIGÉE (PLUS DE SCINTILLEMENT)

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { X, Check, AlertTriangle, MessageSquare, FilePlus, ArrowUp, ArrowDown, Loader } from 'lucide-react';
import { documentsAPI, getFileBaseUrl } from '../services/api';


const DocumentViewer = ({ document: doc, onClose, onValidate, onReject, showActions = false }) => {
    const { user } = useAuth();
    const [comment, setComment] = useState('');
    const [rejectComment, setRejectComment] = useState('');
    const [showRejectInput, setShowRejectInput] = useState(false);
    const [pdfDimensions, setPdfDimensions] = useState({ width: 0, height: 0 });
    
    // ÉTATS POUR LA FUSION
    const [showMergeModal, setShowMergeModal] = useState(false);
    const [selectedMergeFile, setSelectedMergeFile] = useState(null);
    const [isMerging, setIsMerging] = useState(false);
    
    // viewerKey sert à forcer le rechargement UNIQUEMENT quand on le décide (après fusion)
    const [viewerKey, setViewerKey] = useState(0);
    // En mode Electron (file://), on charge le PDF comme blob pour éviter
    // les problèmes d'affichage des URLs http:// dans une iframe
    const [blobUrl, setBlobUrl] = useState(null);

    const iframeRef = useRef(null);
    const fileInputRef = useRef(null);

    const API_URL = getFileBaseUrl();
    const documentUrl = doc ? `${API_URL}/${doc.filePath}?v=${viewerKey}` : null;

    // En mode Electron, charger le PDF comme blob (évite les problèmes file:// + http://)
    useEffect(() => {
        if (!window.electronAPI?.isElectron || !documentUrl) return;

        let objectUrl = null;
        fetch(documentUrl)
            .then(r => r.blob())
            .then(blob => {
                objectUrl = URL.createObjectURL(blob);
                setBlobUrl(objectUrl);
            })
            .catch(err => console.error('Erreur chargement PDF:', err));

        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            setBlobUrl(null);
        };
    }, [documentUrl]);

    const iframeSrc = window.electronAPI?.isElectron ? (blobUrl || null) : documentUrl;

    if (!doc) return null;
    
    const signatureZones = doc.metadata?.signatureZones || [];

    useEffect(() => {
        const iframe = iframeRef.current;
        if (iframe) {
            const handleLoad = () => {
                if (iframe) {
                    setPdfDimensions({
                        width: iframe.offsetWidth,
                        height: iframe.offsetHeight,
                    });
                }
            };
            iframe.addEventListener('load', handleLoad);
            return () => {
                iframe.removeEventListener('load', handleLoad);
            };
        }
    }, [viewerKey]); // On ne ré-attache l'event que si la clé change

    const handleValidate = () => {
        onValidate({ comment });
    };

    const handleReject = () => {
        if (!rejectComment.trim()) {
            alert('Le commentaire est obligatoire pour un rejet.');
            return;
        }
        onReject({ comment: rejectComment });
    };

    const onFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.type !== 'application/pdf') {
                alert('Veuillez sélectionner un fichier PDF uniquement.');
                return;
            }
            setSelectedMergeFile(file);
            setShowMergeModal(true);
            
            // Reset input value pour permettre de sélectionner le même fichier si besoin
            e.target.value = null; 
        }
    };

    const handleMerge = async (position) => {
        if (!selectedMergeFile) return;
        
        try {
            setIsMerging(true);
            const formData = new FormData();
            formData.append('file', selectedMergeFile);
            formData.append('position', position); // 'before' ou 'after'

            await documentsAPI.addPage(doc.id, formData);

            // Succès : On incrémente la clé pour forcer le rechargement de l'iframe UNE SEULE FOIS
            setViewerKey(prev => prev + 1); 
            
            setShowMergeModal(false);
            setSelectedMergeFile(null);

        } catch (error) {
            console.error("Erreur fusion:", error);
            alert("Erreur lors de l'ajout de la page.");
        } finally {
            setIsMerging(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-dark-surface rounded-lg shadow-xl w-full max-w-6xl h-[95%] flex flex-col relative">
                
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-dark-border">
                    <h2 className="text-xl font-bold truncate text-gray-900 dark:text-dark-text">{doc.title}</h2>
                    <button 
                        onClick={onClose} 
                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition text-gray-700 dark:text-dark-text"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Container Principal */}
                <div className="flex-grow flex overflow-hidden relative">
                    
                    {/* Viewer PDF */}
                    <div className="flex-grow bg-gray-200 dark:bg-dark-bg relative flex flex-col">
                        <iframe
                            key={viewerKey} // Important pour React : recrée l'iframe si la clé change
                            ref={iframeRef}
                            src={iframeSrc}
                            title={doc.title}
                            className="w-full h-full flex-grow"
                            frameBorder="0"
                        />

                        {/* Signatures Overlay */}
                        {signatureZones.length > 0 && pdfDimensions.width > 0 && (
                            <div className="absolute inset-0 pointer-events-none">
                                {signatureZones.map((zone, index) => {
                                    // Sécurité pour éviter division par zéro
                                    const scaleX = pdfDimensions.width / 595;
                                    const scaleY = pdfDimensions.height / 842;
                                    
                                    const left = zone.x * scaleX;
                                    const top = zone.y * scaleY;

                                    if (zone.type === 'signature' || zone.type === 'stamp') {
                                        return (
                                            <div key={index} style={{ position: 'absolute', left: `${left}px`, top: `${top}px`, width: `${zone.width * scaleX}px`, height: `${zone.height * scaleY}px` }}>
                                                <img src={`${API_URL}/${zone.imagePath}`} alt={zone.type} className="w-full h-full object-contain" />
                                            </div>
                                        );
                                    }
                                    if (zone.type === 'dateur') {
                                        return (
                                            <div key={index} style={{ position: 'absolute', left: `${left}px`, top: `${top}px`, fontSize: `${zone.fontSize}px`, color: zone.color }} className="font-bold bg-white/75 px-1 rounded">
                                                📅 {zone.text}
                                            </div>
                                        );
                                    }
                                    return null;
                                })}
                            </div>
                        )}
                    </div>

                    {/* TOOLBAR LATÉRALE DROITE */}
                    <div className="w-16 bg-gray-100 dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col items-center py-4 gap-4 z-10">
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={onFileSelect} 
                            accept="application/pdf" 
                            className="hidden" 
                        />
                        
                        <button 
                            onClick={() => fileInputRef.current.click()}
                            className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-lg group relative"
                            title="Ajouter une page"
                        >
                            <FilePlus size={24} />
                        </button>
                    </div>

                </div>

                {/* Actions de validation */}
                {showActions && (
                    <div className="p-4 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg">
                        {showRejectInput ? (
                            <div className="space-y-3">
                                <h3 className="font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                                    <AlertTriangle /> Motif du Rejet
                                </h3>
                                <textarea
                                    value={rejectComment}
                                    onChange={(e) => setRejectComment(e.target.value)}
                                    rows="3"
                                    className="w-full p-2 border border-gray-300 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text rounded-md"
                                />
                                <div className="flex justify-end gap-3">
                                    <button onClick={() => setShowRejectInput(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 dark:text-dark-text rounded-lg">Annuler</button>
                                    <button onClick={handleReject} className="px-4 py-2 bg-red-600 text-white rounded-lg">Confirmer</button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div>
                                    <label className="font-bold text-gray-700 dark:text-dark-text flex items-center gap-2">
                                        <MessageSquare /> Commentaire
                                    </label>
                                    <textarea
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        rows="2"
                                        className="w-full mt-1 p-2 border border-gray-300 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text rounded-md"
                                    />
                                </div>
                                <div className="flex justify-end gap-3">
                                    <button onClick={() => setShowRejectInput(true)} className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Rejeter</button>
                                    <button onClick={handleValidate} className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"><Check /> Approuver</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* MODALE DE CHOIX DE FUSION */}
                {showMergeModal && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl w-96 border border-gray-200 dark:border-gray-700 transform transition-all scale-100">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-center">
                                Où insérer le document ?
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center break-words truncate px-2">
                                {selectedMergeFile?.name}
                            </p>
                            
                            {isMerging ? (
                                <div className="flex flex-col items-center py-4">
                                    <Loader className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                                    <span className="text-gray-600 dark:text-gray-300">Fusion en cours...</span>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <button 
                                        onClick={() => handleMerge('before')}
                                        className="w-full flex items-center justify-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 dark:bg-gray-700 dark:hover:bg-gray-600 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-gray-600 transition-all"
                                    >
                                        <ArrowUp size={20} />
                                        Insérer AU DÉBUT (Avant)
                                    </button>
                                    
                                    <button 
                                        onClick={() => handleMerge('after')}
                                        className="w-full flex items-center justify-center gap-3 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition-all"
                                    >
                                        <ArrowDown size={20} />
                                        Insérer À LA FIN (Après)
                                    </button>
                                    
                                    <button 
                                        onClick={() => { setShowMergeModal(false); setSelectedMergeFile(null); }}
                                        className="w-full mt-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm underline"
                                    >
                                        Annuler
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DocumentViewer;