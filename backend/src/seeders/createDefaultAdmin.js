// backend/src/seeders/createDefaultAdmin.js
import { User, Tenant } from '../models/index.js';

const HSJM_TENANT_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5';

const DEFAULT_ADMIN = {
  firstName: 'Franck',
  lastName: 'YANKEU',
  username: 'F-YANKEU',
  email: 'aureleyankeu@gmail.com',
  password: 'D@minguez123',
  role: 'superadmin',
  position: 'Administrateur Système'
};

export const createDefaultAdmin = async () => {
  try {
    // Récupérer le tenant HSJM (créé par la migration)
    const tenant = await Tenant.findOne({ where: { slug: 'hsjm' } });
    const tenantId = tenant?.id || HSJM_TENANT_ID;

    // Vérifier si l'admin existe déjà (sans filtre tenant car CLS pas encore actif)
    const existingAdmin = await User.unscoped().findOne({
      where: { email: DEFAULT_ADMIN.email, tenantId }
    });

    if (existingAdmin) {
      console.log('ℹ️  Utilisateur admin par défaut existe déjà.');
      return existingAdmin;
    }

    // Créer l'admin — mot de passe en clair, le hook beforeSave du modèle se charge du hachage
    const admin = await User.create({
      firstName: DEFAULT_ADMIN.firstName,
      lastName: DEFAULT_ADMIN.lastName,
      username: DEFAULT_ADMIN.username,
      email: DEFAULT_ADMIN.email,
      password: DEFAULT_ADMIN.password,
      role: DEFAULT_ADMIN.role,
      position: DEFAULT_ADMIN.position,
      tenantId
    });

    console.log('╔════════════════════════════════════════════════╗');
    console.log('║  ✅ UTILISATEUR ADMIN CRÉÉ AVEC SUCCÈS !      ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log(`   👤 Nom: ${DEFAULT_ADMIN.firstName} ${DEFAULT_ADMIN.lastName}`);
    console.log(`   📧 Email: ${DEFAULT_ADMIN.email}`);
    console.log(`   🔑 Mot de passe: ${DEFAULT_ADMIN.password}`);
    console.log(`   🎭 Rôle: ${DEFAULT_ADMIN.role}`);
    console.log(`   🏢 Tenant: ${tenantId}`);
    console.log('╚════════════════════════════════════════════════╝');

    return admin;
  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'admin par défaut:', error);
    throw error;
  }
};
