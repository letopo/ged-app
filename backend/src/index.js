// backend/src/index.js - Configuration complète
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Import des routes
import authRoutes from './routes/auth.js';
import documentRoutes from './routes/documents.js';
import workflowRoutes from './routes/workflow.js';
import Service from './Service.js';
import Motif from './Motif.js';

// Configuration ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger les variables d'environnement
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ==========================================
// CONFIGURATION CORS
// ==========================================
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// SERVIR LES FICHIERS STATIQUES (CRITIQUE!)
// ==========================================
// Cette ligne DOIT être présente pour que les PDFs soient accessibles
const uploadsPath = path.join(__dirname, '../uploads');
console.log('📁 Dossier uploads configuré:', uploadsPath);

app.use('/uploads', express.static(uploadsPath, {
  setHeaders: (res, filePath) => {
    // Permettre l'affichage dans les iframes
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
    
    // Type MIME correct pour les PDFs
    if (filePath.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
    }
  }
}));

// Log pour vérifier les requêtes vers /uploads
app.use('/uploads', (req, res, next) => {
  console.log(`📥 Requête fichier: /uploads${req.url}`);
  next();
});

// ==========================================
// ROUTES API
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/workflow', workflowRoutes);

// Route de test
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Backend GED opérationnel',
    uploadsPath: uploadsPath
  });
});

// ==========================================
// GESTION DES ERREURS 404
// ==========================================
app.use((req, res, next) => {
  console.log(`❌ Route non trouvée: ${req.method} ${req.url}`);
  res.status(404).json({ 
    error: 'Route non trouvée',
    path: req.url,
    method: req.method,
    message: 'La route demandée n\'existe pas'
  });
});

// ==========================================
// GESTION DES ERREURS GLOBALES
// ==========================================
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', err);
  res.status(500).json({ 
    error: 'Erreur serveur',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// ==========================================
// DÉMARRAGE DU SERVEUR
// ==========================================
app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('🚀 Serveur Backend GED Démarré');
  console.log('═══════════════════════════════════════');
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`📁 Uploads: ${uploadsPath}`);
  console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
  console.log('═══════════════════════════════════════');
  console.log('');
});

export { User, Document, Workflow, Service, Motif };
export default app;