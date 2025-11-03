// frontend/src/components/MgTaskModal.jsx (NOUVEAU FICHIER)

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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Traiter la Demande de Travaux</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                </div>
                
                {task.document.status === 'en_attente_dependance' ? (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                        <div className="flex">
                            <div className="flex-shrink-0"><AlertTriangle className="h-5 w-5 text-yellow-400" /></div>
                            <div className="ml-3">
                                <p className="text-sm text-yellow-700">
                                    Cette tâche est en attente de la finalisation d'une Demande de Besoin. Elle sera réactivée automatiquement.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p>Comment souhaitez-vous traiter cette demande ?</p>
                        <div className="flex gap-4">
                            <button onClick={() => setAction('validate')} className={`w-full p-4 border rounded-lg ${action === 'validate' ? 'bg-blue-50 border-blue-500' : ''}`}>
                                <Check className="mx-auto mb-2 text-green-500" /> Valider directement
                            </button>
                            <button onClick={() => setAction('create_db')} className={`w-full p-4 border rounded-lg ${action === 'create_db' ? 'bg-blue-50 border-blue-500' : ''}`}>
                                <FilePlus className="mx-auto mb-2 text-orange-500" /> Initier une Demande de Besoin
                            </button>
                        </div>

                        {action === 'validate' && (
                            <div className="pt-4 border-t">
                                <label className="block text-sm font-medium text-gray-700">Commentaire (optionnel)</label>
                                <textarea value={comment} onChange={e => setComment(e.target.value)} rows="3" className="w-full mt-1 p-2 border rounded-md"></textarea>
                                <button onClick={handleValidateDirectly} disabled={loading} className="w-full mt-2 py-2 px-4 bg-green-600 text-white rounded-lg flex items-center justify-center gap-2">
                                    {loading ? <Loader className="animate-spin"/> : 'Confirmer la validation'}
                                </button>
                            </div>
                        )}

                        {action === 'create_db' && (
                            <div className="pt-4 border-t">
                                <label className="block text-sm font-medium text-gray-700">Joindre la Demande de Besoin (PDF)</label>
                                <input type="file" onChange={e => setFile(e.target.files[0])} accept=".pdf" className="w-full mt-1 p-2 border rounded-md"/>
                                <button onClick={handleInitiateDB} disabled={loading} className="w-full mt-2 py-2 px-4 bg-orange-600 text-white rounded-lg flex items-center justify-center gap-2">
                                    {loading ? <Loader className="animate-spin"/> : 'Créer et Mettre en Pause'}
                                </button>
                            </div>
                        )}
                        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MgTaskModal;