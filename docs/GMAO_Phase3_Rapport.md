# GMAO — Rapport de Mise à Jour · Phase 3 : Budget, Statistiques & Outils d'Analyse

**Date :** 27/03/2026
**Fichier modifié :** `frontend/src/pages/GMAOPage.jsx`
**Phase :** 3 / 4
**Statut :** ✅ Terminé — Build vérifié (0 erreur)

---

## Résumé

La Phase 3 complète deux grandes sections de la GMAO :
1. **Statistiques Annuelles des activités** → Personnels + Finance (2 nouveaux panneaux)
2. **Budget de maintenance** → 4 sous-sections entièrement fonctionnelles
3. **Outils d'Analyse (toolbar)** → 3 outils activés : Pièces & consommables, Analyse 20/80, Consommation du budget

**Total : 9 nouvelles sections activées** (`wip: false`), **6 nouveaux composants**, **0 modification backend**.

---

## Sections activées (wip: false)

| Section | Module | Statut Phase 3 |
|---|---|---|
| **Personnels** | Statistiques Annuelles | ✅ Implémenté |
| **Finance** | Statistiques Annuelles | ✅ Implémenté |
| **Ligne budgétaire** | Budget de maintenance | ✅ Implémenté |
| **Achats et autres dépenses** | Budget de maintenance | ✅ Implémenté |
| **Factures de prestation** | Budget de maintenance | ✅ Implémenté |
| **État du budget** | Budget de maintenance | ✅ Implémenté |
| **Pièces & consommables** | Toolbar Outils d'Analyse | ✅ Implémenté |
| **Analyse 20/80** | Toolbar Outils d'Analyse | ✅ Implémenté |
| **Consommation du budget** | Toolbar Outils d'Analyse | ✅ Implémenté |

---

## Détail des nouveaux panneaux

---

### 1. StatsPersonnelsPanel — Statistiques des techniciens

**Composant :** `StatsPersonnelsPanel`
**API :** `GET /gmao/interventions?date_debut=...&date_fin=...`

**Objectif :** Savoir quel technicien travaille le plus, si la charge est bien répartie, détecter les risques de surcharge.

**Fonctionnalités :**
- Sélection de l'année (2023 à 2026)
- Groupement client-side par technicien (nom prénom depuis le join User)
- **Carte "Technicien le + actif"** avec compteur
- **Alerte rouge automatique** si un technicien dépasse 50% des interventions à lui seul → recommande recrutement ou redistribution
- **Tableau de classement** avec :
  - Rang (médaille or/argent/bronze)
  - Nombre total d'interventions et % du total
  - Répartition préventif / correctif / terminées
  - Heures cumulées (durée réelle)
  - Barre de progression relative au leader

---

### 2. StatsFinancePanel — Analyse financière de la maintenance

**Composant :** `StatsFinancePanel`
**API :** réutilise `analytics` déjà chargé (GET /gmao/analytics)

**Objectif :** Estimer le coût financier de la maintenance à partir de la durée réelle des interventions × un taux horaire configurable.

**Fonctionnalités :**
- **Taux horaire configurable** (bouton ⚙️ → saisie → sauvegarde en localStorage, défaut = 50 €/h)
- **4 KPIs financiers** : Coût total, Coût préventif, Coût correctif, Durée moyenne
- **Graphe coût mensuel** — barres par mois sur l'année en cours
- **Répartition préventif/correctif** — barres horizontales avec pourcentages
- **Coût par service** — classement horizontal avec barres de proportion
- Note de transparence : "Estimation basée sur durée réelle × taux horaire"

**Formule de calcul :**
```
Coût = nb interventions terminées × durée moyenne (avgDuree) × taux horaire (€/h)
```

---

### 3. BudgetPanel — Budget de maintenance (4 sous-sections)

**Composant :** `BudgetPanel({ subSection })`
**Stockage :** `localStorage` (clé `gmao_budget_data`) — prévu migration backend Phase 4

**Objectif :** Permettre la saisie et le suivi du budget de maintenance par année budgétaire. La même interface s'adapte selon la sous-section active.

#### 3a. Ligne budgétaire
- Formulaire : catégorie (dropdown 8 options), montant alloué, description
- Liste des lignes de l'année sélectionnée avec total
- Suppression individuelle

**Catégories disponibles :**
Préventif · Correctif · Pièces de rechange · Contrats externes · Consommables · Formation · Outillage · Autre

#### 3b. Achats et autres dépenses
- Formulaire : date, description, fournisseur, montant, catégorie
- Liste chronologique inverse avec total
- Suppression individuelle

#### 3c. Factures de prestation
- Formulaire : date, n° facture, prestataire, montant HT, TVA, montant TTC, statut
- Statuts : En attente / Payée / Contestée (badges colorés)
- Liste avec total TTC

#### 3d. État du budget
- **Jauge visuelle** de consommation (verte / orange / rouge selon le %)
- **3 compteurs** : Budget alloué / Total dépenses / Solde disponible
- Alerte si budget > 90% consommé
- **Tableau par catégorie** : Alloué vs Dépensé vs Reste (calcul croisé achats + factures)

---

### 4. ToolPanoramaPiecesPanel — Panorama pièces & consommables

**Composant :** `ToolPanoramaPiecesPanel`
**API :** `GET /gmao/interventions?statut=terminee`

**Objectif :** Identifier quelles pièces sont le plus fréquemment utilisées, quels services consomment le plus, et à quelle fréquence.

**Fonctionnement :** Parse le champ texte libre `pieces_remplacees` de chaque intervention (split par `,;/\n`).

