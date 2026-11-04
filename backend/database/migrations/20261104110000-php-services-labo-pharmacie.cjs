'use strict';

// Module PHP (demande du 04/11/2026) : Laboratoire et Pharmacie s'ajoutent à la
// liste des services proposés à l'enregistrement d'une consultation.
module.exports = {
  async up(queryInterface) {
    const [[{ existe }]] = await queryInterface.sequelize.query(
      "SELECT to_regclass('public.php_services_medicaux') IS NOT NULL AS existe"
    );
    if (!existe) return; // sans table, la liste par défaut du serveur s'applique (déjà à jour)
    await queryInterface.sequelize.query(`
      INSERT INTO php_services_medicaux (code, nom, actif)
      VALUES ('LABORATOIRE', 'Laboratoire', true), ('PHARMACIE', 'Pharmacie', true)
      ON CONFLICT (code) DO UPDATE SET actif = true;
    `);
  },

  async down(queryInterface) {
    const [[{ existe }]] = await queryInterface.sequelize.query(
      "SELECT to_regclass('public.php_services_medicaux') IS NOT NULL AS existe"
    );
    if (!existe) return;
    await queryInterface.sequelize.query(
      "DELETE FROM php_services_medicaux WHERE code IN ('LABORATOIRE', 'PHARMACIE')"
    );
  },
};
