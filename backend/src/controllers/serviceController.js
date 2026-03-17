// backend/src/controllers/serviceController.js

import { Service, ServiceMember, User } from '../models/index.js';
import { Op } from 'sequelize';

// ============================================
// Récupérer tous les services (simple)
// ============================================
export const getServices = async (req, res) => {
  try {
    const services = await Service.findAll({
      order: [['name', 'ASC']],
    });

    res.json({
      success: true,
      data: services,
    });
  } catch (error) {
    console.error('Erreur récupération services:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des services',
    });
  }
};

// ============================================
// Récupérer tous les services avec leurs membres
// ============================================
export const getServicesWithMembers = async (req, res) => {
  try {
    const services = await Service.findAll({
      include: [
        {
          model: ServiceMember,
          as: 'members',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName', 'email', 'position'],
            },
          ],
          where: { isActive: true },
          required: false,
        },
      ],
      order: [
        ['name', 'ASC'],
        [{ model: ServiceMember, as: 'members' }, 'fonction', 'ASC'],
      ],
    });

    res.json({
      success: true,
      data: services,
    });
  } catch (error) {
    console.error('Erreur récupération services avec membres:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des services',
    });
  }
};

// ============================================
// Récupérer un service par ID
// ============================================
export const getServiceById = async (req, res) => {
  try {
    const { serviceId } = req.params;

    const service = await Service.findByPk(serviceId, {
      include: [
        {
          model: ServiceMember,
          as: 'members',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName', 'email', 'position'],
            },
          ],
          where: { isActive: true },
          required: false,
        },
      ],
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service introuvable',
      });
    }

    res.json({
      success: true,
      data: service,
    });
  } catch (error) {
    console.error('Erreur récupération service:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
    });
  }
};

// ============================================
// Créer un nouveau service
// ============================================
export const createService = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Le nom du service est requis',
      });
    }

    // Vérifier si le service existe déjà
    const existingService = await Service.findOne({
      where: { name: name.trim() },
    });

    if (existingService) {
      return res.status(400).json({
        success: false,
        message: 'Un service avec ce nom existe déjà',
      });
    }

    const service = await Service.create({
      name: name.trim(),
    });

    res.status(201).json({
      success: true,
      message: 'Service créé avec succès',
      data: service,
    });
  } catch (error) {
    console.error('Erreur création service:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création du service',
    });
  }
};

// ============================================
// Mettre à jour un service
// ============================================
export const updateService = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { name } = req.body;

    const service = await Service.findByPk(serviceId);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service introuvable',
      });
    }

    if (name) {
      // Vérifier l'unicité du nom
      const existingService = await Service.findOne({
        where: {
          name: name.trim(),
          id: { [Op.ne]: serviceId },
        },
      });

      if (existingService) {
        return res.status(400).json({
          success: false,
          message: 'Un service avec ce nom existe déjà',
        });
      }

      service.name = name.trim();
    }

    await service.save();

    res.json({
      success: true,
      message: 'Service mis à jour avec succès',
      data: service,
    });
  } catch (error) {
    console.error('Erreur mise à jour service:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
    });
  }
};

// ============================================
// Supprimer un service
// ============================================
export const deleteService = async (req, res) => {
  try {
    const { serviceId } = req.params;

    const service = await Service.findByPk(serviceId);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service introuvable',
      });
    }

    await service.destroy();

    res.json({
      success: true,
      message: 'Service supprimé avec succès',
    });
  } catch (error) {
    console.error('Erreur suppression service:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
    });
  }
};

// ============================================
// Récupérer les membres d'un service
// ============================================
export const getServiceMembers = async (req, res) => {
  try {
    const { serviceId } = req.params;

    const members = await ServiceMember.findAll({
      where: { serviceId, isActive: true },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'position'],
        },
      ],
      order: [['fonction', 'ASC']],
    });

    res.json({
      success: true,
      data: members,
    });
  } catch (error) {
    console.error('Erreur récupération membres:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
    });
  }
};

