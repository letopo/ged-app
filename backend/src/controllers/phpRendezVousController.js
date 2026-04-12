import { Op } from 'sequelize';
import RendezVousPHP from '../models/RendezVousPHP.js';
import PatientPHP    from '../models/PatientPHP.js';
import Infirmerie    from '../models/Infirmerie.js';
import Secteur       from '../models/Secteur.js';

const patientInclude = {
  model: PatientPHP,
  as: 'patient',
  attributes: ['id', 'matricule', 'nom', 'prenom', 'infirmerieId'],
  include: [
    { model: Infirmerie, as: 'infirmerie', attributes: ['id', 'code', 'nom'] },
    { model: Secteur,    as: 'secteur',    attributes: ['id', 'nom'] },
  ],
};

// ── GET /api/php/rendez-vous ─────────────────────────────────────────────────
export const getRendezVous = async (req, res) => {
  try {
    const { status, dateDebut, dateFin, infirmerieId, search } = req.query;

    const where = {};
    if (status)    where.status = status;
    if (dateDebut && dateFin)
      where.dateRdv = { [Op.between]: [dateDebut, dateFin] };
    else if (dateDebut)
      where.dateRdv = { [Op.gte]: dateDebut };

    const patientWhere = {};
    if (infirmerieId) patientWhere.infirmerieId = infirmerieId;

    const rows = await RendezVousPHP.findAll({
      where,
      include: [{
        ...patientInclude,
        where: Object.keys(patientWhere).length ? patientWhere : undefined,
        required: Object.keys(patientWhere).length > 0,
      }],
      order: [['dateRdv', 'ASC'], ['heureRdv', 'ASC']],
    });

    // Filtre recherche en mémoire
    let data = rows;
    if (search) {
      const q = search.toLowerCase();
      data = rows.filter(r => {
        const p = r.patient;
        return p && (
          (p.matricule || '').toLowerCase().includes(q) ||
          (p.nom || '').toLowerCase().includes(q) ||
          (p.prenom || '').toLowerCase().includes(q)
        );
      });
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error('getRendezVous:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/php/rendez-vous/today ───────────────────────────────────────────
export const getRdvDuJour = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const rows = await RendezVousPHP.findAll({
      where: { dateRdv: today, status: 'planifie' },
      include: [patientInclude],
      order: [['heureRdv', 'ASC']],
    });
    res.json({ success: true, data: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/php/rendez-vous ────────────────────────────────────────────────
export const createRendezVous = async (req, res) => {
  try {
    const { patientId, consultationId, dateRdv, heureRdv, service, motif, notes } = req.body;
    if (!patientId || !dateRdv)
      return res.status(400).json({ success: false, message: 'patientId et dateRdv obligatoires' });

    const rdv = await RendezVousPHP.create({
      patientId, consultationId: consultationId || null,
      dateRdv, heureRdv: heureRdv || null,
      service, motif, notes,
      status: 'planifie',
      creePar: req.user.id,
    });

    const full = await RendezVousPHP.findByPk(rdv.id, { include: [patientInclude] });
    res.status(201).json({ success: true, data: full });
  } catch (err) {
    console.error('createRendezVous:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH /api/php/rendez-vous/:id/status ────────────────────────────────────
export const updateStatusRdv = async (req, res) => {
  try {
    const rdv = await RendezVousPHP.findByPk(req.params.id);
    if (!rdv) return res.status(404).json({ success: false, message: 'RDV introuvable' });

    const { status, notes, dateRdv, heureRdv } = req.body;
    await rdv.update({
      ...(status   && { status }),
      ...(notes    && { notes }),
      ...(dateRdv  && { dateRdv }),
      ...(heureRdv && { heureRdv }),
    });

    const full = await RendezVousPHP.findByPk(rdv.id, { include: [patientInclude] });
    res.json({ success: true, data: full });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/php/rendez-vous/:id ─────────────────────────────────────────
export const deleteRendezVous = async (req, res) => {
  try {
    const rdv = await RendezVousPHP.findByPk(req.params.id);
    if (!rdv) return res.status(404).json({ success: false, message: 'RDV introuvable' });
    await rdv.destroy();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
