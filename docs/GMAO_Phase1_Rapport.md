# GMAO — Rapport de Mise à Jour · Phase 1 : Redesign UI (Layout Optimus)

**Date :** 27/03/2026
**Fichier modifié :** `frontend/src/pages/GMAOPage.jsx`
**Phase :** 1 / 4
**Statut :** ✅ Terminé

---

## Résumé

La Phase 1 consiste à transformer l'interface GMAO existante (4 onglets horizontaux simples) en un layout professionnel à 3 colonnes, inspiré du logiciel **Optimus® by OneSoft Industries**, avec :

- une barre supérieure avec les outils d'analyse rapide,
- une sidebar gauche avec les modules de navigation,
- un panneau droit avec calendrier et interventions en attente en temps réel.

---

## Ce qui existait avant

| Élément | Ancien état |
|---|---|
| Navigation | 4 onglets horizontaux : Équipements / Planning Annuel / Interventions / Analyse |
| Layout | Page pleine largeur avec header + tabs + contenu |
| Modules disponibles | Équipements, Planning, Interventions, Analyse |
| Indicateur live | Bandeau "X interventions planifiées aujourd'hui" (statique) |

---

## Ce qui a été fait (Phase 1)

### 1. Nouvelle structure de layout (`GMAOPage`)

```
┌─────────────────────────────────────────────────────────────────────┐
│  BARRE SUPÉRIEURE : Logo GMAO | Outils d'analyse | Actualiser        │
├─────────────────────────────────────────────────────────────────────┤
│  BREADCRUMB : GMAO > Module > Section active                          │
├───────────────┬─────────────────────────────────┬───────────────────┤
│ SIDEBAR GAUCHE│                                 │ PANNEAU DROIT     │
│   (240px)     │   CONTENU PRINCIPAL             │   (240px)         │
│               │   (flex-1, scrollable)          │                   │
│  5 modules    │                                 │  Mini Calendrier  │
│  collapsibles │                                 │  +                │
│               │                                 │  Interventions    │
│               │                                 │  signalées (live) │
└───────────────┴─────────────────────────────────┴───────────────────┘
```

**Hauteur :** `calc(100vh - 4rem)` — occupe tout l'écran sous la Navbar, sans scroll de page.

---

### 2. Composant `SidebarModule`

Chaque section du sidebar est un accordéon cliquable avec :
- **En-tête** : icône `»`/`«` + nom du module en majuscules
- **Grille 2 colonnes** de boutons
- **Bouton actif** : fond teal (`bg-teal-500`)
- **Bouton disponible** : fond slate (`bg-slate-700`), hover clair
- **Bouton "bientôt"** : grisé, curseur interdit, label "bientôt" en rouge sous le nom

#### 5 modules dans la sidebar :

| Module | Sections disponibles | Sections à venir (Phase 2+) |
|---|---|---|
| Gestion du parc d'équipements | **Inventaire** | Acquisition, Panorama, Localisation, Retrait, Réforme, Historique, Doc. Eqpt. |
| Activité de maintenance | **Planification**, **Intervention** | Contrats, Demande, Listing Op., Historique |
| Gestion des pièces de rechange | — | Pièces et consommables, Gestion du stock, Listing mouvements |
| Budget de maintenance | — | Ligne budgétaire, Achats, Factures, Etat budget |
| Statistiques Annuelles | **Equipements** | Personnels, Finance |

---

### 3. Barre supérieure avec Outils d'analyse

4 boutons d'accès rapide (style toolbar) :

| Bouton | Accès | Statut |
|---|---|---|
| Panorama maintenance | `AnalyseTab` existant | ✅ Actif |
| Pièces & consomm. | — | ⏳ Phase 2 |
| Analyse 20/80 | — | ⏳ Phase 2 |
| Consomm. budget | — | ⏳ Phase 2 |

---

### 4. Composant `MiniCalendar`

- Calendrier mini interactif dans le panneau droit
- Navigation mois précédent/suivant
- Aujourd'hui surligné en teal
- Affiche la date du jour en bas

---

### 5. Panneau "Interventions signalées" (live)

- Se charge au montage via `gmaoAPI.getInterventions({ statut: 'planifiee' })`
- Bouton **Actualiser** (teal) pour rafraîchir en temps réel
- Compteur **Total** visible en permanence
- Tableau 3 colonnes : Date / Heure / Equipement
- Clic sur une ligne → navigation vers section **Intervention**
- Si vide → message "Aucune intervention en attente"

---

### 6. Composant `WIPPanel`

Placeholder élégant affiché pour toutes les sections non encore développées :
- Icône Wrench sur fond gris
- Nom de la section
- Badge "Phase 2 — Prochainement disponible"

---

### 7. Breadcrumb dynamique

Barre de navigation contextuelle :
`GMAO > [Nom du module] > [Section active]`

La section active est toujours mise en évidence en teal.

---

## Mapping Ancien → Nouveau

| Ancien onglet | Nouveau chemin |
|---|---|
| Équipements | Sidebar > Gestion du parc d'équipements > **Inventaire** |
| Planning Annuel | Sidebar > Activité de maintenance > **Planification** |
| Interventions | Sidebar > Activité de maintenance > **Intervention** |
| Analyse | Sidebar > Statistiques Annuelles > **Equipements** OU Toolbar > **Panorama maintenance** |

---

## Fichiers modifiés

| Fichier | Type de modification |
|---|---|
| `frontend/src/pages/GMAOPage.jsx` | Réécriture du composant principal `GMAOPage` + ajout de `GMAO_MODULES`, `TOOLBAR_ITEMS`, `WIPPanel`, `MiniCalendar`, `SidebarModule` |

> Tous les composants existants (EquipementsTab, InterventionsTab, CalendarTab, AnalyseTab, modales) sont **conservés intacts** — seul le layout principal a changé.

---

## Ce qui reste à faire (Phases suivantes)

| Phase | Contenu |
|---|---|
| **Phase 2** | Acquisition, Panorama équipement (fiche d'identité), Localisation, Retrait, Réforme |
| **Phase 3** | Contrats prestataires, Demandes d'intervention, Pièces et stock |
| **Phase 4** | Budget (lignes, achats, factures, état), Statistiques (personnels, finance), Analyse 20/80 |

---

## Pour reprendre le travail

1. Ouvrir `frontend/src/pages/GMAOPage.jsx`
2. Les sections à développer sont identifiées par `wip: true` dans `GMAO_MODULES` (en haut du fichier)
3. Pour activer une section : passer `wip: false` ET ajouter un `case` dans la fonction `renderContent()`
4. Le backend GMAO existe dans `backend/src/controllers/gmaoController.js` et `backend/src/routes/gmao.js`
