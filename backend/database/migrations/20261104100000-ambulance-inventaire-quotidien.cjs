'use strict';

// Ambulances RO SAU (demande du 03/11/2026) :
//  - l'inventaire est ouvert tous les jours : les check-lists restées sur le
//    réglage d'origine (lundi, mercredi, vendredi) passent à tous les jours ;
//  - les fiches de contrôle et d'inventaire déjà générées sont transmises au
//    responsable du véhicule (ambulances : Chef de pôle RO SAU ; à défaut, chef
//    Sécurité / Logistique), comme les nouvelles (shareWithVehicleManagers).
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE vehicle_checklist_templates
      SET inventory_days = '[0, 1, 2, 3, 4, 5, 6]'::jsonb, updated_at = NOW()
      WHERE vehicle_type = 'ambulance' AND inventory_days = '[1, 3, 5]'::jsonb;
    `);
    await queryInterface.sequelize.query(`
      WITH fiches AS (
        SELECT d.id AS document_id, d.user_id AS author_id, d.tenant_id, d.created_at,
               COALESCE(v.manager_poste_code, CASE WHEN v.vehicle_type = 'ambulance' THEN 'chef_pole_ro_sau' ELSE 'chef_securite_logistique' END) AS code
        FROM documents d
        JOIN vehicles v ON v.id::text = d.metadata->>'vehicleId'
        WHERE d.metadata->>'sourceType' IN ('vehicle_check', 'vehicle_inventory')
      ),
      holders AS (
        SELECT p.code, up.user_id
        FROM postes p
        JOIN user_postes up ON up.poste_id = p.id
        JOIN users u ON u.id = up.user_id AND u.is_active IS NOT FALSE
      ),
      cibles AS (
        SELECT f.document_id, f.author_id, f.tenant_id, f.created_at,
               CASE WHEN EXISTS (SELECT 1 FROM holders h WHERE h.code = f.code) THEN f.code ELSE 'chef_securite_logistique' END AS code
        FROM fiches f
      )
      INSERT INTO document_transmissions (id, document_id, from_user_id, to_user_id, message, read_at, tenant_id, created_at, updated_at)
      SELECT DISTINCT ON (c.document_id, h.user_id)
             gen_random_uuid(), c.document_id, c.author_id, h.user_id, NULL, NOW(), c.tenant_id, c.created_at, NOW()
      FROM cibles c
      JOIN holders h ON h.code = c.code
      WHERE h.user_id IS DISTINCT FROM c.author_id
        AND NOT EXISTS (SELECT 1 FROM document_transmissions t WHERE t.document_id = c.document_id AND t.to_user_id = h.user_id);
    `);
  },

  async down() {
    // Rien à annuler : les fiches transmises restent lisibles par le responsable.
  },
};
