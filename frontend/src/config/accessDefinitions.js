// frontend/src/config/accessDefinitions.js
// Source de vérité unique pour les droits d'accès.
// Ce fichier reflète fidèlement ce qui est codé dans App.jsx / AppShell / auth.js.
// Modifier ici ne change PAS le comportement réel — c'est le tableau de bord de lecture.
// Pour modifier un vrai droit, changer App.jsx + AppShell + le middleware backend.

// ── Rôles système ─────────────────────────────────────────────────────────────
export const ROLES = [
  { id: 'superadmin',           label: 'Super Administrateur', color: '#b91c1c', description: 'Accès total + gestion des tenants (super-admin)' },
  { id: 'admin',                label: 'Administrateur',   color: '#ef4444', description: 'Accès total à toutes les fonctionnalités' },
  { id: 'user',                 label: 'Utilisateur',       color: '#6b7280', description: 'Accès GED standard — ses propres documents' },
  { id: 'validator',            label: 'Validateur',        color: '#3b82f6', description: 'Peut valider les documents dans les workflows' },
  { id: 'director',             label: 'Directeur',         color: '#8b5cf6', description: 'Vue globale + validation + gestion' },
  { id: 'caissier',             label: 'Caissier',          color: '#f59e0b', description: 'Gestion exclusive de la caisse' },
  { id: 'agent_accueil_php',    label: 'Point Focal PHP',   color: '#10b981', description: 'Module PHP clinique (patients, consultations)' },
  { id: 'agent_accueil_normal', label: 'Agent Accueil',     color: '#14b8a6', description: 'Enregistrement patients à l\'accueil normal' },
  { id: 'gardien',              label: 'Gardien',           color: '#84cc16', description: 'Portail de gestion des entrées/sorties' },
  { id: 'chef_de_service',      label: 'Chef de Service',   color: '#f97316', description: 'Gestion de son propre service' },
  { id: 'dds',                  label: 'Dir. des Soins',    color: '#ec4899', description: 'Direction des soins infirmiers' },
  { id: 'medical_chief',        label: 'Médecin Chef',      color: '#06b6d4', description: 'Direction médicale' },
  { id: 'achat',                label: 'Resp. Achat',       color: '#a78bfa', description: 'Demandes et gestion des achats' },
];

// ── Postes organisationnels (miroir statique du DB) ────────────────────────────
// Ces postes peuvent être assignés à n'importe quel utilisateur indépendamment de son rôle.
export const POSTES_STATIC = [
  { code: 'comptable',     label: 'Comptable',            color: '#0ea5e9', description: 'Accès au module comptabilité + signature PC' },
  { code: 'rh',            label: 'Responsable RH',       color: '#f472b6', description: 'Gestion des employés + docs RH confidentiels' },
  { code: 'gmao',          label: 'Responsable GMAO',     color: '#f97316', description: 'Accès au module de maintenance des équipements' },
  { code: 'kanban',        label: 'Suivi Technique',      color: '#8b5cf6', description: 'Accès au tableau de suivi MG/Informatique/Biomédical' },
  { code: 'dg',            label: 'Dir. Général',         color: '#7c3aed', description: 'Validation en dernier recours des workflows' },
  { code: 'dds',           label: 'Dir. des Soins (F)',   color: '#d946ef', description: 'Validation circuit soins' },
  { code: 'ds',            label: 'Dir. des Services',    color: '#0891b2', description: 'Validation circuit services' },
  { code: 'medecin_chef',  label: 'Médecin Chef (F)',     color: '#059669', description: 'Validation circuit médical' },
];

// ── Catégories de modules ─────────────────────────────────────────────────────
export const CATEGORIES = ['GED', 'Applications', 'Gestion', 'Administration'];

