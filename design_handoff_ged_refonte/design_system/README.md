# GED — Design System

> Système de design pour **GED**, application web de gestion électronique de documents et de signature électronique. Pensé pour les secteurs **médical, juridique et financier** en Europe (FR/EN).

---

## Le produit en deux phrases

GED est une application web (frontend + backend, déployée via Docker) qui aide les entreprises à **réduire l'usage du papier**, **numériser les workflows de signature**, et **centraliser la gestion documentaire**. Initialement développée par un·e ingénieur·e IT en milieu hospitalier (avec Claude AI + Claude Code) pour usage interne, elle est aujourd'hui en cours de commercialisation auprès d'autres organisations exigeantes.

## Positionnement

- **Cible** : services internes (DSI, qualité, juridique, RH, comptabilité) de structures **médicales, juridiques et financières**.
- **Marché** : France & Europe (UI bilingue FR principal / EN secondaire).
- **Différenciateur** : conçu *par* un opérationnel hospitalier, *pour* des opérationnels — pragmatique, calme, précis. À l'opposé d'un DocuSign/PandaDoc qui privilégie le marketing au workflow réel.

## Personnalité de marque

Trois mots qui doivent traverser chaque pixel :

1. **Calme** — pas de stress visuel, pas de hype, pas de gradients spectaculaires. Le produit doit *se faire oublier* pour laisser place au travail.
2. **Précis** — chaque élément a une raison d'être ; les états sont explicites ; les confirmations sont sobres et claires.
3. **Fiable** — visuellement institutionnel, on confie ses documents sensibles à GED comme on les confie à une banque ou à un notaire.

Inspirations design : **Notion** (densité confortable, hiérarchie typographique nette), **Pennylane** (sérieux financier, FR-natif), **Stripe** (rigueur typographique, tokens propres), **Things** (calme, économie de moyens).

---

## Sources

| Source | État | Notes |
|---|---|---|
| Codebase GED | ❌ non fournie | À demander à l'utilisateur — captures d'écran fournies à la place |
| Captures d'écran de l'app | ⏳ en attente | À joindre via le menu Import pour aligner le UI kit |
| Logo existant | ❌ aucun | Wordmark proposé dans `assets/wordmark.svg` |
| Figma | — | Aucun |

---

## Index du dossier

```
.
├── README.md                  ← ce fichier (contexte, fondations, ton)
├── SKILL.md                   ← invocation skill (Claude Code compatible)
├── colors_and_type.css        ← variables CSS (couleurs + type, light + dark)
├── fonts/                     ← Inter (woff2)
├── assets/
│   ├── wordmark.svg           ← logo principal
│   ├── wordmark-mark.svg      ← variante mark seul
│   └── icons/                 ← (Lucide via CDN — voir ICONOGRAPHY)
├── preview/                   ← cards rendues dans l'onglet Design System
├── ui_kits/
│   └── ged_app/               ← UI kit application (à créer après captures)
└── slides/                    ← (vide, pas de template fourni)
```

(Les sections **Content Fundamentals**, **Visual Foundations** et **Iconography** sont plus bas dans ce fichier.)

---

## Content Fundamentals

### Langue

- **Français principal** (vouvoiement, registre soutenu mais pas guindé).
- **Anglais secondaire** (registre professionnel neutre, no slang).
- Pas de « tu », pas de « salut », pas d'emoji dans la copie produit.

### Ton

> Imaginez un·e collègue compétent·e qui vous remet un dossier sans en faire des tonnes. Pas distant, pas familier. Précis.

- **Phrases courtes**, voix active. *« Le document a été signé. »* — pas *« Nous sommes heureux de vous informer que... »*.
- **Verbes d'action** dans les boutons : *Signer*, *Envoyer*, *Approuver*, *Archiver*. Pas *« Cliquez ici »*.
- **Pas de superlatifs marketing** dans le produit. *« Documents »*, pas *« Vos magnifiques documents »*. Le marketing peut être un peu plus chaleureux mais reste mesuré.
- **Erreurs sans drame** : *« Ce fichier dépasse 25 Mo. »* — pas *« Oups ! »*, pas *« Désolé... »*.
- **Confirmations sobres** : *« Document envoyé à 3 signataires. »* — pas *« Super ! »*.

