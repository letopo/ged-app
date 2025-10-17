# Script de création automatique des fichiers backend
# Exécutez dans PowerShell depuis le dossier ged-app/backend

Write-Host "🚀 Création des fichiers du backend..." -ForegroundColor Green

# Créer les dossiers nécessaires
Write-Host "📁 Création des dossiers..."
New-Item -ItemType Directory -Force -Path "src/config" | Out-Null
New-Item -ItemType Directory -Force -Path "src/controllers" | Out-Null
New-Item -ItemType Directory -Force -Path "src/middleware" | Out-Null
New-Item -ItemType Directory -Force -Path "src/models" | Out-Null
New-Item -ItemType Directory -Force -Path "src/routes" | Out-Null
New-Item -ItemType Directory -Force -Path "src/services" | Out-Null
New-Item -ItemType Directory -Force -Path "src/utils" | Out-Null
New-Item -ItemType Directory -Force -Path "uploads" | Out-Null
New-Item -ItemType Directory -Force -Path "tests" | Out-Null

# Créer .gitkeep
New-Item -ItemType File -Force -Path "uploads/.gitkeep" | Out-Null

# Créer package.json
Write-Host "📦 Création de package.json..."
@'
{
  "name": "ged-backend",
  "version": "1.0.0",
  "description": "Backend API pour l'application GED",
  "main": "src/server.js",
  "type": "module",
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "test": "jest"
  },
  "keywords": ["ged", "documents", "api", "express"],
  "author": "Votre Nom",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "dotenv": "^16.3.1",
    "pg": "^8.11.3",
    "pg-hstore": "^2.3.4",
    "sequelize": "^6.35.1",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "multer": "^1.4.5-lts.1",
    "express-validator": "^7.0.1",
    "winston": "^3.11.0",
    "tesseract.js": "^5.0.3",
    "pdf-parse": "^1.1.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2",
    "jest": "^29.7.0",
    "supertest": "^6.3.3"
  }
}
'@ | Out-File -FilePath "package.json" -Encoding UTF8

# Créer .env.example
Write-Host "🔐 Création de .env.example..."
@'
# Configuration du serveur
PORT=3000
NODE_ENV=development

# Base de données PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ged_db
DB_USER=ged_user
DB_PASSWORD=VotreMotDePasseSecurise123!

# Sécurité
JWT_SECRET=changez_moi_avec_une_longue_chaine_aleatoire_securisee
JWT_EXPIRE=7d

# Stockage des fichiers
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=52428800

# OCR
TESSERACT_LANG=fra

# CORS
CORS_ORIGIN=http://localhost:3001
'@ | Out-File -FilePath ".env.example" -Encoding UTF8

# Créer .env (copie de .env.example)
Write-Host "🔐 Création de .env..."
Copy-Item ".env.example" ".env"

# Créer .gitignore
Write-Host "📝 Création de .gitignore..."
@'
node_modules/
.env
.env.local
uploads/*
!uploads/.gitkeep
*.log
dist/
build/
'@ | Out-File -FilePath ".gitignore" -Encoding UTF8

Write-Host ""
Write-Host "✅ Tous les dossiers et fichiers de configuration créés!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Prochaines étapes:" -ForegroundColor Yellow
Write-Host "1. Éditez le fichier .env avec vos paramètres PostgreSQL"
Write-Host "2. Exécutez: npm install"
Write-Host "3. Créez les fichiers de code (je vais vous donner les commandes)"
Write-Host ""