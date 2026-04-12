# GMAO Phase 4 — Rapport de mise à jour
**Date :** 2026-03-27
**Périmètre :** Acquisitions, Contrats de maintenance, Pièces de rechange (stock), Migration Budget localStorage → PostgreSQL
**Statut :** ✅ Terminé — déployable

---

## 1. Vue d'ensemble

La Phase 4 finalise la couche "gestion des ressources" du module GMAO en y ajoutant :

| Module | Sections | Backend |
|--------|----------|---------|
| Acquisitions d'équipements | `parc_acquisition` | ✅ |
| Contrats de maintenance | `maint_contrats` | ✅ |
| Pièces de rechange | `pieces_liste`, `pieces_stock`, `pieces_mouvements` | ✅ |
| Budget (API) | `budget_lignes`, `budget_achats`, `budget_factures`, `budget_etat` | ✅ |

Le budget était déjà disponible en Phase 3 via localStorage ; il est désormais **persisté en base PostgreSQL**, avec un mécanisme de migration des données existantes.

---

## 2. Architecture — fichiers modifiés / créés

### 2.1 Modèles Sequelize (backend)

| Fichier | Table | Description |
|---------|-------|-------------|
| `backend/src/models/Contrat.js` | `gmao_contrats` | Contrats prestataires |
| `backend/src/models/PieceRechange.js` | `gmao_pieces_rechange` | Référentiel pièces |
| `backend/src/models/MouvementPiece.js` | `gmao_mouvements_pieces` | Entrées / sorties de stock |
| `backend/src/models/DemandeAcquisition.js` | `gmao_acquisitions` | Workflow achats |
| `backend/src/models/BudgetLigne.js` | `gmao_budget_lignes` | Lignes budgétaires |
| `backend/src/models/BudgetDepense.js` | `gmao_budget_depenses` | Achats + factures unifiés |

Tous les modèles utilisent `underscored: true` et des clés primaires `INTEGER AUTO_INCREMENT`.

Les associations sont déclarées dans `backend/src/models/index.js` :

```js
Contrat.belongsTo(User, { as: 'createur', foreignKey: 'created_by' });
PieceRechange.hasMany(MouvementPiece, { as: 'mouvements', foreignKey: 'piece_id', onDelete: 'CASCADE' });
MouvementPiece.belongsTo(PieceRechange, { as: 'piece', foreignKey: 'piece_id' });
MouvementPiece.belongsTo(User, { as: 'auteur', foreignKey: 'created_by' });
DemandeAcquisition.belongsTo(User, { as: 'demandeur', foreignKey: 'demandeur_id' });
DemandeAcquisition.belongsTo(Equipement, { as: 'equipement', foreignKey: 'equipement_id' });
BudgetLigne.belongsTo(User, { as: 'createur', foreignKey: 'created_by' });
BudgetDepense.belongsTo(User, { as: 'createur', foreignKey: 'created_by' });
```

### 2.2 Contrôleur Phase 4

Fichier : `backend/src/controllers/gmaoPhase4Controller.js`

Fonctions exportées :

| Fonction | Route | Rôle |
|----------|-------|------|
| `getContrats` / `createContrat` / `updateContrat` / `deleteContrat` | `/gmao/contrats` | CRUD contrats + calcul `joursRestants` |
| `getPieces` / `createPiece` / `updatePiece` / `deletePiece` | `/gmao/pieces` | CRUD pièces de rechange |
| `getMouvements` / `createMouvement` | `/gmao/pieces/mouvements` | Gestion mouvements de stock |
| `getAcquisitions` / `createAcquisition` / `updateAcquisition` / `deleteAcquisition` | `/gmao/acquisitions` | Workflow acquisitions |
| `getBudget` | `/gmao/budget` | Récupère lignes + dépenses pour une année |
| `createBudgetLigne` / `deleteBudgetLigne` | `/gmao/budget/lignes` | Lignes prévisionnelles |
| `createBudgetDepense` / `deleteBudgetDepense` | `/gmao/budget/depenses` | Achats et factures |
| `migrateBudget` | `/gmao/budget/migrate` | Import localStorage → BDD (idempotent) |

### 2.3 Routes