### Casing

- **Boutons / actions** : Capitalisation à la française → *Signer le document*, pas *Signer Le Document*.
- **Titres de page** : phrase case → *Bibliothèque de documents*.
- **Navigation** : phrase case → *Tableau de bord*, *Paramètres*.
- **Tags / statuts** : MAJUSCULES à éviter. Préférer *En attente*, *Signé*, *Archivé* en sentence case avec une couleur sémantique.

### Pronoms

- **Vous** systématiquement pour s'adresser à l'utilisateur.
- **Nous** réservé au marketing/onboarding ; jamais dans l'app au quotidien.
- Préférer la **voix passive ou impersonnelle** dans l'app : *« Le document a été archivé. »* plutôt que *« Nous avons archivé votre document. »*.

### Microcopy — exemples canoniques

| Contexte | ✅ À faire | ❌ À éviter |
|---|---|---|
| Bouton primaire | *Envoyer pour signature* | *Cliquer pour envoyer le document* |
| État de chargement | *Chargement…* | *Veuillez patienter, le document est en train de... 🚀* |
| Empty state | *Aucun document. Glissez un fichier ou cliquez pour importer.* | *Oh non ! Pas encore de documents 😢* |
| Erreur | *Format non supporté. Formats acceptés : PDF, DOCX, JPG.* | *Oups, quelque chose s'est mal passé !* |
| Succès | *Signature enregistrée.* | *Bravo ! Vous avez signé votre document avec succès ! 🎉* |
| Confirmation destructive | *Supprimer ce document ? Cette action est irréversible.* | *Êtes-vous vraiment sûr·e de vouloir supprimer ?* |

### Emoji & ponctuation décorative

- **Pas d'emoji** dans l'app. Jamais.
- **Pas d'emoji** dans le marketing non plus, sauf cas exceptionnel et rare (ex. statut social interne).
- Pas de *✨*, pas de *🎉*, pas de *✅*. Les statuts utilisent des **icônes Lucide** ou des **pastilles colorées**.

### Vocabulaire

