// Droits de lecture des documents : personnel / service / validateur /
// transmis, administrateurs, documents des RH cachés aux directeurs.
// hasDocumentReadAccess (un document) et buildDocumentAccessWhere (les listes)
// doivent toujours donner la même réponse.
import '../helpers/env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Op } from 'sequelize';
import sequelize from '../../src/config/database.js';
import { Document } from '../../src/models/index.js';
import { hasDocumentReadAccess, buildDocumentAccessWhere } from '../../src/utils/documentVisibility.js';
import { createTenant, makeFactory } from '../helpers/fixtures.js';

let f;
let u; // utilisateurs
let d; // documents

before(async () => {
  f = makeFactory(await createTenant());
  const [owner, colleague, outsider, validatorUser, recipient, admin, director, rhAgent, exColleague] = await Promise.all([
    f.user(), f.user(), f.user(), f.user(), f.user(), f.user({ role: 'admin' }), f.user({ role: 'director' }), f.user(), f.user(),
  ]);
  u = { owner, colleague, outsider, validatorUser, recipient, admin, director, rhAgent, exColleague };
  const sau = await f.service();
  await f.member(owner, sau);
  await f.member(colleague, sau);
  await f.member(exColleague, sau, { isActive: false });
  await f.poste('rh', [rhAgent]);
  d = {
    personal: await f.document(owner),
    service: await f.document(owner, { visibility: 'service', serviceId: sau.id }),
    validated: await f.document(owner),
    transmitted: await f.document(owner),
    rh: await f.document(rhAgent),
  };
  await f.validator(d.validated, validatorUser);
  await f.transmit(d.transmitted, owner, recipient);
});
after(() => sequelize.close());

// Réponse attendue : qui lit quoi
const EXPECTED = {
  owner: ['personal', 'service', 'validated', 'transmitted'],
  colleague: ['service'],
  exColleague: [],
  outsider: [],
  validatorUser: ['validated'],
  recipient: ['transmitted'],
  rhAgent: ['rh'],
  admin: ['personal', 'service', 'validated', 'transmitted', 'rh'],
  director: ['personal', 'service', 'validated', 'transmitted'], // pas les documents des RH
};

for (const [who, expected] of Object.entries(EXPECTED)) {
  test(`${who} : lit exactement ${expected.length ? expected.join(', ') : 'aucun document'}`, async () => {
    const user = u[who];
    await f.run(async () => {
      // Un document à la fois
      for (const [name, doc] of Object.entries(d)) {
        assert.equal(await hasDocumentReadAccess(doc, user), expected.includes(name), `hasDocumentReadAccess(${name})`);
      }
      // Les listes : même réponse
      const where = await buildDocumentAccessWhere(user);
      const ids = Object.values(d).map((x) => x.id);
      const rows = await Document.findAll({ where: where ? { [Op.and]: [{ id: ids }, where] } : { id: ids }, attributes: ['id'] });
      const listed = Object.entries(d).filter(([, doc]) => rows.some((r) => r.id === doc.id)).map(([name]) => name).sort();
      assert.deepEqual(listed, [...expected].sort(), 'buildDocumentAccessWhere');
    });
  });
}

// À CORRIGER (PR dédiée) : le filtre automatique par établissement (hook
// beforeFind de config/database.js) ne s'applique pas — Sequelize ne renseigne
// pas options.model avant ce hook. Les lectures ne sont isolées que là où le
// code ajoute tenantId lui-même.
test('un autre établissement ne voit rien', { todo: 'filtre tenant automatique inopérant (beforeFind)' }, async () => {
  const other = makeFactory(await createTenant());
  const admin = await other.user({ role: 'admin' });
  await other.run(async () => {
    const rows = await Document.findAll({ where: { id: Object.values(d).map((x) => x.id) } });
    assert.equal(rows.length, 0);
    const where = await buildDocumentAccessWhere(admin);
    assert.equal(where, null); // admin : pas de filtre… mais le tenant filtre déjà tout
  });
});