**Affichage :**
- 3 compteurs : total pièces utilisées / interventions concernées / références distinctes
- **Top 12 pièces** avec barres horizontales et rang (or/argent/bronze pour top 3)
- **Services les plus consommateurs** — barres horizontales par service
- **Fréquence mensuelle** — graphe en barres miniature
- Message explicatif si champ `pieces_remplacees` vide sur toutes les interventions

---

### 5. ToolAnalyse2080Panel — Analyse 20/80 (Pareto)

**Composant :** `ToolAnalyse2080Panel`
**API :** réutilise `analytics.topDefaillants` (déjà chargé)

**Objectif :** Identifier les équipements qui concentrent 80% des interventions correctives (pannes). Permet de prioriser les actions de remplacement ou de maintenance renforcée.

**Fonctionnement :**
- Calcule le cumul progressif des pannes pour chaque équipement
- Trouve le seuil où le cumulatif dépasse 80%
- Colorie en rouge les équipements au-delà du seuil, gris les autres

**Affichage :**
- **Résumé Pareto** : X équipements critiques (représentent 80% des pannes), Total pannes, Équipement le + défaillant
- **Diagramme de Pareto** — barres verticales avec ligne de seuil pointillée rouge (label "seuil 80%")
- **Tableau détaillé** : Rang / Équipement / Service / Nb pannes / % Cumulé / Zone (Critique / Normal)

---

### 6. ToolConsoBudgetPanel — Analyse de la consommation du budget

**Composant :** `ToolConsoBudgetPanel`
**API :** réutilise `analytics` (déjà chargé)

**Objectif :** Vue d'ensemble de l'efficacité et de la consommation de l'activité de maintenance. Répond à : "Est-ce qu'on optimise ? Qu'est-ce qui coûte le plus ? Est-ce efficace ?"

**Affichage :**
- **4 KPIs** : Taux de conformité (coloré selon seuil), Interventions de l'année, Part préventif %, Retards
- **Répartition Préventif / Correctif** — barres avec % + barre terminées/planifiées
- **Distribution par service** — graphe en barres colorées (6 couleurs distinctes)
- **Activité mensuelle** — graphe double barre (teal = terminées, gris = en attente) avec légende
- **Recommandations automatiques** (générées selon les données) :
  - ⚠️ Si taux conformité < 70% → renforcer le préventif
  - 🔴 Si retards > 5 → mobiliser des ressources
  - ⚠️ Si part corrective > 40% → investir en préventif
  - ℹ️ Service le plus actif signalé
  - ✅ Message positif si tout va bien

---

## Icônes ajoutées

```js
Users, TrendingUp, DollarSign, Zap, PieChart, Settings2,
ArrowUpRight, ArrowDownRight, Layers, ShoppingCart, Receipt
```

---

## API backend utilisées (aucune nouvelle)

| Endpoint | Utilisé par |
|---|---|
| `GET /gmao/analytics` | StatsFinance, Analyse 20/80, ConsoBudget |
| `GET /gmao/interventions` | StatsPersonnels, PanoramaPièces |

> **Aucune modification backend n'a été nécessaire pour la Phase 3.**
> Le module Budget utilise **localStorage** comme stockage temporaire.

---

## Fichiers modifiés

| Fichier | Modification |
|---|---|
| `frontend/src/pages/GMAOPage.jsx` | +6 composants, +9 wip→false, +9 cases dans renderContent(), +11 icônes |

---

## Architecture du stockage Budget (localStorage)

```
localStorage['gmao_budget_data'] = {
  "2026_lignes":   [{ id, categorie, montant, description }, ...],
  "2026_achats":   [{ id, date, description, fournisseur, montant, categorie }, ...],
  "2026_factures": [{ id, date_facture, numero, prestataire, montant_ht, tva, montant_ttc, statut }, ...],
  "2025_lignes":   [...],
  ...
}
```

La clé est `{annee}_{type}` pour permettre le multi-année.

---

## Ce qui reste à faire (Phase 4)

| Module | Contenu | Priorité |
|---|---|---|
| **Acquisition** | Workflow d'achat complet (expression de besoin → validation → réception) | Haute |
| **Doc. Eqpt.** | Upload PDF/docs techniques par équipement | Moyenne |
| **Contrats** | Gestion des contrats prestataires | Haute |
| **Demande** | Demandes d'intervention utilisateurs | Haute |
| **Pièces (stock)** | Base de données pièces + mouvements de stock | Haute |
| **Budget → BDD** | Migration du budget localStorage vers PostgreSQL | Moyenne |
| **Listing Op.** | Export des opérations en PDF/Excel | Faible |
| **Historique Maintenance** | Historique global (toutes interventions) filtrable | Faible |

---

## Pour reprendre le travail (passation)

1. **Nouveaux panneaux Phase 3** : chercher dans `GMAOPage.jsx` les commentaires `// ─── STATS PERSONNELS PANEL`, `// ─── STATS FINANCE PANEL`, etc.
2. **Activation d'une section** : dans `GMAO_MODULES`, mettre `wip: false` + ajouter un `case` dans la fonction `renderContent()` (chercher le bloc `switch (activeSection)`)
3. **Budget localStorage** : la clé de stockage est `BUDGET_STORE_KEY = 'gmao_budget_data'`. Pour migrer en backend : créer les tables `budget_lignes`, `achats_depenses`, `factures_prestation` en PostgreSQL et remplacer `loadBudgetData()`/`saveBudgetData()` par des appels API.
4. **Taux horaire** (Finance) : stocké sous la clé localStorage `gmao_taux_horaire`, modifiable via le bouton ⚙️ dans le panneau Finance.
