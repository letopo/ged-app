// backend/src/server.js - MISE À JOUR
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import sequelize from './config/database.js';
import './models/index.js';  // Importer les associations
import authRoutes from './routes/auth.js';
import documentRoutes from './routes/documents.js';
import workflowRoutes from './routes/workflow.js';  // NOUVEAU
import userRoutes from './routes/users.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers uploadés
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/workflows', workflowRoutes);  // NOUVEAU
app.use('/api/users', userRoutes);

// Route de test
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'API GED fonctionnelle' });
});

// Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
  console.error('❌ Erreur globale:', err);
  res.status(500).json({ 
    error: 'Erreur serveur',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Connexion à la base de données et démarrage du serveur
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Base de données connectée');

    // Synchroniser les modèles (en développement)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync();
      console.log('🔄 Modèles synchronisés');
    }

    app.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur le port ${PORT}`);
      console.log(`📄 API disponible sur http://localhost:${PORT}/api`);
      console.log(`📋 Workflow API: http://localhost:${PORT}/api/workflows`);
    });

  } catch (error) {
    console.error('❌ Erreur démarrage serveur:', error);
    process.exit(1);
  }
};

startServer();

export default app;