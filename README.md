# 🏥 Application GED - Hôpital Saint Jean de Malte

> Système intégré de gestion hospitalière avec modules de documents, workflows, planning, tickets et suivi technique

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)

---

## 📋 Table des Matières

- [Vue d'ensemble](#-vue-densemble)
- [Modules Fonctionnels](#-modules-fonctionnels)
- [Architecture](#-architecture)
- [Prérequis](#-prérequis)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Déploiement Docker](#-déploiement-docker)
- [Utilisation](#-utilisation)
- [API Documentation](#-api-documentation)
- [Sécurité](#-sécurité)
- [Maintenance](#-maintenance)
- [Support](#-support)

---

## 🎯 Vue d'ensemble

L'application GED (Gestion Électronique de Documents) est une plateforme complète développée pour l'Hôpital Saint Jean de Malte à Njombé, Cameroun. Elle centralise la gestion documentaire, administrative, technique et opérationnelle de l'établissement dans une interface moderne et intuitive.

### 🌟 Points Forts

- **Architecture Modulaire** : 10+ modules indépendants et interopérables
- **Système de Licences** : Activation sélective des fonctionnalités par licence cryptographique (RSA)
- **Temps Réel** : Notifications push, Socket.IO pour les mises à jour instantanées
- **Multi-Rôles** : Permissions granulaires (Admin, Validateur, RH, Portail, Accueil, Caisse, Utilisateur)
- **Responsive Design** : Interface adaptée desktop, tablette et mobile
- **Production Ready** : Déploiement Docker avec Nginx, PostgreSQL

---

## 🧩 Modules Fonctionnels

### 1️⃣ **Gestion Électronique de Documents (GED)**

**📂 Fonctionnalités**
- Upload multi-formats (PDF, Word, Excel, Images)
- OCR automatique (Tesseract.js) pour extraction de texte
- Recherche full-text dans le contenu des documents
- Prévisualisation intégrée (PDF viewer)
- Gestion des versions et métadonnées
- Catégorisation par type de document

**🔄 Workflow de Validation**
- Circuit de validation multi-niveaux configurable
- Assignation séquentielle de validateurs
- Approbation avec commentaires
- Rejet avec motif obligatoire
- Tableau de bord des tâches en attente
- Validation en masse (bulk validation)
- Statistiques temps réel (taux de validation, délais moyens)
- Historique complet des actions

**📊 Statistiques & Rapports**
- Répartition des documents par statut
- Performance des validateurs
- Temps de traitement moyen
- Export de rapports

### 2️⃣ **Système de Tickets & Files d'Attente**

**🎟️ Gestion des Tickets**
- Génération automatique de numéros de ticket (format : P-XXXX, C-XXXX)
- Affichage public sur écran TV (PublicDisplay)
- Système de priorités (Normal, Urgent, VIP)
- Attribution automatique aux positions de service

**🏥 Modules de Service**
- **Portail d'Accueil** : Création de tickets patients
- **Accueil Consultation** : Gestion de la file d'attente consultation
- **Caisse** : Traitement des paiements et clôture des tickets

**📡 Temps Réel**
- Appels de patients en temps réel (Socket.IO)
- Mise à jour automatique des écrans publics
- Notifications sonores pour les agents
- Statistiques live (temps d'attente, nombre en file)

### 3️⃣ **Système Trello / Kanban Technique**

**🔧 Suivi des Interventions**
Tableaux Kanban par service :
- **Moyens Généraux (MG)** : Maintenance bâtiment, travaux
- **Biomédical** : Maintenance équipements médicaux
- **Informatique** : Support IT

**📋 Gestion des Cartes**
- Création de tâches avec description, priorité, date limite
- Assignation aux techniciens
- Drag & Drop entre colonnes (À faire → En cours → Bloqué → Terminé)
- Pièces jointes (photos, rapports)
- Commentaires collaboratifs
- Historique des activités
- Synchronisation automatique avec les Demandes de Travaux (DT)

**📝 Détails Techniques**
- Liste des pièces utilisées (nomenclature)
- Journal d'intervention
- Équipement concerné
- Date de complétion
- Indicateurs de retard

### 4️⃣ **Planning & Horaires (Schedules)**

**📅 Gestion des Plannings**
Types de planning :
- Planning infirmier
- Planning médical
- Planning garde

**🔄 Workflow de Validation**
1. Création par le responsable de service
2. Validation Directrice des Soins (DDS)
3. Validation Médecin Chef
4. Validation Directeur Général (DG)

**✨ Fonctionnalités**
- Création visuelle du planning (grille mois/employés)
- Assignation des postes de travail
- Gestion des types de shifts (Jour, Nuit, Repos, Congé)
- Calcul automatique des heures de travail
- Génération PDF avec signatures numériques
- Export vers le système documentaire (workflow)
- Calendrier interactif avec jours fériés camerounais

### 5️⃣ **Gestion des Employés (RH)**

**👥 Base de Données Employés**
- Informations personnelles (Nom, Prénom, Matricule)
- Affectation service/poste
- Contrat (CDI, CDD, Stage)
- Coordonnées (Téléphone, Email, Adresse)
- Date d'embauche
- Statut (Actif, Inactif)

**📊 Fonctionnalités RH**
- Import/Export CSV
- Recherche et filtres avancés
- Gestion par service
- Historique des affectations
- Export de rapports pour paie

### 6️⃣ **Système de Facturation (Invoices)**

**🗂️ Arborescence de Dossiers**
- Création de dossiers hiérarchiques illimitée
- Déplacement de documents entre dossiers
- Renommage et suppression de dossiers
- Recherche par période (date début/fin)

**📄 Gestion des Factures**
- Upload et classement des factures
- Association aux dossiers clients/fournisseurs
- Filtrage par période
- Prévisualisation PDF
- Métadonnées (numéro facture, date, montant)

### 7️⃣ **Demandes d'Achat**

**🛒 Processus d'Achat**
- Formulaire de demande d'achat
- Multi-articles avec quantités et prix
- Calcul automatique des totaux (HT, TVA, TTC)
- Upload de pièces justificatives
- Service demandeur et bénéficiaire

**📋 Suivi**
- Statuts : En attente, Approuvée, Rejetée, En cours, Livrée
- Tableau de bord des demandes
- Filtres par statut, service, période
- Export PDF de la demande

### 8️⃣ **Templates de Documents**

**📝 Génération Automatique**
Documents prédéfinis avec saisie assistée :

**Documents Administratifs**
- Ordre de Mission
- Demande de Permission
- Demande de Permutation
- Demande d'Explication

**Documents Techniques**
- Demande de Travaux (DT)
- Demande de Besoin (DB)
- Fiche de Suivi d'Équipements

**Documents Financiers**
- Pièce de Caisse
- Bon de Commande
- Bon de Sortie

**Documents Médicaux**
- Planning Opératoire

**✨ Fonctionnalités**
- Remplissage de formulaires interactifs
- Génération PDF automatique
- Signature numérique multi-utilisateurs
- Positionnement des signatures configurable par document
- Upload automatique dans la GED
- Workflow de validation intégré

### 9️⃣ **Signatures Numériques**

**✍️ Système de Signature**
- Upload de signatures manuscrites (images PNG)
- Zones de signature configurables par document
- Ajout de cachets officiels
- Traçabilité (qui a signé, quand)
- Validation d'authenticité

**📐 Configuration**
Fichier `documentSignatureConfig.js` :
- Nombre de signatures
- Positions (X, Y)
- Tailles (largeur/hauteur)
- Layout (horizontal/vertical)

### 🔟 **Calendrier & Jours Fériés**

**📆 Fonctionnalités**
- Calendrier interactif avec événements
- Jours fériés camerounais pré-configurés
- Affichage des permissions et congés
- Filtrage par période
- Export iCal (à venir)

**🇨🇲 Jours Fériés Inclus**
- Jour de l'An, Fête de la Jeunesse
- Fête du Travail, Fête Nationale
- Aïd el-Fitr, Aïd el-Adha
- Noël, etc.

### 1️⃣1️⃣ **Notifications Temps Réel**

**🔔 Types de Notifications**
- **Push Notifications** : Notifications navigateur (Web Push API)
- **Socket.IO** : Mises à jour temps réel
- **Notifications sonores** : Alertes audio pour événements urgents

**🎯 Événements Notifiés**
- Nouvelle tâche de validation
- Appel de ticket (file d'attente)
- Commentaire sur carte Trello
- Changement de statut de document
- Mise à jour de planning

### 1️⃣2️⃣ **Système de Licences**

**🔐 Licences Cryptographiques**
- Génération de licences JWT (RSA-256)
- Clés privée/publique (2048 bits)
- Activation/désactivation de modules
- Date d'expiration
- Nom du client

**📦 Modules Activables**
- `trello` : Système Kanban technique
- `signature` : Signatures numériques
- `export_rh` : Exports RH avancés

**⚙️ Configuration**
Script `generate_license.js` pour créer des licences :
```bash
node generate_license.js
```

---

## 🏗️ Architecture

### Stack Technologique

**Backend**
```
Node.js v18+ / Express.js
├── PostgreSQL 15+ (Base de données)
├── Sequelize ORM (Modèles & Migrations)
├── JWT (Authentification)
├── Multer (Upload de fichiers)
├── Tesseract.js (OCR)
├── Socket.IO (Temps réel)
├── Web Push (Notifications)
├── pdf-lib (Génération PDF)
└── Nodemailer (Emails)
```

**Frontend**
```
React 18 / Vite
├── Tailwind CSS (Styling)
├── Lucide React (Icônes)
├── Axios (API Client)
├── React Router (Navigation)
├── Socket.IO Client (WebSockets)
├── jsPDF (PDF Génération)
├── html2canvas (Capture d'écran)
├── React Context (State Management)
└── Service Worker (PWA)
```

**DevOps**
```
Docker & Docker Compose
├── Nginx (Reverse Proxy & HTTPS)
├── PostgreSQL (Container)
├── Multi-stage builds
└── Healthchecks
```

### Structure des Dossiers

```
ged-app/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration (DB, JWT, License)
│   │   ├── controllers/     # Logique métier (20+ contrôleurs)
│   │   ├── models/          # Modèles Sequelize (30+ tables)
│   │   ├── routes/          # Endpoints API REST
│   │   ├── middleware/      # Auth, Upload, License Check
│   │   ├── services/        # OCR, Push Notifications
│   │   └── utils/           # Helpers (Mailer, Socket, PDF)
│   ├── database/
│   │   ├── migrations/      # 30+ migrations SQL
│   │   └── seeders/         # Données initiales
│   ├── uploads/             # Stockage fichiers
│   ├── fonts/               # Polices pour PDF
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/      # 30+ composants React
│   │   ├── pages/           # Pages principales (20+)
│   │   ├── contexts/        # Auth, Theme
│   │   ├── hooks/           # Custom hooks (notifications)
│   │   ├── services/        # API Client, Schedules
│   │   ├── utils/           # Helpers (dates, push)
│   │   └── templates/       # Templates de documents
│   ├── public/
│   │   ├── sw.js           # Service Worker
│   │   └── manifest.json   # PWA Manifest
│   └── Dockerfile
├── docker/
│   ├── nginx.conf          # Configuration Nginx
│   └── init-db.sql         # Init PostgreSQL
├── docker-compose.yml      # Orchestration
└── README.md
```

---

## 📦 Prérequis

### Développement

- **Node.js** v18 ou supérieur
- **npm** v9 ou supérieur
- **PostgreSQL** v15 ou supérieur
- **Git** (version control)

### Production (Docker)

- **Docker** v24+ 
- **Docker Compose** v2.0+
- Serveur Linux (Ubuntu 20.04+ recommandé)
- 2GB RAM minimum (4GB recommandé)
- 10GB espace disque

---

## 🚀 Installation

### 1️⃣ Cloner le Projet

```bash
git clone https://github.com/votre-org/ged-app.git
cd ged-app
```

### 2️⃣ Configuration Base de Données

**Créer la base de données PostgreSQL :**

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE ged_hsjm;
CREATE USER ged_admin WITH PASSWORD 'votre_mot_de_passe_securise';
GRANT ALL PRIVILEGES ON DATABASE ged_hsjm TO ged_admin;
\q
```

### 3️⃣ Configuration Backend

```bash
cd backend
npm install
```

**Créer le fichier `.env` :**

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ged_hsjm
DB_USER=ged_admin
DB_PASSWORD=votre_mot_de_passe_securise

# JWT
JWT_SECRET=votre_secret_jwt_tres_long_et_securise_256bits_minimum

# Server
PORT=3000
NODE_ENV=development

# Upload
UPLOAD_DIR=uploads
MAX_FILE_SIZE=52428800

# OCR
TESSERACT_LANG=fra

# CORS
CORS_ORIGIN=http://localhost:3001

# Email (optionnel)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre@email.com
SMTP_PASS=votre_mot_de_passe

# Web Push (généré via web-push generate-vapid-keys)
VAPID_PUBLIC_KEY=votre_cle_publique
VAPID_PRIVATE_KEY=votre_cle_privee
VAPID_SUBJECT=mailto:admin@hsjm.cm
```

**Exécuter les migrations :**

```bash
npx sequelize-cli db:migrate
```

**Créer l'admin par défaut :**

```bash
node src/seeders/createDefaultAdmin.js
```

**Démarrer le serveur :**

```bash
npm run dev
```

### 4️⃣ Configuration Frontend

```bash
cd ../frontend
npm install
```

**Créer le fichier `.env` :**

```env
VITE_API_URL=http://localhost:3000/api
```

**Démarrer le frontend :**

```bash
npm run dev
```

L'application sera accessible sur : **http://localhost:3001**

---

## 🐳 Déploiement Docker

### Configuration Initiale

**1. Créer le fichier `.env` à la racine :**

```env
# PostgreSQL
POSTGRES_DB=ged_hsjm
POSTGRES_USER=ged_admin
POSTGRES_PASSWORD=mot_de_passe_ultra_securise_production

# Backend
JWT_SECRET=cle_jwt_production_ultra_securisee_256bits
VAPID_PUBLIC_KEY=votre_cle_publique
VAPID_PRIVATE_KEY=votre_cle_privee
```

**2. Générer les certificats SSL (auto-signés ou Let's Encrypt) :**

```bash
mkdir -p nginx/ssl

# Auto-signé (développement)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/selfsigned.key \
  -out nginx/ssl/selfsigned.crt

# Production : utiliser Certbot pour Let's Encrypt
```

### Lancement Production

```bash
# Build & démarrage
docker-compose -f docker-compose.prod.yml up -d --build

# Vérifier les logs
docker-compose logs -f

# Migrations
docker-compose exec backend npx sequelize-cli db:migrate

# Créer l'admin
docker-compose exec backend node src/seeders/createDefaultAdmin.js
```

**Accès :**
- HTTPS : `https://votre-domaine.com`
- Backend API : `https://votre-domaine.com/api`

### Commandes Utiles

```bash
# Arrêter les containers
docker-compose down

# Reconstruire un service
docker-compose up -d --build backend

# Voir les logs d'un service
docker-compose logs -f frontend

# Redémarrer un service
docker-compose restart nginx

# Backup base de données
docker-compose exec postgres pg_dump -U ged_admin ged_hsjm > backup.sql
```

---

## ⚙️ Configuration

### Génération de Licence

**1. Générer les clés RSA (déjà incluses dans le projet) :**

```bash
cd backend
openssl genpkey -algorithm RSA -out private_key.pem -pkeyopt rsa_keygen_bits:2048
openssl rsa -pubout -in private_key.pem -out public_key.pem
```

**2. Modifier `generate_license.js` avec vos paramètres :**

```javascript
const licenseData = {
  clientName: "Hôpital Saint Jean de Malte",
  generatedAt: new Date().toISOString(),
  expiresAt: "2026-12-31", // Date d'expiration
  features: [
    "trello",      // Module Kanban
    "signature",   // Signatures numériques
    "export_rh"    // Export RH
  ]
};
```

**3. Générer la licence :**

```bash
node generate_license.js
```

**4. Copier la clé générée et l'installer via l'interface admin :**
- Se connecter en tant qu'admin
- Aller dans **Paramètres → Gestion des Licences**
- Coller la clé de licence
- Valider

---

## 📖 Utilisation

### Connexion

**Identifiants par défaut (à changer immédiatement) :**
- Username : `admin`
- Password : `admin123`

### Rôles & Permissions

| Rôle | Permissions |
|------|------------|
| **Admin** | Accès total, gestion utilisateurs, licences, configurations |
| **Validateur** | Validation de documents, consultation, workflows |
| **RH** | Gestion employés, plannings, congés |
| **Portail** | Création de tickets patients |
| **Accueil** | Gestion file d'attente consultation |
| **Caisse** | Traitement paiements, clôture tickets |
| **Utilisateur** | Upload documents, consultation, demandes |

### Workflows Principaux

**1. Upload & Validation de Document**
```
Utilisateur Upload Document
    ↓
Sélection Validateurs (ordre)
    ↓
Validateur 1 Approuve/Rejette (+ commentaires)
    ↓
Validateur 2 Approuve/Rejette
    ↓
...
    ↓
Document Validé → Archivage
```

**2. Demande de Travaux → Carte Trello**
```
Utilisateur Crée DT (via template)
    ↓
DT Uploadée dans GED
    ↓
Circuit de Validation
    ↓
DT Approuvée → Carte Trello créée automatiquement
    ↓
Assignation Technicien → Traitement → Clôture
```

**3. Création de Planning**
```
Chef de Service Crée Planning
    ↓
DDS Valide
    ↓
Médecin Chef Valide
    ↓
DG Valide → Planning Approuvé
    ↓
Génération PDF + Signatures Numériques
    ↓
Publication
```

---

## 🔌 API Documentation

### Authentification

**Connexion**
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "admin",
    "role": "admin",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

**Enregistrement**
```http
POST /api/auth/register
Content-Type: application/json
Authorization: Bearer {admin_token}

{
  "username": "jdoe",
  "email": "jdoe@hsjm.cm",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "user"
}
```

### Documents

**Upload**
```http
POST /api/documents/upload
Content-Type: multipart/form-data
Authorization: Bearer {token}

file: [binary]
title: "Demande de Travaux - Bureau 105"
description: "Fuite d'eau"
category: "Demande de travaux"
metadata: {"service": "MG", "urgence": "haute"}
```

**Liste**
```http
GET /api/documents?page=1&limit=20&category=Demande%20de%20travaux&status=approved
Authorization: Bearer {token}
```

**Recherche Full-Text**
```http
GET /api/documents/search?q=réparation&category=all
Authorization: Bearer {token}
```

### Workflows

**Soumettre pour Validation**
```http
POST /api/workflows
Authorization: Bearer {token}

{
  "documentId": "uuid",
  "validators": ["validator1_id", "validator2_id", "validator3_id"]
}
```

**Mes Tâches**
```http
GET /api/workflows/my-tasks?status=pending
Authorization: Bearer {token}
```

**Valider/Rejeter**
```http
PUT /api/workflows/{workflowId}/validate
Authorization: Bearer {token}

{
  "action": "approve",
  "comments": "Document conforme, approuvé"
}
```

### Trello/Kanban

**Récupérer Tableau**
```http
GET /api/trello/board/MG
Authorization: Bearer {token}
```

**Créer Carte**
```http
POST /api/trello/cards
Authorization: Bearer {token}

{
  "listId": "uuid",
  "title": "Réparer climatisation bureau 102",
  "description": "Panne de climatisation",
  "priority": "high",
  "assignedTo": "technicien_id",
  "dueDate": "2026-02-01",
  "linkedWorkRequestId": "dt_uuid"
}
```

**Déplacer Carte (Drag & Drop)**
```http
PUT /api/trello/cards/{cardId}/move
Authorization: Bearer {token}

{
  "targetListId": "uuid",
  "position": 1000
}
```

### Tickets

**Créer Ticket**
```http
POST /api/tickets
Authorization: Bearer {token}

{
  "queueType": "portail",
  "patientName": "Jean Dupont",
  "priority": "normal"
}
```

**File d'Attente**
```http
GET /api/tickets/queue/accueil
Authorization: Bearer {token}
```

**Appeler Patient**
```http
POST /api/tickets/call-next
Authorization: Bearer {token}

{
  "queueType": "accueil",
  "positionNumber": 1
}
```

---

## 🔒 Sécurité

### Mesures Implémentées

1. **Authentification JWT**
   - Tokens signés RS256
   - Expiration configurable (7 jours par défaut)
   - Refresh tokens (à venir)

2. **HTTPS Obligatoire en Production**
   - Certificats SSL/TLS
   - HSTS headers
   - Content Security Policy

3. **Protection XSS/CSRF**
   - Helmet.js middleware
   - CORS stricte
   - Sanitization des inputs

4. **Contrôle d'Accès**
   - RBAC (Role-Based Access Control)
   - Permissions granulaires par endpoint
   - Middleware d'autorisation

5. **Validation des Données**
   - Express-validator
   - Schémas Sequelize stricts
   - Whitelist de types MIME

6. **Sécurité des Fichiers**
   - Validation des extensions
   - Limite de taille (50MB)
   - Stockage hors webroot
   - Chemin sécurisés (pas d'accès direct)

7. **Audit & Logs**
   - Winston logger
   - Logs d'accès Nginx
   - Historique des actions sensibles

### Recommandations

- ✅ Changer TOUS les mots de passe par défaut
- ✅ Utiliser des secrets JWT longs (256 bits minimum)
- ✅ Activer les backups automatiques PostgreSQL
- ✅ Configurer un pare-feu (UFW, iptables)
- ✅ Mettre à jour régulièrement les dépendances
- ✅ Surveiller les logs avec ELK Stack ou Grafana
- ✅ Implémenter une stratégie de sauvegarde 3-2-1

---

## 🛠️ Maintenance

### Backups

**Base de Données (Automatique via Cron)**

```bash
# Script backup quotidien
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T postgres pg_dump -U ged_admin ged_hsjm \
  | gzip > /backups/ged_${DATE}.sql.gz

# Garder seulement les 30 derniers jours
find /backups -name "ged_*.sql.gz" -mtime +30 -delete
```

**Fichiers Uploads**

```bash
# Backup du volume uploads
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz backend/uploads/
```

### Monitoring

**Healthchecks**

```bash
# Vérifier statut backend
curl -f http://localhost:3000/api/health || exit 1

# Vérifier PostgreSQL
docker-compose exec postgres pg_isready
```

**Logs**

```bash
# Logs temps réel
docker-compose logs -f --tail=100

# Logs spécifiques
docker-compose logs backend | grep ERROR
```

### Mises à Jour

```bash
# Pull dernières modifications
git pull origin main

# Rebuild containers
docker-compose -f docker-compose.prod.yml up -d --build

# Migrations si nécessaire
docker-compose exec backend npx sequelize-cli db:migrate

# Redémarrer services
docker-compose restart
```

---

## 📞 Support

### Assistance Technique

- **Email** : support@hsjm.cm
- **Téléphone** : +237 XXX XXX XXX
- **Documentation** : https://docs.hsjm.cm (à venir)

### Développeur Principal

- **Nom** : F-YANKEU (Aurèle)
- **Email** : aurele@hsjm.cm
- **GitHub** : [@F-YANKEU](https://github.com/F-YANKEU)

### Signalement de Bugs

Créer une issue sur GitHub avec :
1. Description détaillée du problème
2. Étapes de reproduction
3. Logs d'erreur
4. Environnement (OS, navigateur, version)

---

## 📄 License

**Proprietary License - Hôpital Saint Jean de Malte**

Ce logiciel est la propriété exclusive de l'Hôpital Saint Jean de Malte. Toute reproduction, distribution ou modification sans autorisation écrite est strictement interdite.

© 2024-2026 Hôpital Saint Jean de Malte - Tous droits réservés.

---

## 🙏 Remerciements

- Équipe informatique HSJM
- Direction Générale HSJM
- Contributeurs open-source des librairies utilisées

---

**Version** : 1.5.0  
**Dernière mise à jour** : Janvier 2026  
**Statut** : ✅ Production Ready