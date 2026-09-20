// backend/src/controllers/workflowTemplateController.js
import { WorkflowTemplate, User } from '../models/index.js';

// Templates codés en dur (frontend/src/pages/CreateFromTemplate.jsx) + catégories
// générées par d'autres modules. Ordre de mission est exclu : sa chaîne de
// validation est calculée dynamiquement à partir des postes (backend/src/utils/
// ordreMissionChain.js), pas d'un WorkflowTemplate.
// Note : "Demande de permission" est volontairement absent — un modèle la
// couvre déjà ("Validation - Demande de Permission").
const HARDCODED_CATEGORIES = [
  'Demande de besoin',
  'Pièce de caisse',
  'Demande de travaux',
  'Demande de permutation',
  'Bon de sortie',
  'Bon de commande',
  'Bon de commande interne',
  "Certificat d'aptitude",
  'Planning Opératoire',
  'Attestation de départ en congé annuel',
  "Demande d'explication",
  "Fiche de suivi d'équipements",
];

// GET /api/workflow-templates
export const getTemplates = async (req, res) => {
  try {
    const where = {};
    // Non-admins ne voient que les templates actifs
    if (!['admin','superadmin'].includes(req.user.role)) {
      where.isActive = true;
    }
    const templates = await WorkflowTemplate.findAll({
      where,
      order: [['name', 'ASC']],
    });

    // Enrichir avec les noms des validateurs
    const userIds = [...new Set(templates.flatMap(t => (t.validators || []).map(v => v.userId)))];
    const users = userIds.length > 0
      ? await User.findAll({ where: { id: userIds }, attributes: ['id', 'firstName', 'lastName', 'email', 'role'] })
      : [];
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    const enriched = templates.map(t => {
      const plain = t.toJSON();
      plain.validators = (plain.validators || []).map(v => ({
        ...v,
        user: userMap[v.userId] || null,
      }));
      return plain;
    });

    res.json({ success: true, data: enriched });
  } catch (error) {
    console.error('Erreur getTemplates:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// POST /api/workflow-templates
export const createTemplate = async (req, res) => {
  try {
    if (!['admin','superadmin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Admin requis' });
    }
    const { name, description, categories, validators } = req.body;
    if (!name || !validators || !Array.isArray(validators) || validators.length === 0) {
      return res.status(400).json({ success: false, message: 'Nom et validateurs requis' });
    }
    const template = await WorkflowTemplate.create({
      name,
      description: description || null,
      categories: categories || null,
      validators,
      createdBy: req.user.id,
      tenantId: req.tenantId,
    });
    res.status(201).json({ success: true, data: template });
  } catch (error) {
    console.error('Erreur createTemplate:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// PUT /api/workflow-templates/:id
export const updateTemplate = async (req, res) => {
  try {
    if (!['admin','superadmin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Admin requis' });
    }
    const template = await WorkflowTemplate.findByPk(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Modele introuvable' });
    }
    const { name, description, categories, validators, isActive } = req.body;
    await template.update({
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(categories !== undefined && { categories }),
      ...(validators !== undefined && { validators }),
      ...(isActive !== undefined && { isActive }),
    });
    res.json({ success: true, data: template });
  } catch (error) {
    console.error('Erreur updateTemplate:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// DELETE /api/workflow-templates/:id
export const deleteTemplate = async (req, res) => {
  try {
    if (!['admin','superadmin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Admin requis' });
    }
    const template = await WorkflowTemplate.findByPk(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Modele introuvable' });
    }
    await template.destroy();
    res.json({ success: true, message: 'Modele supprime' });
  } catch (error) {
    console.error('Erreur deleteTemplate:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// POST /api/workflow-templates/seed
// Crée un modèle par défaut (une étape placeholder) pour chaque template codé
// en dur qui n'a encore aucun modèle le ciblant explicitement, pour qu'ils
// soient tous visibles et personnalisables depuis "Modèles workflow".
export const seed = async (req, res) => {
  try {
    if (!['admin','superadmin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Admin requis' });
    }

    const existing = await WorkflowTemplate.findAll({ attributes: ['categories'] });
    const coveredCategories = new Set(existing.flatMap(t => t.categories || []));

    const toCreate = HARDCODED_CATEGORIES
      .filter(cat => !coveredCategories.has(cat))
      .map(cat => ({
        name: `Validation - ${cat}`,
        description: 'Modèle par défaut généré automatiquement — à personnaliser.',
        categories: [cat],
        validators: [{
          name: 'Validateur', role: 'validator', step: 1, label: 'Validateur',
          userId: null, onReject: 'back_to_sender', deadlineDays: null,
          validatorType: 'role', user: null,
        }],
        createdBy: req.user.id,
        tenantId: req.tenantId,
      }));

    if (toCreate.length === 0) {
      return res.json({ success: true, message: 'Tout est à jour', count: 0 });
    }

    await WorkflowTemplate.bulkCreate(toCreate);
    res.json({ success: true, message: `${toCreate.length} modèle(s) créé(s)`, count: toCreate.length });
  } catch (error) {
    console.error('Erreur seed workflow templates:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};
