'use strict';

// Double authentification par e-mail (alternative à l'application TOTP) :
// code à 6 chiffres envoyé à la connexion, stocké haché, valable 10 minutes.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const cols = await queryInterface.describeTable('users');
    const add = async (name, def) => { if (!cols[name]) await queryInterface.addColumn('users', name, def); };
    await add('email_otp_enabled',    { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    await add('email_otp_hash',       { type: Sequelize.STRING(128), allowNull: true });
    await add('email_otp_expires_at', { type: Sequelize.DATE, allowNull: true });
    await add('email_otp_attempts',   { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 });
    await add('email_otp_sent_at',    { type: Sequelize.DATE, allowNull: true });
    console.log('✅ Colonnes 2FA par e-mail ajoutées à users');
  },

  down: async (queryInterface) => {
    for (const c of ['email_otp_enabled', 'email_otp_hash', 'email_otp_expires_at', 'email_otp_attempts', 'email_otp_sent_at']) {
      await queryInterface.removeColumn('users', c);
    }
  },
};
