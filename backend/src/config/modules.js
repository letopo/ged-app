// backend/src/config/modules.js — catalogue des modules activables par tenant.
//
// Le socle (connexion, utilisateurs, documents, archives, workflow et
// signatures, notifications, paramètres, journal d'audit, application Android,
// et les types de documents OM / pièce de caisse / demande d'explication) n'est
// pas listé ici : il n'est jamais désactivable.
//
// Un module coupé :
//   - ne répond plus côté serveur (middleware/requireModule.js → 403) ;
//   - disparaît des menus et de ses pages (frontend, user.modules) ;
//   - n'a plus de tâche de fond pour ce tenant ;
//   - ne supprime rien : ses documents déjà signés restent dans Archives.
//
// `wired: true` = le module est réellement branché (routes, menus, tâches).
// Les autres sont listés pour préparer les offres ; leur interrupteur reste
// grisé (« Bientôt ») tant qu'ils ne sont pas branchés.
//
// Licence (JWT signé, cf. utils/tenantModules.js) :
//   { offre: 'etablissement', options: ['sage'] }  ou  { modules: ['sage', …] }
//   Une licence sans `offre` ni `modules` (licences antérieures) donne tous les modules.

export const MODULE_GROUPS = [
  { id: 'bureau',     label: 'Bureau' },
  { id: 'rh',         label: 'RH & organisation' },
  { id: 'finances',   label: 'Finances & achats' },
  { id: 'hopital',    label: 'Hôpital' },
  { id: 'logistique', label: 'Logistique & technique' },
  { id: 'options',    label: 'Options' },
];

export const MODULES = [
  // Bureau
  { key: 'modeles',           group: 'bureau', label: 'Modèles & formulaires',      description: 'Création depuis modèle, formulaires, modèles de workflow' },
  { key: 'discussion',        group: 'bureau', label: 'Discussion',                 description: 'Messagerie instantanée, pièces jointes, @mention de document' },
  { key: 'calendrier',        group: 'bureau', label: 'Calendrier & jours fériés',  description: 'Calendrier partagé et jours fériés' },
  { key: 'scanner',           group: 'bureau', label: 'Scanner mobile & OCR',       description: 'Scan en PDF depuis le téléphone, recherche dans le texte' },
  { key: 'signature_patient', group: 'bureau', label: 'Signature sur tablette',     description: '« Faire signer » à l’écran, borne du guichet' },
  // RH & organisation
  { key: 'personnel',         group: 'rh', label: 'Gestion du personnel',  description: 'Fiches employés, import / export, catégories' },
  { key: 'plannings',         group: 'rh', label: 'Plannings',             description: 'Plannings de garde et leur validation', deps: ['personnel'] },
  { key: 'rh_documents',      group: 'rh', label: 'Documents RH',          description: 'BPC du personnel, certificat d’aptitude', deps: ['personnel'] },
  // Finances & achats
  { key: 'achats',            group: 'finances', label: 'Demandes d’achat',       description: 'Demandes d’achat et leur suivi' },
  { key: 'compta',            group: 'finances', label: 'Documents comptables',   description: 'Espace Comptabilité' },
  { key: 'sage',              group: 'finances', label: 'Intégration Sage 100',   description: 'Factures PHP, BL PHP, BPC, bons de commande lus dans Sage', wired: true },
  { key: 'caisse_pharmacie',  group: 'finances', label: 'Caisse pharmacie',       description: 'Relevé de caisse Sage, caisse de permanence jour / nuit', deps: ['sage'], wired: true },
  // Hôpital
  { key: 'php',               group: 'hopital', label: 'Prise en charge du personnel (PHP)', description: 'Patients, consultations, pharmacie, repos, factures, statistiques' },
  { key: 'dme',               group: 'hopital', label: 'Liaison DME',             description: 'Rapprochement avec le dossier médical, parcours hospitalier', deps: ['php'] },
  { key: 'bloc',              group: 'hopital', label: 'Programme opératoire',    description: 'Programme du bloc de la semaine' },
  { key: 'affichage',         group: 'hopital', label: 'Affichage public',        description: 'Écran d’affichage des files d’attente' },
  // Logistique & technique
  { key: 'travaux',           group: 'logistique', label: 'Demandes de travaux & tickets', description: 'Demandes de travaux, tickets' },
  { key: 'gmao',              group: 'logistique', label: 'GMAO',                 description: 'Maintenance des équipements', deps: ['travaux'] },
  { key: 'vehicules',         group: 'logistique', label: 'Parc véhicules',       description: 'Ambulances, missions, contrôles, inventaire', wired: true },
  { key: 'trello',            group: 'logistique', label: 'Suivi technique',      description: 'Tableaux de suivi des demandes (MG, Biomédical, Informatique)', wired: true },
  // Options
  { key: 'ia',                group: 'options', label: 'IA · OCR avancé',         description: 'Lecture automatique des documents par l’IA' },
  { key: 'statistiques',      group: 'options', label: 'Statistiques avancées',   description: 'Tableaux de statistiques globales' },
  { key: 'evenements',        group: 'options', label: 'Décor & événements',      description: 'Décor de Noël, campagnes d’événements' },
];

export const MODULE_KEYS = MODULES.map(m => m.key);
export const MODULE_BY_KEY = Object.fromEntries(MODULES.map(m => [m.key, m]));

const BUREAU = ['modeles', 'discussion', 'calendrier', 'scanner', 'signature_patient'];
const ETABLISSEMENT = [...BUREAU, 'personnel', 'plannings', 'rh_documents', 'achats', 'compta', 'travaux', 'statistiques', 'evenements'];
const HOPITAL = [...ETABLISSEMENT, 'php', 'bloc', 'affichage', 'gmao', 'vehicules', 'trello'];

// Offres commerciales ; sage, caisse_pharmacie, dme et ia sont des options vendues à part.
export const OFFRES = {
  essentiel:     { label: 'Essentiel',     modules: BUREAU },
  etablissement: { label: 'Établissement', modules: ETABLISSEMENT },
  hopital:       { label: 'Hôpital',       modules: HOPITAL },
};
export const OPTIONS = ['sage', 'caisse_pharmacie', 'dme', 'ia'];

/** Modules qui dépendent (directement ou non) de `key`. */
export function dependentsOf(key) {
  const out = new Set();
  const walk = (k) => {
    for (const m of MODULES) {
      if ((m.deps || []).includes(k) && !out.has(m.key)) { out.add(m.key); walk(m.key); }
    }
  };
  walk(key);
  return [...out];
}
