# 📚 Application GED - Gestion Électronique de Documents

> Système complet de gestion électronique de documents avec workflow de validation multi-niveaux

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Une application moderne et intuitive pour gérer, valider et suivre vos documents d'entreprise avec un système de workflow personnalisable.

---

## ✨ Fonctionnalités Principales

### 📤 Gestion des Documents
- **Upload multi-formats** : PDF, Word (.doc, .docx), Excel (.xls, .xlsx), Images (JPEG, PNG)
- **Extraction de texte OCR** : Reconnaissance automatique du contenu des documents
- **Recherche full-text** : Recherche rapide dans le contenu des documents
- **Gestion des versions** : Suivi de l'historique des modifications
- **Visualisation intégrée** : Aperçu PDF directement dans l'application
- **Affichage flexible** : Vue en cartes ou tableau selon vos préférences
- **Suppression sécurisée** : Suppression avec confirmation

### 🔄 Workflow de Validation
- **Circuit de validation ordonné** : Définissez l'ordre des validateurs
- **Validation multi-niveaux** : Support de plusieurs étapes de validation
- **Sélection de validateurs** : Choisissez les validateurs pour chaque document
- **Tableau de bord Workflow** : Vue d'ensemble des tâches de validation
- **Statistiques en temps réel** : 
  - Taux de complétion
  - Taux d'approbation
  - Répartition des tâches
- **Commentaires et historique** : Suivi complet de chaque validation
- **Notifications** : Alertes pour les tâches en attente

### 🔐 Sécurité et Authentification
- **Authentification JWT** : Connexion sécurisée
- **Gestion des rôles** : Admin, Validateur, Utilisateur
- **Contrôle d'accès** : Permissions basées sur les rôles
- **Sessions sécurisées** : Protection des données utilisateur

### 🎨 Interface Utilisateur
- **Design moderne** : Interface React avec Tailwind CSS
- **Responsive** : Adaptée aux ordinateurs, tablettes et mobiles
- **Intuitive** : Navigation simple et ergonomique
- **Composants réutilisables** : Architecture modulaire
- **Icônes Lucide React** : Bibliothèque d'icônes moderne

---

## 🏗️ Architecture Technique

### Backend
```
backend/
├── src/
│   ├── config/          # Configuration (DB, JWT, Upload)
│   ├── controllers/     # Logique métier
│   ├── models/          # Modèles Sequelize (PostgreSQL)
│   ├── routes/          # Endpoints API REST
│   ├── middleware/      # Auth, Upload, Validation
│   └── server.js        # Point d'entrée
├── uploads/             # Stockage des fichiers
└── package.json
```

### Frontend
```
frontend/
├── public/
├── src/
│   ├── components/      # Composants réutilisables
│   │   ├── DocumentCard.jsx
│   │   ├── DocumentViewer.jsx
│   │   ├── MyTasks.jsx
│   │   └── ...
│   ├── contexts/        # Contextes React (Auth)
│   ├── pages/           # Pages principales
│   │   ├── Dashboard.jsx
│   │   ├── DocumentList.jsx
│   │   ├── WorkflowDashboard.jsx
│   │   └── ...
│   ├── services/        # API client (Axios)
│   └── App.jsx
└── package.json
```

---

## 📋 Prérequis

Avant de commencer, assurez-vous d'avoir installé :

