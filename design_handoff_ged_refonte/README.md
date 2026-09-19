# Handoff : Refonte UI de la GED (Gestion Électronique de Documents)

> **Pour Claude Code** — Ce document est auto-suffisant. Il décrit une refonte d'interface
> validée par le propriétaire du produit. Lis-le en entier avant de coder.

---

## 1. Vue d'ensemble

**GED** est une application web (frontend + backend, déployée sous Docker) de gestion
électronique de documents : upload, classification, circuits de validation (workflow),
signature électronique, archivage légal, statistiques. Elle est en cours de
commercialisation en SaaS multi-tenant (cible : hôpitaux/cliniques, grandes entreprises,
administrations, cabinets juridiques/comptables, PME).

Cette refonte fait passer l'UI d'un rendu jugé « trop enfantin » à un rendu **premium SaaS,
sobre et institutionnel** (inspiration Linear / Notion / Vercel, mais avec une identité
bleu-marine propre). Le périmètre couvre **11 écrans** + navigation desktop & mobile,
thème clair/sombre, et un jeu d'interactions réelles.

---

## 2. À propos des fichiers de design (IMPORTANT)

Les fichiers de ce bundle sont des **références de design réalisées en HTML/React-via-Babel**.
Ce sont des **prototypes** qui montrent l'apparence et le comportement voulus — **PAS du code
de production à copier tel quel**.

**Ta mission** : recréer ces designs dans l'environnement existant de l'application GED, en
utilisant ses patterns, ses conventions et ses librairies déjà en place (composants, routing,
state management, appels API). Si un framework est déjà choisi (React, Vue, etc.), respecte-le.
Le HTML fourni utilise React 18 chargé via CDN + Babel standalone : **ne reproduis pas ce
montage** en production — c'est uniquement un véhicule de prototypage.

Le prototype utilise des **données factices en dur** (noms, documents, dates). Remplace-les par
les vraies données de l'application via les API/état existants.

---

## 3. Fidélité

**Haute fidélité (hi-fi).** Les couleurs, la typographie, les espacements, les rayons, les
ombres et les interactions sont définitifs et tirés du **design system officiel GED** (voir
dossier `design_system/` et section 9). Recrée l'UI fidèlement en t'appuyant sur ce design
system. Tout est tokenisé : tu dois réutiliser les tokens, pas redéfinir des valeurs en dur.

---

## 4. Architecture du prototype (pour t'y retrouver)

| Fichier | Rôle |
|---|---|
| `GED Mid-Fi.html` | Point d'entrée : monte React, gère le routage entre écrans (état `page`), le doc actif, le panneau Tweaks, la barre mobile, les toasts. |
| `midfi-styles.css` | **Tous les tokens** (couleurs, typo, espacements, rayons, ombres) + styles de composants + thème sombre (`:root[data-theme="dark"]`) + densité compacte + rail. |
| `midfi-responsive.css` | Couche responsive (breakpoints 1080 / 860 / 540) + barre d'onglets mobile + bottom-sheet. |
| `midfi-shell.jsx` | Composants de structure : `Icon` (SVG Lucide-like), `Sidebar`, `Topbar`. |
| `midfi-interactions.jsx` | `ToastHost` + dispatcher global `window.gedToast(msg, {tone})`. |
| `midfi-page-home.jsx` | Écran **Accueil**. |
| `midfi-pages-docs.jsx` | Écrans **Documents**, **Aperçu document**, **Upload** (wizard). |
| `midfi-pages-tasks-workflow.jsx` | Écrans **Mes tâches**, **Workflow**. |
| `midfi-pages-arch-srv.jsx` | Écrans **Archives**, **Services**. |
| `midfi-pages-users-stats-set.jsx` | Écrans **Utilisateurs**, **Statistiques**, **Paramètres**. |
| `tweaks-panel.jsx` | Panneau de réglages du prototype (thème/densité/marque/nav). **Outil de démo — à NE PAS porter en production.** |
| `design_system/` | Le design system officiel : CSS de tokens, polices, README, wordmark. **Source de vérité.** |

---

## 5. Principes de design directeurs

Ces principes expliquent *pourquoi* l'UI est ainsi — respecte-les en implémentant :

1. **Une seule action principale par écran.** Pas 4 boutons équivalents. L'accueil met en avant
   UNE tâche urgente ; les autres actions sont secondaires.
