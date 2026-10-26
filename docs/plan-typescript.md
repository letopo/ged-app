# Plan : passer le serveur de la GED en TypeScript

> Préparé le 25/10/2026. À démarrer **après le déploiement du lundi 26/10** : on ne mélange pas la migration et le déploiement.

## Objectif

Rendre le serveur (`backend/`) plus fiable **sans rien changer pour les utilisateurs**. Les erreurs de nom de champ, de forme de données (`metadata`) et de paramètres doivent être détectées à l'écriture, et non en production.

L'interface (`frontend/`, React) est hors périmètre. Elle pourra suivre plus tard, car Vite gère TypeScript nativement.

## Point de départ

| Élément | État actuel |
|---|---|
| Code serveur | ~31 000 lignes de JavaScript (modules ES, `"type": "module"`), Node 20 |
| Contrôleurs | 52 fichiers, ~17 200 lignes (les plus gros : `workflowController` 1 660, `documentController` 920, `vehicleController` 860) |
| Modèles | 74 fichiers Sequelize (`sequelize.define`), ~5 700 lignes |
| Utilitaires | 34 fichiers, ~4 200 lignes |
| Routes / middleware / services | ~3 500 lignes |
| Migrations | 72 fichiers `.cjs` (sequelize-cli) : **elles restent en JavaScript** |
| Tests | Jest et Supertest installés, **aucun test écrit** |
| Particularités | contexte tenant via `cls-hooked`, 29 `await import()` (dépendances circulaires évitées), données JSON libres dans `documents.metadata` |

## Principes

1. **Progressif** : JavaScript et TypeScript cohabitent (`allowJs`). On convertit fichier par fichier, et la GED fonctionne à chaque étape.
2. **Une PR par lot**, **sans aucun changement fonctionnel** dans les PR de conversion. Une évolution demandée pendant la migration se fait dans sa propre PR.
3. **Même comportement** : TypeScript produit le même JavaScript, et les types disparaissent à l'exécution.
4. **Chaque lot est vérifié** : vérification des types, tests, build Docker contrôlé (cf. piège VirtioFS sur le Mac), essai dans le navigateur.
5. **Retour arrière simple** : chaque lot est une PR qu'on peut annuler.

## Étapes

### Étape 0 : outillage (½ journée)

> ✅ **Fait le 26/10/2026.** Choix retenus :
> - TypeScript 7 (compilateur natif, ~3 s pour tout le serveur) et `tsx` pour le mode dev.
> - `src/server.js` reste en JavaScript : aucun fichier n'est converti à l'étape 0. Le script `dev` lance donc `tsx watch src/server.js`.
> - L'image ne garde de `src/` que `src/config/database-cli.cjs`, lu par sequelize-cli via `.sequelizerc`.
> - Le JavaScript produit dans `dist/` a été comparé fichier par fichier à `src/` : il est identique, à la mise en forme près.
> - CI : `.github/workflows/backend-ci.yml` (typecheck, build, test) sur chaque PR qui touche `backend/`.
> - **Attention pour le dev local** : un `docker cp` vers `/app/src` n'a plus d'effet. Il faut viser `/app/dist`, ou reconstruire l'image.

- Ajouter `typescript`, `@types/node`, `@types/express`, `@types/multer`, `@types/jsonwebtoken`, `@types/cls-hooked` (devDependencies).
- `backend/tsconfig.json` :
  - `module`/`moduleResolution: NodeNext`, `target: ES2022` ;
  - `allowJs: true`, `checkJs: false` ;
  - `outDir: dist`, `rootDir: src` ;
  - `strict: false` au départ.
- Scripts :
  - `typecheck` (`tsc --noEmit`) ;
  - `build` (`tsc`) ;
  - `dev` via `tsx watch src/server.ts` ;
  - `start` = `node dist/server.js`.
- Dockerfile : une étape de build lance `npm run build`, et l'image ne contient que `dist/` et les dépendances de production. Les migrations `.cjs` et `database/` sont copiées telles quelles.
- GitHub Actions : `typecheck` et `test` à chaque PR (bloquant).
- **Résultat attendu** : la GED tourne depuis `dist/`, à l'identique. On le vérifie par un build et un essai complet en local avant tout autre lot.

### Étape 1 : filet de sécurité, des tests sur les règles sensibles (2 jours)

À écrire **avant** de convertir, pour prouver que rien ne change :

