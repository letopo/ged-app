// backend/src/controllers/missionMealController.js
// Barème des indemnités de repas de mission + seuils horaires — réglable par
// la comptable, l'admin et le DG. Utilisé pour calculer les frais de mission
// (missionnaire + conducteur) affichés en référence pour la pièce de caisse.
import { MissionMealRate, MissionMealThreshold, Employee } from '../models/index.js';
import { userHasPoste } from '../utils/posteResolver.js';
import { calculerIndemnite } from '../utils/missionIndemniteCalculator.js';

const canManageRates = async (user) =>
  ['admin', 'superadmin'].includes(user.role)
  || await userHasPoste(user.id, 'comptable')
  || await userHasPoste(user.id, 'dg');

export const getMealRates = async (req, res, next) => {
  try {
    const rates = await MissionMealRate.findAll({ order: [['categorie', 'ASC']] });
    const [thresholds] = await MissionMealThreshold.findOrCreate({
      where: { tenantId: req.tenantId },
      defaults: { tenantId: req.tenantId },
    });
    res.json({ success: true, data: { rates, thresholds } });
  } catch (error) {
    next(error);
  }
};

export const upsertMealRate = async (req, res, next) => {
  try {
    if (!(await canManageRates(req.user))) {
      return res.status(403).json({ success: false, message: 'Accès réservé à la comptabilité, au DG et aux administrateurs.' });
    }
    const { categorie, montantPetitDejeuner, montantDejeuner, montantDiner, montantHebergement } = req.body;
    if (!categorie) return res.status(400).json({ success: false, message: 'Catégorie requise.' });

    const [rate] = await MissionMealRate.upsert({
      tenantId: req.tenantId,
      categorie,
      montantPetitDejeuner: montantPetitDejeuner ?? 0,
      montantDejeuner: montantDejeuner ?? 0,
      montantDiner: montantDiner ?? 0,
      montantHebergement: montantHebergement ?? 0,
    }, { returning: true });

    res.json({ success: true, data: rate });
  } catch (error) {
    next(error);
  }
};

export const deleteMealRate = async (req, res, next) => {
  try {
    if (!(await canManageRates(req.user))) {
      return res.status(403).json({ success: false, message: 'Accès réservé à la comptabilité, au DG et aux administrateurs.' });
    }
    await MissionMealRate.destroy({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const updateMealThresholds = async (req, res, next) => {
  try {
    if (!(await canManageRates(req.user))) {
      return res.status(403).json({ success: false, message: 'Accès réservé à la comptabilité, au DG et aux administrateurs.' });
    }
    const {
      heureLimitePetitDejeuner, heureDejeunerDebut, heureDejeunerFin, heureDinerDebut, heureLimiteDiner,
      montantPrimeSecurite, montantPeageChauffeur,
    } = req.body;
    const [thresholds] = await MissionMealThreshold.findOrCreate({
      where: { tenantId: req.tenantId },
      defaults: { tenantId: req.tenantId },
    });
    await thresholds.update({
      heureLimitePetitDejeuner: heureLimitePetitDejeuner ?? thresholds.heureLimitePetitDejeuner,
      heureDejeunerDebut: heureDejeunerDebut ?? thresholds.heureDejeunerDebut,
      heureDejeunerFin: heureDejeunerFin ?? thresholds.heureDejeunerFin,
      heureDinerDebut: heureDinerDebut ?? thresholds.heureDinerDebut,
      heureLimiteDiner: heureLimiteDiner ?? thresholds.heureLimiteDiner,
      montantPrimeSecurite: montantPrimeSecurite ?? thresholds.montantPrimeSecurite,
      montantPeageChauffeur: montantPeageChauffeur ?? thresholds.montantPeageChauffeur,
    });
    res.json({ success: true, data: thresholds });
  } catch (error) {
    next(error);
  }
};

// Calcule les indemnités du missionnaire + conducteur d'un OM, pour affichage
// en référence à la comptable (ne crée/modifie aucun document).
export const calculateMissionMeals = async (req, res, next) => {
  try {
    const { missionnaireId, missionnaireSource, conducteurId, conducteurSource, heureDepart, heureRetour, dateDepart, dateRetour } = req.body;

    const [thresholds] = await MissionMealThreshold.findOrCreate({
      where: { tenantId: req.tenantId },
      defaults: { tenantId: req.tenantId },
    });
    const rates = await MissionMealRate.findAll();
    const rateByCategorie = Object.fromEntries(rates.map(r => [r.categorie, r]));

    const resolveCategorie = async (id, source) => {
      if (!id || source !== 'employee') return null;
      const employee = await Employee.findByPk(id, { attributes: ['categorie'] });
      return employee?.categorie || null;
    };

    const buildResult = async (id, source) => {
      const categorie = await resolveCategorie(id, source);
      const rate = categorie ? rateByCategorie[categorie] : null;
      return { categorie, ...calculerIndemnite({ rate, thresholds, heureDepart, heureRetour, dateDepart, dateRetour }) };
    };

    const [missionnaire, conducteur] = await Promise.all([
      buildResult(missionnaireId, missionnaireSource),
      buildResult(conducteurId, conducteurSource),
    ]);

    // Péage chauffeur : montant fixe, indépendant de la catégorie, ajouté
    // automatiquement dès qu'un conducteur est désigné sur l'ordre de mission.
    if (conducteurId) {
      const montantPeage = Number(thresholds.montantPeageChauffeur ?? 1000);
      conducteur.peage = true;
      conducteur.montantPeage = montantPeage;
      conducteur.total = Number(conducteur.total || 0) + montantPeage;
    }

    res.json({ success: true, data: { missionnaire, conducteur, total: missionnaire.total + conducteur.total } });
  } catch (error) {
    next(error);
  }
};