2. **Calme visuel.** Le bleu-marine de marque est réservé aux CTA, états actifs et liens.
   Le reste est neutre (gris ardoise). Pas d'aplats colorés partout.
3. **Densité aérée** par défaut, mais **contenu utile maximisé** (tables denses pour les
   power users). Une option "Compact" existe.
4. **Sentence case** partout. **Aucune MAJUSCULE** sur les labels répétés (sauf petites
   étiquettes mono décoratives). **Aucun emoji, aucun caractère unicode** comme contenu
   (✓ ✕ → 📱) : utiliser des **icônes SVG** (style Lucide).
5. **Clic sur la ligne = action principale** (ouvrir le document). Pas de bouton "Voir"
   redondant quand la ligne entière est cliquable.
6. **Différenciateurs produit à valoriser** : rapidité, ergonomie mobile (scan caméra),
   signature électronique fluide, OCR + recherche plein-texte, IA (classification/insights),
   multilingue, multi-tenant.

---

## 6. Les 11 écrans

> Conventions communes : police **Inter** (corps & titres), **JetBrains Mono** (références,
> ID, petites étiquettes), couleur de marque `#1B3A6B`. Voir tokens en section 9.

### 6.1 — Shell applicatif (présent sur tous les écrans desktop)
- **Sidebar gauche, largeur 240px**, fond `--c-bg` (#fff), bordure droite `--c-line`.
  - Wordmark (mark SVG 26px + texte « GED »).
  - Sélecteur d'organisation (multi-tenant) « HSJM ⌄ ».
  - Champ recherche déclencheur (`⌘K`).
  - 3 groupes : **Travail** (Accueil, Documents `badge 174`, Mes tâches `badge 3 urgent`,
    Workflow, Archives), **Organisation** (Utilisateurs, Services, Statistiques, Journal
    d'audit), **Système** (Paramètres).
  - Item actif : fond `--c-bg-3` + barre marine 3px à gauche + texte `--c-ink` semi-bold.
  - Pied : avatar utilisateur + nom + rôle.
- **Topbar** par écran : fil d'Ariane (mono, dernier niveau en gras) à gauche ; actions +
  cloche de notifications à droite. Sticky, hauteur ~53px, bordure basse.

### 6.2 — Accueil (`PageHome`)
- **Salutation** : éyebrow mono (date + organisation), titre « Bonjour Franck. », sous-titre
  résumant tâches urgentes / docs à examiner.
- **Carte héros d'action** (classe `.hero-action`) : fond dégradé doux marine, icône horloge
  sur carré `--c-warn`, chips d'état (« À traiter maintenant », échéance), titre du document,
  2 boutons (« Voir le document » secondaire, « Approuver » primaire). Sur mobile (<540px), le
  bloc boutons passe en pleine largeur sous le texte.
- **4 KPIs** (grille 4 colonnes) : Total documents (+trend), En validation, Approuvés (%),
  Délai moyen. Voir composant KPI §7.
- **2 colonnes** (`.stack-mobile`, ratio 1.4fr / 1fr) :
  - Gauche : **mini-calendrier d'échéances** (grille 7 colonnes, jour actuel en marine soft,
    barres d'intensité de tâches par jour) + **documents récents** (lignes cliquables →
    ouvrent l'aperçu).
  - Droite : **raccourcis** (Upload, Scan IA, Mes tâches, Statistiques) + **fil d'activité**
    groupé par jour (avatar + acteur + action + cible colorée + heure).

### 6.3 — Documents (`PageDocs`)
- **3 vues** via segmented control : **Table** (défaut), **Grille**, **Kanban**. L'état `view`
  les commute ; les filtres s'appliquent aux 3.
- **Barre de filtres** : recherche plein-texte (OCR) live + chips Type / Statut / Service +
  bouton « + Filtre ». Le filtre Statut est fonctionnel (toggle en attente / tous).
- **Sélection multiple** (checkbox par ligne + select-all) → **barre d'actions groupées** (fond
  marine soft) : Approuver / Archiver / Télécharger / Supprimer. Approuver met à jour les
  statuts ; Archiver retire les lignes ; toast de confirmation.
- **Table** : colonnes = checkbox, Document (icône type + nom), Type (chip), Statut (chip à
  point coloré), Auteur (avatar), Service, Workflow (`1/2` mono), Modifié, menu `⋯`.
  Ligne entière cliquable → ouvre l'aperçu de CE document. Hover = fond `--c-bg-2`.
- **Grille** : cartes (vignette type, nom 2 lignes max, service + date, chip statut + avatar).
- **Kanban** : 4 colonnes par statut (Brouillon / En validation / Approuvé / Archivé), compteurs
  dynamiques, cartes draggables (drag visuel ; persistance à implémenter côté app).
- **Pagination** en pied (compteur + pages).

### 6.4 — Aperçu document (`PageDocDetail`)
- **3 colonnes** (`.docdetail-grid`, `320px / 1fr / 320px`, pleine hauteur) :
  - **Gauche** (`.docdetail-list`) : liste filtrable des docs à traiter (sélection mise en
    évidence en marine soft + barre gauche). **Masquée sur mobile.**
  - **Centre** (`.docdetail-preview`) : barre de zoom + **rendu PDF** (page blanche ombrée
    avec en-tête organisation, titre, corps factice, **zone de signature détectée** en
    pointillés marine).
  - **Droite** (`.docdetail-meta`) : **timeline workflow verticale** (étapes : done = pastille
    verte ✓, current = pastille marine numérotée, pending = contour gris) ; **métadonnées**
    (type, service, tags, référence, OCR, date) ; **zone commentaire** + boutons **Rejeter /
    Demander modifs / Approuver**.
- **Comportement** : Approuver/Rejeter/Demander-modifs → toast (success/danger/default) +
  retour automatique à la liste Documents après ~650ms ; boutons désactivés après décision
  (micro-pulse sur Approuver). Le titre/breadcrumb reflètent le document ouvert.

### 6.5 — Upload (`PageUpload`) — wizard 3 étapes
- **Stepper** : Fichier → Métadonnées → Workflow (étapes passées = ✓ vert cliquable).
- **Étape 1 — Fichier** : dropzone ; au dépôt → carte fichier + **barre OCR animée 1.4s** →
  bloc « Analyse terminée » (chips : type détecté, texte indexé, zone de signature) + toast.
  Bouton **Suivant désactivé tant que l'OCR n'est pas terminé**. Carte promo **scan mobile**.
- **Étape 2 — Métadonnées** : bannière IA, champs **pré-remplis** (titre, référence), selects
  Type / Service, **éditeur de tags** (ajout par Entrée, retrait par clic sur ✕).
- **Étape 3 — Workflow** : 3 circuits en radio (Validation 2 niveaux / simple / archivage
  direct) ; **aperçu dynamique** du circuit recalculé selon le choix.
- **Validation finale** : « Créer et envoyer » → toast success → retour Documents.
  Navigation Précédent/Suivant libre.

### 6.6 — Mes tâches (`PageTasks`)
- Onglets : En attente (défaut) / Approuvées / Rejetées / Expirées (compteurs).
- Filtres (recherche + Urgence / Service / Type / Échéance) + compteur de résultats.
- Sélection multiple → barre groupée (Approuver tout / Rejeter tout).
- **Table** : checkbox, Document (+ état d'étape), Type, Soumis par (avatar), Service, Échéance
  (chip danger si urgent), Action (Approuver / Rejeter / Voir).
- **Comportement** : approuver/rejeter une ligne → la retire + toast ; quand la file est vide →
  **empty state** « Tout est traité. » (icône check-circle verte). Compteurs dynamiques.

### 6.7 — Workflow (`PageWorkflow`)
- 4 KPIs (Entrées 30j, En attente, Approuvées, Délai moyen).
- **Diagramme Sankey** (SVG) : Soumissions → Validation N1 → Validation N2 → sorties
  (Approuvés / En attente / Rejetés), épaisseurs proportionnelles.
- 2 cartes : **Goulots d'étranglement** (barres de délai par service, colorées par sévérité) +
  **Top valideurs** (avatar + nom + rôle + nombre).

### 6.8 — Archives (`PageArchives`)
- Bascule **Recherche** / **Timeline** (segmented dans la topbar).
- **Recherche** : 2 colonnes (`.stack-mobile`) — filtres à gauche (recherche plein-texte OCR,
  cases Type, période, auteur) ; résultats à droite (cartes : vignette PDF, nom, auteur+avatar,
  date, taille, type, **durée de conservation légale** 5 ans/10 ans, actions Télécharger /
  Partager / Restaurer).
- **Timeline** : regroupement par mois, grille de cartes par période.

### 6.9 — Services (`PageServices`)
- En-tête avec compteurs (services, membres, **alerte « X sans chef »**).
- Filtres + segmented (Grille / Liste / Org. chart).
- **Cartes services** (grille 3 col) : nom, nb membres, chip statut. Si chef assigné → bloc chef
  (avatar + nom + rôle). **Sinon → bloc d'alerte** (fond `--c-warn-soft`, pointillés, bouton
  « Assigner chef »). Actions Voir membres / Éditer.

### 6.10 — Utilisateurs (`PageUsers`)
- Filtres (recherche + Rôle / Service / Statut).
- Sélection multiple → barre groupée (Changer rôle / service / Réinitialiser MDP / Désactiver).
- **Table 4 colonnes utiles** (vs 7 surchargées avant) : Utilisateur (avatar + nom + email),
  Rôle · Service (chip coloré par rôle), **Signature / Cachet** (chips ✓/—), Dernière activité,
  menu `⋯`. Ligne de rôle : admin=marine, directeur=info, validateur=success, etc.

### 6.11 — Statistiques (`PageStats`)
- Bascule **Insights** / **Explorer** (segmented).
- **Insights (éditorial Q&R)** : 4 KPIs, puis sections où **le titre = la conclusion** (« L'activité
  reprend après une baisse hivernale. ») illustrée par un graphique (bar/donut/barres horizontales).
  Carte **Insight IA** actionnable en fin.
- **Explorer (self-serve)** : panneau dimensions/mesures (drag) + zone graphique générée.
  *(Fonctionnalité avancée / enterprise — peut être hors v1.)*

### 6.12 — Paramètres (`PageSettings`)
- Layout **sidebar de sections** (`.stack-mobile`) : Compte (Profil, Sécurité·2FA, Notifications),
  Organisation (Équipe, Branding, Licence), Avancé (IA·OCR, Intégrations, API·Webhooks).
- Contenu **Profil** complet (photo, identité, email, **langue FR/EN/ES/AR**, signature
  électronique). Les autres sections suivent le même pattern (form + actions sticky).

---

## 7. Composants réutilisables (specs)

| Composant | Spécification |
|---|---|
| **Bouton** `.btn` | padding 7×12, radius 6px, border 1px `--c-line`, font 13/500. Variantes : `.primary` (fond marine, texte blanc), `.ghost` (transparent), `.danger` (texte rouge). Tailles `.sm` `.xs` `.lg`. Hover : fond `--c-bg-3`. |
| **Carte** `.card` | fond `--c-bg`, border 1px `--c-line`, radius 8px, padding 18px. Ombre quasi nulle (la bordure structure). `.card-head` = titre + lien. |
| **Chip** `.chip` | radius plein, padding 2×8, font 11/500. Tons : `.brand .success .warn .danger .info .outline`. `.dot` ajoute une pastille. |
| **KPI** `.kpi` | label (12px gris) + valeur (28px, Inter 700, `letter-spacing -0.8`) + trend (vert ↑ / rouge ↓). Grille `.kpi-grid` 4 col → 2 (tablette) → 2/1 (mobile). |
| **Avatar** `.avatar` | rond, initiales, fond aplat sobre (`.c1`..`.c6` = marine/bleu/vert/ambre/ardoise/gris). Tailles `.sm .lg .xl`. Pas de dégradés flashy. |
| **Table** `.tbl` / `.table-wrap` | en-têtes 12px/600 sentence-case fond `--c-bg-2` ; cellules padding 12×14, séparateur `--c-line-2` ; hover ligne `--c-bg-2` ; ligne sélectionnée `--c-brand-soft`. Sur mobile : scroll horizontal, `min-width 640px`. |
| **Champ recherche** `.search-input` | border 1px, radius 6px, focus = bordure marine + halo `--sh-focus`. |
| **Segmented** `.segmented` | conteneur `--c-bg-3`, bouton actif = fond `--c-bg` + ombre xs. |
| **Filter chip** `.filter-chip` | comme un bouton ; `.active` = marine soft + bordure marine. |
| **Status dot** `.status-dot` | 8px ; `.draft`(gris) `.pending`(ambre) `.approved`(vert) `.rejected`(rouge) `.archived`(info). |
| **Toast** | dispatcher `window.gedToast(message, {tone})`, tones `success / danger / default`. Fond sombre `--c-ink-2`, texte blanc, icône Lucide (check / x / info), apparition bas-centre, auto-dismiss ~3.2s. Reste sombre dans les 2 thèmes. |

---

## 8. Interactions & comportements

- **Navigation entre écrans** : transition fade + translate 4px, **250ms**, easing
  `cubic-bezier(0.4, 0, 0.2, 1)`.
- **Approbation** : micro-pulse 500ms sur le bouton, toast, puis redirection ~650ms.
- **Suppression de ligne** (tâches) : retrait immédiat + toast (prévoir un « Annuler » optionnel,
  le toast supporte un callback `undo`).
- **OCR upload** : barre de progression animée `ocr-bar` 1.4s (simulée ; à brancher sur le
  vrai pipeline OCR backend).
- **Recherche / filtres** : filtrage **live** côté client dans le proto (à remplacer par la
  vraie recherche backend / index OCR).
- **États** à implémenter : hover (fonds `--c-bg-2/3`), focus (`--sh-focus` halo marine),
  disabled (opacité 0.5 + curseur not-allowed), loading (barres/squelettes), empty
  (ex. « Tout est traité. »), erreur (toasts danger).

---

## 9. Design tokens (source de vérité : `design_system/colors_and_type.css`)

> ⚠️ Le prototype utilise des **alias** `--c-*` mappés sur les tokens officiels. En production,
> utilise directement les tokens du design system (`--fg`, `--surface`, `--accent`, etc.).
> Table de correspondance ci-dessous.

### Couleurs — thème clair
| Alias proto | Valeur | Token DS / rôle |
|---|---|---|
| `--c-brand` | `#1B3A6B` | accent marine (CTA, actif, liens) |
| `--c-brand-hover` | `#152E55` | accent survol |
| `--c-brand-soft` | `#E8EEF7` | fond accent doux |
| `--c-ink` / `--c-fg` | `#0F1B2D` | texte principal |
| `--c-fg-2` / `--c-fg-3` | `#5A6478` | texte secondaire / muted |
| `--c-fg-4` | `#8C95A8` | texte subtil |
| `--c-line` | `#E5E7EC` | bordures |
| `--c-line-2` | `#EEF0F3` | séparateurs |
| `--c-bg` | `#FFFFFF` | surface |
| `--c-bg-2` | `#FBFBFC` | fond app |
| `--c-bg-3` | `#F5F6F8` | surface alternée |
| `--c-success` | `#1F7A4D` / soft `#E5F4ED` | validé |
| `--c-warn` | `#A86A1F` / soft `#FBEFD9` | attention |
| `--c-danger` | `#B43A3A` / soft `#FBE6E6` | rejet/erreur |
| `--c-info` | `#2563A0` / soft `#E2EEF8` | information |

### Couleurs — thème sombre (`:root[data-theme="dark"]`)
Fond app `#0B0F19`, surface `#121826`, texte `#E8ECF4`, accent marine clairci `#5B89D6`.
Toutes les valeurs sont dans `midfi-styles.css` (section « Dark theme »). Les boutons primaires
passent en texte sombre sur l'accent éclairci.

### Typographie
- **Familles** : `Inter` (corps & titres), `JetBrains Mono` (références/ID/étiquettes). Polices
  variables fournies dans `design_system/fonts/`.
- **Titres de page** : Inter 700, 24px, `letter-spacing -0.5px`, `line-height 1.2`.
- **Titres de carte** : Inter 600, 14px, `-0.2px`.
- **Corps** : Inter 400/500, 13–14px, `line-height 1.5`.
- **Valeurs KPI** : Inter 700, 28px, `-0.8px`.
- **Mono / étiquettes** : JetBrains Mono, 10–12px.

### Espacements (échelle proto)
`4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64 px` (variables `--s-1`..`--s-16`).

### Rayons
`--r-sm 6px` (boutons/inputs) · `--r-md 6px` · `--r-lg 8px` (cartes) · `--r-xl 10px` ·
`--r-2xl 12px` · `--r-full 9999px` (chips/avatars).

### Ombres (très subtiles)
`--sh-xs`, `--sh-sm`, `--sh-md`, `--sh-lg`, `--sh-focus` (halo marine 2px pour le focus).
Valeurs exactes dans `midfi-styles.css`.

---

## 10. Responsive

Breakpoints : **1080px** (KPI/grilles passent à 2 col), **860px** (bascule mobile),
**540px** (téléphone fin).

En mobile (<860px) :
- Sidebar desktop **masquée** → **barre d'onglets en bas** (Accueil · Documents · Tâches · Stats
  · **Plus**). « Plus » ouvre une **bottom-sheet** (Workflow, Archives, Services, Utilisateurs,
  Upload, Paramètres).
