// backend/src/utils/sanitizeBody.js
// Retire du payload client les champs que seul le serveur doit contrôler
// (id, tenant, auteur, horodatages) avant un create()/update() Sequelize.

const PROTECTED_FIELDS = [
  'id', 'tenantId', 'tenant_id',
  'created_at', 'createdAt', 'updated_at', 'updatedAt',
];

export const sanitizeBody = (body = {}, extraProtected = []) => {
  const clean = { ...body };
  for (const field of [...PROTECTED_FIELDS, ...extraProtected]) {
    delete clean[field];
  }
  // Un champ numérique/date optionnel laissé vide dans un formulaire envoie ""
  // — Postgres rejette ça pour FLOAT/INTEGER/DATE (attend NULL, pas "").
  for (const key of Object.keys(clean)) {
    if (clean[key] === '') clean[key] = null;
  }
  return clean;
};
