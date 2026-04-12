// backend/src/controllers/gmaoController.js
import { Equipement, PlanMaintenance, Intervention, User, sequelize } from '../models/index.js';
import { Op } from 'sequelize';

// ─── ÉQUIPEMENTS ────────────────────────────────────────────────────────────

export const getEquipements = async (req, res) => {
  try {
    const { service, statut } = req.query;
    const where = {};
    if (service) where.service = service;
    if (statut) where.statut = statut;
    const equipements = await Equipement.findAll({
      where,
      order: [['service', 'ASC'], ['nom', 'ASC']],
    });
    res.json({ success: true, data: equipements });
  } catch (err) {
    console.error('getEquipements error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createEquipement = async (req, res) => {
  try {
    const eq = await Equipement.create(req.body);
    res.status(201).json({ success: true, data: eq });
  } catch (err) {
    console.error('createEquipement error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateEquipement = async (req, res) => {
  try {
    const eq = await Equipement.findByPk(req.params.id);
    if (!eq) return res.status(404).json({ success: false, message: 'Équipement introuvable' });
    await eq.update(req.body);
    res.json({ success: true, data: eq });
  } catch (err) {
    console.error('updateEquipement error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteEquipement = async (req, res) => {
  try {
    const eq = await Equipement.findByPk(req.params.id);
    if (!eq) return res.status(404).json({ success: false, message: 'Équipement introuvable' });
    // Delete related plans first
    await PlanMaintenance.destroy({ where: { equipement_id: eq.id } });
    await eq.destroy();
    res.json({ success: true, message: 'Équipement supprimé' });
  } catch (err) {
    console.error('deleteEquipement error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PLANS DE MAINTENANCE ────────────────────────────────────────────────────

export const getPlans = async (req, res) => {
  try {
    const { equipement_id } = req.query;
    const where = { actif: true };
    if (equipement_id) where.equipement_id = equipement_id;
    const plans = await PlanMaintenance.findAll({
      where,
      include: [
        { model: Equipement, as: 'equipement', attributes: ['id', 'nom', 'service', 'statut'] },
        { model: User, as: 'technicien', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
      order: [['equipement_id', 'ASC'], ['jour_du_mois', 'ASC']],
    });
    res.json({ success: true, data: plans });
  } catch (err) {
    console.error('getPlans error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createPlan = async (req, res) => {
  try {
    const plan = await PlanMaintenance.create(req.body);
    const full = await PlanMaintenance.findByPk(plan.id, {
      include: [
        { model: Equipement, as: 'equipement', attributes: ['id', 'nom', 'service'] },
        { model: User, as: 'technicien', attributes: ['id', 'firstName', 'lastName'] },
      ],
    });
    res.status(201).json({ success: true, data: full });
  } catch (err) {
    console.error('createPlan error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updatePlan = async (req, res) => {
  try {
    const plan = await PlanMaintenance.findByPk(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan introuvable' });
    await plan.update(req.body);
    res.json({ success: true, data: plan });
  } catch (err) {
    console.error('updatePlan error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deletePlan = async (req, res) => {
  try {
    const plan = await PlanMaintenance.findByPk(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan introuvable' });
    await plan.destroy();
    res.json({ success: true, message: 'Plan supprimé' });
  } catch (err) {
    console.error('deletePlan error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── CALENDRIER ANNUEL ───────────────────────────────────────────────────────
// Returns: { [month]: { [day]: [ { equipement, plan } ] } }

export const getCalendar = async (req, res) => {
  try {
    const year = parseInt(req.params.year) || new Date().getFullYear();

    const plans = await PlanMaintenance.findAll({
      where: { actif: true },
      include: [{ model: Equipement, as: 'equipement' }],
    });

    // Build calendar map: calendarData[month][day] = [entries]
    const calendarData = {};
    for (let m = 1; m <= 12; m++) {
      calendarData[m] = {};
    }

    plans.forEach(plan => {
      const { mois, jour_du_mois, equipement } = plan;
      const months = Array.isArray(mois) ? mois : JSON.parse(mois || '[]');
      months.forEach(m => {
        if (m < 1 || m > 12) return;
        // Validate day exists in this month/year
        const daysInMonth = new Date(year, m, 0).getDate();
        const day = Math.min(jour_du_mois, daysInMonth);
        if (!calendarData[m][day]) calendarData[m][day] = [];
        calendarData[m][day].push({
          planId: plan.id,
          equipementId: equipement.id,
          nom: equipement.nom,
          service: equipement.service,
          statut: equipement.statut,
          duree: plan.duree_estimee,
          notes: plan.notes,
        });
      });
    });

    res.json({ success: true, data: calendarData, year });
  } catch (err) {
    console.error('getCalendar error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── STATISTIQUES ────────────────────────────────────────────────────────────

export const getStats = async (req, res) => {
  try {
    const totalEquipements = await Equipement.count();
    const actifs = await Equipement.count({ where: { statut: 'actif' } });
    const enReparation = await Equipement.count({ where: { statut: 'en_reparation' } });
    const horsService = await Equipement.count({ where: { statut: 'hors_service' } });
    const totalPlans = await PlanMaintenance.count({ where: { actif: true } });

    // Count by service
    const byService = await Equipement.findAll({
      attributes: ['service', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['service'],
      raw: true,
    });

    res.json({
      success: true,
      data: { totalEquipements, actifs, enReparation, horsService, totalPlans, byService },
    });
  } catch (err) {
    console.error('getStats error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── INTERVENTIONS ───────────────────────────────────────────────────────────

// GET /interventions - list with filters
export const getInterventions = async (req, res) => {
  try {
    const { type, statut, service, date_debut, date_fin, equipement_id } = req.query;
    const where = {};
    if (type) where.type = type;
    if (statut) where.statut = statut;
    if (equipement_id) where.equipement_id = parseInt(equipement_id);
    if (date_debut || date_fin) {
      where.date_planifiee = {};
      if (date_debut) where.date_planifiee[Op.gte] = date_debut;
      if (date_fin) where.date_planifiee[Op.lte] = date_fin;
    }

    const include = [
      { model: Equipement, as: 'equipement', attributes: ['id', 'nom', 'service', 'statut'] },
      { model: User, as: 'technicien', attributes: ['id', 'firstName', 'lastName', 'email'] },
    ];

    // Filter by service via equipement
    if (service) {
      include[0].where = { service };
    }

    const interventions = await Intervention.findAll({
      where,
      include,
      order: [['date_planifiee', 'ASC']],
    });
    res.json({ success: true, data: interventions });
  } catch (err) {
    console.error('getInterventions error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /interventions/today
export const getTodayInterventions = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const interventions = await Intervention.findAll({
      where: { date_planifiee: today, statut: { [Op.in]: ['planifiee', 'en_cours'] } },
      include: [
        { model: Equipement, as: 'equipement', attributes: ['id', 'nom', 'service'] },
        { model: User, as: 'technicien', attributes: ['id', 'firstName', 'lastName'] },
      ],
      order: [['date_planifiee', 'ASC']],
    });
    res.json({ success: true, data: interventions, count: interventions.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /interventions
export const createIntervention = async (req, res) => {
  try {
    const { equipement_id, plan_id, type, statut, priorite, date_planifiee, technicien_id, description, signale_par } = req.body;
    if (!equipement_id || !date_planifiee) {
      return res.status(400).json({ success: false, message: 'equipement_id et date_planifiee sont requis.' });
    }
    const intervention = await Intervention.create({
      equipement_id, plan_id: plan_id || null, type: type || 'preventive',
      statut: statut || 'planifiee', priorite: priorite || 'normal',
      date_planifiee, technicien_id: technicien_id || null,
      description, signale_par
    });
    const full = await Intervention.findByPk(intervention.id, {
      include: [
        { model: Equipement, as: 'equipement', attributes: ['id', 'nom', 'service'] },
        { model: User, as: 'technicien', attributes: ['id', 'firstName', 'lastName'] },
      ]
    });
    res.status(201).json({ success: true, data: full });
  } catch (err) {
    console.error('createIntervention error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /interventions/:id
export const updateIntervention = async (req, res) => {
  try {
    const { id } = req.params;
    const intervention = await Intervention.findByPk(id);
    if (!intervention) return res.status(404).json({ success: false, message: 'Intervention introuvable.' });
    await intervention.update(req.body);
    const full = await Intervention.findByPk(id, {
      include: [
        { model: Equipement, as: 'equipement', attributes: ['id', 'nom', 'service'] },
        { model: User, as: 'technicien', attributes: ['id', 'firstName', 'lastName'] },
      ]
    });
    res.json({ success: true, data: full });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /interventions/:id/complete
export const completeIntervention = async (req, res) => {
  try {
    const { id } = req.params;
    const { actions_effectuees, pieces_remplacees, duree_reelle, observations } = req.body;
    const intervention = await Intervention.findByPk(id);
    if (!intervention) return res.status(404).json({ success: false, message: 'Intervention introuvable.' });
    await intervention.update({
      statut: 'terminee',
      date_realisation: new Date().toISOString().split('T')[0],
      actions_effectuees, pieces_remplacees, duree_reelle, observations
    });
    res.json({ success: true, data: intervention });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /interventions/:id
export const deleteIntervention = async (req, res) => {
  try {
    const { id } = req.params;
    const intervention = await Intervention.findByPk(id);
    if (!intervention) return res.status(404).json({ success: false, message: 'Intervention introuvable.' });
    await intervention.destroy();
    res.json({ success: true, message: 'Intervention supprimée.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /gmao/analytics - Comprehensive analytics for Phase 3
export const getAnalytics = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const currentYear = new Date().getFullYear();
    const yearStart = `${currentYear}-01-01`;
    const yearEnd = `${currentYear}-12-31`;

    // 1. Compliance rate: terminées / total planned (this year)
    const totalThisYear = await Intervention.count({
      where: {
        date_planifiee: { [Op.between]: [yearStart, yearEnd] },
        type: 'preventive'
      }
    });
    const termineeThisYear = await Intervention.count({
      where: {
        date_planifiee: { [Op.between]: [yearStart, yearEnd] },
        type: 'preventive',
        statut: 'terminee'
      }
    });
    const tauxConformite = totalThisYear > 0 ? Math.round((termineeThisYear / totalThisYear) * 100) : 0;

    // 2. Overdue interventions (planifiee/en_cours, date_planifiee < today)
    const enRetard = await Intervention.count({
      where: {
        date_planifiee: { [Op.lt]: today },
        statut: { [Op.in]: ['planifiee', 'en_cours'] }
      }
    });

    // 3. En cours today
    const enCours = await Intervention.count({
      where: { statut: 'en_cours' }
    });

    // 4. Average real duration (for completed interventions with duree_reelle set)
    const avgDureeResult = await Intervention.findOne({
      attributes: [[sequelize.fn('AVG', sequelize.col('duree_reelle')), 'avgDuree']],
      where: { statut: 'terminee', duree_reelle: { [Op.not]: null } },
      raw: true
    });
    const avgDuree = avgDureeResult?.avgDuree ? Math.round(parseFloat(avgDureeResult.avgDuree) * 10) / 10 : null;

    // 5. Interventions by month (current year) - preventive + corrective
    const byMonthRaw = await Intervention.findAll({
      attributes: [
        [sequelize.fn('EXTRACT', sequelize.literal('MONTH FROM date_planifiee')), 'month'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
        [sequelize.literal(`SUM(CASE WHEN statut = 'terminee' THEN 1 ELSE 0 END)`), 'terminee'],
        [sequelize.literal(`SUM(CASE WHEN type = 'corrective' THEN 1 ELSE 0 END)`), 'corrective'],
      ],
      where: { date_planifiee: { [Op.between]: [yearStart, yearEnd] } },
      group: [sequelize.fn('EXTRACT', sequelize.literal('MONTH FROM date_planifiee'))],
      order: [[sequelize.fn('EXTRACT', sequelize.literal('MONTH FROM date_planifiee')), 'ASC']],
      raw: true
    });
    // Build a full 12-month array
    const byMonth = Array.from({ length: 12 }, (_, i) => {
      const found = byMonthRaw.find(r => parseInt(r.month) === i + 1);
      return { month: i + 1, total: found ? parseInt(found.total) : 0, terminee: found ? parseInt(found.terminee) : 0, corrective: found ? parseInt(found.corrective) : 0 };
    });

    // 6. Interventions by service (via equipement join)
    const byServiceRaw = await Intervention.findAll({
      attributes: [
        [sequelize.col('equipement.service'), 'service'],
        [sequelize.fn('COUNT', sequelize.col('Intervention.id')), 'total'],
        [sequelize.literal(`SUM(CASE WHEN "Intervention"."statut" = 'terminee' THEN 1 ELSE 0 END)`), 'terminee'],
      ],
      include: [{ model: Equipement, as: 'equipement', attributes: [] }],
      where: { date_planifiee: { [Op.between]: [yearStart, yearEnd] } },
      group: [sequelize.col('equipement.service')],
      order: [[sequelize.fn('COUNT', sequelize.col('Intervention.id')), 'DESC']],
      raw: true
    });
    const byService = byServiceRaw.filter(r => r.service).map(r => ({
      service: r.service,
      total: parseInt(r.total),
      terminee: parseInt(r.terminee)
    }));

    // 7. Preventive vs Corrective counts (this year)
    const preventiveCount = await Intervention.count({
      where: { date_planifiee: { [Op.between]: [yearStart, yearEnd] }, type: 'preventive' }
    });
    const correctiveCount = await Intervention.count({
      where: { date_planifiee: { [Op.between]: [yearStart, yearEnd] }, type: 'corrective' }
    });

    // 8. Top equipment with most corrective interventions (all time)
    const topDefaillants = await Intervention.findAll({
      attributes: [
        'equipement_id',
        [sequelize.fn('COUNT', sequelize.col('Intervention.id')), 'nbPannes'],
      ],
      include: [{ model: Equipement, as: 'equipement', attributes: ['id', 'nom', 'service', 'statut'] }],
      where: { type: 'corrective' },
      group: ['equipement_id', 'equipement.id'],
      order: [[sequelize.fn('COUNT', sequelize.col('Intervention.id')), 'DESC']],
      limit: 10,
      raw: false
    });

    // 9. Overdue interventions list (top 10)
    const overdueList = await Intervention.findAll({
      where: {
        date_planifiee: { [Op.lt]: today },
        statut: { [Op.in]: ['planifiee', 'en_cours'] }
      },
      include: [
        { model: Equipement, as: 'equipement', attributes: ['id', 'nom', 'service'] },
        { model: User, as: 'technicien', attributes: ['id', 'firstName', 'lastName'] }
      ],
      order: [['date_planifiee', 'ASC']],
      limit: 10
    });

    res.json({
      success: true,
      data: {
        tauxConformite, totalThisYear, termineeThisYear,
        enRetard, enCours, avgDuree,
        preventiveCount, correctiveCount,
        byMonth, byService,
        topDefaillants: topDefaillants.map(t => ({
          equipement: t.equipement,
          nbPannes: parseInt(t.dataValues.nbPannes)
        })),
        overdueList
      }
    });
  } catch (err) {
    console.error('getAnalytics error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /gmao/rapport/:equipementId - Data for equipment PDF report
export const getRapportEquipement = async (req, res) => {
  try {
    const { equipementId } = req.params;
    const equipement = await Equipement.findByPk(equipementId, {
      include: [{ model: PlanMaintenance, as: 'plans', include: [{ model: User, as: 'technicien', attributes: ['id', 'firstName', 'lastName'] }] }]
    });
    if (!equipement) return res.status(404).json({ success: false, message: 'Équipement introuvable.' });

    const interventions = await Intervention.findAll({
      where: { equipement_id: equipementId },
      include: [{ model: User, as: 'technicien', attributes: ['id', 'firstName', 'lastName'] }],
      order: [['date_planifiee', 'DESC']]
    });

    const stats = {
      total: interventions.length,
      terminee: interventions.filter(i => i.statut === 'terminee').length,
      corrective: interventions.filter(i => i.type === 'corrective').length,
      preventive: interventions.filter(i => i.type === 'preventive').length,
      enRetard: interventions.filter(i => ['planifiee', 'en_cours'].includes(i.statut) && i.date_planifiee < new Date().toISOString().split('T')[0]).length,
      avgDuree: (() => {
        const withDuree = interventions.filter(i => i.duree_reelle);
        return withDuree.length ? Math.round(withDuree.reduce((a, b) => a + b.duree_reelle, 0) / withDuree.length * 10) / 10 : null;
      })()
    };

    res.json({ success: true, data: { equipement, interventions, stats } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /interventions/generate - Generate preventive interventions from plans for a year
export const generatePreventiveInterventions = async (req, res) => {
  try {
    const { year } = req.body;
    const targetYear = year || new Date().getFullYear();

    // Get all active plans
    const plans = await PlanMaintenance.findAll({
      where: { actif: true },
      include: [{ model: Equipement, as: 'equipement' }]
    });

    let created = 0;
    let skipped = 0;

    for (const plan of plans) {
      const months = Array.isArray(plan.mois) ? plan.mois : [];
      for (const month of months) {
        const dateStr = `${targetYear}-${String(month).padStart(2, '0')}-${String(plan.jour_du_mois).padStart(2, '0')}`;
        // Check if already exists
        const existing = await Intervention.findOne({
          where: { plan_id: plan.id, date_planifiee: dateStr }
        });
        if (existing) { skipped++; continue; }
        // Validate date
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) { skipped++; continue; }
        await Intervention.create({
          equipement_id: plan.equipement_id,
          plan_id: plan.id,
          type: 'preventive',
          statut: 'planifiee',
          priorite: 'normal',
          date_planifiee: dateStr,
          technicien_id: plan.technicien_id || null,
          description: `Maintenance préventive - ${plan.equipement?.nom || ''}`,
        });
        created++;
      }
    }

    res.json({ success: true, message: `${created} interventions créées, ${skipped} ignorées (déjà existantes ou dates invalides).`, created, skipped });
  } catch (err) {
    console.error('generatePreventiveInterventions error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