- Fil d'Ariane réduit au dernier niveau ; actions repliées.
- KPIs 2 col, grilles multi-col → 1 col, splits 2 col (`.stack-mobile`) → empilés.
- Tables : scroll horizontal tactile.
- Filtres : barre scrollable horizontalement.
- Aperçu document : 3 colonnes → 1 colonne (liste masquée, PDF puis métadonnées/workflow dessous).
- Zones tactiles ≥ 44px ; `env(safe-area-inset-bottom)` géré (encoches iPhone).

---

## 11. État (state) à prévoir

- `page` (écran courant) + `activeDoc` (document ouvert dans l'aperçu) → à mapper sur ton
  **routing** réel (URLs : `/documents`, `/documents/:id`, `/upload`, `/taches`, etc.).
- Listes (`docs`, `tasks`) : statut, sélection multiple, filtres (query, statut, type, service),
  vue active (table/grille/kanban). → à brancher sur tes **API** (liste, recherche OCR, mutations
  approve/reject/archive).
- Upload : fichier, état OCR (`idle/processing/done`), métadonnées, workflow choisi. → pipeline
  d'upload + OCR + création de document réels.
- Thème (`light/dark`), densité, marque, type de nav : à exposer en **préférences utilisateur**
  si souhaité (le panneau Tweaks est un outil de démo, pas un composant produit).

---

## 12. Assets

- **Wordmark** : `design_system/wordmark.svg` (logo complet) et `wordmark-mark.svg` (mark seul,
  utilisé dans la sidebar). En marine de marque.
- **Icônes** : SVG inline style **Lucide** (définies dans `midfi-shell.jsx`, composant `Icon`).
  En production, utilise la librairie d'icônes de ton codebase (Lucide recommandé pour
  correspondre) — pas les chemins SVG copiés du proto.
