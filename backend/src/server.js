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
import gmaoRoutes from './routes/gmao.js'; // ✅ GMAO
// ── MODULE PHP ────────────────────────────────────────────────────────────────
import phpReferenceRoutes from './routes/phpReference.js';
import phpPatientsRoutes from './routes/phpPatients.js';
import phpConsultationsRoutes from './routes/phpConsultations.js';
import phpStatsRoutes from './routes/phpStats.js';
import phpRendezVousRoutes from './routes/phpRendezVous.js';
import templatePermissionRoutes from './routes/templatePermissionRoutes.js';
import { startPHPAutoCloseScheduler, cloturerConsultationsPassees } from './utils/phpAutoClose.js';
import { startWorkflowExpireScheduler, expireOverdueWorkflows } from './utils/workflowAutoExpire.js';


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
  'https://192.168.1.179',
  'http://192.168.1.179',
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
app.use('/api/gmao', gmaoRoutes); // ✅ GMAO - Maintenance Préventive
// ── MODULE PHP ────────────────────────────────────────────────────────────────
app.use('/api/php/reference', phpReferenceRoutes);
app.use('/api/php/patients', phpPatientsRoutes);
app.use('/api/php/consultations', phpConsultationsRoutes);
app.use('/api/php/stats', phpStatsRoutes);
app.use('/api/php/rendez-vous', phpRendezVousRoutes);
app.use('/api/template-permissions', templatePermissionRoutes);


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
    } catch (migErr) {
      console.warn('⚠️ Migration archived (ignoré si déjà existante):', migErr.message);
    }

    // 2b-bis. Migration workflows : ajout deadline_at pour l'expiration automatique
    try {
      await sequelize.query(`
        ALTER TABLE workflows
        ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMP WITH TIME ZONE;
      `);
      console.log('✅ Colonne deadline_at vérifiée/ajoutée dans workflows.');
    } catch (migErr) {
      console.warn('⚠️ Migration deadline_at workflows (ignoré si déjà existante):', migErr.message);
    }

    try {
      // Corriger les tâches pending existantes sans deadline : leur donner 7 jours à partir de maintenant
      await sequelize.query(`
        UPDATE workflows
        SET deadline_at = assigned_at + INTERVAL '7 days'
        WHERE status = 'pending'
          AND assigned_at IS NOT NULL
          AND deadline_at IS NULL;
      `);
      console.log('✅ deadline_at calculée pour les tâches pending existantes.');
    } catch (migErr) {
      console.warn('⚠️ Migration backfill deadline_at:', migErr.message);
    }

    // 2c. Migration GMAO : créer les tables equipements et plans_maintenance
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS equipements (
          id SERIAL PRIMARY KEY,
          nom VARCHAR(255) NOT NULL,
          reference VARCHAR(255),
          numero_serie VARCHAR(255),
          service VARCHAR(255),
          type_equipement VARCHAR(255),
          marque VARCHAR(255),
          modele VARCHAR(255),
          date_mise_en_service DATE,
          statut VARCHAR(20) NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif','en_reparation','hors_service')),
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
      `);
      console.log('✅ Table equipements vérifiée/créée.');
    } catch (migErr) {
      console.warn('⚠️ Migration equipements:', migErr.message);
    }

    // 2c-bis. Migration equipements : ajout des colonnes matricule, origine, fournisseur, date_mise_au_rebus
    try {
      await sequelize.query(`ALTER TABLE equipements ADD COLUMN IF NOT EXISTS matricule VARCHAR(255);`);
      await sequelize.query(`ALTER TABLE equipements ADD COLUMN IF NOT EXISTS origine VARCHAR(50) DEFAULT 'achat';`);
      await sequelize.query(`ALTER TABLE equipements ADD COLUMN IF NOT EXISTS fournisseur VARCHAR(255);`);
      await sequelize.query(`ALTER TABLE equipements ADD COLUMN IF NOT EXISTS date_mise_au_rebus DATE;`);
      console.log('✅ Colonnes matricule/origine/fournisseur/date_mise_au_rebus vérifiées/ajoutées dans equipements.');
    } catch (migErr) {
      console.warn('⚠️ Migration colonnes equipements (ignoré si déjà existantes):', migErr.message);
    }

    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS plans_maintenance (
          id SERIAL PRIMARY KEY,
          equipement_id INTEGER NOT NULL REFERENCES equipements(id) ON DELETE CASCADE,
          mois JSONB NOT NULL DEFAULT '[]'::jsonb,
          jour_du_mois INTEGER NOT NULL,
          duree_estimee FLOAT,
          technicien_id UUID REFERENCES users(id) ON DELETE SET NULL,
          notes TEXT,
          actif BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
      `);
      console.log('✅ Table plans_maintenance vérifiée/créée.');
    } catch (migErr) {
      console.warn('⚠️ Migration plans_maintenance:', migErr.message);
    }

    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS interventions (
          id SERIAL PRIMARY KEY,
          equipement_id INTEGER NOT NULL REFERENCES equipements(id) ON DELETE CASCADE,
          plan_id INTEGER REFERENCES plans_maintenance(id) ON DELETE SET NULL,
          type VARCHAR(20) NOT NULL DEFAULT 'preventive' CHECK (type IN ('preventive', 'corrective')),
          statut VARCHAR(20) NOT NULL DEFAULT 'planifiee' CHECK (statut IN ('planifiee', 'en_cours', 'terminee', 'reportee')),
          priorite VARCHAR(10) NOT NULL DEFAULT 'normal' CHECK (priorite IN ('faible', 'normal', 'urgent')),
          date_planifiee DATE NOT NULL,
          date_realisation DATE,
          technicien_id UUID REFERENCES users(id) ON DELETE SET NULL,
          description TEXT,
          actions_effectuees TEXT,
          pieces_remplacees TEXT,
          duree_reelle FLOAT,
          observations TEXT,
          signale_par VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
      `);
      console.log('✅ Table interventions vérifiée/créée.');
    } catch (migErr) {
      console.warn('⚠️ Migration interventions:', migErr.message);
    }

    // ── MIGRATIONS MODULE PHP ─────────────────────────────────────────────────
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS php_infirmeries (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          code VARCHAR(50) NOT NULL UNIQUE,
          nom VARCHAR(255) NOT NULL,
          localisation VARCHAR(255),
          responsable VARCHAR(255),
          telephone VARCHAR(20),
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
      `);
      console.log('✅ Table php_infirmeries vérifiée/créée.');
    } catch (e) { console.warn('⚠️ php_infirmeries:', e.message); }

    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS php_secteurs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          code VARCHAR(100) NOT NULL UNIQUE,
          nom VARCHAR(255) NOT NULL,
          infirmerie_id UUID REFERENCES php_infirmeries(id) ON DELETE SET NULL,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
      `);
      console.log('✅ Table php_secteurs vérifiée/créée.');
    } catch (e) { console.warn('⚠️ php_secteurs:', e.message); }

    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS php_patients (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          matricule VARCHAR(100) NOT NULL UNIQUE,
          nom VARCHAR(255) NOT NULL,
          prenom VARCHAR(255),
          genre VARCHAR(1) CHECK (genre IN ('M','F')),
          date_naissance DATE,
          secteur_id UUID REFERENCES php_secteurs(id) ON DELETE SET NULL,
          infirmerie_id UUID REFERENCES php_infirmeries(id) ON DELETE SET NULL,
          telephone VARCHAR(20),
          adresse VARCHAR(500),
          status VARCHAR(20) NOT NULL DEFAULT 'actif' CHECK (status IN ('actif','decede','transfere','inactif')),
          created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_php_patients_matricule ON php_patients(matricule);
        CREATE INDEX IF NOT EXISTS idx_php_patients_nom ON php_patients(nom);
        CREATE INDEX IF NOT EXISTS idx_php_patients_infirmerie ON php_patients(infirmerie_id);
      `);
      console.log('✅ Table php_patients vérifiée/créée.');
    } catch (e) { console.warn('⚠️ php_patients:', e.message); }

    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS php_bons_prise_en_charge (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          numero_bon VARCHAR(50) NOT NULL UNIQUE,
          patient_id UUID NOT NULL REFERENCES php_patients(id) ON DELETE CASCADE,
          date_emission DATE NOT NULL DEFAULT CURRENT_DATE,
          heure_emission TIME,
          service_destination VARCHAR(255),
          motif_visite TEXT,
          agent_emetteur_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
          status VARCHAR(20) NOT NULL DEFAULT 'emis' CHECK (status IN ('emis','utilise','annule')),
          ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_bons_patient ON php_bons_prise_en_charge(patient_id);
        CREATE INDEX IF NOT EXISTS idx_bons_date ON php_bons_prise_en_charge(date_emission);
        CREATE INDEX IF NOT EXISTS idx_bons_status ON php_bons_prise_en_charge(status);
      `);
      console.log('✅ Table php_bons_prise_en_charge vérifiée/créée.');
    } catch (e) { console.warn('⚠️ php_bons_prise_en_charge:', e.message); }

    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS php_consultations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          patient_id UUID NOT NULL REFERENCES php_patients(id) ON DELETE CASCADE,
          bon_prise_en_charge_id UUID REFERENCES php_bons_prise_en_charge(id) ON DELETE SET NULL,
          date_consultation DATE NOT NULL DEFAULT CURRENT_DATE,
          heure_arrivee TIME,
          heure_appel_medecin TIME,
          heure_debut_consultation TIME,
          heure_fin_consultation TIME,
          duree_attente_minutes INTEGER,
          service_name VARCHAR(255),
          medecin_id UUID REFERENCES users(id) ON DELETE SET NULL,
          medecin_nom VARCHAR(255),
          motif TEXT,
          diagnostic TEXT,
          ordonnance TEXT,
          resultat VARCHAR(30) NOT NULL DEFAULT 'en_cours' CHECK (resultat IN ('retour_travail','repos','hospitalisation','operation','transfert','deces','en_cours','non_presente')),
          agent_accueil_id UUID REFERENCES users(id) ON DELETE SET NULL,
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_php_consult_patient ON php_consultations(patient_id);
        CREATE INDEX IF NOT EXISTS idx_php_consult_date ON php_consultations(date_consultation);
        CREATE INDEX IF NOT EXISTS idx_php_consult_resultat ON php_consultations(resultat);
      `);
      console.log('✅ Table php_consultations vérifiée/créée.');
    } catch (e) { console.warn('⚠️ php_consultations:', e.message); }

    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS php_hospitalisations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          patient_id UUID NOT NULL REFERENCES php_patients(id) ON DELETE CASCADE,
          consultation_id UUID REFERENCES php_consultations(id) ON DELETE SET NULL,
          service_hospitalisation VARCHAR(255),
          numero_chambre VARCHAR(50),
          date_entree DATE NOT NULL,
          date_sortie DATE,
          duree_sejour INTEGER,
          status VARCHAR(20) NOT NULL DEFAULT 'en_cours' CHECK (status IN ('en_cours','sorti','transfert','deces')),
          medecin_responsable VARCHAR(255),
          diagnostic TEXT,
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_php_hosp_patient ON php_hospitalisations(patient_id);
        CREATE INDEX IF NOT EXISTS idx_php_hosp_date ON php_hospitalisations(date_entree);
      `);
      console.log('✅ Table php_hospitalisations vérifiée/créée.');
    } catch (e) { console.warn('⚠️ php_hospitalisations:', e.message); }

    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS php_repos (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          patient_id UUID NOT NULL REFERENCES php_patients(id) ON DELETE CASCADE,
          consultation_id UUID REFERENCES php_consultations(id) ON DELETE SET NULL,
          date_debut DATE NOT NULL,
          date_fin DATE NOT NULL,
          duree_jours INTEGER,
          status VARCHAR(20) NOT NULL DEFAULT 'en_cours' CHECK (status IN ('en_cours','termine','prolonge')),
          prolongations JSONB DEFAULT '[]'::jsonb,
          motif TEXT,
          medecin_id UUID REFERENCES users(id) ON DELETE SET NULL,
          medecin_nom VARCHAR(255),
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_php_repos_patient ON php_repos(patient_id);
        CREATE INDEX IF NOT EXISTS idx_php_repos_status ON php_repos(status);
        CREATE INDEX IF NOT EXISTS idx_php_repos_datefin ON php_repos(date_fin);
      `);
      console.log('✅ Table php_repos vérifiée/créée.');
    } catch (e) { console.warn('⚠️ php_repos:', e.message); }

    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS php_operations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          patient_id UUID NOT NULL REFERENCES php_patients(id) ON DELETE CASCADE,
          consultation_id UUID REFERENCES php_consultations(id) ON DELETE SET NULL,
          type_operation VARCHAR(255),
          date_operation DATE,
          chirurgien_nom VARCHAR(255),
          anesthesiste_nom VARCHAR(255),
          status VARCHAR(20) NOT NULL DEFAULT 'planifiee' CHECK (status IN ('planifiee','realisee','annulee')),
          diagnostic TEXT,
          compte_rendu TEXT,
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_php_ops_patient ON php_operations(patient_id);
      `);
      console.log('✅ Table php_operations vérifiée/créée.');
    } catch (e) { console.warn('⚠️ php_operations:', e.message); }

    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS php_deces_transferts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          patient_id UUID NOT NULL REFERENCES php_patients(id) ON DELETE CASCADE,
          consultation_id UUID REFERENCES php_consultations(id) ON DELETE SET NULL,
          type VARCHAR(20) NOT NULL CHECK (type IN ('deces','transfert')),
          date DATE NOT NULL,
          motif TEXT,
          destination VARCHAR(500),
          causes_deces TEXT,
          enregistre_par_id UUID REFERENCES users(id) ON DELETE SET NULL,
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
      `);
      console.log('✅ Table php_deces_transferts vérifiée/créée.');
    } catch (e) { console.warn('⚠️ php_deces_transferts:', e.message); }

    // Seeder automatique des données de référence PHP (si tables vides)
    try {
      const { default: seedPHPData } = await import('./seeders/phpReferenceSeeder.js');
      await seedPHPData();
    } catch (e) { console.warn('⚠️ Seeder PHP:', e.message); }

    // 2z. Migration : créer la table template_permissions
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS template_permissions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          template_name VARCHAR(255) NOT NULL UNIQUE,
          allowed_roles JSONB DEFAULT '[]',
          allowed_user_ids JSONB DEFAULT '[]',
          is_restricted BOOLEAN DEFAULT FALSE,
          description VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
      `);
      console.log('✅ Table template_permissions vérifiée/créée.');
    } catch (e) { console.warn('⚠️ template_permissions:', e.message); }

    // 3️⃣ Créer l'utilisateur admin par défaut
    console.log('');
    console.log('🔐 Vérification de l\'utilisateur admin par défaut...');
    await createDefaultAdmin();
    console.log('');
    
    // 4️⃣ Initialiser Socket.IO
    initializeSocket(httpServer);
    console.log('');

    // 4b. PHP : clôturer les consultations oubliées d'hier au démarrage, puis planifier
    await cloturerConsultationsPassees();
    startPHPAutoCloseScheduler();

    // 4c. Workflow : expirer les tâches dépassées au démarrage, puis planifier chaque nuit
    await expireOverdueWorkflows();
    startWorkflowExpireScheduler();
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