Fichier : `backend/src/routes/gmao.js`

14 nouvelles routes ajoutées dans la section `PHASE 4 ROUTES`. Toutes sont protégées par `protect` + `gmaoAccess`.

**Point d'attention** : La route `/pieces/mouvements` est déclarée **avant** `/pieces/:id` pour éviter que le paramètre `:id` ne capture "mouvements". Ce point était déjà géré dans le fichier.

### 2.4 Client API frontend

Fichier : `frontend/src/services/api.js`

20 méthodes ajoutées à l'objet `gmaoAPI` :

```js
// Contrats
getContrats(params), createContrat(data), updateContrat(id, data), deleteContrat(id)

// Pièces
getPieces(params), createPiece(data), updatePiece(id, data), deletePiece(id)
getMouvements(params), createMouvement(data)

// Acquisitions
getAcquisitions(params), createAcquisition(data), updateAcquisition(id, data), deleteAcquisition(id)

// Budget
getBudget(params), createBudgetLigne(data), deleteBudgetLigne(id)
createBudgetDepense(data), deleteBudgetDepense(id), migrateBudget(data)
```

### 2.5 Interface frontend

Fichier : `frontend/src/pages/GMAOPage.jsx`

#### Nouveaux composants

**`ContratsPanel`**
- Barre KPI : contrats actifs / expirant bientôt (≤30 j) / expirés / montant total
- Filtre par statut (actif, suspendu, résilié, expiré)
- Formulaire inline pour créer/modifier un contrat
- Tableau avec badge de statut coloré et affichage des jours restants (rouge si < 30 j)
- Actions : éditer, supprimer (avec confirmation)

**`PiecesPanel({ subSection })`**
- **Onglet `pieces_liste` / `pieces_stock`** : barre KPI (références totales, stock critique, valeur stock), recherche plein texte + filtre alerte stock, CRUD complet, badge vert/rouge selon stock, bouton `±Stock` pour saisir un mouvement
- **Onglet `pieces_mouvements`** : tableau des 200 derniers mouvements avec type (entrée 🟢 / sortie 🔴 / ajustement 🟡 / retour 🔵), date, motif, quantité
- Modal stock : saisie du type, quantité, date, motif, prix unitaire

**`AcquisitionPanel`**
- Formulaire de demande d'acquisition (désignation, type, quantité, service, priorité, budget estimé, motif)
- Liste avec badges de priorité (critique 🔴 / urgente 🟠 / normale 🟢) et statut
- Panneau de détail (volet droit) : stepper visuel à 5 étapes, boutons d'action contextuels selon le statut courant
- Workflow : `en_attente → approuvée → commandée → réceptionnée → affectée` (ou `rejetée`)
- Les dates de transition (approbation, commande, réception) sont auto-définies côté backend au changement de statut

**`BudgetPanelAPI({ subSection })`**
- Version API du panneau Budget (remplace `BudgetPanel` localStorage)
- **4 sous-sections** : Lignes budgétaires / Achats / Factures / État général
- `MigrateBar` : composant d'import unique affiché si des données existent dans localStorage (`gmao_budget_*`). Un clic lance `POST /gmao/budget/migrate` pour transférer en BDD puis vide le localStorage
- Lignes : ajout par catégorie + montant, suppression, récapitulatif par catégorie
- Achats : saisie date/catégorie/description/montant/fournisseur, liste, suppression
- Factures : saisie prestataire/numéro/montant HT+TTC/TVA/statut, liste avec badge statut, suppression
- État général : KPIs budget total / dépensé / restant + alertes si dépassement

#### Wiring dans `renderContent()`

```js
case 'parc_acquisition':   return <AcquisitionPanel equipements={equipements} />;
case 'maint_contrats':     return <ContratsPanel />;
case 'pieces_liste':
case 'pieces_stock':       return <PiecesPanel subSection={activeSection} />;
case 'pieces_mouvements':  return <PiecesPanel subSection="pieces_mouvements" />;
case 'budget_lignes':
case 'budget_achats':
case 'budget_factures':
case 'budget_etat':        return <BudgetPanelAPI subSection={activeSection} />;
```

#### Sections désormais actives (`wip: false`)

