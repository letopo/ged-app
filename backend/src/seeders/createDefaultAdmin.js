// backend/src/seeders/createDefaultAdmin.js
import { User } from '../models/index.js';
import bcrypt from 'bcryptjs';

const DEFAULT_ADMIN = {
  firstName: 'Franck',
  lastName: 'YANKEU',
  username: 'F-YANKEU',
  email: 'aureleyankeu@gmail.com',
  password: 'D@minguez123',
  role: 'admin',
  position: 'Administrateur Système'
};

export const createDefaultAdmin = async () => {
  try {
    // Vérifier si l'admin existe déjà
    const existingAdmin = await User.findOne({
      where: { email: DEFAULT_ADMIN.email }
    });

    if (existingAdmin) {
      console.log('ℹ️  Utilisateur admin par défaut existe déjà.');
      console.log(`   📧 Email: ${DEFAULT_ADMIN.email}`);
      return existingAdmin;
    }

    // Créer l'admin
    const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, 10);
    
    const admin = await User.create({
      firstName: DEFAULT_ADMIN.firstName,
      lastName: DEFAULT_ADMIN.lastName,
      username: DEFAULT_ADMIN.username,
      email: DEFAULT_ADMIN.email,
      password: hashedPassword,
      role: DEFAULT_ADMIN.role,
      position: DEFAULT_ADMIN.position
    });

    console.log('╔════════════════════════════════════════════════╗');
    console.log('║  ✅ UTILISATEUR ADMIN CRÉÉ AVEC SUCCÈS !      ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log(`   👤 Nom: ${DEFAULT_ADMIN.firstName} ${DEFAULT_ADMIN.lastName}`);
    console.log(`   📧 Email: ${DEFAULT_ADMIN.email}`);
    console.log(`   🔑 Mot de passe: ${DEFAULT_ADMIN.password}`);
    console.log(`   🎭 Rôle: ${DEFAULT_ADMIN.role}`);
    console.log('╚════════════════════════════════════════════════╝');

    return admin;
  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'admin par défaut:', error);
    throw error;
  }
};