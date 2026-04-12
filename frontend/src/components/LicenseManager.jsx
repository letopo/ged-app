// frontend/src/components/LicenseManager.jsx
import React, { useState, useEffect } from 'react';
import api from '../services/api'; // Assure-toi d'avoir configuré axios ou api
import { ShieldCheck, ShieldAlert, Key } from 'lucide-react';
import toast from 'react-hot-toast';

const LicenseManager = () => {
    const [licenseKey, setLicenseKey] = useState('');
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);

    // Vérifier l'état actuel au chargement
    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        try {
            const res = await api.get('/license/status');
            setStatus(res.data);
        } catch (error) {
            console.error("Erreur statut licence", error);
        }
    };

    const handleActivate = async () => {
        if (!licenseKey.trim()) return;
        setLoading(true);
        try {
            const res = await api.post('/license/activate', { licenseKey });
            if (res.data.success) {
                toast.success("Licence activée avec succès !");
                setStatus({ 
                    active: true, 
                    client: res.data.info.clientName, 
                    expiresAt: res.data.info.expiresAt 
                });
                setLicenseKey('');
            }
        } catch (error) {
            toast.error("Erreur : " + (error.response?.data?.message || "Clé invalide"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 max-w-lg mx-auto mt-10">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                <Key className="text-blue-600" /> Gestion de la Licence
            </h2>

            {/* État Actuel */}
            <div className={`p-4 rounded-lg mb-6 ${status?.active ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
                {status?.active ? (
                    <div className="flex items-start gap-3">
                        <ShieldCheck className="text-green-600 w-6 h-6 mt-1" />
                        <div>
                            <h3 className="font-bold text-green-800">Licence Active</h3>
                            <p className="text-sm text-green-700">Client : {status.client}</p>
                            <p className="text-sm text-green-700">Expire le : {new Date(status.expiresAt).toLocaleDateString()}</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <ShieldAlert className="text-red-600 w-6 h-6" />
                        <h3 className="font-bold text-red-800">Aucune licence valide détectée</h3>
                    </div>
                )}
            </div>

            {/* Formulaire d'activation */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Activer une nouvelle clé
                </label>
                <textarea
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                    placeholder="Collez votre clé de licence ici (eyJh...)"
                    className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-900 dark:border-gray-600 dark:text-white h-24 text-xs font-mono mb-4"
                />
                <button
                    onClick={handleActivate}
                    disabled={loading || !licenseKey}
                    className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50"
                >
                    {loading ? 'Vérification...' : 'Activer la licence'}
                </button>
            </div>
        </div>
    );
};

export default LicenseManager;