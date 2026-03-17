const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    
    // 0. CORRECTION CRITIQUE : Ajouter 'container' à l'ENUM PostgreSQL
    // On utilise un try/catch car si on relance le script, l'ajout plantera si la valeur existe déjà
    try {
      await queryInterface.sequelize.query(`ALTER TYPE "enum_invoice_folders_type" ADD VALUE 'container';`);
    } catch (e) {
      console.log("Note: La valeur 'container' existe probablement déjà dans l'enum ou la table n'existe pas encore.");
    }

    // 1. Ajouter la colonne parent_id si elle n'existe pas
    try {
      await queryInterface.addColumn('invoice_folders', 'parent_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'invoice_folders', key: 'id' },
        onDelete: 'CASCADE'
      });
    } catch (e) {
      // La colonne existe peut-être déjà
    }

    // 2. Nettoyer les dossiers existants
    // D'abord on détache les documents pour ne pas les perdre (on les met temporairement sans dossier)
    await queryInterface.sequelize.query(`UPDATE documents SET invoice_folder_id = NULL`);
    
    // On vide la table pour recréer la structure propre
    await queryInterface.bulkDelete('invoice_folders', null, {});

    // 3. Créer la structure FIGÉE
    const now = new Date();
    
    // A. Boîte de réception
    await queryInterface.bulkInsert('invoice_folders', [{
      id: uuidv4(),
      name: 'Boîte de réception',
      type: 'inbox',
      position: 0,
      created_at: now,
      updated_at: now
    }]);

    // B. Dossiers Entreprises Simples
    const companies = [
      'TISSERIN', 'DIOCESE', 'WILLISTOWER', 'CHANAS', 
      'ASCOMA', 'C’ESTDBM', 'ROYAL ONYX', 'DANGOTE'
    ];

    let position = 1;
    const companyInserts = companies.map(name => ({
      id: uuidv4(),
      name: name,
      type: 'custom',
      position: position++,
      created_at: now,
      updated_at: now
    }));
    await queryInterface.bulkInsert('invoice_folders', companyInserts);

    // C. Dossier Parent PHP
    const phpId = uuidv4();
    await queryInterface.bulkInsert('invoice_folders', [{
      id: phpId,
      name: 'PHP (Groupe)',
      type: 'container', // C'est ici que ça bloquait avant le fix
      position: position++,
      created_at: now,
      updated_at: now
    }]);

    // D. Sous-dossiers PHP
    const phpSubFolders = [
      'MUTEULLE PHP', 'VISITE SYSTEMATIQUE', 'MEDICAMENTS', 
      'SOUS COUVERT PHP', 'FAMILLE PHP'
    ];

    const phpInserts = phpSubFolders.map(name => ({
      id: uuidv4(),
      name: name,
      type: 'custom',
      parent_id: phpId, // Liaison parent/enfant
      position: position++,
      created_at: now,
      updated_at: now
    }));
    
    await queryInterface.bulkInsert('invoice_folders', phpInserts);
  },

  down: async (queryInterface, Sequelize) => {
    // En cas de rollback, on supprime la colonne parent_id
    await queryInterface.removeColumn('invoice_folders', 'parent_id');
  }
};