// ── Définition complète des modules ──────────────────────────────────────────
// roles  : liste des IDs de rôle qui ont accès
// postes : liste des codes de poste qui ont accès
// note   : { type: 'email'|'service', text } si accès fragile (email hardcodé dans le code)
export const MODULES = [
  // ── GED ─────────────────────────────────────────────────────────────────────
  {
    id: 'ged_view', category: 'GED', label: 'Documents — Voir',
    path: '/documents', description: 'Voir ses propres documents (admin/directeur voient tout)',
    roles: ['superadmin','admin','user','validator','director','caissier','agent_accueil_php','agent_accueil_normal','gardien','chef_de_service','dds','medical_chief','achat'],
    postes: [],
  },
  {
    id: 'ged_upload', category: 'GED', label: 'Documents — Uploader',
    path: '/upload', description: 'Importer des documents dans la GED',
    roles: ['superadmin','admin','user','validator','director','caissier','agent_accueil_php','agent_accueil_normal','chef_de_service','dds','medical_chief','achat'],
    postes: [],
  },
  {
    id: 'ged_archives', category: 'GED', label: 'Archives',
    path: '/archives', description: 'Consulter les documents archivés',
    roles: ['superadmin','admin','user','validator','director','caissier','agent_accueil_php','agent_accueil_normal','gardien','chef_de_service','dds','medical_chief','achat'],
    postes: [],
  },
  {
    id: 'ged_validate', category: 'GED', label: 'Workflow — Valider',
    path: '/my-tasks', description: 'Valider/rejeter des documents dans les circuits',
    roles: ['superadmin','admin','validator','director','dds','medical_chief','chef_de_service'],
    postes: ['comptable','rh','dg','dds','ds','medecin_chef'],
  },
  {
    id: 'ged_categories_rh', category: 'GED', label: 'Docs RH confidentiels',
    path: '/documents', description: 'Voir les documents de catégorie RH (attestations congé…)',
    roles: ['superadmin','admin'],
    postes: ['rh'],
  },
  {
    id: 'compta_docs_view', category: 'GED', label: 'Docs Comptabilité confidentiels',
    path: '/documents', description: 'Voir les documents de catégorie «Pièce comptable» dans la GED',
    roles: ['superadmin','admin'],
    postes: ['comptable'],
  },
  // ── Applications ─────────────────────────────────────────────────────────────
  {
    id: 'caisse', category: 'Applications', label: 'Caisse',
    path: '/caisse', description: 'Module de gestion de la caisse (recettes, reçus)',
    roles: ['superadmin','admin','caissier'],
    postes: [],
  },
  {
    id: 'comptabilite', category: 'Applications', label: 'Comptabilité',
    path: '/compta', description: 'Pièces de caisse scannées + extraction IA',
    roles: ['superadmin','admin'],
    postes: ['comptable'],
  },
  {
    id: 'php_module', category: 'Applications', label: 'PHP — Clinique',
    path: '/php', description: 'Gestion clinique : patients, consultations, hospitalisations',
    roles: ['superadmin','admin','agent_accueil_php'],
    postes: [],
  },
  {
    id: 'php_factures', category: 'Applications', label: 'PHP — Factures prestataires',
    path: '/php/factures', description: 'Factures prestataires avec OCR + extraction IA',
    roles: ['superadmin','admin','agent_accueil_php'],
    postes: [],
  },
  {
    id: 'portail', category: 'Applications', label: 'Portail Gardien',
    path: '/portail', description: 'Gestion des entrées/sorties du site',
    roles: ['superadmin','admin','gardien'],
    postes: [],
  },
  {
    id: 'accueil', category: 'Applications', label: 'Accueil Patients',
    path: '/accueil', description: 'Enregistrement et prise en charge à l\'accueil',
    roles: ['superadmin','admin','agent_accueil_php','agent_accueil_normal'],
    postes: [],
  },
  {
    id: 'demandes_achat', category: 'Applications', label: 'Demandes d\'Achat',
    path: '/demandes-achat', description: 'Créer et suivre les demandes d\'achat',
    roles: ['superadmin','admin','achat','user','validator','director','chef_de_service','dds','medical_chief'],
    postes: [],
  },
  // ── Gestion ──────────────────────────────────────────────────────────────────
  {
    id: 'employees_rh', category: 'Gestion', label: 'Employés (RH)',
    path: '/employees', description: 'Fiches employés, import/export CSV',
    roles: ['superadmin','admin'],
    postes: ['rh'],
  },
  {
    id: 'plannings', category: 'Gestion', label: 'Plannings',
    path: '/schedules', description: 'Gestion des plannings de travail et gardes',
    roles: ['superadmin','admin','director','dds','medical_chief'],
    postes: [],
  },
  {
    id: 'gmao', category: 'Gestion', label: 'GMAO — Maintenance',
    path: '/gmao', description: 'Gestion de la maintenance des équipements biomédicaux',
    roles: ['superadmin','admin'],
    postes: ['gmao'],
  },
  {
    id: 'kanban', category: 'Gestion', label: 'Suivi Technique (Kanban)',
    path: '/kanban/MG', description: 'Tickets techniques — services MG, Informatique, Biomédical',
    roles: ['superadmin','admin'],
    postes: ['kanban'],
  },
  {
    id: 'facturation', category: 'Gestion', label: 'Facturation',
    path: '/invoices', description: 'Dossiers de facturation et suivi',
    roles: ['superadmin','admin','director','dds','medical_chief'],
    postes: [],
  },
  // ── Administration ────────────────────────────────────────────────────────────
  {
    id: 'admin_users', category: 'Administration', label: 'Admin — Utilisateurs',
    path: '/user-management', description: 'Créer, modifier, désactiver des comptes',
    roles: ['superadmin','admin'], postes: [],
  },
  {
    id: 'admin_droits', category: 'Administration', label: 'Admin — Droits d\'accès',
    path: '/admin/droits-acces', description: 'Matrice d\'accès et gestion des droits (cette page)',
    roles: ['superadmin','admin'], postes: [],
  },
  {
    id: 'admin_postes', category: 'Administration', label: 'Admin — Postes & Fonctions',
    path: '/postes', description: 'Assigner les titulaires aux postes organisationnels',
    roles: ['superadmin','admin'], postes: [],
  },
  {
    id: 'admin_services', category: 'Administration', label: 'Admin — Services',
    path: '/services', description: 'Structure organisationnelle de l\'hôpital',
    roles: ['superadmin','admin'], postes: [],
  },
  {
    id: 'admin_audit', category: 'Administration', label: 'Admin — Journal d\'audit',
    path: '/audit-log', description: 'Historique de toutes les actions utilisateurs',
    roles: ['superadmin','admin'], postes: [],
  },
  {
    id: 'admin_stats', category: 'Administration', label: 'Admin — Statistiques',
    path: '/statistiques', description: 'Tableaux de bord et indicateurs',
    roles: ['superadmin','admin'], postes: [],
  },
  {
    id: 'admin_workflow_tpl', category: 'Administration', label: 'Admin — Modèles Workflow',
    path: '/workflow-templates', description: 'Circuits de validation paramétrables',
    roles: ['superadmin','admin'], postes: [],
  },
  {
    id: 'admin_forms', category: 'Administration', label: 'Admin — Formulaires',
    path: '/forms', description: 'Créateur de formulaires personnalisés',
    roles: ['superadmin','admin'], postes: [],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Vérifie si un rôle ou poste donne accès à un module. */
export const hasAccess = (module, id, type = 'role') =>
  type === 'role' ? module.roles.includes(id) : module.postes.includes(id);

/** Calcule tous les modules accessibles pour un utilisateur donné. */
export const getUserModules = (userRole, userPostes = []) =>
  MODULES.filter(m =>
    m.roles.includes(userRole) || userPostes.some(p => m.postes.includes(p))
  );

/** Retourne le label d'un rôle. */
export const getRoleInfo = (roleId) =>
  ROLES.find(r => r.id === roleId) || { id: roleId, label: roleId, color: '#9ca3af' };
