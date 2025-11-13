// frontend/src/components/MgTaskModal.jsx (NOUVEAU FICHIER) - VERSION 100% COMPLÈTE AVEC SUPPORT DARK MODE

import React, { useState } from 'react';
import { workflowAPI } from '../services/api';
import { Loader, Check, X, FilePlus, AlertTriangle } from 'lucide-react';

const MgTaskModal = ({ task, onClose, onUpdate }) => {
    const [action, setAction] = useState(null); // 'validate' ou 'create_db'
    const [comment, setComment] = useState('');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleValidateDirectly = async () => {
        setLoading(true);
        setError('');
        try {
            // Utiliser 'simple_approve' ou 'approved' selon la logique attendue pour cette étape
            await workflowAPI.validateTask(task.id, { status: 'approved', comment });
            alert('✅ Tâche validée avec succès.');
            onUpdate();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Erreur lors de la validation.');
            setLoading(false);
        }
    };

    const handleInitiateDB = async () => {
        if (!file) {
            return setError('Veuillez joindre le fichier de la Demande de Besoin.');
        }
        setLoading(true);
        setError('');
        try {
            const formData = new FormData();
            formData.append('parentDocumentId', task.documentId);
            formData.append('title', `Demande de Besoin pour DT - ${task.document.title}`);
            formData.append('category', 'Demande de Besoin');
            formData.append('file', file);
            
            // Ceci mettra en pause la tâche parent et créera le document enfant
            await workflowAPI.initiateLinkedDocument(formData);
            
            alert('✅ Demande de Besoin initiée. La Demande de Travaux est en pause.');
            onUpdate();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Erreur lors de l\'initiation.');
            setLoading(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            {/* Conteneur principal - Support Dark Mode */}
            <div className="bg-white dark:bg-dark-surface rounded-lg shadow-xl dark:shadow-2xl w-full max-w-lg p-6">
                <div className="flex justify-between items-center mb-4">
                    {/* Titre - Support Dark Mode */}
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Traiter la Demande de Travaux</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400"><X size={24} /></button>
                </div>
                
                {task.document.status === 'en_attente_dependance' ? (
                    // Message d'attente - Support Dark Mode
                    <div className="bg-yellow-50 dark:bg-yellow-900/10 border-l-4 border-yellow-400 dark:border-yellow-700 p-4 rounded-md">
                        <div className="flex">
                            <div className="flex-shrink-0"><AlertTriangle className="h-5 w-5 text-yellow-400 dark:text-yellow-400" /></div>
                            <div className="ml-3">
                                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                    Cette tâche est en attente de la finalisation d'une Demande de Besoin. Elle sera réactivée automatiquement.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Texte d'instruction - Support Dark Mode */}
                        <p className="text-gray-700 dark:text-dark-text">Comment souhaitez-vous traiter cette demande ?</p>
                        <div className="flex gap-4">
                            {/* Bouton Valider - Support Dark Mode */}
                            <button 
                                onClick={() => setAction('validate')} 
                                className={`w-full p-4 border rounded-lg transition-all ${
                                    action === 'validate' 
                                        ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/30 dark:border-blue-700' 
                                        : 'bg-gray-50 dark:bg-dark-bg border-gray-300 dark:border-dark-border dark:text-dark-text hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                            >
                                <Check className="mx-auto mb-2 text-green-500 dark:text-green-400" /> 
                                Valider directement
                            </button>
                            {/* Bouton Initier DB - Support Dark Mode */}
                            <button 
                                onClick={() => setAction('create_db')} 
                                className={`w-full p-4 border rounded-lg transition-all ${
                                    action === 'create_db' 
                                        ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/30 dark:border-blue-700' 
                                        : 'bg-gray-50 dark:bg-dark-bg border-gray-300 dark:border-dark-border dark:text-dark-text hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                            >
                                <FilePlus className="mx-auto mb-2 text-orange-500 dark:text-orange-400" /> 
                                Initier une Demande de Besoin
                            </button>
                        </div>

                        {action === 'validate' && (
                            <div className="pt-4 border-t border-gray-200 dark:border-dark-border">
                                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text">Commentaire (optionnel)</label>
                                {/* Input Commentaire - Support Dark Mode */}
                                <textarea 
                                    value={comment} 
                                    onChange={e => setComment(e.target.value)} 
                                    rows="3" 
                                    className="w-full mt-1 p-2 border rounded-md border-gray-300 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
                                ></textarea>
                                <button onClick={handleValidateDirectly} disabled={loading} className="w-full mt-2 py-2 px-4 bg-green-600 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50">
                                    {loading ? <Loader className="animate-spin"/> : 'Confirmer la validation'}
                                </button>
                            </div>
                        )}

                        {action === 'create_db' && (
                            <div className="pt-4 border-t border-gray-200 dark:border-dark-border">
                                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text">Joindre la Demande de Besoin (PDF)</label>
                                {/* Input Fichier - Support Dark Mode (l'input file est difficile à styliser) */}
                                <input 
                                    type="file" 
                                    onChange={e => setFile(e.target.files[0])} 
                                    accept=".pdf" 
                                    className="w-full mt-1 p-2 border rounded-md border-gray-300 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
                                />
                                <button onClick={handleInitiateDB} disabled={loading} className="w-full mt-2 py-2 px-4 bg-orange-600 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-600 disabled:opacity-50">
                                    {loading ? <Loader className="animate-spin"/> : 'Créer et Mettre en Pause'}
                                </button>
                            </div>
                        )}
                        {/* Message d'erreur - Support Dark Mode */}
                        {error && <p className="text-red-500 dark:text-red-400 text-sm mt-2">{error}</p>}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MgTaskModal;