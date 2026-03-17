// backend/database/migrations/20251209100000-add-new-fields-to-trello-cards.cjs
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      
      // 1. AJOUTER LES NOUVELLES COLONNES (sans defaultValue initialement)
      
      // Ajouter la colonne 'dates'
      await queryInterface.addColumn('trello_cards', 'dates', {
        type: Sequelize.JSONB,
        allowNull: true,
      }, { transaction });
      
      // Ajouter la colonne 'checklists'
      await queryInterface.addColumn('trello_cards', 'checklists', {
        type: Sequelize.JSONB,
        allowNull: true,
      }, { transaction });
      
      // 2. RETIRER L'ANCIENNE VALEUR PAR DÉFAUT DE 'labels'
      await queryInterface.sequelize.query(
        'ALTER TABLE trello_cards ALTER COLUMN labels DROP DEFAULT',
        { transaction }
      );
      
      // 3. CHANGER LE TYPE DE 'labels' avec un CAST EXPLICITE
      await queryInterface.sequelize.query(
        'ALTER TABLE trello_cards ALTER COLUMN labels TYPE JSONB USING array_to_json(labels)::jsonb',
        { transaction }
      );

      // 4. DÉFINIR LES NOUVELLES VALEURS PAR DÉFAUT (JSONB)
      
      // Définir la valeur par défaut pour 'labels'
      await queryInterface.sequelize.query(
        "ALTER TABLE trello_cards ALTER COLUMN labels SET DEFAULT '[]'::jsonb",
        { transaction }
      );
      
      // Définir la valeur par défaut pour 'dates'
      await queryInterface.sequelize.query(
        "ALTER TABLE trello_cards ALTER COLUMN dates SET DEFAULT '{}'::jsonb",
        { transaction }
      );
      
      // Définir la valeur par défaut pour 'checklists'
      await queryInterface.sequelize.query(
        "ALTER TABLE trello_cards ALTER COLUMN checklists SET DEFAULT '[]'::jsonb",
        { transaction }
      );
      
      await transaction.commit();

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Retrait des colonnes ajoutées
      await queryInterface.removeColumn('trello_cards', 'checklists', { transaction });
      await queryInterface.removeColumn('trello_cards', 'dates', { transaction });

      // Supprimer les valeurs par défaut JSONB
      await queryInterface.sequelize.query(
        'ALTER TABLE trello_cards ALTER COLUMN labels DROP DEFAULT',
        { transaction }
      );
      
      // Revenir au type de colonne ARRAY(STRING)
      // Ceci est la commande la plus sûre pour revenir à l'état initial ARRAY
      await queryInterface.sequelize.query(
        'ALTER TABLE trello_cards ALTER COLUMN labels TYPE VARCHAR[] USING ARRAY[]::VARCHAR[]', // Remplace par un array vide
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
  }
};