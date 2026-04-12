# GMAO — Rapport de Mise à Jour · Phase 2 : Gestion du Parc d'Équipements

**Date :** 27/03/2026
**Fichier modifié :** `frontend/src/pages/GMAOPage.jsx`
**Phase :** 2 / 4
**Statut :** ✅ Terminé

---

## Résumé

La Phase 2 implemente les 6 fonctionnalités principales de la section **"Gestion du parc d'équipements"** (section 1 du sidebar). Chaque section dispose désormais de son propre panneau fonctionnel. Aucune modification backend nécessaire — tout repose sur les API existantes.

---

## Sections activées (wip: false)

| Section | Statut Phase 1 | Statut Phase 2 |
|---|---|---|
| Acquisition | ⏳ bientôt | ⏳ (Phase 3 — workflow complexe) |
| **Inventaire** | ✅ Actif | ✅ Inchangé |
| **Panorama** | ⏳ bientôt | ✅ **Implémenté** |
| **Localisation** | ⏳ bientôt | ✅ **Implémenté** |
| **Retrait** | ⏳ bientôt | ✅ **Implémenté** |
| **Réforme** | ⏳ bientôt | ✅ **Implémenté** |
| **Historique** | ⏳ bientôt | ✅ **Implémenté** |
| Doc. Eqpt. | ⏳ bientôt | ⏳ (Phase 3 — upload fichiers) |

---

## Détail des nouveaux panneaux

---

### 1. Panorama — Fiche d'identité de l'équipement

**Composant :** `PanoramaPanel`
**API utilisée :** `GET /gmao/equipements` + `GET /gmao/rapport/:id`

**Description :** Carte d'identité complète d'un équipement. Permet de consulter toute l'information sur un équipement en un seul écran.

**Layout :**
```
┌──────────────────┬────────────────────────────────────────────┐
│ Liste recherchable│         Fiche détaillée                    │
│ de tous les       │  • Header: nom, service, statut, matricule │
│ équipements       │  • Spécifications: marque, modèle, type,   │
│ (filtrée)         │    référence, n° série, fournisseur         │
│                   │  • Dates: mise en service, fin de vie       │
│ Clic → charge     │  • Bilan maintenance: 4 compteurs colorés   │
│ la fiche         │    (total, terminées, correctives, prév.)    │
│                   │  • 5 dernières interventions (timeline)     │
│                   │  • Notes                                    │
└──────────────────┴────────────────────────────────────────────┘
```

**Fonctionnement :**
1. L'utilisateur tape dans la barre de recherche (nom, référence, matricule, service)
2. Il clique sur un équipement dans la liste → chargement de la fiche via `getRapportEquipement`
3. La fiche affiche tout l'historique de vie de l'équipement

---

### 2. Localisation — Équipements par service

**Composant :** `LocalisationPanel`
**API utilisée :** `GET /gmao/equipements` (données locales, pas de rechargement)

**Description :** Vue géographique du parc — montre où se trouve chaque équipement dans l'hôpital (quel service), avec indicateurs de statut.

**Layout :**
```
[Recherche] [Filtre statut]  → X équipements

Légende: ● Actif  ● En réparation  ● Hors service

┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ ANES         │ │ BOP          │ │ SAU          │
│ 12 équip.    │ │ 8 équip.     │ │ 15 équip.    │
│ Actifs|Rép|HS│ │ Actifs|Rép|HS│ │ Actifs|Rép|HS│
│ • Moniteur   │ │ • Bistouri   │ │ • Défibrillat│
│ • Respirateur│ │ • Table op.  │ │ ...          │
└──────────────┘ └──────────────┘ └──────────────┘
```

**Fonctionnement :**
- Groupement automatique de tous les équipements par service
- Chaque carte de service affiche : nombre d'équipements, compteurs par statut (actifs/en réparation/hors service)
- Liste scrollable des équipements dans chaque service avec point coloré (statut)
- Filtres combinables : statut + texte libre

---

### 3. Historique — Timeline des interventions

**Composant :** `HistoriquePanel`
**API utilisée :** `GET /gmao/interventions?equipement_id=X`

**Description :** Chronologie complète de toutes les interventions de maintenance sur un équipement spécifique.

**Layout :**
```
[Sélectionner équipement ▼]  [Tous | Préventif | Correctif]

  Nom de l'équipement — N interventions
  [X Terminées] [Y En cours] [Z Planifiées]

  │
  ●── 15/03/2026 [Terminée] [Préventif] [Normal]
  │   Description de l'intervention
  │   Actions : vérification complète, nettoyage
  │   Technicien : M. Dupont  —  2.5h
  │
  ●── 01/02/2026 [Terminée] [Correctif] [Urgent]
  │   Remplacement capteur SPO2
  │   Pièces : capteur SPO2 réf. 445-B
  │
  ●── ...
```

**Fonctionnement :**
- Sélection de l'équipement via dropdown
- Filtrage par type (Tous / Préventif / Correctif)
- Chaque entrée montre : date, statut (badge coloré), type, priorité, description, actions effectuées, pièces remplacées, technicien, durée
- Dot coloré sur la timeline selon le statut (vert=terminé, jaune=en cours, bleu=planifié, orange=reporté)

---

### 4. Retrait — Sortie temporaire d'équipement

