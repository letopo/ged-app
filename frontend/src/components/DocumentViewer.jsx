// frontend/src/components/DocumentViewer.jsx - VERSION 100% COMPLÈTE AVEC SUPPORT DARK MODE

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { X, Check, AlertTriangle, MessageSquare } from 'lucide-react';

const DocumentViewer = ({ document: doc, onClose, onValidate, onReject, showActions = false }) => {
    const { user } = useAuth();
    const [comment, setComment] = useState('');
    const [rejectComment, setRejectComment] = useState('');
    const [showRejectInput, setShowRejectInput] = useState(false);
    const [pdfDimensions, setPdfDimensions] = useState({ width: 0, height: 0 });
    const iframeRef = useRef(null);

    if (!doc) return null;

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const documentUrl = `${API_URL}/${doc.filePath}`;
    
    // Récupérer les zones de signature depuis metadata
    const signatureZones = doc.metadata?.signatureZones || [];

    useEffect(() => {
        // Calculer les dimensions du PDF pour le positionnement des signatures
        if (iframeRef.current) {
            const handleLoad = () => {
                // Utiliser la taille du conteneur parent ou la taille de l'iframe après chargement
                setPdfDimensions({
                    width: iframeRef.current.offsetWidth,
                    height: iframeRef.current.offsetHeight,
                });
            };
            
            iframeRef.current.addEventListener('load', handleLoad);
            
            return () => {
                if (iframeRef.current) {
                    iframeRef.current.removeEventListener('load', handleLoad);
                }
            };
        }
    }, []);

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

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-dark-surface rounded-lg shadow-xl w-full max-w-4xl h-[95%] flex flex-col">
                
                {/* Header - Support Dark Mode pour le fond et le bouton de fermeture */}
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-dark-border">
                    <h2 className="text-xl font-bold truncate text-gray-900 dark:text-dark-text">{doc.title}</h2>
                    <button 
                        onClick={onClose} 
                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition text-gray-700 dark:text-dark-text"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Viewer avec superposition des signatures */}
                <div className="flex-grow bg-gray-200 dark:bg-dark-bg overflow-hidden relative">
                    {/* PDF en arrière-plan (l'iframe garde son propre style) */}
                    <iframe 
                        ref={iframeRef}
                        src={documentUrl} 
                        title={doc.title} 
                        className="w-full h-full" 
                        frameBorder="0" 
                    />

                    {/* SUPERPOSITION DES SIGNATURES/CACHETS/DATEUR */}
                    {signatureZones.length > 0 && pdfDimensions.width > 0 && (
                        <div className="absolute inset-0 pointer-events-none">
                            {signatureZones.map((zone, index) => {
                                // Les positions sont calculées en fonction de la taille du PDF
                                const scaleX = pdfDimensions.width / 595; // A4 width en points (approx.)
                                const scaleY = pdfDimensions.height / 842; // A4 height en points (approx.)

                                const left = zone.x * scaleX;
                                const top = zone.y * scaleY;

                                if (zone.type === 'signature' || zone.type === 'stamp') {
                                    return (
                                        <div
                                            key={index}
                                            style={{
                                                position: 'absolute',
                                                left: `${left}px`,
                                                top: `${top}px`,
                                                width: `${zone.width * scaleX}px`,
                                                height: `${zone.height * scaleY}px`,
                                            }}
                                            className="flex flex-col items-center"
                                        >
                                            <img
                                                src={`${API_URL}/${zone.imagePath}`}
                                                alt={zone.type}
                                                className="w-full h-full object-contain"
                                                onError={(e) => {
                                                    console.error('Erreur chargement image:', zone.imagePath);
                                                    e.target.style.display = 'none';
                                                }}
                                            />
                                            {/* Détails de signature/cachet - Support Dark Mode */}
                                            <div className="text-xs text-center mt-1 bg-white dark:bg-dark-surface bg-opacity-75 px-1 rounded shadow text-gray-900 dark:text-dark-text">
                                                <p className="font-semibold">{zone.validatorName}</p>
                                                <p className="text-gray-600 dark:text-dark-text-secondary">{zone.position}</p>
                                                <p className="text-gray-500 dark:text-gray-500">
                                                    {new Date(zone.date).toLocaleDateString('fr-FR')}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                }

                                if (zone.type === 'dateur') {
                                    return (
                                        <div
                                            key={index}
                                            style={{
                                                position: 'absolute',
                                                left: `${left}px`,
                                                top: `${top}px`,
                                                fontSize: `${zone.fontSize}px`,
                                                color: zone.color || '#FF0000',
                                            }}
                                            // Détails du dateur - Support Dark Mode
                                            className="font-bold bg-white dark:bg-dark-surface bg-opacity-75 px-2 py-1 rounded shadow text-red-600 dark:text-red-400"
                                        >
                                            📅 {zone.text}
                                        </div>
                                    );
                                }

                                return null;
                            })}
                        </div>
                    )}
                </div>

                {/* Actions de validation */}
                {showActions && (
                    <div className="p-4 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg">
                        {showRejectInput ? (
                            // Vue pour le rejet - Support Dark Mode
                            <div className="space-y-3">
                                <h3 className="font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                                    <AlertTriangle /> Motif du Rejet (obligatoire)
                                </h3>
                                <textarea
                                    value={rejectComment}
                                    onChange={(e) => setRejectComment(e.target.value)}
                                    rows="3"
                                    placeholder="Expliquez pourquoi le document est rejeté..."
                                    // Input - Support Dark Mode
                                    className="w-full p-2 border border-gray-300 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text rounded-md"
                                />
                                <div className="flex justify-end gap-3">
                                    <button 
                                        onClick={() => setShowRejectInput(false)} 
                                        // Bouton Annuler - Support Dark Mode
                                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 dark:text-dark-text rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                                    >
                                        Annuler
                                    </button>
                                    <button 
                                        onClick={handleReject} 
                                        // Bouton Confirmer - Support Dark Mode
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
                                    >
                                        Confirmer le Rejet
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // Vue pour la validation - Support Dark Mode
                            <div className="space-y-3">
                                <div>
                                    <label className="font-bold text-gray-700 dark:text-dark-text flex items-center gap-2">
                                        <MessageSquare /> Commentaire (optionnel)
                                    </label>
                                    <textarea
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        rows="2"
                                        placeholder="Ajoutez un commentaire..."
                                        // Input - Support Dark Mode
                                        className="w-full mt-1 p-2 border border-gray-300 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text rounded-md"
                                    />
                                </div>
                                <div className="flex justify-end gap-3">
                                    <button 
                                        onClick={() => setShowRejectInput(true)} 
                                        // Bouton Rejeter - Support Dark Mode
                                        className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 dark:bg-red-700 dark:hover:bg-red-600"
                                    >
                                        Rejeter
                                    </button>
                                    <button 
                                        onClick={handleValidate} 
                                        // Bouton Approuver - Support Dark Mode
                                        className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 dark:bg-green-700 dark:hover:bg-green-600 flex items-center gap-2"
                                    >
                                        <Check /> Approuver
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DocumentViewer;