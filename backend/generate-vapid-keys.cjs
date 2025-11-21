// backend/generate-vapid-keys.js
// Script pour générer les clés VAPID (à exécuter une seule fois)

const webpush = require('web-push');

console.log('🔐 Génération des clés VAPID...\n');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('✅ Clés VAPID générées avec succès !\n');
console.log('📋 Copiez ces valeurs dans votre fichier .env :\n');
console.log('VAPID_PUBLIC_KEY=' + vapidKeys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey);
console.log('\n⚠️  ATTENTION : Gardez la clé privée secrète !');
console.log('💡 N\'oubliez pas d\'ajouter aussi :');
console.log('VAPID_EMAIL=mailto:votre-email@example.com\n');