**Composant :** `RetraitPanel`
**API utilisée :** `PUT /gmao/equipements/:id` (updateEquipement existant)

**Description :** Permet d'enregistrer le retrait temporaire d'un équipement de son service (pour maintenance, transfert, contrôle). Le retrait change le statut en `en_reparation` et enregistre le motif dans les notes.

**Layout :**
```
┌───────────────────────┐  ┌───────────────────────────────┐
│ Enregistrer un retrait│  │ Équipements en retrait (N)    │
│                       │  │                               │
│ Équipement *          │  │ ● Moniteur HP  — SAU          │
│ Date de retrait *     │  │   [RETRAIT 15/03] Maintenance │
│ Motif * (dropdown)    │  │                [Remettre en   │
│ Destination/Responsab.│  │                 service]      │
│                       │  │                               │
│ [Enregistrer]         │  │ ● Respirateur  — BOP          │
└───────────────────────┘  └───────────────────────────────┘
```

**Motifs disponibles :**
- Maintenance préventive
- Panne / réparation
- Transfert vers un autre service
- Transfert vers un autre site
- Contrôle qualité
- Autre

**Fonctionnement :**
- Seuls les équipements `actifs` apparaissent dans la liste (on ne peut retirer que ce qui est en service)
- À la soumission : statut → `en_reparation`, note ajoutée : `[RETRAIT date] Motif: X | Destination: Y`
- La colonne droite liste tous les équipements actuellement en retrait (`en_reparation`)
- Bouton "Remettre en service" → remet le statut à `actif` en un clic

---

### 5. Réforme — Mise au rebus définitive

**Composant :** `ReformePanel`
**API utilisée :** `PUT /gmao/equipements/:id` (updateEquipement existant)

**Description :** Retire définitivement un équipement du parc actif. La réforme est une action irréversible avec confirmation obligatoire.

**Layout :**
```
┌───────────────────────┐  ┌───────────────────────────────┐
│ ATTENTION — action    │  │ Équipements réformés (N)      │
│ définitive            │  │                               │
│                       │  │ ● Défibrillateur — SAU        │
│ Équipement *          │  │   Réformé le 12/01/2026       │
│ Date de réforme *     │  │   [RÉFORME] Fin de vie        │
│ Motif * (dropdown)    │  │                               │
│ Observations          │  │ ● Respirateur — BOP           │
│                       │  │   Réformé le 05/11/2025       │
│ [Confirmer réforme]   │  └───────────────────────────────┘
└───────────────────────┘
```

**Motifs disponibles :**
- Fin de vie / amortissement
- Panne irréparable
- Obsolescence technologique
- Coût de réparation non rentable
- Remplacement par un nouvel équipement
- Décision administrative
- Autre

**Fonctionnement :**
- Une `confirm()` de sécurité avant validation
- À la soumission : statut → `hors_service`, `date_mise_au_rebus` renseignée, note ajoutée
- La colonne droite liste les équipements réformés avec date de réforme
- Tous les équipements (actifs ou en réparation) peuvent être réformés

---

## API backend utilisées (aucune nouvelle)

| Endpoint | Utilisé par |
|---|---|
| `GET /gmao/equipements` | Panorama (liste), Localisation, Historique (select), Retrait, Réforme |
| `GET /gmao/rapport/:id` | Panorama (fiche détaillée) |
| `GET /gmao/interventions?equipement_id=X` | Historique |
| `PUT /gmao/equipements/:id` | Retrait (→ en_reparation), Réforme (→ hors_service) |

> **Aucune modification backend n'a été nécessaire pour la Phase 2.**

---

## Fichiers modifiés

| Fichier | Modification |
|---|---|
| `frontend/src/pages/GMAOPage.jsx` | Ajout de 5 composants (PanoramaPanel, LocalisationPanel, HistoriquePanel, RetraitPanel, ReformePanel) + mise à jour wip/renderContent |

---

## Ce qui reste à faire (Phase 3+)

| Module | Contenu | Complexité |
|---|---|---|
| **Acquisition** | Workflow complet : expression du besoin → pro-forma → validation → réception → affectation service | Haute (nouveaux modèles BDD) |
| **Doc. Eqpt.** | Upload PDF/documents techniques liés à un équipement | Moyenne (endpoint upload + stockage) |
| **Contrats** | Gestion contrats de maintenance prestataires | Haute |
| **Demande** | Demandes d'intervention utilisateurs | Moyenne |
| **Pièces & stock** | Inventaire pièces de rechange + mouvements | Haute |
| **Budget** | Lignes budgétaires, achats, factures | Haute |
| **Stats** | Personnels, finance, équipements | Moyenne |

---

## Pour reprendre le travail (passation)

1. Ouvrir `frontend/src/pages/GMAOPage.jsx`
2. Les nouveaux panneaux commencent à la ligne marquée `// ─── PANORAMA PANEL`
3. Pour activer une nouvelle section : mettre `wip: false` dans `GMAO_MODULES` + ajouter un `case` dans `renderContent()`
4. La section `// ─── GMAO NAVIGATION CONFIG` contient la configuration complète du sidebar et de la toolbar
5. Le backend est dans `backend/src/controllers/gmaoController.js` et `backend/src/routes/gmao.js`
