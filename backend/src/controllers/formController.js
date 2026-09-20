// backend/src/controllers/formController.js

import { Op } from 'sequelize';
import { Form, FormPermission, FormResponse, User, WorkflowTemplate } from '../models/index.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function validateSchema(schema) {
  const errors = [];
  if (!schema || typeof schema !== 'object') {
    errors.push('Schéma invalide');
    return errors;
  }
  if (!Array.isArray(schema.fields)) errors.push('fields doit être un tableau');
  return errors;
}

// ─── CRUD Formulaires ─────────────────────────────────────────────────────────

/** GET /api/forms */
export const getForms = async (req, res) => {
  try {
    const { status, type, search, page = 1, limit = 20 } = req.query;
    const where = {};

    if (status) where.status = status;
    if (type)   where.type   = type;
    if (search) where.title  = { [Op.iLike]: `%${search}%` };

    // Les non-admins voient uniquement leurs propres formulaires (draft)
    // et les formulaires publiés auxquels ils ont accès
    if (!['admin', 'director'].includes(req.user.role)) {
      where[Op.or] = [
        { createdBy: req.user.id },
        { status: 'published' },
      ];
    }

    const { count, rows } = await Form.findAndCountAll({
      where,
      include: [{ model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    res.json({
      success: true,
      data: rows,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / limit) },
    });
  } catch (err) {
    console.error('getForms:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/forms/:id */
export const getFormById = async (req, res) => {
  try {
    const form = await Form.findByPk(req.params.id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName'] },
        { model: FormPermission, as: 'permissions' },
      ],
    });
    if (!form) return res.status(404).json({ success: false, message: 'Formulaire introuvable' });
    res.json({ success: true, data: form });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** POST /api/forms */
export const createForm = async (req, res) => {
  try {
    const { title, description, type, schema, settings, workflowTemplateId } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Le titre est requis' });

    const form = await Form.create({
      title,
      description,
      type: type || 'custom',
      schema: schema || { version: 1, fields: [], layout: { columns: 12, rowHeight: 40, gap: 8 }, logic: { conditions: [], calculations: [] } },
      settings: settings || {},
      createdBy: req.user.id,
      status: 'draft',
      workflowTemplateId: workflowTemplateId || null,
      tenantId: req.tenantId,
    });

    res.status(201).json({ success: true, data: form });
  } catch (err) {
    console.error('createForm:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/** PUT /api/forms/:id */
export const updateForm = async (req, res) => {
  try {
    const form = await Form.findByPk(req.params.id);
    if (!form) return res.status(404).json({ success: false, message: 'Formulaire introuvable' });

    // Vérification propriétaire ou admin
    if (form.createdBy !== req.user.id && !['admin', 'director'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }

    const { title, description, type, schema, settings, workflowTemplateId } = req.body;

    // Valider le schéma si fourni
    if (schema) {
      const errors = validateSchema(schema);
      if (errors.length) return res.status(400).json({ success: false, errors });
    }

    await form.update({
      ...(title              !== undefined && { title }),
      ...(description        !== undefined && { description }),
      ...(type               !== undefined && { type }),
      ...(schema             !== undefined && { schema }),
      ...(settings           !== undefined && { settings }),
      ...(workflowTemplateId !== undefined && { workflowTemplateId: workflowTemplateId || null }),
    });

    res.json({ success: true, data: form });
  } catch (err) {
    console.error('updateForm:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/** PATCH /api/forms/:id/publish */
export const publishForm = async (req, res) => {
  try {
    const form = await Form.findByPk(req.params.id);
    if (!form) return res.status(404).json({ success: false, message: 'Formulaire introuvable' });

    if (form.createdBy !== req.user.id && !['admin', 'director'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }

    const errors = validateSchema(form.schema);
    if (errors.length) return res.status(400).json({ success: false, errors });

    if (!form.schema.fields || form.schema.fields.length === 0) {
      return res.status(400).json({ success: false, message: 'Le formulaire doit contenir au moins un champ' });
    }

    await form.update({
      status: 'published',
      publishedAt: new Date(),
      version: form.version + 1,
    });

    res.json({ success: true, data: form, message: 'Formulaire publié avec succès' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** PATCH /api/forms/:id/unpublish */
export const unpublishForm = async (req, res) => {
  try {
    const form = await Form.findByPk(req.params.id);
    if (!form) return res.status(404).json({ success: false, message: 'Formulaire introuvable' });

    await form.update({ status: 'draft' });
    res.json({ success: true, data: form });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** PATCH /api/forms/:id/archive */
export const archiveForm = async (req, res) => {
  try {
    const form = await Form.findByPk(req.params.id);
    if (!form) return res.status(404).json({ success: false, message: 'Formulaire introuvable' });

    await form.update({ status: 'archived' });
    res.json({ success: true, data: form });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** DELETE /api/forms/:id */
export const deleteForm = async (req, res) => {
  try {
    const form = await Form.findByPk(req.params.id);
    if (!form) return res.status(404).json({ success: false, message: 'Formulaire introuvable' });

    if (form.createdBy !== req.user.id && !['admin', 'director'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }

    // Supprime aussi les permissions et réponses en cascade (FK)
    await form.destroy();
    res.json({ success: true, message: 'Formulaire supprimé' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** POST /api/forms/:id/duplicate */
export const duplicateForm = async (req, res) => {
  try {
    const original = await Form.findByPk(req.params.id);
    if (!original) return res.status(404).json({ success: false, message: 'Formulaire introuvable' });

    const copy = await Form.create({
      title:              `${original.title} (copie)`,
      description:        original.description,
      type:               original.type,
      schema:             { ...original.schema, version: 1 },
      settings:           original.settings,
      createdBy:          req.user.id,
      status:             'draft',
      workflowTemplateId: original.workflowTemplateId || null,
      tenantId:           req.tenantId,
    });

    res.status(201).json({ success: true, data: copy });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Permissions ──────────────────────────────────────────────────────────────

/** GET /api/forms/:id/permissions */
export const getFormPermissions = async (req, res) => {
  try {
    const perms = await FormPermission.findAll({ where: { formId: req.params.id } });
    res.json({ success: true, data: perms });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** PUT /api/forms/:id/permissions */
export const setFormPermissions = async (req, res) => {
  try {
    const { permissions } = req.body; // Array de { targetType, targetId, canView, canFill, canEdit, canDelete }
    if (!Array.isArray(permissions)) return res.status(400).json({ success: false, message: 'permissions doit être un tableau' });

    // Remplacer toutes les permissions existantes
    await FormPermission.destroy({ where: { formId: req.params.id } });

    const created = await FormPermission.bulkCreate(
      permissions.map(p => ({ ...p, formId: req.params.id }))
    );

    res.json({ success: true, data: created });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Réponses ─────────────────────────────────────────────────────────────────

/** POST /api/forms/:id/responses */
export const submitResponse = async (req, res) => {
  try {
    const form = await Form.findByPk(req.params.id);
    if (!form) return res.status(404).json({ success: false, message: 'Formulaire introuvable' });
    if (form.status !== 'published') return res.status(400).json({ success: false, message: 'Ce formulaire n\'est pas publié' });

    // Résoudre le workflow template si lié
    let workflowStatus = null;
    let workflowCurrentStep = null;
    let workflowData = null;

    if (form.workflowTemplateId) {
      const template = await WorkflowTemplate.findByPk(form.workflowTemplateId);
      if (template && Array.isArray(template.validators) && template.validators.length > 0) {
        // Résoudre les validateurs par rôle → chercher un utilisateur correspondant dans le tenant
        const resolvedSteps = await Promise.all(
          template.validators.map(async (v, i) => {
            let resolvedUserId = v.userId || null;
            let resolvedUserLabel = v.label || '';

            if (v.validatorType === 'role' && v.role) {
              try {
                const roleUser = await User.findOne({
                  where: { role: v.role, tenantId: req.tenantId },
                  attributes: ['id', 'firstName', 'lastName'],
                });
                if (roleUser) {
                  resolvedUserId = roleUser.id;
                  resolvedUserLabel = `${roleUser.firstName} ${roleUser.lastName}`;
                } else {
                  resolvedUserLabel = `Rôle: ${v.role}`;
                }
              } catch {
                // Role value not in DB enum — store as label only, admin can still approve
                resolvedUserLabel = `Rôle: ${v.role}`;
              }
            } else if (v.userId) {
              const u = await User.findByPk(v.userId, { attributes: ['id', 'firstName', 'lastName'] });
              if (u) resolvedUserLabel = `${u.firstName} ${u.lastName}`;
            }

            return {
              step: i + 1,
              name: v.name || `Étape ${i + 1}`,
              validatorType: v.validatorType || 'user',
              role: v.role || null,
              userId: resolvedUserId,
              userLabel: resolvedUserLabel,
              deadlineDays: v.deadlineDays || null,
              onReject: v.onReject || 'back_to_sender',
              status: 'pending',
              comment: null,
              validatedAt: null,
            };
          })
        );

        workflowStatus = 'pending_approval';
        workflowCurrentStep = 1;
        workflowData = {
          templateId:   template.id,
          templateName: template.name,
          steps:        resolvedSteps,
        };
      }
    }

    const response = await FormResponse.create({
      formId:             form.id,
      formVersion:        form.version,
      submittedBy:        req.user?.id || null,
      data:               req.body.data || {},
      ipAddress:          req.ip,
      workflowStatus,
      workflowCurrentStep,
      workflowData,
    });

    res.status(201).json({
      success: true,
      data: response,
      message: form.settings?.successMessage || 'Formulaire soumis avec succès',
      hasWorkflow: !!workflowStatus,
    });
  } catch (err) {
    console.error('submitResponse:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/** POST /api/forms/:formId/responses/:responseId/approve */
export const approveStep = async (req, res) => {
  try {
    const response = await FormResponse.findOne({
      where: { id: req.params.rid, formId: req.params.id },
    });
    if (!response) return res.status(404).json({ success: false, message: 'Réponse introuvable' });
    if (response.workflowStatus !== 'pending_approval')
      return res.status(400).json({ success: false, message: 'Aucun workflow en attente' });

    const steps = response.workflowData?.steps || [];
    const currentIdx = (response.workflowCurrentStep || 1) - 1;
    const currentStep = steps[currentIdx];

    if (!currentStep) return res.status(400).json({ success: false, message: 'Étape introuvable' });

    // Vérifier que l'utilisateur peut approuver cette étape
    const canApprove =
      currentStep.userId === req.user.id ||
      (currentStep.validatorType === 'role' && currentStep.role === req.user.role) ||
      ['admin', 'superadmin'].includes(req.user.role);

    if (!canApprove) return res.status(403).json({ success: false, message: 'Vous n\'êtes pas autorisé à valider cette étape' });

    steps[currentIdx] = {
      ...currentStep,
      status: 'approved',
      comment: req.body.comment || null,
      validatedAt: new Date().toISOString(),
      validatedBy: req.user.id,
    };

    const isLastStep = currentIdx >= steps.length - 1;
    const nextStep = isLastStep ? null : response.workflowCurrentStep + 1;

    await response.update({
      workflowData: { ...response.workflowData, steps },
      workflowCurrentStep: nextStep,
      workflowStatus: isLastStep ? 'approved' : 'pending_approval',
      status: isLastStep ? 'reviewed' : response.status,
    });

    res.json({
      success: true,
      message: isLastStep ? 'Formulaire approuvé définitivement' : `Étape ${response.workflowCurrentStep} approuvée`,
      data: response,
    });
  } catch (err) {
    console.error('approveStep:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/** POST /api/forms/:formId/responses/:responseId/reject */
export const rejectStep = async (req, res) => {
  try {
    const response = await FormResponse.findOne({
      where: { id: req.params.rid, formId: req.params.id },
    });
    if (!response) return res.status(404).json({ success: false, message: 'Réponse introuvable' });
    if (response.workflowStatus !== 'pending_approval')
      return res.status(400).json({ success: false, message: 'Aucun workflow en attente' });

    const steps = response.workflowData?.steps || [];
    const currentIdx = (response.workflowCurrentStep || 1) - 1;
    const currentStep = steps[currentIdx];

    if (!currentStep) return res.status(400).json({ success: false, message: 'Étape introuvable' });

    const canReject =
      currentStep.userId === req.user.id ||
      (currentStep.validatorType === 'role' && currentStep.role === req.user.role) ||
      ['admin', 'superadmin'].includes(req.user.role);

    if (!canReject) return res.status(403).json({ success: false, message: 'Non autorisé' });

    steps[currentIdx] = {
      ...currentStep,
      status: 'rejected',
      comment: req.body.comment || null,
      validatedAt: new Date().toISOString(),
      validatedBy: req.user.id,
    };

    // Action sur rejet selon la config de l'étape
    let newStatus = 'rejected';
    let newStep = null;
    if (currentStep.onReject === 'previous_step' && currentIdx > 0) {
      newStatus = 'pending_approval';
      newStep = currentIdx; // revient à l'étape précédente (idx-1 + 1)
      steps[currentIdx - 1] = { ...steps[currentIdx - 1], status: 'pending', comment: null, validatedAt: null };
    }

    await response.update({
      workflowData: { ...response.workflowData, steps },
      workflowCurrentStep: newStep,
      workflowStatus: newStatus,
    });

    res.json({
      success: true,
      message: newStatus === 'rejected' ? 'Formulaire rejeté' : 'Retour à l\'étape précédente',
      data: response,
    });
  } catch (err) {
    console.error('rejectStep:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/forms/responses/pending — tâches en attente pour l'utilisateur connecté */
export const getPendingApprovals = async (req, res) => {
  try {
    const responses = await FormResponse.findAll({
      where: { workflowStatus: 'pending_approval' },
      include: [
        { model: Form, as: 'form', attributes: ['id', 'title', 'type'], where: { tenantId: req.tenantId } },
        { model: User, as: 'submitter', attributes: ['id', 'firstName', 'lastName'] },
      ],
      order: [['submittedAt', 'DESC']],
    });

    // Filtrer : seules les réponses dont l'étape actuelle est assignée à cet utilisateur
    const mine = responses.filter(r => {
      const steps = r.workflowData?.steps || [];
      const currentIdx = (r.workflowCurrentStep || 1) - 1;
      const step = steps[currentIdx];
      if (!step) return false;
      return (
        step.userId === req.user.id ||
        (step.validatorType === 'role' && step.role === req.user.role) ||
        ['admin', 'superadmin'].includes(req.user.role)
      );
    });

    res.json({ success: true, data: mine });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/forms/:id/responses */
export const getFormResponses = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const where = { formId: req.params.id };
    if (status) where.status = status;

    const { count, rows } = await FormResponse.findAndCountAll({
      where,
      include: [{ model: User, as: 'submitter', attributes: ['id', 'firstName', 'lastName', 'email'] }],
      order: [['submittedAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    res.json({
      success: true,
      data: rows,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/forms/:id/responses/:rid */
export const getResponseById = async (req, res) => {
  try {
    const response = await FormResponse.findOne({
      where: { id: req.params.rid, formId: req.params.id },
      include: [
        { model: User, as: 'submitter', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: Form, as: 'form', attributes: ['id', 'title', 'schema'] },
      ],
    });
    if (!response) return res.status(404).json({ success: false, message: 'Réponse introuvable' });
    res.json({ success: true, data: response });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** PATCH /api/forms/:id/responses/:rid/status */
export const updateResponseStatus = async (req, res) => {
  try {
    const response = await FormResponse.findOne({ where: { id: req.params.rid, formId: req.params.id } });
    if (!response) return res.status(404).json({ success: false, message: 'Réponse introuvable' });

    await response.update({ status: req.body.status });
    res.json({ success: true, data: response });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/forms/:id/stats */
export const getFormStats = async (req, res) => {
  try {
    const form = await Form.findByPk(req.params.id);
    if (!form) return res.status(404).json({ success: false, message: 'Formulaire introuvable' });

    const total      = await FormResponse.count({ where: { formId: req.params.id } });
    const submitted  = await FormResponse.count({ where: { formId: req.params.id, status: 'submitted' } });
    const reviewed   = await FormResponse.count({ where: { formId: req.params.id, status: 'reviewed' } });

    res.json({
      success: true,
      data: { total, submitted, reviewed, form: { id: form.id, title: form.title, status: form.status } },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