- *Document* > *fichier* (sauf contexte technique d'upload).
- *Signataire* > *destinataire*.
- *Bibliothèque* > *dossier* pour la vue principale (mais *dossier* pour les sous-collections).
- *Workflow* > *circuit* (terme reconnu dans le SaaS B2B FR).
- *Tableau de bord* > *dashboard* (on est en FR, on assume).

---

## Visual Foundations

### Couleurs

Palette construite autour d'un **bleu marine profond** comme couleur de marque, avec une grise neutre froide pour le chrome, et une palette sémantique sobre.

| Rôle | Light | Dark | Usage |
|---|---|---|---|
| **Brand / Primary** | `#1B3A6B` (marine profond) | `#5B89D6` | Boutons primaires, liens, focus rings |
| **Brand hover** | `#152E55` | `#7AA3E5` | États hover sur surfaces brand |
| **Foreground** | `#0F1B2D` | `#E8ECF4` | Texte principal |
| **Foreground muted** | `#5A6478` | `#9AA3B8` | Texte secondaire, légendes |
| **Background** | `#FBFBFC` | `#0B0F19` | Fond de page |
| **Surface** | `#FFFFFF` | `#121826` | Cards, panneaux |
| **Border** | `#E5E7EC` | `#1F2937` | Séparateurs, bordures de cards |
| Success | `#1F7A4D` | `#3FB57E` | *Signé*, *Approuvé* |
| Warning | `#A86A1F` | `#E0A14B` | *En attente*, *À relire* |
| Danger | `#B43A3A` | `#E26565` | Erreurs, suppression |
| Info | `#2563A0` | `#5BA3DD` | Notifications neutres |

**Règles d'usage :**
- Le bleu marine est utilisé **avec parcimonie** — boutons primaires, focus, état actif. Pas en background de page, pas en gradient.
- **Pas de dégradés** sauf très subtils (≤4% delta) sur des hover states ou des avatars.
- Les couleurs sémantiques (success/warning/danger) apparaissent **uniquement** sur les états et badges, jamais comme couleurs décoratives.

### Typographie

- **Famille** : **Inter** (variable, woff2). Grotesk neutre, lisible à toutes les tailles, support FR/EN excellent.
- **Mono** : **JetBrains Mono** (pour les IDs de documents, hashes, métadonnées techniques).
- **Pas de serif** (pas de moment éditorial : on est dans un outil de travail, pas dans une revue).

| Token | Taille | Line-height | Weight | Usage |
|---|---|---|---|---|
| `--text-display` | 48px / 56px | 1.05 | 600 | Titres marketing uniquement |
| `--text-h1` | 30px / 36px | 1.15 | 600 | Titre de page |
| `--text-h2` | 22px / 28px | 1.25 | 600 | Section |
| `--text-h3` | 17px / 24px | 1.35 | 600 | Sous-section, card title |
| `--text-body` | 14px / 21px | 1.5 | 400 | Texte courant |
| `--text-small` | 13px / 18px | 1.4 | 400 | Légendes, métadonnées |
| `--text-mono` | 13px / 18px | 1.45 | 450 | IDs, hashes |
| `--text-button` | 14px / 14px | 1.0 | 500 | Boutons |

**Règles** : pas de tracking forcé, pas de UPPERCASE (sauf un petit eyebrow exceptionnel). Les titres ne sont jamais centrés, sauf empty states.

### Espacement

Échelle 4px. Tokens : `--space-1: 4px` → `--space-12: 64px`. Voir `colors_and_type.css`.

Densité **aérée mais professionnelle** : padding de card = 20–24px ; gutter de table = 12px vertical / 16px horizontal ; padding de bouton = 8px vertical / 14px horizontal.

### Backgrounds & motifs

- **Pas d'illustrations vectorielles décoratives.** Pas de blobs, pas de personnages, pas de mascottes.
- **Photographie** réservée au marketing : tons froids, lumière naturelle, pas de stock évident. Bureaux, mains qui signent, espaces médicaux propres. Pas de sourires forcés.
- **Empty states** : icône Lucide (gris muted), titre court, sous-titre explicatif, CTA. Pas d'illustration custom.
- **Pas de patterns ni de textures** sauf un possible bruit imperceptible (1–2%) sur de très grandes surfaces marketing.

### Animation

- **Durées** : 150ms (micro), 250ms (standard), 400ms (transitions de page).
- **Easing** : `cubic-bezier(0.4, 0, 0.2, 1)` (Material standard). Pas de bounce, pas d'overshoot.
- **Fades & translations courtes** uniquement (≤8px). Pas de scale dramatique, pas de rotation.
- **Hover** : transitions de couleur 150ms, pas de scale.
- **Page transitions** : fade + 4px translate-up, 250ms.
- **Loading** : skeleton shimmer subtil (delta 4% sur background). Spinners minimalistes (1.5px stroke), bleu brand.

### États hover & press

- **Hover** : assombrir background de 4–6% (light) / éclaircir de 4–6% (dark). Pas de changement de taille.
- **Press / Active** : assombrir de 8–10%. Pas de scale.
- **Focus** : ring de 2px en couleur brand, offset 2px. Visible au clavier, masqué à la souris (`:focus-visible`).
- **Disabled** : opacity 0.4, `cursor: not-allowed`, pas de hover.

### Bordures & rayons

- **Rayon par défaut** : `6px` (boutons, inputs, badges).
- **Cards** : `8px`.
- **Modales** : `10px`.
- **Avatars / pastilles** : `9999px`.
- **Bordure standard** : 1px solid `--border`. Pas de bordures épaisses.
- **Pas de double bordure**, pas de bordure colorée gauche-only (l'anti-pattern à éviter absolument).

### Ombres

Système d'élévation à 4 niveaux, très subtil :

```
--shadow-1: 0 1px 2px rgba(15, 27, 45, 0.04);
--shadow-2: 0 1px 3px rgba(15, 27, 45, 0.06), 0 1px 2px rgba(15, 27, 45, 0.04);
--shadow-3: 0 4px 12px rgba(15, 27, 45, 0.08), 0 2px 4px rgba(15, 27, 45, 0.04);
--shadow-4: 0 12px 32px rgba(15, 27, 45, 0.10), 0 4px 8px rgba(15, 27, 45, 0.06);
```

- `shadow-1` : cards de liste.
- `shadow-2` : cards principales, dropdowns.
- `shadow-3` : popovers, tooltips.
- `shadow-4` : modales.
- En mode sombre, les ombres sont quasi-imperceptibles ; on s'appuie sur les bordures pour la séparation.

### Transparence & blur

- **Backdrop blur** : modales et overlays uniquement. `backdrop-filter: blur(8px)` + fond `rgba(15, 27, 45, 0.4)`.
- **Pas de cards translucides en plein écran**. La GED ne fait pas de glassmorphism.

### Layout

- **Largeur max de contenu app** : 1280px (centré, padding 24px).
- **Marketing** : 1200px max, breakpoints 640 / 768 / 1024 / 1280.
- **Sidebar app** : 240px (collapsible à 56px).
- **Top bar** : 56px de haut, sticky.
- **Grille** : 12 colonnes, gutter 24px sur marketing ; flex/grid simple dans l'app.

### Cards

```
background: var(--surface);
border: 1px solid var(--border);
border-radius: 8px;
box-shadow: var(--shadow-1);
padding: 20px 24px;
```

Pas d'ombre flottante exagérée. La bordure fait 80% du travail visuel ; l'ombre apporte juste un soupçon de profondeur.

---

## Iconography

- **Système choisi** : **Lucide** ([lucide.dev](https://lucide.dev)) — ligne fine, stroke 1.5px, esthétique épurée qui correspond exactement à la direction *fin / raffiné* demandée.
- **Stroke override** : on utilise `stroke-width: 1.5` (default Lucide) en taille standard, et `1.25` aux tailles ≥ 24px pour préserver la finesse.
- **Tailles** : 16px (inline), 18px (boutons), 20px (nav), 24px (en-tête), 32px+ (empty states).
- **Couleur** : héritée du `currentColor`. Toujours `--fg-muted` par défaut, `--fg` à l'état actif/hover, `--brand` pour les actions primaires.
- **Pas d'icônes pleines/solid** dans l'app. Une exception possible : favicon et le mark de l'app dans le sidebar.
- **Pas d'emoji** comme icônes. Jamais.
- **Pas d'unicode** (✓, →, ✕) à la place d'icônes : on utilise Lucide systématiquement.
- **Distribution** : via CDN ESM dans les UI kits (`https://cdn.jsdelivr.net/npm/lucide-static@latest`) ou via `lucide-react` en prod.

### Icônes clés du produit

| Concept | Icône Lucide |
|---|---|
| Document | `file-text` |
| Bibliothèque | `folder` / `folders` |
| Signature | `pen-line` ou `signature` |
| Workflow | `git-branch` |
| Approbation | `check-circle-2` |
| En attente | `clock` |
| Tableau de bord | `layout-dashboard` |
| Recherche | `search` |
| Paramètres | `settings` |
| Utilisateurs | `users` |
| Permissions | `shield-check` |
| Téléverser | `upload-cloud` |
| Télécharger | `download` |
| Notifications | `bell` |

---

## À faire pour boucler le système

1. **Captures d'écran de l'app actuelle** — pour aligner pixel-près le UI kit avec votre application réelle.
2. **Validation du wordmark** proposé (`assets/wordmark.svg`).
3. **Validation des couleurs** : surtout le bleu primaire `#1B3A6B`. Si vous préférez plus profond / plus clair / plus saturé, je peux décliner 2–3 variantes.
4. **Police Inter** : substitution Google Fonts. Si vous voulez une licence commerciale alternative (ex. Söhne, Founders Grotesk), à signaler.
