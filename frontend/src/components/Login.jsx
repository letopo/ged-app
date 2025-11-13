// frontend/src/components/Login.jsx - VERSION 100% COMPLÈTE AVEC SUPPORT DARK MODE
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { LogIn, Mail, Lock, Loader, AlertCircle } from 'lucide-react';

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.username || !formData.password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    try {
      setLoading(true);
      const response = await authAPI.login(formData);
      
      if (onLogin) {
        onLogin(response.data.token, response.data.user);
      }
      
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la connexion');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    // Conteneur principal - Support Dark Mode (le fond sombre hérite du <body>)
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-dark-bg dark:to-gray-900 px-4 transition-colors duration-200">
      <div className="max-w-md w-full">
        {/* Carte de connexion - Support Dark Mode */}
        <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl dark:shadow-none dark:border dark:border-dark-border p-8">
          
          {/* Header - Support Dark Mode */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
              <LogIn className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-dark-text">Connexion</h2>
            <p className="text-gray-600 dark:text-dark-text-secondary mt-2">Accédez à votre espace GED</p>
          </div>

          {/* Error Message - Support Dark Mode */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-700 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              {/* Label - Support Dark Mode */}
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                Nom d'utilisateur
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                {/* Input - Support Dark Mode */}
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-dark-border dark:bg-dark-bg dark:text-dark-text rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Entrez votre nom d'utilisateur"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              {/* Label - Support Dark Mode */}
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                {/* Input - Support Dark Mode */}
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-dark-border dark:bg-dark-bg dark:text-dark-text rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Entrez votre mot de passe"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Bouton de soumission - Support Dark Mode */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center dark:bg-blue-700 dark:hover:bg-blue-600 dark:focus:ring-blue-800"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin mr-2" />
                  Connexion en cours...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Se connecter
                </>
              )}
            </button>
          </form>

          {/* Footer - Support Dark Mode */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 dark:text-dark-text-secondary">
              Pas encore de compte ?{' '}
              <Link to="/register" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
                Créer un compte
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}