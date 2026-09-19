'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('employees', 'user_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    });
    await queryInterface.addColumn('employees', 'categorie', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: "Catégorie/grade du personnel — détermine le taux d'indemnité de mission",
    });
    await queryInterface.addIndex('employees', ['user_id']);

    await queryInterface.addColumn('ordre_mission_types', 'service_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'services', key: 'id' },
      onDelete: 'SET NULL',
      comment: 'Pôle lié à ce type — restreint la liste de missionnaires proposée',
    });

    // Rapprochement one-shot Employee ↔ User par nom/prénom (pas d'email sur Employee).
    // Ne lie que les correspondances non ambiguës (exactement 1 User actif du même nom).
    const [result] = await queryInterface.sequelize.query(`
      WITH candidates AS (
        SELECT lower(u.first_name) AS fn, lower(u.last_name) AS ln, u.id AS user_id,
               count(*) OVER (PARTITION BY lower(u.first_name), lower(u.last_name)) AS cnt
        FROM users u
        WHERE u.is_active = true
      )
      UPDATE employees e
      SET user_id = c.user_id
      FROM candidates c
      WHERE lower(e.first_name) = c.fn AND lower(e.last_name) = c.ln AND c.cnt = 1 AND e.user_id IS NULL
      RETURNING e.id
    `);
    console.log(`✅ ${result.length} employé(s) rapproché(s) d'un compte utilisateur par nom/prénom`);
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('ordre_mission_types', 'service_id');
    await queryInterface.removeIndex('employees', ['user_id']);
    await queryInterface.removeColumn('employees', 'categorie');
    await queryInterface.removeColumn('employees', 'user_id');
  },
};