// ============================================
// Récupérer le Chef de Service
// ============================================
export const getChefDeService = async (req, res) => {
  try {
    const { serviceId } = req.params;

    const chef = await ServiceMember.findOne({
      where: {
        serviceId,
        fonction: 'Chef de Service',
        isActive: true,
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'position'],
        },
      ],
    });

    res.json({
      success: true,
      data: chef,
    });
  } catch (error) {
    console.error('Erreur récupération chef de service:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
    });
  }
};

// ============================================
// Ajouter un membre à un service
// ============================================
export const addServiceMember = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { userId, fonction } = req.body;

    if (!userId || !fonction) {
      return res.status(400).json({
        success: false,
        message: 'userId et fonction sont requis',
      });
    }

    // Vérifier que le service existe
    const service = await Service.findByPk(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service introuvable',
      });
    }

    // Vérifier que l'utilisateur existe
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur introuvable',
      });
    }

    // Vérifier si l'utilisateur est déjà membre de ce service
    const existingMember = await ServiceMember.findOne({
      where: { serviceId, userId },
    });

    if (existingMember) {
      if (existingMember.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Cet utilisateur est déjà membre de ce service',
        });
      } else {
        // Réactiver le membre
        existingMember.isActive = true;
        existingMember.fonction = fonction;
        await existingMember.save();

        const memberWithUser = await ServiceMember.findByPk(existingMember.id, {
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName', 'email', 'position'],
            },
          ],
        });

        return res.json({
          success: true,
          message: 'Membre réactivé avec succès',
          data: memberWithUser,
        });
      }
    }

    // Si c'est un Chef de Service, vérifier qu'il n'y en a pas déjà un
    if (fonction === 'Chef de Service') {
      const existingChef = await ServiceMember.findOne({
        where: {
          serviceId,
          fonction: 'Chef de Service',
          isActive: true,
        },
      });

      if (existingChef) {
        return res.status(400).json({
          success: false,
          message: 'Ce service a déjà un Chef de Service. Retirez-le d\'abord ou changez sa fonction.',
        });
      }
    }

    // Créer le nouveau membre
    const member = await ServiceMember.create({
      serviceId,
      userId,
      fonction,
    });

    const memberWithUser = await ServiceMember.findByPk(member.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'position'],
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Membre ajouté avec succès',
      data: memberWithUser,
    });
  } catch (error) {
    console.error('Erreur ajout membre:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
    });
  }
};

// ============================================
// Mettre à jour un membre
// ============================================
export const updateServiceMember = async (req, res) => {
  try {
    const { serviceId, memberId } = req.params;
    const { fonction, isActive } = req.body;

    const member = await ServiceMember.findOne({
      where: { id: memberId, serviceId },
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Membre introuvable',
      });
    }

    // Si changement vers Chef de Service, vérifier qu'il n'y en a pas déjà un
    if (fonction === 'Chef de Service' && fonction !== member.fonction) {
      const existingChef = await ServiceMember.findOne({
        where: {
          serviceId,
          fonction: 'Chef de Service',
          isActive: true,
          id: { [Op.ne]: memberId },
        },
      });

      if (existingChef) {
        return res.status(400).json({
          success: false,
          message: 'Ce service a déjà un Chef de Service',
        });
      }
    }

    if (fonction) member.fonction = fonction;
    if (typeof isActive !== 'undefined') member.isActive = isActive;

    await member.save();

    const updatedMember = await ServiceMember.findByPk(member.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'position'],
        },
      ],
    });

    res.json({
      success: true,
      message: 'Membre mis à jour avec succès',
      data: updatedMember,
    });
  } catch (error) {
    console.error('Erreur mise à jour membre:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
    });
  }
};

// ============================================
// Retirer un membre d'un service
// ============================================
export const removeServiceMember = async (req, res) => {
  try {
    const { serviceId, memberId } = req.params;

    const member = await ServiceMember.findOne({
      where: { id: memberId, serviceId },
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Membre introuvable',
      });
    }

    // Désactiver au lieu de supprimer (soft delete)
    member.isActive = false;
    await member.save();

    res.json({
      success: true,
      message: 'Membre retiré avec succès',
    });
  } catch (error) {
    console.error('Erreur suppression membre:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
    });
  }
};