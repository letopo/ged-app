// MAIL_REDIRECT_TO=off : aucun e-mail ne part, même si l'établissement a une
// messagerie réglée et active (cas de la base de développement copiée de la
// production).
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import sequelize from '../../src/config/database.js';
import { TenantMailSettings } from '../../src/models/index.js';
import { sendNotificationEmail } from '../../src/utils/mailer.js';
import { encryptSecret } from '../../src/utils/secretBox.js';
import { createTenant, makeFactory, inTenant } from '../helpers/fixtures.js';

let f;
const previous = process.env.MAIL_REDIRECT_TO;

before(async () => {
  f = makeFactory(await createTenant());
  // Messagerie « réelle » mais injoignable : un envoi tenté échouerait
  await TenantMailSettings.create({
    tenantId: f.tenant.id, enabled: true, host: '127.0.0.1', port: 1, security: 'none',
    username: 'ged@hsjm.cm', passwordEncrypted: encryptSecret('secret'), fromEmail: 'ged@hsjm.cm',
  });
});
after(async () => {
  if (previous === undefined) delete process.env.MAIL_REDIRECT_TO; else process.env.MAIL_REDIRECT_TO = previous;
  await sequelize.close();
});

test('MAIL_REDIRECT_TO=off : rien ne part, même avec une messagerie active', async () => {
  process.env.MAIL_REDIRECT_TO = 'off';
  const r = await inTenant(f.tenant.id, () => sendNotificationEmail('collegue@hsjm.cm', 'Document reçu', 'Bonjour'));
  assert.equal(r.success, true);
  assert.equal(r.simulated, true);
  const row = await TenantMailSettings.findOne({ where: { tenantId: f.tenant.id } });
  assert.equal(row.lastErrorAt, null, 'aucune tentative de connexion');
});

test('sans MAIL_REDIRECT_TO (production) : l\'envoi est bien tenté', async () => {
  delete process.env.MAIL_REDIRECT_TO;
  const r = await inTenant(f.tenant.id, () => sendNotificationEmail('collegue@hsjm.cm', 'Document reçu', 'Bonjour'));
  assert.equal(r.success, false, 'serveur injoignable : échec, donc tentative réelle');
});
