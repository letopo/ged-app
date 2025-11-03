'use strict';
const { v4: uuidv4 } = require('uuid');

const services = [
  'Gynécologie', 'PMI', 'Direction', 'Pharmacie', 'Médecine', 'Pédiatrie',
  'Néonatalogie', 'Bloc opératoire', 'Anesthésie', 'Chirurgie', 'SAU',
  'Accueil', 'Lingerie', 'Kiné', 'Point Focal', 'Biomédical', 'Paramètre SAU', 'MG'
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const serviceRecords = services.map(service => ({
      id: uuidv4(),
      name: service,
      created_at: new Date(),
      updated_at: new Date(),
    }));
    await queryInterface.bulkInsert('services', serviceRecords, {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('services', { name: services }, {});
  }
};