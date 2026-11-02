// Installation de développement : MAIL_REDIRECT_TO empêche d'écrire aux vrais
// destinataires (réglages de messagerie copiés de la production).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mailRedirect, applyMailRedirect } from '../../src/utils/mailer.js';

const msg = { to: 'collegue@hsjm.cm', subject: 'Document reçu', text: 'Bonjour' };

test('absent (production) : message inchangé', () => {
  assert.equal(mailRedirect({}), null);
  assert.deepEqual(applyMailRedirect(msg, {}), msg);
  assert.deepEqual(applyMailRedirect(msg, { MAIL_REDIRECT_TO: '  ' }), msg);
});

test('« off » : rien ne part', () => {
  for (const v of ['off', 'OFF', 'none', 'non', 'false', '0']) {
    assert.deepEqual(mailRedirect({ MAIL_REDIRECT_TO: v }), { mode: 'off' });
    assert.equal(applyMailRedirect(msg, { MAIL_REDIRECT_TO: v }), null);
  }
});

test('une adresse : tout part vers elle, vrai destinataire indiqué', () => {
  const out = applyMailRedirect({ ...msg, to: ['a@hsjm.cm', 'b@hsjm.cm'] }, { MAIL_REDIRECT_TO: 'dev@example.org' });
  assert.equal(out.to, 'dev@example.org');
  assert.equal(out.subject, '[DEV → a@hsjm.cm, b@hsjm.cm] Document reçu');
  assert.match(out.text, /^\[Installation de développement — destinataire réel : a@hsjm\.cm, b@hsjm\.cm\]\n\nBonjour$/);
});

test('PUSH_DISABLED : notifications push bloquées seulement si demandé', async () => {
  const { pushDisabled } = await import('../../src/services/pushNotificationService.js');
  assert.equal(pushDisabled({}), false);
  assert.equal(pushDisabled({ PUSH_DISABLED: 'false' }), false);
  for (const v of ['true', 'TRUE', '1', 'oui']) assert.equal(pushDisabled({ PUSH_DISABLED: v }), true);
});