- **Polices** : `design_system/fonts/` (Inter variable + JetBrains Mono variable, woff2).

---

## 13. Comment procéder (suggestion de séquencement)

1. Lis `design_system/README.md` (le DS officiel) et câble ses tokens dans ton codebase.
2. Implémente le **shell** (sidebar + topbar + thème clair/sombre) — il conditionne tout.
3. Puis les écrans par ordre d'usage : **Accueil → Documents → Aperçu → Mes tâches → Upload**,
   puis Workflow, Archives, Services, Utilisateurs, Statistiques, Paramètres.
4. Branche les **données réelles** et les **API** au fur et à mesure (remplace les mocks).
5. Ajoute le **responsive** (barre d'onglets mobile + bottom-sheet) une fois le desktop stable.
6. Ne porte PAS : le panneau Tweaks, le chargement React/Babel par CDN, la nav inter-écrans du
   proto (`proto-nav`).

---

## 14. Fichiers fournis dans ce bundle

```
design_handoff_ged_refonte/
├── README.md                          ← ce document
├── GED Mid-Fi.html                    ← prototype hi-fi (point d'entrée)
├── midfi-styles.css                   ← tokens + composants + thème sombre
├── midfi-responsive.css               ← responsive + mobile
├── midfi-shell.jsx                    ← Icon, Sidebar, Topbar
├── midfi-interactions.jsx             ← toasts
├── midfi-page-home.jsx                ← Accueil
├── midfi-pages-docs.jsx               ← Documents, Aperçu, Upload
├── midfi-pages-tasks-workflow.jsx     ← Mes tâches, Workflow
├── midfi-pages-arch-srv.jsx           ← Archives, Services
├── midfi-pages-users-stats-set.jsx    ← Utilisateurs, Statistiques, Paramètres
├── tweaks-panel.jsx                   ← panneau de démo (NE PAS porter)
└── design_system/                     ← DESIGN SYSTEM OFFICIEL (source de vérité)
    ├── colors_and_type.css
    ├── README.md
    ├── wordmark.svg
    ├── wordmark-mark.svg
    └── fonts/
```

Pour ouvrir le prototype : sers le dossier en HTTP (ex. `npx serve`) puis ouvre `GED Mid-Fi.html`
(les polices et le wordmark sont chargés en chemins relatifs depuis `design_system/`).
