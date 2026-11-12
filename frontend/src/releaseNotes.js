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
import { phpAccess } from './utils/phpAccess';
import { isAndroidApp, partageDisponible as partageDisponibleNote } from './utils/androidApp';

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
  {
    id: '2026-10-29-qr-adresse-ged',
    date: '2026-10-29',
    target: 'app',
    title: 'QR code des documents signés : bonne adresse',
    items: [
      'Le QR code posé à la fin du circuit de signature renvoie maintenant vers ged.hsjmcam.net (il renvoyait par erreur vers « localhost »). Les documents déjà signés ont reçu un QR corrigé, avec le même code de vérification.',
      'Nouveau : « Vérifier un document signé » depuis l\'écran de connexion — saisissez le code de 16 caractères imprimé sous le QR (utile pour les copies papier déjà imprimées).',
    ],
  },
  {
    id: '2026-10-30-poste-finances',
    date: '2026-10-30',
    target: 'app',
    title: 'Poste « Finances » : accès aux factures et BL PHP',
    access: isAdmin,
    items: [
      'Nouveau poste « Finances » dans Admin › Postes & Fonctions : il donne accès aux pages Finances › Factures PHP (Sage) et BL PHP en attente (consultation et modification), sans rendre la personne signataire des pièces de caisse.',
      'L\'entrée « Factures PHP (Sage) » n\'apparaît plus qu\'aux personnes qui peuvent réellement l\'ouvrir.',
    ],
  },
  {
    id: '2026-10-30-php-type-visite-import',
    date: '2026-10-30',
    target: 'app',
    title: 'Module PHP : type de visite et import du fichier Excel',
    access: (user) => ['admin', 'superadmin', 'agent_accueil_php'].includes(user?.role),
    items: [
      'Chaque consultation a désormais un type de visite, comme dans l\'Excel du Point Focal : CS (consultation), RDV (rendez-vous de suivi) ou AUTRE (pharmacie, laboratoire, bilans…). Il se choisit à l\'enregistrement et sert de filtre dans la liste.',
      'La liste des consultations affiche le n° d\'ordre du jour et les heures d\'arrivée et de prise en charge.',
      'Nouveau bouton « Importer l\'Excel » dans le module PHP : analyse du fichier, puis import des patients, consultations, hospitalisations, opérations et repos. Réimportable à chaque mise à jour du fichier, sans doublon.',
    ],
  },
  {
    id: '2026-10-30-php-sans-clignotement',
    date: '2026-10-30',
    target: 'app',
    title: 'Module PHP : plus d\'actualisation visible toutes les 30 secondes',
    access: (user) => ['admin', 'superadmin', 'agent_accueil_php'].includes(user?.role),
    items: [
      'L\'accueil du module PHP se met à jour en arrière-plan : les chiffres changent sans que la page clignote comme si elle avait été actualisée.',
    ],
  },
  {
    id: '2026-11-02-php-stats-excel',
    date: '2026-11-02',
    target: 'app',
    title: 'Statistiques PHP : export Excel identique à l\'écran',
    access: (user) => ['admin', 'superadmin', 'agent_accueil_php'].includes(user?.role),
    items: [
      'Le bouton « Exporter en Excel » remplace l\'export CSV et fonctionne sur tous les onglets (rapport journalier, synthèse mensuelle, trimestriel, hospitalisations, repos maladie, pathologies).',
      'Le fichier reprend la présentation de l\'écran : couleurs des semaines et des colonnes D / R / H, cellules fusionnées, ligne TOTAL, chiffres clés en tête et légende, en-têtes figés au défilement.',
    ],
  },
  {
    id: '2026-11-02-postes-module-php',
    date: '2026-11-02',
    target: 'app',
    title: 'Module PHP : accès par poste',
    access: (user) => ['admin', 'superadmin'].includes(user?.role),
    items: [
      'Deux nouveaux postes dans Admin › Postes & Fonctions : « Module PHP » (utilisation complète, comme le Point Focal) et « Module PHP — consultation » (listes, statistiques et exports, sans saisie).',
      'Les données du module PHP (patients, diagnostics, statistiques) ne sont plus lisibles que par les administrateurs, le Point Focal PHP et les titulaires de ces postes : le contrôle est fait par le serveur.',
    ],
  },
  {
    id: '2026-11-02-php-recherche-matricule',
    date: '2026-11-02',
    target: 'app',
    title: 'PHP : recherche du patient par matricule',
    access: (user) => phpAccess(user).write,
    items: [
      'Dans « Enregistrer un patient PHP », un bouton « Rechercher » (ou la touche Entrée) retrouve le patient à partir du matricule et affiche ses informations : genre, date de naissance, téléphone, secteur et infirmerie.',
      'Un patient déjà enregistré n\'est plus ressaisi : vous le mettez directement en consultation ou lui faites un nouveau bon.',
    ],
  },
  {
    id: '2026-11-03-chat-pieces-jointes',
    date: '2026-11-03',
    target: '/chat',
    title: 'Discussion : pièces jointes',
    items: [
      'Le trombone 📎 à gauche de la zone de saisie joint un fichier de l\'ordinateur ou du téléphone (PDF, Word, Excel, PowerPoint, images, ZIP…) ou un document de la GED. Vous pouvez aussi glisser un fichier sur la conversation ou coller une capture d\'écran.',
      'Les images s\'affichent directement dans le message ; les autres fichiers s\'ouvrent ou se téléchargent d\'un clic. Seuls les membres de la conversation y ont accès.',
      'Un document de la GED partagé ne s\'ouvre que pour les membres qui ont déjà le droit de le lire : les autres voient « accès réservé » et peuvent demander à son auteur de le leur transmettre.',
    ],
  },
  {
    id: '2026-11-03-chat-bulles',
    date: '2026-11-03',
    target: '/chat',
    title: 'Discussion : affichage façon messagerie',
    items: [
      'Vos messages s\'affichent à droite dans une bulle bleue, ceux de vos interlocuteurs à gauche, avec l\'heure dans la bulle — comme sur WhatsApp ou Telegram. Dans un canal, le nom et l\'avatar de chacun restent affichés.',
      'Sur téléphone, un appui long sur un message permet de réagir, copier le texte, modifier ou supprimer.',
      'Les réactions restent affichées quand on rouvre une conversation.',
    ],
  },
  {
    id: '2026-11-03-chat-mention-document',
    date: '2026-11-03',
    target: 'app',
    title: 'Discussion d\'un document : inviter un collègue avec @',
    items: [
      'Sur un document ouvert, dans la discussion (bouton rond en bas à droite), tapez @ puis le nom d\'un collègue : il rejoint la discussion et, s\'il ne pouvait pas encore lire le document, il le reçoit (onglet « Reçus » et notification), comme avec « Transmettre ».',
      'La liste signale « recevra le document » pour les personnes qui n\'y ont pas encore accès. Le panneau a aussi les bulles, les réactions et les pièces jointes de la page Discussion.',
    ],
  },
  {
    id: '2026-11-03-chat-document-bandeau',
    date: '2026-11-03',
    target: '/chat',
    title: 'Discussion d\'un document : le document épinglé et son suivi',
    items: [
      'En haut de la discussion d\'un document : son aperçu, son statut et l\'étape de validation en cours (« au tour de… », « c\'est à vous de valider »), avec un bouton « Ouvrir le document » pour le lire, le signer ou le valider.',
      'La discussion raconte la vie du document : soumission, validations, signatures, rejet, approbation finale et transmissions s\'y affichent automatiquement.',
    ],
  },
  {
    id: '2026-11-03-chat-lu-notifications',
    date: '2026-11-03',
    target: 'app',
    title: 'Discussion : accusés de lecture et notifications',
    items: [
      'Sous vos messages : ✓ envoyé, ✓✓ bleu lu — et « Vu à 14:52 » (ou « Vu par… » dans un canal) sous votre dernier message.',
      'Un nouveau message vous prévient : une alerte en haut de l\'écran si la GED est ouverte (un clic ouvre la conversation), une notification sur le téléphone ou l\'ordinateur sinon.',
      'Trop de messages dans un canal ? La cloche en haut de la conversation la met en sourdine.',
    ],
  },
  {
    id: '2026-11-03-chat-repondre-rechercher',
    date: '2026-11-03',
    target: '/chat',
    title: 'Discussion : répondre à un message et rechercher',
    items: [
      'Répondre à un message précis : bouton ↩ au survol, ou glisser le message vers la droite sur téléphone. Le message cité s\'affiche dans la réponse ; un clic dessus remonte jusqu\'à lui.',
      'La barre « Rechercher » de la Discussion cherche aussi dans les messages de toutes vos conversations : un clic sur un résultat ouvre la conversation à cet endroit.',
    ],
  },
  {
    id: '2026-11-03-php-tableau-jour-indicateurs',
    date: '2026-11-03',
    target: '/php/statistiques',
    title: 'Statistiques PHP : tableau du jour et indicateurs',
    access: (user) => phpAccess(user).read,
    items: [
      '« Tableau du jour » : pour une date, les visites par infirmerie, type (CS, RDV, AUTRE) et service, avec les totaux — comme les tableaux croisés de l\'Excel du Point Focal. Les flèches passent d\'un jour saisi à l\'autre.',
      '« Indicateurs » : paludisme et IST par secteur, visites par spécialité, évacuations par secteur et repos par spécialité, sur la période choisie. Les mots-clés des indicateurs (PALU, IST…) se modifient avec « Modifier les indicateurs ».',
      'Chaque visite garde désormais l\'infirmerie et le secteur du jour où elle a eu lieu, comme sur la ligne de l\'Excel. Export Excel identique à l\'écran, une feuille par tableau.',
    ],
  },
  {
    id: '2026-11-03-php-registre-pharmacie',
    date: '2026-11-03',
    target: '/php',
    title: 'Module PHP : registre de pharmacie',
    access: (user) => phpAccess(user).read,
    items: [
      'Nouveau « Registre de pharmacie » (lien « Pharmacie » de l\'accueil du module PHP) : les produits prescrits à chaque patient, par source (pharmacie HSJM, hôpital extérieur, médecin du travail), avec la quantité, le nombre servi et le reste à servir — comme la feuille PHARMACIE de l\'Excel.',
      '« Nouvelle ordonnance » : le patient est retrouvé par son matricule et rattaché à sa consultation du jour ; les produits déjà saisis sont proposés pendant la frappe. « Servir » complète une ligne restée à servir.',
      'Onglet « Consommation par produit » sur la période choisie, export Excel identique à l\'écran. L\'import du fichier Excel reprend aussi la feuille PHARMACIE.',
    ],
  },
  {
    id: '2026-11-03-php-activite-infirmeries',
    date: '2026-11-03',
    target: '/php/statistiques',
    title: 'Statistiques PHP : activité des infirmeries',
    access: (user) => phpAccess(user).read,
    items: [
      'Nouvel onglet « Activité des infirmeries » : pour chaque infirmerie et chaque mois, les consultations et rendez-vous (généraliste, spécialiste de l\'hôpital, spécialiste externe), le labo, la pharmacie et les présentations de résultats — comme le « Tableau PHP 2026 » du Point Focal.',
      'Présentation par semaine ou par jour ; tout se calcule à partir des visites enregistrées, rien à recompter à la main.',
      '« Exporter en Excel » télécharge le tableau du mois, par jour et par semaine, avec les totaux.',
    ],
  },
  {
    id: '2026-11-03-ambulance-inventaire-quotidien',
    date: '2026-11-03',
    target: '/vehicules',
    title: 'Ambulances : inventaire tous les jours',
    access: (user) => !!user?.fleet?.hasModule,
    items: [
      'L\'inventaire du matériel des ambulances est ouvert tous les jours (et plus seulement lundi, mercredi et vendredi), comme le demande le RO SAU.',
      'Une fois l\'inventaire fait, la fenêtre de l\'ambulance l\'indique : « Inventaire du jour fait par … », et le jour passe en vert.',
      'Les fiches d\'inventaire et de contrôle (véhicule, matériel médical) sont transmises au Chef de pôle RO SAU : il les retrouve dans Documents › Reçus.',
    ],
  },
  {
    id: '2026-11-04-php-labo-pharmacie-antidate',
    date: '2026-11-04',
    target: '/php',
    title: 'Consultations PHP : Laboratoire, Pharmacie et date antérieure',
    access: (user) => phpAccess(user).write,
    items: [
      'Laboratoire et Pharmacie s\'ajoutent à la liste des services à l\'enregistrement d\'une arrivée.',
      'Nouveau champ « Date de la consultation » : aujourd\'hui par défaut, il permet de rattraper une consultation d\'un jour passé (période où l\'Excel ne fonctionnait pas). Le n° d\'ordre suit ceux de ce jour-là.',
      'Pour la retrouver et la clôturer, choisissez sa date dans le filtre de la liste des consultations ; une consultation antidatée non clôturée est close automatiquement à minuit (Retour au travail).',
    ],
  },
  {
    id: '2026-11-05-pc-circuit-pharmacie',
    date: '2026-11-05',
    target: '/documents',
    title: 'Pièce de caisse : circuit de la Pharmacie',
    access: (user) => user?.role === 'caissier' || (user?.postes || []).includes('comptable'),
    items: [
      'Les pièces de caisse déposées par le personnel de la Pharmacie suivent leur propre circuit : la Pharmacienne qui la dépose, puis la Caissière, puis la Comptable — chacune signe ; elles ne passent pas chez le DG.',
      'Dans ce circuit, la Caissière signe la pièce (pas de bouton « Payer ») ; les autres pièces de caisse ne changent pas.',
    ],
  },
  {
    id: '2026-11-05-finances-patients-externes',
    date: '2026-11-05',
    target: '/sage-factures-php',
    title: 'Finances : patients externes et hospitalisés',
    items: [
      'BL PHP et Factures PHP : nouveau filtre « Patients externes / Patients hospitalisés ».',
      'Externe = consultation, laboratoire, imagerie, pharmacie, sans hospitalisation (même en gynécologie, pédiatrie ou chirurgie). Hospitalisé = au moins une chambre, un acte du bloc, une anesthésie ou un accouchement, d\'après les familles d\'articles Sage.',
      'Les totaux par catégorie s\'affichent en haut de page, le badge « Hospitalisé » sur chaque ligne, et la colonne « Parcours » dans l\'export.',
    ],
  },
  {
    id: '2026-11-05-finances-bpc-complet',
    date: '2026-11-05',
    target: '/sage-bl-php',
    title: 'BL PHP : BPC facturés en plusieurs fois',
    items: [
      'En dépliant un BPC en attente, les BL de la même période déjà facturés s\'affichent avec leur numéro de facture : on voit tout le BPC, pas seulement ce qui reste.',
      'Factures PHP : une facture dont le BPC a encore des BL non facturés est signalée en rouge (« + N BL du BPC non facturé(s) »), avec la case et le filtre « BL du BPC non facturés ».',
      'Onglet « Contrôle des BPC » : liste des BPC facturés en plusieurs factures, à vérifier.',
    ],
  },
  {
    id: '2026-11-05-caissiere-signature',
    date: '2026-11-05',
    target: 'app',
    title: 'Caissière : signature et cachet',
    access: (user) => user?.role === 'caissier',
    items: [
      'Dans « Mes tâches », le bouton « Approuver, Signer et Cacheter » est désormais proposé à la caissière (avec sa signature et son cachet enregistrés), comme aux autres validateurs.',
      'La caissière peut aussi être choisie comme validatrice lors de la soumission d\'un document.',
    ],
  },
  {
    id: '2026-11-06-php-penja-est-php-bas',
    date: '2026-11-06',
    target: '/php',
    title: 'PHP : PENJA EST rattaché à PHP Bas et secteurs en double regroupés',
    access: (user) => phpAccess(user).read,
    items: [
      'Le secteur PENJA EST dépend désormais de l\'Infirmerie PHP Bas (et non plus de Nyombe). Ses patients et toutes ses consultations, y compris passées, comptent dans les statistiques de PHP Bas.',
      '« P EST » et « P OUEST » étaient les mêmes secteurs saisis en abrégé : ils sont fusionnés dans PENJA EST et PENJA OUEST (qui reste rattaché à Nyombe).',
      'Secteurs en double à cause d\'une faute de frappe, regroupés : LOUM1 et IOUM1 → LOUM 1, LOUM2 et LOUN2 → LOUM 2, BOUBOPU → BOUBOU, NJOMBE → NYOMBE.',
    ],
  },
  {
    id: '2026-11-09-apk-choix-serveur',
    date: '2026-11-09',
    target: 'app',
    title: 'Application Android : choix du serveur',
    access: () => isAndroidApp(),
    items: [
      "Au premier lancement, l'application demande l'adresse du serveur GED (production ou développement). Elle s'en souvient ensuite.",
      "Pour changer de serveur : lien « Changer de serveur » sous le formulaire de connexion, ou icône serveur à côté du bouton de déconnexion.",
    ],
  },
  {
    id: '2026-11-09-visionneuse-mobile',
    date: '2026-11-09',
    target: 'app',
    title: 'Visionneuse de documents sur téléphone',
    items: [
      "Sur téléphone, les boutons de la visionneuse (Télécharger, Modifier, Transmettre, Fermer…) passent sous le titre du document : ils ne sont plus masqués et se touchent facilement.",
    ],
  },
  {
    id: '2026-11-09-apk-telechargements',
    date: '2026-11-09',
    target: 'app',
    title: 'Application Android : téléchargements',
    access: () => isAndroidApp(),
    items: [
      "Les fichiers téléchargés (documents, exports Excel, PDF, pièces jointes) sont enregistrés dans le dossier Téléchargements du téléphone, puis s'ouvrent automatiquement.",
    ],
  },
  {
    id: '2026-11-09-apk-notifications',
    date: '2026-11-09',
    target: 'app',
    title: 'Application Android : notifications',
    access: () => isAndroidApp(),
    items: [
      "Le téléphone reçoit les notifications de la GED même application fermée : tâche à valider, message du chat, document reçu…",
      "Toucher la notification ouvre directement la page concernée.",
      "À la déconnexion, le téléphone ne reçoit plus les notifications de votre compte.",
    ],
  },
  {
    id: '2026-11-09-apk-verrouillage',
    date: '2026-11-09',
    target: 'app',
    title: 'Application Android : verrouillage par empreinte',
    access: () => isAndroidApp(),
    items: [
      "À l'ouverture de l'application, et quand vous y revenez après 1 minute, le téléphone demande votre empreinte, votre visage ou son code avant d'afficher la GED.",
      "Réglage dans Paramètres › Sécurité : activer ou non, et choisir le délai (immédiatement, 1 min, 5 min…).",
    ],
  },
  {
    id: '2026-11-09-parametres-mobile',
    date: '2026-11-09',
    target: 'app',
    title: 'Paramètres sur téléphone',
    access: () => typeof window !== 'undefined' && window.matchMedia?.('(max-width: 860px)').matches,
    items: [
      "Sur téléphone, la page Paramètres affiche d'abord la liste des rubriques (Profil, Sécurité, Notifications…). Touchez une rubrique pour ouvrir ses options ; « ‹ Paramètres » ou le bouton retour du téléphone ramène à la liste.",
    ],
  },
  {
    id: '2026-11-09-apk-barres-couleur',
    date: '2026-11-09',
    target: 'app',
    title: 'Application Android : barres aux couleurs de la GED',
    access: () => isAndroidApp(),
    items: [
      "La barre de notification (en haut) et la barre de navigation (en bas) du téléphone prennent la couleur de l'interface : claires en thème clair, sombres en thème sombre, assombries quand un menu est ouvert.",
    ],
  },
  {
    id: '2026-11-09-partager-document',
    date: '2026-11-09',
    target: 'app',
    title: 'Partager un document',
    access: () => partageDisponibleNote(),
    items: [
      "Dans la visionneuse, le bouton « Partager » envoie le document par WhatsApp, e-mail, Bluetooth… directement depuis le téléphone.",
      "Pour l'envoyer à un collègue dans la GED, utilisez toujours « Transmettre ».",
    ],
  },
  {
    id: '2026-11-09-application-android-telechargement',
    date: '2026-11-09',
    target: 'app',
    title: 'Application Android à télécharger',
    items: [
      "La GED existe en application Android : menu Système › Application Android (ou Plus › Application Android sur téléphone). Scannez le QR code avec le téléphone, ou touchez « Télécharger ».",
      "L'application signale elle-même les nouvelles versions et propose de se mettre à jour.",
    ],
  },
  {
    id: '2026-11-09-ambulances-manques-rearmement',
    date: '2026-11-09',
    target: '/vehicules',
    title: 'Ambulances : suivi des manques jusqu’au réarmement',
    items: [
      'Nouvel onglet « Manques » : un manque relevé à l’inventaire reste affiché sur l’ambulance jusqu’à ce qu’il soit réarmé (À commander → Commandé → Réarmé).',
      'L’infirmier du matin voit, sur chaque ligne de l’inventaire, ce qui manquait déjà et où en est la commande (« commandé le …, attend en pharmacie »).',
      '« Réarmer » : cochez l’article remis dans l’ambulance et la quantité ; un article remis en partie reste ouvert pour le reste.',
      'Responsables : cochez les articles et « Marquer commandé » (n° du bon papier facultatif). Un manque déjà commandé ne repart pas dans une nouvelle alerte : seules les nouveautés sont signalées.',
      'Ordre de mission RO SAU : l’ambulance affiche « N article(s) non réarmé(s) », en rouge si un article critique manque (alerte, pas un blocage).',
    ],
  },
  {
    id: '2026-11-10-ambulances-prise-de-poste-oxygene',
    date: '2026-11-10',
    target: '/vehicules',
    title: 'Ambulances : prise de poste et oxygène',
    items: [
      'Nouvel onglet « Prise de poste » : chaque matin, une seule fiche pour les ambulances — matériel vital de l’une puis de l’autre, bouteilles d’oxygène à bord, et bouteilles pleines / vides en réserve. Fiche PDF signée, transmise au Chef de pôle RO SAU.',
      'Oxygène : 🟠 « passer commande » quand il ne reste plus aucune bouteille pleine en réserve ; 🔴 urgent si, en plus, une ambulance n’a plus ses 2 bouteilles. Les responsables sont prévenus quand le niveau se dégrade.',
      'Les contrôles de départ et de retour à chaque mission sont supprimés pour les ambulances (faits à la prise de poste). Un ordre de mission classé au retour enregistre la sortie.',
      'Inventaire : « Rien n’a changé » confirme en un geste les quantités de la veille quand l’ambulance n’est pas sortie et que rien n’a été réarmé. Après une sortie — même si l’OM n’est classé qu’après coup — le recomptage complet est redemandé.',
    ],
  },
  {
    id: '2026-11-10-prise-de-poste-chauffeur',
    date: '2026-11-10',
    target: '/vehicules',
    title: 'Prise de poste : une partie pour le chauffeur',
    items: [
      'La prise de poste des ambulances a deux parties : le chauffeur contrôle le véhicule (carburant, freins, pneus, gyrophare…) et note le kilométrage ; l’infirmier contrôle le matériel médical et l’oxygène.',
      'Chacun ne voit que sa partie, selon sa fonction dans le service (Chauffeur ou soignant). Le chauffeur n’a pas l’inventaire du matériel médical à faire.',
    ],
  },
  {
    id: '2026-11-10-ambulances-commande-soignants',
    date: '2026-11-10',
    target: '/vehicules',
    title: 'Ambulances : commande par le personnel soignant',
    items: [
      'Onglet « Manques » : le personnel soignant peut maintenant marquer lui-même un article « Commandé » (et annuler une commande notée par erreur), comme la responsable.',
      'Inventaire : « Poubelle » retirée et « Masque FFP1 » devient « Masque ». Prise de poste : « Sac d’urgence complet » retiré.',
    ],
  },
  {
    id: '2026-11-10-facturation-assistee-bpc',
    date: '2026-11-10',
    target: '/sage-bl-php',
    title: 'Facturation assistée des BPC',
    items: [
      'Dans un BPC, « Préparer la facture » : cochez les BL (tous, normalement). La GED affiche les numéros exacts à transformer en une seule facture dans Sage.',
      'Après la transformation dans Sage, « Vérifier dans Sage » : la GED retrouve la facture et signale tout BL oublié, en trop, ou un BPC facturé en plusieurs fois.',
      'Une fois la facture complète, « Envoyer en signature » lance la liasse et le circuit de signature. La GED n’écrit jamais dans Sage.',
    ],
    access: (user) => !!user?.canSeeSageBl || user?.role === 'superadmin',
  },
  {
    id: '2026-11-10-integration-dme',
    date: '2026-11-10',
    target: 'app',
    title: 'Liaison avec le DME',
    access: (user) => user?.role === 'superadmin',
    items: [
      'Paramètres › Intégrations : nouvelle connexion au DME (base MySQL), en lecture seule, avec « Tester la connexion » et la liste des tables. Première étape pour joindre les ordonnances et les bulletins d’examens à la liasse PHP.',
    ],
  },
  {
    id: '2026-11-10-caisse-pharmacie',
    date: '2026-11-10',
    target: 'app',
    title: 'État de la caisse pharmacie',
    access: (user) => user?.role === 'superadmin' || !!user?.canSeeCaissePharmacie,
    items: [
      'Finances › Caisse pharmacie : choisissez la date, la GED affiche le relevé des factures de la caisse de vente (client comptant pharmacie) lu directement dans Sage, avec le total général.',
      '« Envoyer l’état de caisse en signature » crée le PDF et l’envoie à la caissière puis à la comptable. Plus besoin de l’imprimer depuis Sage.',
    ],
  },
  {
    id: '2026-11-10-caisse-pharmacie-3-signatures',
    date: '2026-11-10',
    target: '/caisse-pharmacie',
    title: 'Caisse pharmacie : trois signatures',
    access: (user) => user?.role === 'superadmin' || !!user?.canSeeCaissePharmacie,
    items: [
      'L’état de caisse est signé d’abord par la personne de la pharmacie qui l’envoie (son nom figure sur la fiche), puis par la caissière, puis par la comptable.',
      '« Aperçu PDF » s’ouvre dans la visionneuse de la GED, sans quitter la page.',
    ],
  },
  {
    id: '2026-11-11-vehicules-visionneuse-pdf',
    date: '2026-11-11',
    target: '/vehicules',
    title: 'Parc véhicules : fiches PDF dans la visionneuse',
    items: [
      'Les fiches PDF (inventaire d’ambulance, contrôle, prise de poste) s’ouvrent maintenant dans la visionneuse de la GED, comme « Voir » dans Documents, sans ouvrir de nouvel onglet. Bouton Télécharger en haut à droite.',
    ],
  },
  {
    id: '2026-11-11-poste-saisie-personnel',
    date: '2026-11-11',
    target: 'app',
    title: 'Nouveau poste « Saisie du personnel »',
    access: (user) => ['admin', 'superadmin'].includes(user?.role) || (user?.postes || []).some((p) => ['rh', 'employes_saisie'].includes(p)),
    items: [
      'Admin › Postes & Fonctions : le poste « Saisie du personnel » donne accès à la page Employés pour ajouter et modifier les fiches (par exemple aux personnes qui font les plannings, pour ajouter leur personnel).',
      'Ce poste ne peut ni désactiver un employé, ni importer/exporter le CSV, ni lier un compte utilisateur GED : cela reste réservé au RH et aux administrateurs.',
    ],
  },
  {
    id: '2026-11-11-rapprochement-dme',
    date: '2026-11-11',
    target: '/sage-bl-php',
    title: 'BL PHP : rapprochement avec le DME',
    access: (user) => user?.role === 'superadmin' || !!user?.canSeeSageBl,
    items: [
      'Nouvel onglet « Rapprochement DME » : pour chaque BL PHP de Sage (facturé ou non) d’une période, le patient du DME qui a le même compte tiers.',
      'Quand plusieurs patients du DME partagent un compte, le nom du client Sage sert à choisir. Les BL sans patient trouvé sont listés pour corriger le compte tiers dans le DME.',
      'Première étape avant de joindre automatiquement les ordonnances et les bulletins d’examens à la liasse PHP.',
    ],
  },
  {
    id: '2026-11-11-php-comptes-sage',
    date: '2026-11-11',
    target: '/php',
    title: 'Patients PHP : comptes tiers Sage',
    access: (user) => ['admin', 'superadmin', 'agent_accueil_php', 'agent_accueil_PHP'].includes(user?.role) || (user?.postes || []).some((p) => ['php', 'php_lecture'].includes(p)),
    items: [
      'La fiche d’un patient PHP affiche ses comptes tiers Sage : la GED propose les comptes qui portent son matricule dans Sage, ceux de l’agent et ceux de sa famille.',
      'Confirmez (✓) ou écartez (✕) chaque proposition, ou ajoutez un compte à la main si le matricule est mal saisi dans Sage.',
      'Ces comptes serviront à afficher le parcours hospitalier du patient : BL, factures, consultations et examens du DME.',
    ],
  },
  {
    id: '2026-11-11-php-parcours-hospitalier',
    date: '2026-11-11',
    target: '/php',
    title: 'Patients PHP : parcours hospitalier',
    access: (user) => ['admin', 'superadmin', 'agent_accueil_php', 'agent_accueil_PHP'].includes(user?.role) || (user?.postes || []).some((p) => ['php', 'php_lecture'].includes(p)),
    items: [
      'Dans la fiche d’un patient PHP, « Parcours hospitalier » réunit sur une période ses consultations du Module PHP, ses passages dans le DME (consultations, hospitalisations, bulletins d’examens) et ses BL et factures Sage, avec les montants.',
      'La famille de l’agent apparaît aussi, avec un filtre par personne.',
      'Contrôle : un passage dans le DME sans BL dans Sage est signalé (oubli de facturation possible). Les BL non facturés sont regroupés dans « À regarder ».',
    ],
  },
  {
    id: '2026-11-11-caisse-permanence',
    date: '2026-11-11',
    target: '/caisse-pharmacie',
    title: 'Caisse pharmacie : caisse de permanence',
    access: (user) => user?.role === 'superadmin' || !!user?.canSeeCaissePharmacie,
    items: [
      'Nouvel onglet « Caisse de permanence » : il remplace le classeur Excel « CAISSE HSJM » (une séance de jour 7 h-16 h 30 ou de nuit 16 h 30-7 h).',
      'À la prise de service, la caissière compte le montant reçu ; le solde est repris automatiquement de la séance précédente.',
      'Saisie des cautions, autres recettes (pass, carnets…) et sorties (pass remboursés, pièces de caisse, versement DG), en espèces ou Orange Money ; solde calculé en direct.',
      'Clôture : comptage des espèces (billet par billet si besoin) et écart expliqué. Historique de toutes les séances et recherche d’une caution par nom de patient.',
    ],
  },
  {
    id: '2026-11-12-caisse-permanence-signature',
    date: '2026-11-12',
    target: '/caisse-pharmacie',
    title: 'Caisse de permanence : envoi en signature',
    access: (user) => user?.role === 'superadmin' || !!user?.canSeeCaissePharmacie,
    items: [
      'Après la clôture, la séance s’envoie en signature : une fiche PDF (mouvements, totaux, comptage, écart) est signée par la caissière de la pharmacie puis par la Caissière.',
      'Aperçu PDF de la séance à tout moment ; l’historique indique pour chaque séance « À envoyer », « En signature » ou « Signée ».',
      'Les administrateurs peuvent supprimer une séance (par exemple une séance de test), avec un motif gardé dans le journal d’audit.',
      'Nouveau poste « Caisse pharmacie » (Admin › Postes & Fonctions) : donne accès au module et permet de tenir la caisse de permanence.',
    ],
  },
  {
    id: '2026-11-12-bons-commande-sage',
    date: '2026-11-12',
    target: '/bons-commande',
    title: 'Bons de commande depuis Sage',
    access: (user) => ['admin', 'superadmin'].includes(user?.role) || (user?.postes || []).includes('bons_commande'),
    items: [
      'Préparez le bon de commande dans Sage comme d’habitude, puis saisissez son numéro (BCF… ou BLF…) dans Finances › Bons de commande.',
      'La GED lit le bon dans Sage et produit le même document que l’impression Sage, plus le montant en lettres et les cadres de signature.',
      'Envoi en signature en un clic : vous → DG ou DGA → Comptable (pour paiement). Plus besoin d’imprimer le PDF dans Sage pour l’importer.',
      'La liste des pièces d’achat récentes (par dépôt) indique celles déjà envoyées et signées.',
    ],
  },
];

export default RELEASE_NOTES;
