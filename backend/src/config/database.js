import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'ged_db',
  username: process.env.DB_USER || 'ged_user',
  password: process.env.DB_PASSWORD,
  dialect: 'postgres',
  // On désactive le logging pour rendre la console plus lisible.
  // Vous pourrez le réactiver si besoin pour déboguer une requête SQL.
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: true
  }
});

// La fonction testConnection a été supprimée d'ici.
// L'authentification est maintenant gérée uniquement dans server.js pour un démarrage propre.

export default sequelize;