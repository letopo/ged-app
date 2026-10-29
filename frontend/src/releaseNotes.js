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

import { isFestiveSeason } from './components/Festive';

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
  {
    id: '2026-10-01-employes-mobile',
    date: '2026-10-01',
    target: '/employees',
    title: 'Gestion des employés sur téléphone',
    items: [
      'Sur téléphone, chaque employé s’affiche en carte avec ses boutons Voir, Modifier et Désactiver ; le bouton « Ajouter un employé » est de nouveau accessible.',
      'Les fenêtres Détails, Ajouter/Modifier et Importer CSV s’ouvrent en bas de l’écran, champs sur une seule colonne.',
    ],
  },
  {
    id: '2026-10-01-demandes-achat-mobile',
    date: '2026-10-01',
    target: '/demandes-achat',
    title: 'Demandes d’achat sur téléphone',
    items: [
      'Sur téléphone, la liste des demandes prend tout l’écran ; une demande ouverte (ou le formulaire) s’affiche en plein écran, la croix ramène à la liste.',
      'Les champs du formulaire et les informations de la demande passent sur une seule colonne.',
    ],
  },
  {
    id: '2026-10-01-comptabilite-mobile',
    date: '2026-10-01',
    target: '/compta',
    title: 'Comptabilité sur téléphone',
    items: [
      'Sur téléphone et tablette, chaque pièce s’affiche en carte (libellé, n° d’ordre, date, référence, montant, type) et les encarts Entrées / Sorties / Solde tiennent dans l’écran.',
      'Sur ordinateur, un libellé long est coupé proprement au lieu de déborder sur la colonne « Date pièce ».',
    ],
  },
  {
    id: '2026-10-01-suivi-technique-mobile',
    date: '2026-10-01',
    target: '/kanban',
    title: 'Suivi technique sur téléphone',
    items: [
      'Sur téléphone, chaque colonne (À faire, En cours…) occupe la largeur de l’écran : glissez pour passer à la suivante. Le bouton « Toutes / Mes tâches » est de nouveau visible.',
      'La fiche d’une carte s’ouvre en plein écran, les commentaires en dessous de la description.',
    ],
  },
  {
    id: '2026-10-02-cachet-taille-reelle',
    date: '2026-10-02',
    target: 'app',
    title: 'Cachets à leur taille réelle',
    items: [
      'À la validation, chaque cachet est désormais apposé à la taille réelle de son tampon (58 × 22 mm par défaut), centré sur le cadre de signature et par-dessus la signature, comme sur papier.',
      'Ordre de mission à 4 signataires : les cadres de signature sont disposés sur 2 lignes de 2.',
      'Les documents déjà validés ou signés ne sont pas modifiés.',
    ],
  },
  {
    id: '2026-10-02-cachet-taille-reelle-admin',
    date: '2026-10-02',
    target: '/user-management',
    title: 'Dimensions des cachets',
    items: [
      'Utilisateurs › … › Uploader cachet : indiquez la largeur et la hauteur du tampon (mm) ; un aperçu à l’échelle montre le rendu sur la page. Les dimensions se modifient aussi sans changer l’image.',
      'Paramètres › Délais et session › Signatures : l’interrupteur « Apposer les cachets à leur taille réelle » permet de revenir à l’ancien calcul si besoin.',
    ],
    access: isAdmin,
  },
  {
    id: '2026-10-02-flux-validation',
    date: '2026-10-02',
    target: '/workflow-dashboard',
    title: 'Nouveau schéma du flux de validation',
    items: [
      'Le flux de validation est maintenant calculé sur les vrais circuits : on voit, étape par étape, combien de documents passent à l’étape suivante, sont validés, rejetés, expirés ou encore en cours.',
      'Survolez une étape ou un ruban pour le détail et le temps moyen de traitement ; filtrez par service et par type de document.',
      'Les indicateurs, les goulots d’étranglement et les valideurs les plus sollicités utilisent les mêmes données ; l’export donne un document par ligne avec son issue.',
    ],
  },
  {
    id: '2026-10-02-sage-compte-collectif',
    date: '2026-10-02',
    target: 'app',
    title: 'Factures PHP Sage : employés et familles',
    items: [
      'Paramètres › Intégrations › Sage : nouveau critère « Compte collectif du client » — 4127000 pour les employés PHP, 4122000 pour leurs familles. C’est la méthode recommandée pour reconnaître les patients PHP.',
      'L’aperçu affiche le compte collectif de chaque facture ; les factures importées indiquent « Employé PHP » ou « Famille PHP » (titre et PDF).',
      'Nouveau réglage « Importer les factures à partir du » : seules les factures datées de ce jour ou après sont importées, jamais tout l’historique.',
      'Les factures du mois pas encore comptabilisées dans Sage sont aussi prises en compte (réglage « Factures à importer ») ; l’aperçu indique l’état de chacune.',
      'L’aperçu indique le nombre total de factures qui seraient importées (employés, familles, non comptabilisées, période couverte) avant d’enregistrer.',
    ],
    access: isAdmin,
  },
  {
    id: '2026-10-02-bl-php-en-attente',
    date: '2026-10-02',
    target: '/sage-bl-php',
    title: 'BL PHP en attente de facturation',
    items: [
      'Nouveau tableau de bord (Finances › BL PHP en attente) : les actes des employés et familles PHP pas encore facturés dans Sage, regroupés par Bon de Prise en Charge de 3 jours (à partir de la date d’entrée du patient).',
      'Pour chaque BPC : état (en cours J1–J3, à facturer, en retard), services, montant, et le détail des actes de chaque BL. Filtres, recherche et export Excel.',
      'Onglet « Contrôle des 3 jours » : les factures qui regroupent des BL espacés de plus de 3 jours.',
    ],
    access: (user) => user?.role === 'superadmin' || !!user?.canSeeSageBl,
  },
  {
    id: '2026-10-02-liasse-facture-php',
    date: '2026-10-02',
    target: 'app',
    title: 'Factures PHP : liasse complète générée depuis Sage',
    items: [
      'Chaque facture PHP importée devient une liasse PDF : la facture (date et n° de BL, référence, désignation, quantité, prix, montant, total en lettres) suivie des bordereaux de cession de chaque BL en pièces justificatives.',
      'La facture indique le patient (matricule, secteur, assuré), la période du BPC et signale les BL hors période.',
      'Les cadres de signature reprennent les étapes du modèle « Circuit Facture PHP » et accueillent les cachets à taille réelle.',
      'Paramètres › Intégrations › Sage : « Aperçu PDF » génère la liasse d’une facture sans rien importer.',
    ],
    access: isAdmin,
  },
  {
    id: '2026-10-02-factures-php-tableau',
    date: '2026-10-02',
    target: '/sage-factures-php',
    title: 'Factures PHP (Sage) : nouveau tableau de bord',
    items: [
      'Les factures PHP arrêtées dans Sage, lues en direct : période (aujourd’hui, 7 jours, mois…), employés / familles, état Sage, contrôle du BPC (BL étalés sur plus de 3 jours) et état dans la GED (non importée, en signature, signée).',
      'Bouton « Liasse » : la facture et les bordereaux de cession de ses BL en PDF.',
      'Relevé journalier : aperçu et création du relevé des factures du jour, envoyé en signature au DG (modèle « Circuit Relevé Factures PHP »).',
      'Page accessible au superadmin et aux postes autorisés (comme « BL PHP en attente »).',
    ],
    access: (user) => user?.role === 'superadmin' || !!user?.canSeeSageBl,
  },
  {
    id: '2026-10-02-modeles-par-poste',
    date: '2026-10-02',
    target: '/workflow-templates',
    title: 'Modèles de workflow : étapes « par poste »',
    items: [
      'Une étape peut désormais désigner un poste (Service Facturation, DG, CCG…) : le document va à la personne qui occupe le poste, même si elle change. Si plusieurs personnes l’occupent, choisissez celle à solliciter en priorité.',
      'Nouveaux modèles « Circuit Facture PHP » (Service Facturation → DG → CCG) et « Circuit Relevé Factures PHP » (Service Facturation → DG), modifiables ici.',
      'Si un poste du circuit n’a pas de titulaire, le circuit n’est pas lancé et un message l’indique (pas de signatures décalées).',
    ],
    access: isAdmin,
  },
  {
    id: '2026-10-24-scanner-pdf',
    date: '2026-10-24',
    target: '/upload',
    title: 'Scanner un document depuis le téléphone',
    items: [
      'Nouveau bouton « Scanner un document » : prenez le document en photo, la feuille est recadrée et redressée automatiquement (coins ajustables à la main, avec une loupe).',
      'Choisissez un filtre pour mieux lire : Original, Amélioré (ombres effacées, par défaut), Gris ou Noir & blanc. Le dernier filtre choisi est retenu.',
      'Ajoutez autant de pages que nécessaire, réordonnez-les, puis « Créer le PDF » : le document est envoyé en PDF, plus en image.',
      'Une photo déjà choisie peut aussi être convertie en PDF avec le bouton « Convertir en PDF ».',
    ],
  },
  {
    id: '2026-10-24-pdf-android',
    date: '2026-10-24',
    target: 'app',
    title: 'PDF lisibles directement sur Android',
    items: [
      'Sur téléphone Android, les PDF s’affichent maintenant directement dans la visionneuse, sans devoir les télécharger : défilement des pages, numéro de page et zoom.',
      '« Créer un document lié » › « Joindre un fichier » : nouveau bouton « Scanner » pour photographier le document et le joindre en PDF (la liasse avec le document d’origine fonctionne alors aussi).',
    ],
  },
  {
    id: '2026-10-24-scanner-auto-ocr',
    date: '2026-10-24',
    target: '/upload',
    title: 'Scanner : photo automatique et texte reconnu',
    items: [
      'La caméra s’ouvre dans la GED et entoure la feuille en direct : la photo se prend toute seule dès que la feuille est stable (bouton « Auto / Manuel »), puis la caméra reste prête pour la page suivante.',
      'Chaque page est recadrée et filtrée automatiquement ; touchez la vignette pour revoir, modifier ou réordonner les pages.',
      'Le texte des pages est reconnu sur le téléphone (OCR) : le PDF devient sélectionnable, la recherche de la GED retrouve le document par son contenu, et le type (facture, devis, bon de commande…) est proposé automatiquement.',
    ],
  },
  {
    id: '2026-10-24-archives-recherche-texte',
    date: '2026-10-24',
    target: '/archives',
    title: 'Archives : recherche dans le texte des documents',
    items: [
      'La recherche des Archives trouve aussi les documents scannés par leur contenu (à partir de 3 lettres) : un extrait du texte s’affiche sous le titre, le mot cherché surligné.',
    ],
  },
  {
    id: '2026-10-24-signature-manuscrite',
    date: '2026-10-24',
    target: '/documents',
    title: 'Faire signer un document (patient, client…)',
    items: [
      'Nouveau bouton « Faire signer » dans la visionneuse (PDF et photos) : touchez l’endroit où signer — la GED trouve souvent seule la mention « Signature du patient ».',
      'Le patient signe au doigt ou au stylet sur tablette ou téléphone, ou avec une tablette graphique sur PC ; « Lu et approuvé », son nom, la date et l’heure sont ajoutés.',
      'Le document signé est verrouillé, l’original est conservé et l’intégrité du fichier est vérifiée à chaque ouverture.',
    ],
  },
  {
    id: '2026-10-24-signature-tablette-guichet',
    date: '2026-10-24',
    target: '/documents',
    title: 'Faire signer sur une tablette du guichet',
    items: [
      'Depuis le PC, « Faire signer » → « Sur une tablette » : le patient voit le document et signe sur la tablette, la signature arrive aussitôt sur le PC pour vérification.',
      'Tablette connectée en permanence : ouvrez /borne-signature sur la tablette, elle apparaît dans la liste et reçoit les documents directement.',
      'Sans borne : un QR code à scanner avec la tablette ou le téléphone du patient (lien valable 15 minutes, utilisable une seule fois).',
    ],
  },
  {
    id: '2026-10-24-miniatures-documents',
    date: '2026-10-24',
    target: '/documents',
    title: 'Aperçu des documents dans la vue Grille',
    items: [
      'Chaque carte affiche le haut de la première page du document (PDF, scans, photos) au lieu d’une icône : on reconnaît un document d’un coup d’œil.',
      'L’aperçu suit les nouvelles versions (cachets, signatures) ; les documents signés par le patient portent un badge « Signé ».',
    ],
  },
  {
    id: '2026-10-24-grille-cartes-rejet',
    date: '2026-10-24',
    target: '/documents',
    title: 'Vue Grille : cartes alignées, rejets résumés',
    items: [
      'Un document rejeté n’étire plus toute la ligne : la carte résume le rejet (qui, quand, motif) avec les boutons « Relancer » et « Détails » (progression complète et discussion).',
      'Les boutons « Voir » sont alignés en bas de toutes les cartes et l’avancement du circuit s’affiche en fine barre colorée.',
    ],
  },
  {
    id: '2026-10-24-pagination-taille-page',
    date: '2026-10-24',
    target: 'app',
    title: 'Listes : numéros de page et nombre d’éléments par page',
    items: [
      'Documents, Mes tâches, Employés, Journal d’audit, Patients et Consultations PHP, Factures et BL Sage : numéros de page cliquables (1 … 4 5 6 … 18) et choix du nombre d’éléments par page.',
      'Le nombre choisi est mémorisé pour chaque liste sur votre appareil.',
    ],
  },
  {
    id: '2026-10-24-ajout-pages-depuis-ged',
    date: '2026-10-24',
    target: '/documents',
    title: 'Ajouter des pages depuis un document de la GED',
    items: [
      'Dans la visionneuse, « Ajouter une page PDF » propose « Depuis la GED » ou « Depuis le PC ».',
      'Depuis la GED : documents validés par défaut, recherche par nom, filtre par type et par période, tri par date, nom ou type ; le document ajouté reste inchangé.',
    ],
  },
  {
    id: '2026-10-24-visibilite-creation',
    date: '2026-10-24',
    target: '/documents',
    title: 'Document personnel ou de service dès sa création',
    items: [
      'Bons de commande, bons de sortie, demandes de permission, demandes de travaux, formulaires, documents liés et upload : choix « Personnel » ou « Service » juste avant d’enregistrer.',
      'Le choix est pré-rempli selon le type de document et indique votre service ; « Service » rend le document visible par tous les membres de votre service.',
    ],
  },
  {
    id: '2026-10-24-demande-permission-refonte',
    date: '2026-10-24',
    target: '/documents',
    title: 'Demande de permission : formulaire réparé et PDF plus lisible',
    items: [
      'Le type de permission se choisit de nouveau (les cadres de signature le recouvraient) : boutons Personnel, Journée Directeur, Journée Major, Urgence, Exceptionnelle, puis l’événement pour une permission exceptionnelle.',
      'Formulaire plus clair : nom pré-rempli, périodes avec jours ouvrables et total, alerte si la durée dépasse celle prévue pour l’événement.',
      'PDF généré plus présentable : périodes en tableau avec total, motif mis en évidence, zone d’intérim et signatures alignées.',
    ],
  },
  {
    id: '2026-10-24-permission-interim-48h',
    date: '2026-10-24',
    target: '/documents',
    title: 'Demande de permission : intérim unique et délai de 48 h',
    items: [
      'L’intérim n’est saisi qu’une fois dans le circuit : dès qu’un validateur l’a renseigné, les suivants le voient sans pouvoir le modifier.',
      'Une permission se demande au moins 48 h à l’avance (première date possible : dans 2 jours). Les administrateurs peuvent déroger à ce délai pour les urgences.',
    ],
  },
  {
    id: '2026-10-25-parc-vehicules-ambulances',
    date: '2026-10-25',
    target: '/vehicules',
    title: 'Parc véhicules : contrôle des ambulances avant et après chaque mission',
    items: [
      'Nouveau menu Logistique › Parc véhicules : sur téléphone, le chauffeur contrôle le véhicule et l’infirmier le matériel médical, au départ et au retour, point par point (photo en cas d’anomalie), puis signe.',
      'Chaque contrôle est horodaté par le serveur, figé et archivé en fiche PDF liée à l’ordre de mission.',
      'Ordre de mission RO SAU : choix de l’ambulance dans une liste colorée selon son dernier contrôle (🟢 🟠 🟡 🔴) ; une ambulance en mission n’y apparaît pas ; une sortie urgente contrôlée avant l’OM y est rattachée.',
      'Tableau de bord pour la cheffe de pôle RO SAU et le chef sécurité logistique : contrôles faits ou manquants, anomalies, alertes, remise en service des ambulances.',
    ],
  },
  {
    id: '2026-10-25-parc-vehicules-acces-admin',
    date: '2026-10-25',
    target: '/vehicules',
    title: 'Parc véhicules : accès du superadmin et des administrateurs',
    items: [
      'Le superadmin voit et gère toujours le parc véhicules ; un interrupteur « Accès des administrateurs » lui permet de l’ouvrir (ou non) aux administrateurs.',
      'Les menus suivent les droits sans avoir à se déconnecter : un accès donné apparaît à la prochaine ouverture de la GED.',
    ],
  },
  {
    id: '2026-10-25-parc-vehicules-etape2',
    date: '2026-10-25',
    target: '/my-tasks',
    title: 'Ambulances : rappels à l’équipage et contrôles dans « Mes tâches »',
    items: [
      'Dès qu’un ordre de mission RO SAU est créé avec une ambulance, le chauffeur et l’infirmier sont prévenus (notification et e-mail), avec un rappel 30 min avant le départ et à l’heure du retour.',
      'Nouveau bloc « Contrôles d’ambulance à faire » dans Mes tâches et sur l’accueil : chacun ne voit que sa partie (véhicule pour le chauffeur, matériel pour l’infirmier) et l’ouvre d’un clic.',
      'Sur l’ordre de mission, un encadré « Ambulance » montre l’état des contrôles départ et retour (clic = fiche PDF).',
      'Ordre de mission rejeté ou supprimé : la mission de l’ambulance est annulée automatiquement.',
      'Demande de permission : le délai est désormais de 2 jours ouvrables (le week-end ne compte pas).',
    ],
  },
  {
    id: '2026-10-25-parc-vehicules-etape3',
    date: '2026-10-25',
    target: '/vehicules?tab=suivi',
    title: 'Parc véhicules : tout le parc, carnet de bord, carburant, entretien et échéances',
    items: [
      'Véhicules de service avec leur propre check-list ; chaque sortie (destination, km départ / retour) alimente le carnet de bord.',
      'Fiche véhicule : résumé, carnet de bord, pleins de carburant (consommation en L/100 km), entretiens et réparations (coût, garage, facture), échéances.',
      'Échéances (assurance, visite technique, vidange, extincteur…) par date et/ou kilométrage, avec alertes à J-30, J-7, 1 000 km et au dépassement ; « Fait » calcule la suivante.',
      'Onglet « Suivi du parc » pour le chef sécurité logistique : véhicules disponibles / en mission / indisponibles, échéances à traiter, coûts carburant et entretien.',
      'Les conducteurs peuvent ajouter un plein (avec photo du ticket) depuis l’écran de contrôle.',
    ],
  },
  {
    id: '2026-10-26-signature-tablette-graphique',
    date: '2026-10-26',
    target: '/documents',
    title: 'Faire signer sur une tablette graphique USB',
    items: [
      'Dans « Faire signer », nouveau choix « Tablette graphique (USB) » pour les tablettes sans écran branchées sur le PC (Huion HS64, Wacom…) : la zone de signature passe en plein écran pour que le patient dispose de toute la surface de la tablette.',
      'Le choix « Sur cet écran » reste disponible ; le dernier choix utilisé sur le poste est proposé en premier (touche Entrée).',
    ],
  },
  {
    id: '2026-10-26-inventaire-ambulance',
    date: '2026-10-26',
    target: '/vehicules',
    title: 'Ambulances : inventaire hebdomadaire (fiche RO SAU)',
    items: [
      'Le lundi, le mercredi et le vendredi, l’infirmier fait l’inventaire de chaque ambulance depuis « Parc véhicules » (ou « Mes tâches ») : matériel médical, consommables, médicaments et DSA, avec la quantité requise de la fiche RO SAU.',
      'Pour chaque article : quantité présente (bouton « Tout est complet » par section), case « Périme ce mois » pour les médicaments, pression des bouteilles d’O2 en bar ; l’inventaire est signé et sa fiche PDF archivée dans la GED.',
      'Les manques et les péremptions forment une liste « À réapprovisionner » envoyée à la cheffe de pôle ; O2 sous 50 bar, DSA ou électrodes en défaut rendent l’ambulance indisponible.',
      'Nouvel onglet « Inventaires » : la semaine en grille, une colonne par ambulance, comme la fiche papier ; alerte à 14 h si l’inventaire du jour n’est pas fait.',
      'Le contrôle avant / après mission est raccourci aux points vitaux (O2 en bar, ballon, aspirateur, DSA, brancard). La fiche d’inventaire se modifie dans l’onglet « Check-list ».',
    ],
  },
  {
    id: '2026-10-26-securite-sessions',
    date: '2026-10-26',
    target: 'app',
    title: 'Sécurité des sessions renforcée',
    items: [
      'Désactiver un compte ou réinitialiser son mot de passe ferme immédiatement toutes ses sessions, y compris sur les autres appareils et en temps réel.',
      'Changer son propre mot de passe garde la session en cours et déconnecte les autres appareils.',
      'La double authentification ne peut plus être contournée : sans le code, aucune page n’est accessible.',
    ],
    access: isAdmin,
  },
  {
    id: '2026-10-26-securite-roles',
    date: '2026-10-26',
    target: 'app',
    title: 'Rôle super-administrateur protégé',
    items: [
      'Seul un super-administrateur peut attribuer le rôle « Super Administrateur », ou modifier, réinitialiser ou supprimer un tel compte.',
    ],
    access: isAdmin,
  },
  {
    id: '2026-10-26-securite-depots',
    date: '2026-10-26',
    target: 'app',
    title: 'Dépôts de fichiers mieux contrôlés',
    items: [
      'Seuls les PDF, documents Word et images JPEG ou PNG peuvent être déposés comme documents ; l’extension doit correspondre au contenu annoncé.',
      'Signatures et cachets : images PNG ou JPEG uniquement. Logos : PNG, JPEG, WebP ou SVG.',
    ],
    access: isAdmin,
  },
  {
    id: '2026-10-26-securite-acces-fichiers',
    date: '2026-10-26',
    target: 'app',
    title: 'Fichiers accessibles seulement aux personnes connectées',
    items: [
      'Les fichiers des documents, signatures et pièces jointes ne s’ouvrent plus sans être connecté, et le fichier d’un document seulement pour qui a le droit de le lire.',
      'Un lien de fichier copié ne fonctionne donc plus une fois déconnecté ni pour une personne sans accès au document.',
    ],
    access: isAdmin,
  },
  {
    id: '2026-10-26-securite-bornes',
    date: '2026-10-26',
    target: 'app',
    title: 'Tablettes de signature : comptes autorisés',
    items: [
      'Seuls les comptes de guichet (caisse, accueil PHP, accueil), les administrateurs et les titulaires du poste « Borne de signature » (code borne_signature) peuvent servir de tablette de signature. Un autre compte voit « Tablette non autorisée ».',
    ],
    access: isAdmin,
  },
  {
    id: '2026-10-26-securite-discussion',
    date: '2026-10-26',
    target: 'app',
    title: 'Discussion : conversations mieux protégées',
    items: [
      'Seuls les membres d’une conversation (ou un administrateur) peuvent y ajouter un collègue ; une conversation privée à deux reste à deux.',
      'La discussion d’un document n’est accessible qu’aux personnes autorisées à lire ce document.',
      'Une personne retirée d’une conversation cesse immédiatement de recevoir ses messages.',
    ],
  },
  {
    id: '2026-10-26-securite-ajout-pages',
    date: '2026-10-26',
    target: 'app',
    title: 'Ajout de pages réservé au propriétaire',
    items: [
      'Ajouter des pages à un document modifie son fichier : seuls son propriétaire et les administrateurs peuvent le faire. Les autres personnes peuvent toujours le consulter.',
      'Un document approuvé est verrouillé, comme un document signé.',
    ],
  },
  {
    id: '2026-10-27-rester-connecte',
    date: '2026-10-27',
    target: 'app',
    title: 'Moins de mots de passe à taper',
    items: [
      'Sur votre téléphone ou votre poste personnel, cochez « Rester connecté sur cet appareil » à la connexion : la GED ne vous déconnecte plus après une pause (reconnexion tous les 30 jours). Ne la cochez pas sur un ordinateur partagé.',
      'Votre navigateur peut désormais retenir votre identifiant et votre mot de passe GED.',
      'Paramètres › Sécurité › « Déconnecter mes autres appareils » : en cas de téléphone perdu ou de poste resté ouvert.',
    ],
  },
  {
    id: '2026-10-27-appareils-connectes',
    date: '2026-10-27',
    target: 'app',
    title: 'Vos appareils connectés',
    items: [
      'Paramètres › Sécurité › Appareils connectés : la liste des téléphones et ordinateurs où votre compte est ouvert, avec le navigateur, l’adresse IP, la date de connexion et la dernière activité.',
      'Un appareil que vous ne reconnaissez pas ? Cliquez sur « Déconnecter » à côté : il est déconnecté immédiatement. Pensez aussi à changer votre mot de passe.',
    ],
  },
  {
    id: '2026-10-27-transmettre-tout-document',
    date: '2026-10-27',
    target: 'app',
    title: 'Transmettre un document non signé',
    items: [
      'Le bouton « Transmettre » est maintenant proposé sur tous les documents, signés ou non : par exemple une facture déposée à votre niveau, à transmettre à la comptabilité.',
      'Un document reçu peut lui aussi être transmis à quelqu’un d’autre.',
    ],
  },
  {
    id: '2026-10-27-connexion-sans-mot-de-passe',
    date: '2026-10-27',
    target: 'app',
    title: 'Connexion avec l’empreinte ou le code PIN',
    items: [
      'Facultatif : dans Paramètres › Sécurité, cliquez sur « Activer sur cet appareil » pour vous connecter ensuite avec l’empreinte, Face ID ou le code PIN de votre téléphone ou de Windows, sans taper de mot de passe.',
      'À activer sur chaque appareil. Votre mot de passe reste toujours valable.',
      'Fonctionne en ouvrant la GED par son nom : https://ged.hsjmcam.net',
    ],
  },
  {
    id: '2026-10-27-bon-prise-en-charge',
    date: '2026-10-27',
    target: 'app',
    title: 'Bon de prise en charge du personnel',
    // Concerne le médecin du travail, les RH, le DG et l'accueil
    access: (user) => isAdmin(user) || ['director', 'agent_accueil_php', 'agent_accueil_normal'].includes(user?.role) || (user?.postes || []).some(p => ['medecin_travail', 'rh', 'dg'].includes(p)),
    items: [
      'Nouveau formulaire « Bon de prise en charge » (format A5) : le médecin du travail le crée et le vise, les RH complètent l’assuré, le DG le vise.',
      'Une fois visé par le DG, le bon arrive automatiquement à l’accueil (Documents › Reçus) pour l’ouverture du BPC dans Sage.',
    ],
  },
  {
    id: '2026-10-28-acces-plannings',
    date: '2026-10-28',
    target: 'app',
    title: 'Plannings ouverts aux RH',
    access: (user) => (user?.postes || []).some(p => ['planning', 'rh'].includes(p)),
    items: [
      'Le menu Ressources humaines › Plannings vous est désormais accessible : vous pouvez créer et remplir les plannings de travail et de garde, puis les soumettre à la validation de la direction.',
    ],
  },
  {
    id: '2026-10-28-documents-mode-nuit',
    date: '2026-10-28',
    target: 'app',
    title: 'Documents lisibles en mode nuit',
    items: [
      'En mode nuit, les formulaires (Bon de sortie, Demande de besoin, Pièce de caisse…) gardent une écriture noire sur la feuille blanche, à l’écran comme dans le PDF généré.',
    ],
  },
  {
    id: '2026-12-decor-fetes',
    date: '2026-10-29',
    target: 'app',
    title: 'La GED se met à l’heure des fêtes 🎄',
    // Ne s'affiche qu'à partir du 1er décembre (pas de surprise gâchée)
    access: () => isFestiveSeason(),
    items: [
      'Jusqu’au 6 janvier, la GED se pare de neige, d’une guirlande et d’un bonnet de Noël. Joyeuses fêtes !',
      'Pour retirer le décor : Paramètres › Profil › Décor de fêtes.',
    ],
  },
  {
    id: '2026-10-29-programme-operatoire',
    date: '2026-10-29',
    target: 'app',
    title: 'Programme opératoire commun à tous les services',
    access: (user) => isAdmin(user) || ['director', 'dds', 'medical_chief'].includes(user?.role)
      || (user?.postes || []).some(p => ['bloc_saisie', 'bloc_responsable'].includes(p)),
    items: [
      'Nouveau menu Bloc opératoire › Programme opératoire : chaque service (Chirurgie, Gynécologie, Pédiatrie, Médecine…) ajoute ses interventions de la semaine en même temps que les autres, et chacun voit les lignes des autres services apparaître en direct.',
      'La saisie de la semaine suivante est ouverte jusqu\'au vendredi 12 h ; ensuite, seul le responsable du programme peut encore corriger.',
      'Le responsable clôture la semaine puis génère un seul document, avec une colonne « Service », envoyé automatiquement au Médecin Chef puis au DG pour signature.',
    ],
  },
  {
    id: '2026-10-29-alerte-disque-en-direct',
    date: '2026-10-29',
    target: 'app',
    title: 'Alerte « Sauvegarde du serveur » à jour en direct',
    access: isAdmin,
    items: [
      'L\'occupation du disque est maintenant mesurée en direct : l\'alerte de l\'Accueil disparaît dès que le disque repasse sous le seuil et apparaît en cours de journée s\'il le dépasse, sans attendre la sauvegarde de minuit.',
      'Seuils par défaut : avertissement à 80 %, critique à 90 % ; alerte aussi si la dernière sauvegarde a échoué ou date de plus de 26 h.',
    ],
  },
  {
    id: '2026-10-29-etat-serveur',
    date: '2026-10-29',
    target: 'app',
    title: 'Panneau « État du serveur »',
    access: (user) => user?.role === 'superadmin',
    items: [
      'Nouveau menu Super Admin › État du serveur : disque en direct, dernière sauvegarde (résultat, durée, journal), points de restauration, taille des documents, de la base et des sauvegardes.',
      'Tendance sur 30 jours et estimation du nombre de mois avant que le disque soit plein, à partir d\'une mesure par jour.',
      'E-mail aux superadministrateurs au passage des seuils et en cas d\'échec de sauvegarde, puis un e-mail de retour à la normale (jamais en boucle). Seuils réglables depuis le panneau.',
    ],
  },
  {
    id: '2026-10-29-certificat-aptitude-a5',
    date: '2026-10-29',
    target: 'app',
    title: 'Certificat d\'aptitude au format du Bon de prise en charge',
    items: [
      'Le certificat d\'aptitude sort maintenant en A5 paysage, avec la même présentation que le Bon de prise en charge : texte net, rubriques remplies en bleu sur pointillés, cadre « Le Médecin » pour la signature et le cachet.',
      'L\'écran de saisie montre un aperçu identique au document produit.',
    ],
  },
];

export default RELEASE_NOTES;
