// backend/src/controllers/tenantBrandingController.js
import { Tenant } from '../models/index.js';

// Récupérer le branding (logo + couleur) du tenant courant — tout utilisateur authentifié
export const getBranding = async (req, res) => {
  try {
    const tenant = await Tenant.findByPk(req.tenantId, {
      attributes: ['id', 'name', 'logoUrl', 'primaryColor'],
    });
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Organisation introuvable' });
    }
    res.json({ success: true, data: tenant });
  } catch (error) {
    console.error('Erreur getBranding:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Mettre à jour la couleur de marque — admin/superadmin du tenant uniquement
export const updateBranding = async (req, res) => {
  try {
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Admin requis' });
    }
    const { primaryColor } = req.body;
    if (primaryColor !== undefined && primaryColor !== null && !/^#[0-9A-Fa-f]{6}$/.test(primaryColor)) {
      return res.status(400).json({ success: false, message: 'Couleur invalide (format attendu : #RRGGBB)' });
    }
    const tenant = await Tenant.findByPk(req.tenantId);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Organisation introuvable' });
    }
    await tenant.update({ primaryColor: primaryColor || null });
    res.json({ success: true, data: tenant });
  } catch (error) {
    console.error('Erreur updateBranding:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Uploader le logo — admin/superadmin du tenant uniquement
export const uploadLogo = async (req, res) => {
  try {
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Admin requis' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Aucun fichier image n'a été envoyé" });
    }
    const tenant = await Tenant.findByPk(req.tenantId);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Organisation introuvable' });
    }
    await tenant.update({ logoUrl: req.file.path.replace(/\\/g, '/') });
    res.json({ success: true, message: 'Logo mis à jour avec succès.', data: tenant });
  } catch (error) {
    console.error('Erreur uploadLogo:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};
