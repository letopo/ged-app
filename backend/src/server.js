// backend/src/server.js - VERSION COMPLÈTE AVEC ROUTES LISTES

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import sequelize from './config/database.js';
import { Op } from 'sequelize';

// Import des modèles avec associations
import './models/index.js';
import { Service, Motif } from './models/index.js';
import authMiddlewareObject from './middleware/auth.js';

// Import des routes existantes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import documentRoutes from './routes/documents.js';
import workflowRoutes from './routes/workflow.js';
import notificationRoutes from './routes/notifications.js';
import calendarRoutes from './routes/calendar.js';
import healthRouter from './routes/health.js';
import listsRoutes from './routes/lists.js';
import holidaysRoutes from './routes/holidays.js';

// Configuration
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE CORS
// ============================================
const allowedOrigins = [
  'http://localhost',
  'http://localhost:80',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://192.168.1.186',
  process.env.CORS_ORIGIN
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// ============================================
// MIDDLEWARES EXPRESS & LOGGING
// ============================================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================
// GESTION DES FICHIERS STATIQUES
// ============================================
app.use('/api/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/api/signatures', express.static(path.join(__dirname, '../signatures')));

// ============================================
// ROUTES API EXISTANTES
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api', healthRouter);
app.use('/api/lists', listsRoutes);
app.use('/api/holidays', holidaysRoutes); // ✅ NOUVEAU

// ============================================
// GESTION DES ROUTES NON TROUVÉES ET ERREURS
// ============================================
app.use((req, res, next) => {
  res.status(404).json({ error: 'Route non trouvée', path: req.path });
});

app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', err.stack);
  res.status(err.status || 500).json({ 
    error: err.message || 'Erreur serveur interne' 
  });
});

// ============================================
// DÉMARRAGE DU SERVEUR
// ============================================
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Base de données connectée avec succès.');
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('╔═══════════════════════════════════════╗');
      console.log('🚀 Serveur Backend GED Démarré');
      console.log('╚═══════════════════════════════════════╝');
      console.log(`📡 URL: http://localhost:${PORT}`);
      console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
      console.log('╚═══════════════════════════════════════╝');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Impossible de démarrer le serveur:', error);
    process.exit(1);
  }
};

startServer();

export default app;