- **Droits d'accès** : `hasDocumentReadAccess` et `buildDocumentAccessWhere` (personnel / service / validateurs / transmis, plafonds RH et Compta).
- **Demande de permission** : délai de 2 jours ouvrables (vendredi → mardi), administrateurs exemptés, intérim saisi une seule fois.
- **Signature manuscrite** : document verrouillé (re-signature, ajout de page, circuit refusés), jeton de signature à distance à usage unique.
- **Circuits de validation** : création, approbation, rejet, relance (au moins le cas nominal).
- **Parc véhicules** : `evaluateAnswers`, `deadlineStatus`, calcul de la prochaine échéance, droits (`canManage` / `canCheck`).
- **Indemnités de mission** : `missionIndemniteCalculator`, avec les règles confirmées le 18/09.

Les tests utilisent une base PostgreSQL de test (conteneur dédié), lancée par `npm test`.

### Étape 2 : types partagés (1 à 2 jours)

- `src/types/express.d.ts` : `req.user`, `req.tenantId`, `req.tenant` sur `Request`.
- `src/types/metadata.ts` décrit les formes réelles de `documents.metadata` :
  - `manualSignature`, `interim` ;
  - `signatureZones`, `mergedFrom` ;
  - champs de l'ordre de mission (`type_mission`, `vehicle_id`, missionnaires…) ;
  - périodes de permission.
- Modèles : passer en classes Sequelize typées (`Model<InferAttributes, InferCreationAttributes>`), à commencer par `Document`, `User`, `Workflow`, `Vehicle*`, `TenantSettings`.

### Étape 3 : conversion, du plus sensible au moins sensible (8 à 12 jours au total, étalés)

| Lot | Contenu | Pourquoi d'abord |
|---|---|---|
| A | `utils/` sans dépendances (`vehicleChecklist`, `stampSize`, `tenantSettings`, `signatureRequests`, `thumbnails`…) | Facile, sert de modèle aux lots suivants |
| B | `utils/documentVisibility`, `posteResolver`, `middleware/` (`auth`, `tenant`, `upload`) | Sécurité : qui voit quoi |
| C | `manualSignatureController`, `routes/signaturePublic` | Preuve et verrouillage des signatures |
| D | `documentController`, `routes/documents` | Cœur de la GED |
| E | `workflowController`, `utils/workflowEngine`, `posteChain`, `ordreMissionChain` | Le plus gros fichier, avec les règles de circuits |
| F | `vehicleController`, `vehicleFleetController`, `vehicleAlerts` | Module récent, bien délimité |
| G | Sage, PHP (patients, consultations, factures), compta | Intégrations externes |
| H | GMAO, tickets, plannings, chat, reste | Faible risque |

**Rythme conseillé** : un lot par semaine, à côté des évolutions habituelles, soit environ 2 à 3 mois. En continu, compter 3 à 4 semaines de travail.

### Étape 4 : durcissement (2 à 3 jours)

- Activer progressivement `strict` (`noImplicitAny`, puis `strictNullChecks`), dossier par dossier.
- Optionnel : valider les corps de requête avec un schéma (zod) sur les routes sensibles : signature, upload, circuits, parc véhicules.
- Supprimer `allowJs` quand tout est converti.

## Risques et parades

| Risque | Parade |
|---|---|
| Sequelize s'écrit mal en TypeScript avec `sequelize.define` | Convertir les modèles en classes, au fil des lots (étape 2) |
| `cls-hooked` (tenant automatique dans les requêtes) | Ne pas y toucher : on se contente de le typer, et un test vérifie qu'un `create()` reçoit bien le `tenantId` |
| `await import()` utilisés pour casser des cycles | Conserver tel quel ; corriger les cycles seulement dans un lot dédié |
| Images Docker parfois périmées sur le Mac (VirtioFS) | Vérifier le contenu de l'image après chaque build (`grep` sur `dist/`), comme aujourd'hui |
| Ralentissement des évolutions | Lots courts, jamais bloquants ; une évolution urgente passe toujours avant |
| Déploiement VM | Le Dockerfile change à l'étape 0 seulement : un premier déploiement « à blanc » valide la chaîne |

## Ce qu'on gagne

- **Erreurs de champ ou de forme de données** (`metadata`, `req.body`, attributs Sequelize) signalées dans l'éditeur et bloquées par la CI.
- **Renommer ou modifier une fonction** : tous les endroits concernés sont listés automatiquement.
- **Code auto-documenté**, plus simple à reprendre par un autre développeur.
- **Tests automatiques** sur les règles métier sensibles. Ce gain vient de l'étape 1 et compte autant que TypeScript lui-même.

## Première action après lundi

Étape 0 (outillage + build Docker depuis `dist/`) dans une PR dédiée, vérifiée en local, puis déployée seule sur la VM pour valider la chaîne.
