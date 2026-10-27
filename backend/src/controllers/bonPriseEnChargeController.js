// backend/src/controllers/bonPriseEnChargeController.js
// Création d'un bon de prise en charge (BPC) du personnel : le médecin du
// travail (ou une personne autorisée) saisit le malade, le type de soins et le
// diagnostic ; le serveur dessine le bon A5 (utils/bonPriseEnCharge.js). Le
// circuit Médecin du travail → RH → DG est ensuite lancé comme pour les autres
// circuits imposés (POST /api/workflows, utils/posteChain.js).
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { Document } from '../models/index.js';
import { BPC_CATEGORY, sanitizeMedecinFields, buildBpcPdf } from '../utils/bonPriseEnCharge.js';
import { canUseTemplate } from './templatePermissionController.js';

// POST /api/documents/bon-prise-en-charge  { nomMalade, typeSoins, dateSoins, diagnostic }
export const createBonPriseEnCharge = async (req, res, next) => {
  try {
    if (!(await canUseTemplate(req.user, BPC_CATEGORY))) {
      return res.status(403).json({ success: false, message: 'Réservé au médecin du travail, aux RH et aux administrateurs.' });
    }
    const { fields, error } = sanitizeMedecinFields(req.body || {});
    if (error) return res.status(400).json({ success: false, message: error });

    const { bytes, signatureZones } = await buildBpcPdf(fields);
    const fileName = `Bon_de_prise_en_charge_${Date.now()}_${crypto.randomBytes(3).toString('hex')}.pdf`;
    await fs.writeFile(path.resolve(process.cwd(), 'uploads', fileName), bytes);

    const document = await Document.create({
      title: `${BPC_CATEGORY} - ${fields.nomMalade}`,
      fileName,
      originalName: fileName,
      filePath: `uploads/${fileName}`,
      fileSize: bytes.length,
      fileType: 'application/pdf',
      userId: req.user.id,
      tenantId: req.tenantId,
      category: BPC_CATEGORY,
      status: 'draft',
      // Diagnostic médical : visible du créateur, des validateurs et des destinataires seulement
      visibility: 'personal',
      metadata: { ...fields, signatureZones, nbSignataires: signatureZones.length },
    });

    const { AuditLog } = await import('../models/index.js');
    AuditLog.log(req, 'UPLOAD', 'document', document.id, { title: document.title, category: BPC_CATEGORY });
    res.status(201).json({ success: true, data: document });
  } catch (error) {
    next(error);
  }
};
