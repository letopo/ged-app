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

  // ── 30 septembre ──────────────────────────────────────────────────────────
  {
    id: '2026-09-30-general',
    date: '2026-09-30',
    target: 'app',
    title: 'Nouveautés du 30 septembre',
    items: [
      'Transmettez un document validé à un collègue (ex. une demande d’achat signée à l’acheteur) : il le retrouve en tête de sa liste, dans Documents › Reçus.',
      'Depuis un document validé, « Créer un document lié » prépare un bon de commande, une proforma… : le document d’origine est joint en tête du PDF pour les signataires.',
      'Sur téléphone : une barre d’onglets en bas de l’écran, tous les modules dans « Plus », et Mes tâches, Documents, GMAO et Discussion s’affichent correctement.',
      'Discussion : la recherche d’un utilisateur filtre enfin selon ce que vous tapez.',
      'Choisissez la langue de la GED (français, anglais, espagnol, arabe) dans Paramètres › Profil.',
      'Quand votre session a expiré, la GED vous ramène directement à la page de connexion.',
      'Les accents mal affichés dans les anciens documents (services, lieux, titres…) ont été corrigés.',
    ],
  },
  {
    id: '2026-09-30-accueil',
    date: '2026-09-30',
    target: '/dashboard',
    title: 'Accueil',
    items: [
      'La « Synthèse du jour » résume ce qui vous attend : documents à valider, les plus anciens, vos documents approuvés ou rejetés dans la semaine.',
      'Chaque indicateur montre l’évolution des 7 derniers jours ; les approbations sont comptées à leur date réelle de validation.',
    ],
  },
  {
    id: '2026-09-30-documents',
    date: '2026-09-30',
    target: '/documents',
    title: 'Documents',
    items: [
      'Onglet « Reçus » : les documents qu’on vous a transmis, avec la date et l’expéditeur (« Reçu le … de … »).',
      'Dans la visionneuse d’un document validé : boutons « Transmettre » et « Créer un document lié », et la chaîne des documents liés entre eux.',
    ],
  },
  {
    id: '2026-09-30-statistiques',
    date: '2026-09-30',
    target: '/statistiques',
    title: 'Statistiques',
    items: [
      'L’Explorateur affiche les vrais chiffres de la GED, et le graphique en camembert est lisible sur téléphone.',
    ],
    access: isAdmin,
  },
  {
    id: '2026-09-30-sauvegardes',
    date: '2026-09-30',
    target: '/dashboard',
    title: 'Sauvegarde du serveur',
    items: [
      'Les données sont sauvegardées et vérifiées chaque nuit, avec un historique de 6 mois.',
      'En cas de problème (sauvegarde échouée, absente ou disque presque plein), une alerte rouge apparaît ici, sur l’Accueil — uniquement pour les administrateurs.',
    ],
    access: isAdmin,
  },

  // ── 1er octobre ───────────────────────────────────────────────────────────
  {
    id: '2026-10-01-reglages',
    date: '2026-10-01',
    target: 'app',
    title: 'Nouveaux réglages',
    items: [
      'Paramètres › Délais et session : délai pour valider un document, seuil « en retard », déconnexion après inactivité, durée de session et taille maximale des fichiers se règlent désormais pour votre organisation.',
      'Paramètres › Messagerie : le compte d’envoi des e-mails de notification (ex. Gmail) se configure et se teste depuis l’application, pour le super-administrateur ou les administrateurs qu’il autorise.',
    ],
    access: isAdmin,
  },
  {
    id: '2026-10-01-clients-messagerie',
    date: '2026-10-01',
    target: '/super-admin',
    title: 'Réglages des clients',
    items: [
      'Bouton « Réglages » sur chaque client : sa Messagerie, son IA · OCR et son intégration Sage, avec pour chacun la possibilité d’en confier la gestion à ses administrateurs.',
    ],
    access: (user) => user?.role === 'superadmin',
  },
  {
    id: '2026-10-01-integrations',
    date: '2026-10-01',
    target: 'app',
    title: 'IA et Sage dans les Paramètres',
    items: [
      'Paramètres › IA · OCR : la clé et le modèle d’intelligence artificielle qui lisent automatiquement factures PHP et pièces comptables se règlent et se testent depuis l’application.',
      'Paramètres › Intégrations : l’import automatique des factures PHP depuis Sage se configure à l’écran ; le bouton « Aperçu » montre les factures qui seraient importées avant d’activer quoi que ce soit.',
      'Ces réglages sont réservés au super-administrateur, qui peut les confier aux administrateurs de chaque organisation.',
    ],
    access: isAdmin,
  },
  {
    id: '2026-10-01-2fa-email',
    date: '2026-10-01',
    target: 'app',
    title: 'Double authentification par e-mail',
    items: [
      'Paramètres › Sécurité : en plus de l’application d’authentification, vous pouvez choisir de recevoir votre code de connexion par e-mail.',
      'Dans l’application d’authentification, la GED apparaît désormais sous le nom de votre organisation.',
    ],
  },
  {
    id: '2026-10-01-confidentialite',
    date: '2026-10-01',
    target: 'app',
    title: 'Confidentialité des documents',
    items: [
      'Paramètres › Confidentialité : réservez un type de document (fiches de paie, contrats, dossiers médicaux…) à certains postes, sans passer par le développeur.',
      'Utilisateurs › « … » › Désactiver la 2FA : débloquez une personne qui a perdu son téléphone ou l’accès à sa boîte e-mail.',
    ],
    access: isAdmin,
  },
  {
    id: '2026-10-01-upload-taille',
    date: '2026-10-01',
    target: '/upload',
    title: 'Upload',
    items: [
      'La taille maximale d’un fichier est affichée à côté de la zone d’envoi et fixée par votre organisation (50 Mo par défaut, au lieu de 10).',
    ],
  },
  {
    id: '2026-10-01-signataires',
    date: '2026-10-01',
    target: 'app',
    title: 'Titres des signataires',
    items: [
      'Sous chaque signature, le document indique désormais le titre et le nom de la personne qui valide (ex. « Directeur Général — Michel VAUTROT »), selon les validateurs choisis à la soumission et dans leur ordre.',
      'Dans la fenêtre « Soumettre », chaque validateur indique le cadre qu’il signera ; si une personne occupe plusieurs postes, vous choisissez le titre à afficher.',
      'Les circuits imposés (Pièce de caisse, Ordre de mission, Demande d’explication) et le cadre du demandeur gardent leur libellé.',
    ],
  },
  {
    id: '2026-10-01-signataires-permission',
    date: '2026-10-01',
    target: 'app',
    title: 'Demande de permission',
    items: [
      'La demande de permission affiche elle aussi, au-dessus de chaque signature, le titre et le nom du validateur choisi (Chef de pôle, Ressources humaines, Directeur Général…), et chaque signature tombe dans son cadre.',
    ],
  },
  {
    id: '2026-10-01-comptable-pc-om',
    date: '2026-10-01',
    target: '/my-tasks',
    title: 'Ordres de mission avec frais',
    items: [
      'Quand un ordre de mission avec frais arrive à votre niveau, le bouton « Pièce caisse » vous propose de créer la pièce de caisse de chaque bénéficiaire, pré-remplie avec les éléments de l’OM ; finalisez l’OM une fois toutes les pièces créées.',
    ],
    access: (user) => (user?.postes || []).includes('comptable'),
  },
  {
    id: '2026-10-01-om-plusieurs-missionnaires',
    date: '2026-10-01',
    target: 'form:ordre-de-mission',
    title: 'Plusieurs missionnaires sur un même OM',
    items: [
      '« + Ajouter un missionnaire » : saisissez chaque personne sur sa propre ligne quand un ordre de mission concerne plusieurs missionnaires (en plus du conducteur).',
      'Les indemnités estimées sont calculées pour chacun, et la comptable fera une pièce de caisse par personne.',
    ],
  },
  {
    id: '2026-10-01-comptable-pc-om-plusieurs',
    date: '2026-10-01',
    target: '/my-tasks',
    title: 'OM à plusieurs missionnaires',
    items: [
      'Sur un ordre de mission avec frais, chaque missionnaire a désormais son propre bouton « Créer Pièce de caisse », en plus du conducteur — y compris sur les OM où plusieurs noms ont été saisis dans le même champ.',
      'Les pièces déjà créées restent cochées si vous rouvrez l’OM plus tard.',
    ],
    access: (user) => (user?.postes || []).includes('comptable'),
  },
  {
    id: '2026-10-01-accueil-calendrier-mobile',
    date: '2026-10-01',
    target: '/dashboard',
    title: 'Accueil sur téléphone',
    items: [
      'L’accueil s’adapte de nouveau à la taille de l’écran : un titre de document très long n’élargit plus la page, et le calendrier des permissions reste compact sur ordinateur comme sur téléphone.',
    ],
  },
  {
    id: '2026-10-01-journal-audit',
    date: '2026-10-01',
    target: '/audit-log',
    title: 'Journal d’audit',
    items: [
      'Sur téléphone, les événements s’affichent en cartes lisibles au lieu d’un tableau à faire défiler.',
      'Cliquez sur un événement pour voir tout son détail (utilisateur, ressource, adresse IP, navigateur, commentaire…).',
      'Toutes les actions ont désormais un nom clair (absence déclarée, poste attribué, messagerie modifiée…) et les connexions indiquent l’e-mail utilisé.',
    ],
    access: isAdmin,
  },
];

export default RELEASE_NOTES;
