// backend/src/controllers/templatePermissionController.js
import TemplatePermission from '../models/TemplatePermission.js';
import { User, Document } from '../models/index.js';
import sequelize from '../config/database.js';

// Liste de TOUS les templates avec leurs permissions
export const getAll = async (req, res) => {
  try {
    const permissions = await TemplatePermission.findAll({ order: [['templateName', 'ASC']] });
    res.json({ data: permissions });
  } catch (err) {
    console.error('Erreur getAll template permissions:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Récupère les templates accessibles pour l'utilisateur connecté
export const getMyTemplates = async (req, res) => {
  try {
    const user = req.user;
    const permissions = await TemplatePermission.findAll();

    // Tous les templates définis
    const result = permissions.map(p => {
      const data = p.toJSON();
      // Un admin voit tout
      if (user.role === 'admin') {
        data.hasAccess = true;
        return data;
      }
      // Template non restreint → tout le monde y accède
      if (!data.isRestricted) {
        data.hasAccess = true;
        return data;
      }
      // Vérifier si l'utilisateur est dans allowedRoles ou allowedUserIds
      const roleOk = data.allowedRoles?.length > 0 && data.allowedRoles.includes(user.role);
      const userOk = data.allowedUserIds?.length > 0 && data.allowedUserIds.includes(user.id);
      data.hasAccess = roleOk || userOk;
      return data;
    });

    res.json({ data: result });
  } catch (err) {
    console.error('Erreur getMyTemplates:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Créer ou mettre à jour une permission de template
export const upsert = async (req, res) => {
  try {
    const { templateName, allowedRoles, allowedUserIds, isRestricted, description } = req.body;
    if (!templateName) return res.status(400).json({ message: 'templateName requis' });

    const [permission, created] = await TemplatePermission.upsert({
      templateName,
      allowedRoles: allowedRoles || [],
      allowedUserIds: allowedUserIds || [],
      isRestricted: isRestricted ?? false,
      description: description || null,
    }, {
      returning: true,
    });

    res.json({ data: permission, created });
  } catch (err) {
    console.error('Erreur upsert template permission:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Mettre à jour une permission existante par ID
export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { allowedRoles, allowedUserIds, isRestricted, description } = req.body;

    const permission = await TemplatePermission.findByPk(id);
    if (!permission) return res.status(404).json({ message: 'Permission non trouvée' });

    await permission.update({
      allowedRoles: allowedRoles ?? permission.allowedRoles,
      allowedUserIds: allowedUserIds ?? permission.allowedUserIds,
      isRestricted: isRestricted ?? permission.isRestricted,
      description: description ?? permission.description,
    });

    res.json({ data: permission });
  } catch (err) {
    console.error('Erreur update template permission:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Seed + sync — détecte toutes les catégories existantes et crée les permissions manquantes
export const seed = async (req, res) => {
  try {
    // Récupérer toutes les catégories distinctes depuis la table documents
    const [categories] = await sequelize.query(
      `SELECT DISTINCT category FROM documents WHERE category IS NOT NULL AND category != '' ORDER BY category ASC`
    );
    const existingNames = categories.map(c => c.category);

    // Templates par défaut (au cas où aucun document n'existe encore)
    const defaultTemplates = [
      'Demande de permission', 'Pièce de caisse', 'Demande de travaux',
      'Ordre de mission', 'Demande de permutation', 'Bon de sortie',
      "Certificat d'aptitude", 'Bon de commande', 'Bon de commande interne',
      "Demande d'explication", 'Planning Opératoire', 'Attestation de départ en congé annuel',
    ];

    // Fusionner : toutes les catégories existantes + les defaults
    const allNames = [...new Set([...existingNames, ...defaultTemplates])];

    // Ne créer que ceux qui n'existent pas encore dans template_permissions
    const existing = await TemplatePermission.findAll({ attributes: ['templateName'] });
    const existingSet = new Set(existing.map(p => p.templateName));

    const toCreate = allNames
      .filter(name => !existingSet.has(name))
      .map(name => ({
        templateName: name,
        isRestricted: false,
        allowedRoles: [],
        allowedUserIds: [],
        description: 'Accessible à tous',
      }));

    if (toCreate.length === 0) {
      return res.json({ message: 'Tout est à jour', count: existing.length });
    }

    await TemplatePermission.bulkCreate(toCreate);
    res.json({ message: `${toCreate.length} template(s) ajouté(s)`, count: toCreate.length, total: allNames.length });
  } catch (err) {
    console.error('Erreur seed:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Récupérer les utilisateurs pour le sélecteur
export const getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'username'],
      where: { isActive: true },
      order: [['firstName', 'ASC']],
    });
    res.json({ data: users });
  } catch (err) {
    console.error('Erreur getUsers:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