```
parc_acquisition    ✅
maint_contrats      ✅
pieces_liste        ✅
pieces_stock        ✅
pieces_mouvements   ✅
budget_lignes       ✅  (maintenant API)
budget_achats       ✅  (maintenant API)
budget_factures     ✅  (maintenant API)
budget_etat         ✅  (maintenant API)
```

---

## 3. Logiques métier clés

### 3.1 Gestion du stock (MouvementPiece)

La fonction `createMouvement` du contrôleur est **atomique** :

1. Charger la pièce (`findByPk`)
2. Calculer le nouveau stock selon le type :
   - `entree` / `retour` → `newStock = stock + quantite`
   - `sortie` → validation `stock >= quantite`, puis `newStock = stock - quantite`
   - `ajustement` → `newStock = quantite` (valeur absolue)
3. Mettre à jour `quantite_stock` sur la pièce
4. Créer l'enregistrement `MouvementPiece`

Cela garantit qu'il n'y a **jamais de stock négatif** et que chaque mouvement est traçable.

### 3.2 Workflow Acquisitions

5 statuts possibles avec transitions contrôlées côté frontend + auto-date côté backend :

```
en_attente
   ├─→ approuvee  (date_approbation = aujourd'hui)
   │      └─→ commandee  (date_commande = aujourd'hui)
   │                └─→ receptionnee  (date_reception = aujourd'hui)
   │                          └─→ affectee  (lier à un équipement)
   └─→ rejetee    (motif_rejet requis)
```

### 3.3 Alertes contrats

Le backend calcule `joursRestants = ceil((date_fin - today) / ms_par_jour)` pour chaque contrat et retourne deux flags booléens :

- `expirationProche` : vrai si `joursRestants ≤ alerte_renouvellement` (défaut 30 j) **et** pas encore expiré
- `expire` : vrai si `joursRestants ≤ 0`

Ces flags sont utilisés dans le frontend pour colorier les badges et les lignes du tableau.

### 3.4 Migration Budget

Le endpoint `POST /gmao/budget/migrate` est **idempotent** :

1. Il efface toutes les lignes et dépenses de l'année concernée
2. Il réinsère les données envoyées

Le composant `MigrateBar` lit dans localStorage les clés `${annee}_lignes`, `${annee}_achats`, `${annee}_factures`, construit le payload et appelle l'endpoint. En cas de succès, il vide les clés localStorage correspondantes.

---

## 4. Prérequis de déploiement

### 4.1 Base de données

Les 6 nouvelles tables sont créées **automatiquement** par Sequelize au démarrage (`sync({ alter: true })` ou `sync({ force: false })`).

Si vous utilisez des migrations Sequelize CLI, générez-les manuellement à partir des modèles.

### 4.2 Variables d'environnement

Aucune variable supplémentaire n'est requise par la Phase 4.

### 4.3 Droits d'accès

L'accès au module GMAO est restreint aux rôles `admin` et aux emails dans `GMAO_EMAILS` (liste dans `backend/src/routes/gmao.js`).

---

## 5. Sections encore en WIP

Les sections suivantes restent à développer dans une phase ultérieure :

| Section | ID | Raison |
|---------|----|--------|
| Demande d'intervention | `maint_demande` | Formulaire de ticket curatif |
| Listing opérationnel | `maint_listing_op` | Vue planning semaine |
| Historique maintenance | `maint_historique` | Timeline globale |
| Stats équipements | `stats_equipements` | Toujours via AnalyseTab |
| Panorama maintenance | `tool_panorama_maint` | Toujours via AnalyseTab |

---

## 6. Récapitulatif des phases GMAO

| Phase | Périmètre | Statut |
|-------|-----------|--------|
| Phase 1 | Redesign UI sidebar (style Optimus) | ✅ |
| Phase 2 | Panorama, Localisation, Historique, Retrait, Réforme | ✅ |
| Phase 3 | Budget localStorage, Stats Personnels, Stats Finance, Analyses 20/80 | ✅ |
| Phase 4 | Acquisitions, Contrats, Pièces stock, Budget PostgreSQL | ✅ |

---

*Rapport généré le 2026-03-27 — GMAO GED-APP v4.0*
