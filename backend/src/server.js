// backend/src/server.js - VERSION AVEC SOCKET.IO

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import sequelize from './config/database.js';
import { Op } from 'sequelize';

// Import des modèles avec associations
import './models/index.js';
import { Service, Motif } from './models/index.js';
import authMiddlewareObject from './middleware/auth.js';

// ✅ NOUVEAU : Import Socket.IO Manager
import { initializeSocket } from './utils/socketManager.js';

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
import employeeRoutes from './routes/employees.js';
import { createDefaultAdmin } from './seeders/createDefaultAdmin.js';
import pushRoutes from './routes/push.js';
import ticketRoutes from './routes/tickets.js';
import positionRoutes from './routes/positions.js'; // ✅ AJOUTER
import schedulesRoutes from './routes/schedules.js';
import departmentsRoutes from './routes/departments.js';
import shiftTypesRoutes from './routes/shiftTypes.js';
import trelloRoutes from './routes/trello.js'; // ✅ AJOUTER CECI
import licenseRoutes from './routes/license.js';
import invoiceRoutes from './routes/invoices.js'; 
import demandeAchatRoutes from './routes/demandeAchat.js';


// Configuration
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ NOUVEAU : Créer serveur HTTP pour Socket.IO
const httpServer = createServer(app);

// ============================================
// MIDDLEWARE CORS
// ============================================
const allowedOrigins = [
  'http://localhost',
  'https://localhost',
  'https://192.168.1.186',
  'http://localhost:80',
  'https://localhost:80',
  'http://localhost:3001',
  'https://localhost:3001',
  'http://localhost:5173',
  'https://localhost:5173',
  'http://192.168.1.186',
  'https://ged.hsjm.net',
  'http://ged.hsjm.net',
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
app.use('/api/holidays', holidaysRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/tickets/positions', positionRoutes); // ✅ AJOUTER
app.use('/api/tickets', ticketRoutes);
app.use('/api/schedules', schedulesRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/shift-types', shiftTypesRoutes);
app.use('/api/trello', trelloRoutes);
app.use('/api/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/api/license', licenseRoutes); // <--- AJOUTER
app.use('/api/invoices', invoiceRoutes); // ✅ NOUVELLE ROUTE POUR LES FACTURES
app.use('/api/demande-achat', demandeAchatRoutes); // ✅ NOUVELLE ROUTE POUR LES DEMANDES D'ACHAT


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
    // 1️⃣ Connexion à la base de données
    await sequelize.authenticate();
    console.log('✅ Base de données connectée avec succès.');
    
    // 2️⃣ ❌ DÉSACTIVER SYNC ALTER - Utiliser uniquement les migrations
    // await sequelize.sync({ alter: true });
    // console.log('✅ Modèles synchronisés avec succès.');

    console.log('✅ Utilisation des migrations pour la structure de la base');

    // 2b. Migration : ajout de la colonne archived si elle n'existe pas
    try {
      await sequelize.query(`
        ALTER TABLE documents
        ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE;
      `);
      console.log('✅ Colonne archived vérifiée/ajoutée dans documents.');
    } catch (migErr) {
      console.warn('⚠️ Migration archived (ignoré si déjà existante):', migErr.message);
    }
    
    // 3️⃣ Créer l'utilisateur admin par défaut
    console.log('');
    console.log('🔐 Vérification de l\'utilisateur admin par défaut...');
    await createDefaultAdmin();
    console.log('');
    
    // 4️⃣ Initialiser Socket.IO
    initializeSocket(httpServer);
    console.log('');
    
    // 5️⃣ Démarrage du serveur HTTP (avec Socket.IO)
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('╔═══════════════════════════════════════╗');
      console.log('║  🚀 Serveur Backend GED Démarré      ║');
      console.log('╚═══════════════════════════════════════╝');
      console.log(`📡 URL: http://localhost:${PORT}`);
      console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
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