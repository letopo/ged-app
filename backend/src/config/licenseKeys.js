// backend/src/config/licenseKeys.js
import fs from 'fs';
import path from 'path';

// On cherche le fichier à la racine du dossier backend (où tourne le serveur)
const keyPath = path.resolve('public_key.pem');

let keyContent = '';

try {
  // On lit le fichier brut pour garder le formatage exact
  keyContent = fs.readFileSync(keyPath, 'utf8');
  console.log("✅ Clé publique chargée depuis :", keyPath);
} catch (error) {
  console.error("❌ ERREUR CRITIQUE : Impossible de lire public_key.pem !");
  console.error("Assurez-vous que le fichier 'public_key.pem' est bien à la racine du dossier 'backend'.");
  // On laisse vide, le controller renverra une erreur 500 explicite
}

export const PUBLIC_KEY = keyContent;