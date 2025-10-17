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
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
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

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Base de données connectée');
  } catch (error) {
    console.error(' Erreur de connexion:', error.message);
  }
};

testConnection();

export default sequelize;
