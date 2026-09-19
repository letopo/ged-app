import { Op } from 'sequelize';
import crypto from 'crypto';
import { Tenant, User } from '../models/index.js';
import { sendNotificationEmail } from '../utils/mailer.js';

// ─── Liste des tenants ────────────────────────────────────────────────────────
export const listTenants = async (req, res, next) => {
  try {
    const tenants = await Tenant.findAll({
      order: [['created_at', 'DESC']]
    });
    res.json({ success: true, tenants });
  } catch (err) {
    next(err);
  }
};

// ─── Détail d'un tenant ───────────────────────────────────────────────────────
export const getTenant = async (req, res, next) => {
  try {
    const tenant = await Tenant.findByPk(req.params.id);
    if (!tenant) return res.status(404).json({ success: false, error: 'Tenant introuvable' });
    res.json({ success: true, tenant });
  } catch (err) {
    next(err);
  }
};

// ─── Créer un tenant + admin + email de bienvenue ────────────────────────────
export const createTenant = async (req, res, next) => {
  try {
    const {
      name, subdomain, contactName, contactPhone, notes,
      adminFirstName, adminLastName, adminEmail, adminUsername,
      autoDeleteAt
    } = req.body;

    if (!name || !subdomain || !adminEmail || !adminFirstName || !adminLastName || !adminUsername) {
      return res.status(400).json({
        success: false,
        error: 'Champs obligatoires: name, subdomain, adminEmail, adminFirstName, adminLastName, adminUsername'
      });
    }

    const baseDomain = process.env.BASE_DOMAIN || 'hsjmcam.net';
    const domain = `${subdomain}.${baseDomain}`;
    const slug = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    // Vérifier unicité
    const existing = await Tenant.findOne({ where: { [Op.or]: [{ domain }, { slug }] } });
    if (existing) {
      return res.status(409).json({ success: false, error: `Le sous-domaine "${subdomain}" est déjà utilisé` });
    }

    // Créer le tenant
    const tenant = await Tenant.create({
      name,
      domain,
      subdomain,
      slug,
      adminEmail,
      contactName,
      contactPhone,
      notes,
      status: 'active',
      isActive: true,
      autoDeleteAt: autoDeleteAt || null
    });

    // Générer un mot de passe temporaire
    const tempPassword = crypto.randomBytes(8).toString('base64url').slice(0, 12) + '!';

    // Créer l'admin du tenant (sans CLS — superadmin bypass)
    const adminUser = await User.create({
      firstName: adminFirstName,
      lastName: adminLastName,
      username: adminUsername,
      email: adminEmail,
      password: tempPassword,
      role: 'admin',
      tenantId: tenant.id
    });

    // Email de bienvenue
    const loginUrl = `https://${domain}`;
    const welcomeText = `
Bonjour ${adminFirstName} ${adminLastName},<br/><br/>
Votre espace GED est prêt ! Voici vos informations de connexion :<br/><br/>
<b>Adresse de connexion :</b> <a href="${loginUrl}">${loginUrl}</a><br/>
<b>Identifiant :</b> ${adminUsername}<br/>
<b>Mot de passe temporaire :</b> ${tempPassword}<br/><br/>
<em>Veuillez changer votre mot de passe lors de votre première connexion.</em>
    `.trim();

    await sendNotificationEmail(
      adminEmail,
      `Bienvenue sur votre GED — ${name}`,
      welcomeText,
      'default',
      loginUrl
    );

    res.status(201).json({
      success: true,
      message: `Tenant "${name}" créé. Email de bienvenue envoyé à ${adminEmail}.`,
      tenant,
      admin: {
        id: adminUser.id,
        username: adminUser.username,
        email: adminUser.email
      }
    });
  } catch (err) {
    next(err);
  }
};

// ─── Mettre à jour un tenant ──────────────────────────────────────────────────
export const updateTenant = async (req, res, next) => {
  try {
    const tenant = await Tenant.findByPk(req.params.id);
    if (!tenant) return res.status(404).json({ success: false, error: 'Tenant introuvable' });

    const allowed = ['name', 'contactName', 'contactPhone', 'notes', 'logoUrl', 'adminEmail', 'autoDeleteAt'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) tenant[field] = req.body[field];
    });

    await tenant.save();
    res.json({ success: true, tenant });
  } catch (err) {
    next(err);
  }
};

// ─── Changer le statut (active / suspended / cancelled) ──────────────────────
export const setTenantStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Statut invalide (active | suspended | cancelled)' });
    }

    const tenant = await Tenant.findByPk(req.params.id);
    if (!tenant) return res.status(404).json({ success: false, error: 'Tenant introuvable' });

    // Empêcher de suspendre/annuler le tenant principal HSJM
    if (tenant.slug === 'hsjm' && status !== 'active') {
      return res.status(403).json({ success: false, error: 'Impossible de modifier le statut du tenant principal' });
    }

    tenant.status = status;
    tenant.isActive = status === 'active';
    if (status === 'cancelled') {
      tenant.cancelledAt = new Date();
    } else if (status === 'active') {
      tenant.cancelledAt = null;
    }

    await tenant.save();
    res.json({ success: true, message: `Statut mis à jour : ${status}`, tenant });
  } catch (err) {
    next(err);
  }
};

// ─── Supprimer un tenant (et tous ses utilisateurs) ──────────────────────────
export const deleteTenant = async (req, res, next) => {
  try {
    const tenant = await Tenant.findByPk(req.params.id);
    if (!tenant) return res.status(404).json({ success: false, error: 'Tenant introuvable' });

    if (tenant.slug === 'hsjm') {
      return res.status(403).json({ success: false, error: 'Impossible de supprimer le tenant principal' });
    }

    // Supprimer les utilisateurs du tenant d'abord
    await User.unscoped().destroy({ where: { tenantId: tenant.id } });
    await tenant.destroy();

    res.json({ success: true, message: `Tenant "${tenant.name}" supprimé définitivement.` });
  } catch (err) {
    next(err);
  }
};

// ─── Statistiques globales ────────────────────────────────────────────────────
export const getStats = async (req, res, next) => {
  try {
    const [total, active, suspended, cancelled] = await Promise.all([
      Tenant.count(),
      Tenant.count({ where: { status: 'active' } }),
      Tenant.count({ where: { status: 'suspended' } }),
      Tenant.count({ where: { status: 'cancelled' } })
    ]);

    res.json({ success: true, stats: { total, active, suspended, cancelled } });
  } catch (err) {
    next(err);
  }
};