- **Node.js** v18 ou supérieur - [Télécharger](https://nodejs.org/)
- **PostgreSQL** v15 ou supérieur - [Télécharger](https://www.postgresql.org/download/)
- **npm** ou **yarn** - Inclus avec Node.js

---

## 🚀 Installation

### 1️⃣ Cloner le projet
```bash
git clone https://github.com/votre-username/ged-app.git
cd ged-app
```

### 2️⃣ Configuration de la Base de Données

Créez une base de données PostgreSQL :

```sql
CREATE DATABASE ged_db;
CREATE USER ged_user WITH PASSWORD 'votre_mot_de_passe';
GRANT ALL PRIVILEGES ON DATABASE ged_db TO ged_user;
```

### 3️⃣ Installation du Backend

```bash
cd backend
npm install
```

Créez un fichier `.env` à la racine du dossier backend :

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ged_db
DB_USER=ged_user
DB_PASSWORD=votre_mot_de_passe

# JWT
JWT_SECRET=votre_secret_jwt_tres_securise_ici

# Server
PORT=3000
NODE_ENV=development

# Upload
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760
```

Démarrez le serveur backend :

```bash
npm run dev
```

Le backend sera accessible sur `http://localhost:3000`

### 4️⃣ Installation du Frontend

Dans un nouveau terminal :

```bash
cd frontend
npm install
```

Créez un fichier `.env` à la racine du dossier frontend :

```env
REACT_APP_API_URL=http://localhost:3000/api
```

Démarrez le frontend :

```bash
npm start
```

Le frontend sera accessible sur `http://localhost:3001`

---

## 📖 Utilisation

### 🔐 Connexion

1. Accédez à `http://localhost:3001`
2. Connectez-vous avec vos identifiants
3. Ou créez un nouveau compte

### 📤 Upload de Documents

1. Cliquez sur **"Upload"** dans la navigation
2. Sélectionnez un fichier (PDF, Word, Excel, Image)
3. Choisissez une catégorie
4. Cliquez sur **"Uploader"**

### 🔄 Workflow de Validation

#### Pour l'utilisateur :
1. Allez dans **"Mes Documents"**
2. Cliquez sur **"Soumettre"** sur un document
3. Sélectionnez les validateurs dans l'ordre souhaité
4. Ajoutez un commentaire (optionnel)
5. Cliquez sur **"Soumettre au workflow"**

#### Pour le validateur :
1. Allez dans **"Mes tâches"** ou **"Workflow"**
2. Consultez les documents en attente
3. Cliquez sur **"Voir le document"**
4. Approuvez ou rejetez avec un commentaire
5. Le document passe au validateur suivant

### 📊 Tableau de Bord Workflow

Le tableau de bord affiche :
- **Statistiques globales** : Tâches en attente, approuvées, rejetées
- **Taux de complétion** : Pourcentage de tâches traitées
- **Taux d'approbation** : Pourcentage d'approbations
- **Répartition visuelle** : Distribution des tâches par statut
- **Liste filtrée** : Filtrage par statut (En attente, Approuvés, Rejetés)

---

## 🛠️ Technologies Utilisées

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **Sequelize** - ORM pour PostgreSQL
- **PostgreSQL** - Base de données relationnelle
- **JWT** - Authentification
- **Multer** - Upload de fichiers
- **bcrypt** - Hachage de mots de passe

### Frontend
- **React** - Bibliothèque UI
- **React Router** - Navigation
- **Axios** - Client HTTP
- **Tailwind CSS** - Framework CSS
- **Lucide React** - Icônes
- **React PDF** - Visualisation PDF

---

## 📁 Structure de la Base de Données

### Tables Principales

#### `users`
- Gestion des utilisateurs et authentification
- Rôles : admin, validator, user

#### `documents`
- Stockage des métadonnées des documents
- Champs : title, originalName, filename, fileType, fileSize, userId, status, etc.

#### `workflows`
- Gestion du circuit de validation
- Champs : documentId, validatorId, step, status, comment, etc.

---

## 🔧 Configuration Avancée

### Personnalisation des Rôles

Modifiez les permissions dans `backend/src/middleware/auth.js` :

```javascript
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    next();
  };
};
```

### Ajout de Types de Fichiers

Modifiez `backend/src/config/multer.js` :

```javascript
const allowedTypes = [
  'application/pdf',
  'application/msword',
  // Ajoutez vos types ici
];
```

### Personnalisation du Workflow

Le workflow est entièrement personnalisable :
- Nombre d'étapes illimité
- Ordre flexible des validateurs
- Validation conditionnelle

---

## 🐛 Dépannage

### Le backend ne démarre pas
```bash
# Vérifiez que PostgreSQL est lancé
sudo service postgresql status

# Vérifiez les variables d'environnement
cat backend/.env
```

### Erreur de connexion à la base de données
```bash
# Testez la connexion PostgreSQL
psql -h localhost -U ged_user -d ged_db
```

### Le frontend ne se connecte pas au backend
```bash
# Vérifiez que le backend est lancé sur le bon port
curl http://localhost:3000/api/health
```

---

## 📝 Scripts Disponibles

### Backend
```bash
npm run dev        # Démarrage en mode développement (nodemon)
npm start          # Démarrage en mode production
npm run migrate    # Exécuter les migrations
npm run seed       # Insérer des données de test
```

### Frontend
```bash
npm start          # Démarrage du serveur de développement
npm run build      # Build de production
npm test           # Lancer les tests
```

---

## 🚧 Roadmap

### Version 2.0 (À venir)
- [ ] Notifications en temps réel (WebSocket)
- [ ] Signature électronique
- [ ] Exports Excel/CSV des statistiques
- [ ] Intégration avec services cloud (Google Drive, OneDrive)
- [ ] Application mobile (React Native)
- [ ] Thème sombre
- [ ] Multilingue (FR, EN, ES)

---

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. Forkez le projet
2. Créez une branche (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add AmazingFeature'`)
4. Pushez vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

---

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

---

## 👨‍💻 Développé avec l'aide de Claude AI

Ce projet a été développé en collaboration avec **Claude AI** d'Anthropic, un assistant IA avancé qui a aidé à :
- Concevoir l'architecture de l'application
- Développer les fonctionnalités frontend et backend
- Résoudre les bugs et optimiser le code
- Créer une interface utilisateur moderne et intuitive

---

## 📧 Contact

Pour toute question ou suggestion :

- **Email** : votre-email@example.com
- **GitHub** : [@votre-username](https://github.com/votre-username)
- **LinkedIn** : [Votre Nom](https://linkedin.com/in/votre-profil)

---

## 🙏 Remerciements

- [Node.js](https://nodejs.org/)
- [React](https://reactjs.org/)
- [PostgreSQL](https://www.postgresql.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)
- [Anthropic Claude AI](https://www.anthropic.com/)

---

<div align="center">

**Fait avec ❤️ et ☕ par votre équipe**

⭐ N'oubliez pas de mettre une étoile si ce projet vous a aidé !

</div>s