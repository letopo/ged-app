'use strict';

// Retour de la responsable RO SAU (10/11/2026) sur les check-lists ambulance :
//  - inventaire : « Poubelle » retirée ; « Masque FFP1 » devient « Masque »
//  - prise de poste (section du soignant) : « Sac d'urgence complet » retiré
// Les manques encore ouverts sur ces articles retirés sont classés sans suite.
const REMOVED_INVENTORY = ['poubelle'];
const REMOVED_SHIFT = ['sac'];

module.exports = {
  up: async (queryInterface) => {
    const [templates] = await queryInterface.sequelize.query(
      "SELECT id, sections, inventory_sections FROM vehicle_checklist_templates WHERE vehicle_type = 'ambulance'",
    );
    for (const tpl of templates) {
      const sections = (tpl.sections || []).map((s) => ({
        ...s,
        items: (s.items || []).filter((it) => !REMOVED_SHIFT.includes(it.id)),
      }));
      const inventory = (tpl.inventory_sections || []).map((s) => ({
        ...s,
        items: (s.items || [])
          .filter((it) => !REMOVED_INVENTORY.includes(it.id))
          .map((it) => (it.id === 'masque_ffp1' && it.label === 'Masque FFP1' ? { ...it, label: 'Masque' } : it)),
      }));
      await queryInterface.sequelize.query(
        'UPDATE vehicle_checklist_templates SET sections = :sections::jsonb, inventory_sections = :inventory::jsonb, updated_at = NOW() WHERE id = :id',
        { replacements: { id: tpl.id, sections: JSON.stringify(sections), inventory: JSON.stringify(inventory) } },
      );
    }
    const removed = [...REMOVED_INVENTORY, ...REMOVED_SHIFT.map((id) => `pp_${id}`)];
    await queryInterface.sequelize.query(
      `UPDATE vehicle_shortages SET status = 'annule', closed_at = NOW(), closed_reason = 'annule',
         closed_by_name = 'Article retiré de la check-list', updated_at = NOW()
       WHERE item_id IN (:removed) AND status IN ('a_commander', 'commande')`,
      { replacements: { removed } },
    );
    await queryInterface.sequelize.query(
      "UPDATE vehicle_shortages SET label = 'Masque', updated_at = NOW() WHERE item_id = 'masque_ffp1' AND label = 'Masque FFP1'",
    );
  },

  // Les articles retirés ne sont pas recréés : la responsable peut les rajouter
  // dans l'onglet Check-list si besoin.
  down: async () => {},
};
