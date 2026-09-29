// frontend/src/releaseNotes.js
// Notes « Nouveautés » livrées avec chaque mise à jour.
//
// Chaque note ne s'affiche qu'une fois par utilisateur (mémorisé en base :
// users.seen_release_notes). Ajouter une note = ajouter une entrée ici dans le
// même commit que l'amélioration qu'elle décrit.
//
//   id      identifiant unique et définitif (ne jamais le réutiliser ni le renommer)
//   date    'AAAA-MM-JJ' — un compte créé après cette date ne voit pas la note
//   target  'app'            → fenêtre à l'ouverture de l'application
//           '/archives'      → bulle à la 1re ouverture de cette page (et sous-pages)
//           'form:<clé>'     → bulle à la 1re ouverture du formulaire qui appelle
//                              useFeatureNote('<clé>') (cf. components/ReleaseNotes.jsx)
//   title   titre court
//   items   liste de phrases (une nouveauté par ligne)
//   access  (optionnel) (user) => boolean — ne cibler qu'une partie des utilisateurs
//
// Les notes sont affichées de la plus ancienne à la plus récente.

const isAdmin = (user) => ['admin', 'superadmin'].includes(user?.role);

const RELEASE_NOTES = [
  {
    id: '2026-09-29-general',
    date: '2026-09-29',
    target: 'app',
    title: 'Nouveautés du 29 septembre',
    items: [
      "Sur téléphone, les pages Accueil, Archives, Statistiques, Workflow, Utilisateurs et Upload s'affichent désormais correctement.",
      'Sur téléphone, votre compte et le bouton de déconnexion sont visibles en bas du menu ☰.',
      'La rubrique « Nouveautés » (menu Système) permet de relire ces informations à tout moment.',
    ],
  },
  {
    id: '2026-09-29-menu-groupes',
    date: '2026-09-29',
    target: 'app',
    title: 'Menu réorganisé',
    items: [
      'La section « Organisation » du menu est rangée en sous-menus par métier (Administration, Ressources humaines, Finances…). Cliquez sur un groupe pour l’ouvrir.',
    ],
    access: isAdmin,
  },
  {
    id: '2026-09-29-archives-mobile',
    date: '2026-09-29',
    target: '/archives',
    title: 'Archives',
    items: [
      'Sur téléphone, les filtres Type, Période et Auteur sont repliés derrière le bouton « Filtres », au-dessus des résultats.',
    ],
  },
  {
    id: '2026-09-29-utilisateurs-mobile',
    date: '2026-09-29',
    target: '/user-management',
    title: 'Utilisateurs',
    items: [
      'Sur téléphone, chaque utilisateur s’affiche sous forme de carte ; le bouton « … » donne accès à Modifier, Réinitialiser le mot de passe, Signature et Cachet.',
    ],
  },
  {
    id: '2026-09-29-piece-de-caisse-signatures',
    date: '2026-09-29',
    target: 'form:piece-de-caisse',
    title: 'Pièce de caisse',
    items: [
      'Les cadres de signature suivent désormais l’ordre du circuit : Visa Directeur, Comptabilité, puis Visa Bénéficiaire.',
    ],
  },
];

export default RELEASE_NOTES;
