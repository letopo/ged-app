// backend/src/routes/categoryAccess.js — Paramètres › Confidentialité (administrateurs).
// Règles « qui peut voir quel type de document » du tenant courant ; logique
// d'application : utils/categoryAccess.js.
import express from 'express';
import { Op } from 'sequelize';
import { protect, authorize } from '../middleware/auth.js';
import { sequelize, CategoryAccessRule, Document, Poste, AuditLog } from '../models/index.js';
import { getCategoryRules, invalidateCategoryRules } from '../utils/categoryAccess.js';

const router = express.Router();
const admin = [protect, authorize('admin')];

async function payload(tenantId) {
  const [rules, postes, categories] = await Promise.all([
    getCategoryRules(tenantId),
    Poste.findAll({ attributes: ['code', 'label'], order: [['label', 'ASC']] }),
    Document.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('category')), 'category']],
      where: { category: { [Op.ne]: null } },
      raw: true,
    }),
  ]);
  const known = new Set([...categories.map(c => c.category), ...rules.map(r => r.category)].filter(Boolean));
  return {
    success: true,
    rules,
    postes: postes.map(p => ({ code: p.code, label: p.label })),
    categories: [...known].sort((a, b) => a.localeCompare(b, 'fr')),
  };
}

router.get('/category-access-rules', ...admin, async (req, res) => {
  try {
    res.json(await payload(req.tenantId));
  } catch (error) {
    console.error('Confidentialité :', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// Remplace l'ensemble des règles du tenant
router.put('/category-access-rules', ...admin, async (req, res) => {
  try {
    const input = Array.isArray(req.body?.rules) ? req.body.rules : null;
    if (!input || input.length > 200) return res.status(400).json({ success: false, message: 'Liste de règles invalide.' });

    const validCodes = new Set((await Poste.findAll({ attributes: ['code'] })).map(p => p.code));
    const seen = new Set();
    const rules = [];
    for (const r of input) {
      const category = String(r?.category || '').trim().slice(0, 150);
      if (!category) return res.status(400).json({ success: false, message: 'Chaque règle doit avoir un type de document.' });
      if (seen.has(category.toLowerCase())) return res.status(400).json({ success: false, message: `Type de document en double : « ${category} ».` });
      seen.add(category.toLowerCase());
      const allowedPostes = [...new Set((Array.isArray(r.allowedPostes) ? r.allowedPostes : []).map(String))];
      const unknown = allowedPostes.filter(c => !validCodes.has(c));
      if (unknown.length) return res.status(400).json({ success: false, message: `Poste inconnu : ${unknown.join(', ')}.` });
      rules.push({ category, allowedPostes, includeParticipants: r.includeParticipants !== false });
    }

    const before = await getCategoryRules(req.tenantId);
    await sequelize.transaction(async (transaction) => {
      await CategoryAccessRule.destroy({ where: { tenantId: req.tenantId }, transaction });
      if (rules.length) {
        await CategoryAccessRule.bulkCreate(
          rules.map(r => ({ ...r, tenantId: req.tenantId, updatedBy: req.user.id })),
          { transaction },
        );
      }
    });
    invalidateCategoryRules(req.tenantId);

    await AuditLog.log(req, 'CATEGORY_ACCESS_UPDATED', 'tenant', req.tenantId, {
      avant: before.map(r => ({ category: r.category, postes: r.allowedPostes, participants: r.includeParticipants })),
      après: rules.map(r => ({ category: r.category, postes: r.allowedPostes, participants: r.includeParticipants })),
    });
    res.json({ ...(await payload(req.tenantId)), message: 'Règles de confidentialité enregistrées.' });
  } catch (error) {
    console.error('Confidentialité :', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

export default router;
