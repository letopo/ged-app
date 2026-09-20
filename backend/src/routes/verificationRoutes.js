// backend/src/routes/verificationRoutes.js
import express from 'express';
import { Op } from 'sequelize';
import { Document, Workflow, User } from '../models/index.js';

const router = express.Router();

// GET /api/verify/:hash - Endpoint PUBLIC (pas d'auth)
router.get('/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    if (!hash || hash.length < 10) {
      return res.status(400).json({ success: false, message: 'Hash invalide' });
    }

    // Chercher le document qui contient ce hash de verification
    const document = await Document.findOne({
      where: {
        metadata: { [Op.contains]: { verification_hash: hash } }
      },
      include: [
        { model: User, as: 'uploadedBy', attributes: ['firstName', 'lastName', 'email'] },
        {
          model: Workflow,
          as: 'workflows',
          include: [{ model: User, as: 'validator', attributes: ['firstName', 'lastName', 'email', 'role'] }],
          order: [['step', 'ASC']],
        },
      ],
    });

    if (!document) {
      return res.json({
        success: false,
        verified: false,
        message: 'Document non trouve ou hash invalide',
      });
    }

    // Construire les infos de verification
    const signatures = (document.workflows || [])
      .filter(w => w.status === 'approved' && w.validatedAt)
      .map(w => ({
        step: w.step,
        validator: w.validator
          ? `${w.validator.firstName} ${w.validator.lastName}`
          : 'Inconnu',
        role: w.validator?.role || '',
        date: w.validatedAt,
      }));

    res.json({
      success: true,
      verified: true,
      data: {
        title: document.title,
        category: document.category,
        status: document.status,
        createdAt: document.createdAt,
        createdBy: document.uploadedBy
          ? `${document.uploadedBy.firstName} ${document.uploadedBy.lastName}`
          : 'Inconnu',
        signatures,
        verificationHash: hash,
      },
    });
  } catch (error) {
    console.error('Erreur verification:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

export default router;
