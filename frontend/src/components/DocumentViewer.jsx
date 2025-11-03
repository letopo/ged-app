// frontend/src/components/DocumentViewer.jsx - CORRIGÉ

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
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[95%] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold truncate">{doc.title}</h2>
                    <button 
                        onClick={onClose} 
                        className="p-2 rounded-full hover:bg-gray-200 transition"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Viewer avec superposition des signatures */}
                <div className="flex-grow bg-gray-200 overflow-hidden relative">
                    {/* PDF en arrière-plan */}
                    <iframe 
                        ref={iframeRef}
                        src={documentUrl} 
                        title={doc.title} 
                        className="w-full h-full" 
                        frameBorder="0" 
                    />

                    {/* ✅ SUPERPOSITION DES SIGNATURES/CACHETS/DATEUR */}
                    {signatureZones.length > 0 && pdfDimensions.width > 0 && (
                        <div className="absolute inset-0 pointer-events-none">
                            {signatureZones.map((zone, index) => {
                                // Calcul de la position (adapter selon votre mise en page)
                                const scaleX = pdfDimensions.width / 595; // A4 width en points
                                const scaleY = pdfDimensions.height / 842; // A4 height en points

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
                                            <div className="text-xs text-center mt-1 bg-white bg-opacity-75 px-1 rounded">
                                                <p className="font-semibold">{zone.validatorName}</p>
                                                <p className="text-gray-600">{zone.position}</p>
                                                <p className="text-gray-500">
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
                                            className="font-bold bg-white bg-opacity-75 px-2 py-1 rounded"
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
                    <div className="p-4 border-t bg-gray-50">
                        {showRejectInput ? (
                            // Vue pour le rejet
                            <div className="space-y-3">
                                <h3 className="font-bold text-red-600 flex items-center gap-2">
                                    <AlertTriangle /> Motif du Rejet (obligatoire)
                                </h3>
                                <textarea
                                    value={rejectComment}
                                    onChange={(e) => setRejectComment(e.target.value)}
                                    rows="3"
                                    placeholder="Expliquez pourquoi le document est rejeté..."
                                    className="w-full p-2 border rounded-md"
                                />
                                <div className="flex justify-end gap-3">
                                    <button 
                                        onClick={() => setShowRejectInput(false)} 
                                        className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                                    >
                                        Annuler
                                    </button>
                                    <button 
                                        onClick={handleReject} 
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                    >
                                        Confirmer le Rejet
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // Vue pour la validation
                            <div className="space-y-3">
                                <div>
                                    <label className="font-bold flex items-center gap-2">
                                        <MessageSquare /> Commentaire (optionnel)
                                    </label>
                                    <textarea
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        rows="2"
                                        placeholder="Ajoutez un commentaire..."
                                        className="w-full mt-1 p-2 border rounded-md"
                                    />
                                </div>
                                <div className="flex justify-end gap-3">
                                    <button 
                                        onClick={() => setShowRejectInput(true)} 
                                        className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                                    >
                                        Rejeter
                                    </button>
                                    <button 
                                        onClick={handleValidate} 
                                        className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
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