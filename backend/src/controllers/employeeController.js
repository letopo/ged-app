// backend/src/controllers/employeeController.js
import Employee from '../models/Employee.js';
import Service from '../models/Service.js';
import { Op } from 'sequelize';
import { Parser } from 'json2csv';
import { Readable } from 'stream';

// Vérifier si l'utilisateur est RH ou admin
const isRHOrAdmin = (user) => {
  return user.role === 'admin' || user.email === 'hsjm.rh@gmail.com';
};

// @desc    Récupérer tous les employés (avec pagination et filtres)
// @route   GET /api/employees
// @access  Private (RH/Admin)
export const getEmployees = async (req, res, next) => {
  try {
    if (!isRHOrAdmin(req.user)) {
      return res.status(403).json({ success: false, error: 'Accès réservé au RH et administrateurs' });
    }

    const { page = 1, limit = 10, serviceId, search } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { isActive: true };
    
    if (serviceId) {
      whereClause.serviceId = serviceId;
    }

    if (search) {
      whereClause[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { matricule: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: employees } = await Employee.findAndCountAll({
      where: whereClause,
      include: [{
        model: Service,
        as: 'service',
        attributes: ['id', 'name']
      }],
      order: [['lastName', 'ASC'], ['firstName', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      employees,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Récupérer un employé par ID
// @route   GET /api/employees/:id
// @access  Private (RH/Admin)
export const getEmployeeById = async (req, res, next) => {
  try {
    if (!isRHOrAdmin(req.user)) {
      return res.status(403).json({ success: false, error: 'Accès réservé au RH et administrateurs' });
    }

    const employee = await Employee.findByPk(req.params.id, {
      include: [{
        model: Service,
        as: 'service',
        attributes: ['id', 'name']
      }]
    });

    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employé non trouvé' });
    }

    res.json({ success: true, employee });
  } catch (error) {
    next(error);
  }
};

// @desc    Créer un nouvel employé
// @route   POST /api/employees
// @access  Private (RH/Admin)
export const createEmployee = async (req, res, next) => {
  try {
    if (!isRHOrAdmin(req.user)) {
      return res.status(403).json({ success: false, error: 'Accès réservé au RH et administrateurs' });
    }

    const {
      firstName,
      lastName,
      birthDate,
      birthPlace,
      gender,
      childrenCount,
      matricule,
      maritalStatus,
      serviceId
    } = req.body;

    // Validation des champs requis
    if (!firstName || !lastName || !birthDate || !birthPlace || !gender || 
        !matricule || !maritalStatus || !serviceId) {
      return res.status(400).json({ success: false, error: 'Tous les champs sont requis' });
    }

    // Vérifier si le matricule existe déjà
    const existingEmployee = await Employee.findOne({ where: { matricule } });
    if (existingEmployee) {
      return res.status(409).json({ success: false, error: 'Matricule déjà utilisé' });
    }

    // Vérifier si le service existe
    const service = await Service.findByPk(serviceId);
    if (!service) {
      return res.status(404).json({ success: false, error: 'Service non trouvé' });
    }

    const employee = await Employee.create({
      firstName,
      lastName,
      birthDate,
      birthPlace,
      gender,
      childrenCount: childrenCount || 0,
      matricule,
      maritalStatus,
      serviceId
    });

    const employeeWithService = await Employee.findByPk(employee.id, {
      include: [{
        model: Service,
        as: 'service',
        attributes: ['id', 'name']
      }]
    });

    res.status(201).json({
      success: true,
      message: 'Employé créé avec succès',
      employee: employeeWithService
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mettre à jour un employé
// @route   PUT /api/employees/:id
// @access  Private (RH/Admin)
export const updateEmployee = async (req, res, next) => {
  try {
    if (!isRHOrAdmin(req.user)) {
      return res.status(403).json({ success: false, error: 'Accès réservé au RH et administrateurs' });
    }

    const employee = await Employee.findByPk(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employé non trouvé' });
    }

    const {
      firstName,
      lastName,
      birthDate,
      birthPlace,
      gender,
      childrenCount,
      matricule,
      maritalStatus,
      serviceId,
      isActive
    } = req.body;

    // Vérifier l'unicité du matricule si modifié
    if (matricule && matricule !== employee.matricule) {
      const existingEmployee = await Employee.findOne({ 
        where: { matricule, id: { [Op.ne]: employee.id } } 
      });
      if (existingEmployee) {
        return res.status(409).json({ success: false, error: 'Matricule déjà utilisé' });
      }
      employee.matricule = matricule;
    }

    // Vérifier le service si modifié
    if (serviceId && serviceId !== employee.serviceId) {
      const service = await Service.findByPk(serviceId);
      if (!service) {
        return res.status(404).json({ success: false, error: 'Service non trouvé' });
      }
      employee.serviceId = serviceId;
    }

    // Mettre à jour les autres champs
    if (firstName !== undefined) employee.firstName = firstName;
    if (lastName !== undefined) employee.lastName = lastName;
    if (birthDate !== undefined) employee.birthDate = birthDate;
    if (birthPlace !== undefined) employee.birthPlace = birthPlace;
    if (gender !== undefined) employee.gender = gender;
    if (childrenCount !== undefined) employee.childrenCount = childrenCount;
    if (maritalStatus !== undefined) employee.maritalStatus = maritalStatus;
    if (isActive !== undefined) employee.isActive = isActive;

    await employee.save();

    const updatedEmployee = await Employee.findByPk(employee.id, {
      include: [{
        model: Service,
        as: 'service',
        attributes: ['id', 'name']
      }]
    });

    res.json({
      success: true,
      message: 'Employé mis à jour avec succès',
      employee: updatedEmployee
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Supprimer un employé (soft delete)
// @route   DELETE /api/employees/:id
// @access  Private (RH/Admin)
export const deleteEmployee = async (req, res, next) => {
  try {
    if (!isRHOrAdmin(req.user)) {
      return res.status(403).json({ success: false, error: 'Accès réservé au RH et administrateurs' });
    }

    const employee = await Employee.findByPk(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employé non trouvé' });
    }

    employee.isActive = false;
    await employee.save();

    res.json({ success: true, message: 'Employé désactivé avec succès' });
  } catch (error) {
    next(error);
  }
};

// @desc    Récupérer les employés par service
// @route   GET /api/employees/service/:serviceId
// @access  Private (RH/Admin)
export const getEmployeesByService = async (req, res, next) => {
  try {
    if (!isRHOrAdmin(req.user)) {
      return res.status(403).json({ success: false, error: 'Accès réservé au RH et administrateurs' });
    }

    const employees = await Employee.findAll({
      where: { 
        serviceId: req.params.serviceId,
        isActive: true 
      },
      include: [{
        model: Service,
        as: 'service',
        attributes: ['id', 'name']
      }],
      order: [['lastName', 'ASC'], ['firstName', 'ASC']]
    });

    res.json({ success: true, employees });
  } catch (error) {
    next(error);
  }
};

// @desc    Récupérer tous les services avec leurs employés
// @route   GET /api/employees/services/with-employees
// @access  Private (RH/Admin)
export const getServicesWithEmployees = async (req, res, next) => {
  try {
    if (!isRHOrAdmin(req.user)) {
      return res.status(403).json({ success: false, error: 'Accès réservé au RH et administrateurs' });
    }

    const services = await Service.findAll({
      include: [{
        model: Employee,
        as: 'employees',
        where: { isActive: true },
        required: false,
        attributes: ['id', 'firstName', 'lastName', 'matricule']
      }],
      order: [['name', 'ASC']]
    });

    res.json({ success: true, services });
  } catch (error) {
    next(error);
  }
};

// @desc    Exporter les employés en CSV
// @route   GET /api/employees/export/csv
// @access  Private (RH/Admin)
export const exportEmployeesToCSV = async (req, res, next) => {
  try {
    if (!isRHOrAdmin(req.user)) {
      return res.status(403).json({ success: false, error: 'Accès réservé au RH et administrateurs' });
    }

    const employees = await Employee.findAll({
      include: [{
        model: Service,
        as: 'service',
        attributes: ['name']
      }],
      where: { isActive: true },
      order: [['lastName', 'ASC'], ['firstName', 'ASC']]
    });

    // Préparer les données pour le CSV
    const csvData = employees.map(employee => ({
      Matricule: employee.matricule,
      Nom: employee.lastName,
      Prénom: employee.firstName,
      'Date de naissance': employee.birthDate,
      'Lieu de naissance': employee.birthPlace,
      Sexe: employee.gender === 'M' ? 'Masculin' : 'Féminin',
      'Nombre d\'enfants': employee.childrenCount,
      'Statut matrimonial': employee.maritalStatus,
      Service: employee.service?.name,
      'Service ID': employee.serviceId
    }));

    // Configuration des champs CSV
    const fields = [
      'Matricule',
      'Nom',
      'Prénom',
      'Date de naissance',
      'Lieu de naissance',
      'Sexe',
      'Nombre d\'enfants',
      'Statut matrimonial',
      'Service',
      'Service ID'
    ];

    const json2csvParser = new Parser({ fields, delimiter: ';' });
    const csv = json2csvParser.parse(csvData);

    // Définir les en-têtes pour le téléchargement
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=employes_${new Date().toISOString().split('T')[0]}.csv`);

    res.send(csv);
  } catch (error) {
    next(error);
  }
};

// @desc    Importer des employés depuis un fichier CSV
// @route   POST /api/employees/import/csv
// @access  Private (RH/Admin)
export const importEmployeesFromCSV = async (req, res, next) => {
  try {
    if (!isRHOrAdmin(req.user)) {
      return res.status(403).json({ success: false, error: 'Accès réservé au RH et administrateurs' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Aucun fichier CSV fourni' });
    }

    const csvBuffer = req.file.buffer.toString('utf-8');
    const lines = csvBuffer.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return res.status(400).json({ success: false, error: 'Le fichier CSV est vide ou invalide' });
    }

    const headers = lines[0].split(';').map(header => header.trim());
    const results = {
      total: 0,
      success: 0,
      errors: [],
      duplicates: 0
    };

    // Traiter chaque ligne (en commençant à la ligne 1, après les en-têtes)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(';').map(value => value.trim());
      const rowData = {};
      
      // Associer les valeurs aux en-têtes
      headers.forEach((header, index) => {
        rowData[header] = values[index] || '';
      });

      results.total++;

      try {
        // Validation des données requises
        if (!rowData.Matricule || !rowData.Nom || !rowData.Prénom || !rowData.Service) {
          results.errors.push(`Ligne ${i + 1}: Champs obligatoires manquants`);
          continue;
        }

        // Vérifier si le matricule existe déjà
        const existingEmployee = await Employee.findOne({ 
          where: { matricule: rowData.Matricule } 
        });

        if (existingEmployee) {
          results.duplicates++;
          results.errors.push(`Ligne ${i + 1}: Matricule "${rowData.Matricule}" existe déjà`);
          continue;
        }

        // Trouver le service par nom
        const service = await Service.findOne({ 
          where: { name: rowData.Service } 
        });

        if (!service) {
          results.errors.push(`Ligne ${i + 1}: Service "${rowData.Service}" non trouvé`);
          continue;
        }

        // Préparer les données pour la création
        const employeeData = {
          matricule: rowData.Matricule,
          lastName: rowData.Nom,
          firstName: rowData.Prénom,
          birthDate: rowData['Date de naissance'] || null,
          birthPlace: rowData['Lieu de naissance'] || '',
          gender: rowData.Sexe === 'Féminin' ? 'F' : 'M',
          childrenCount: parseInt(rowData['Nombre d\'enfants']) || 0,
          maritalStatus: rowData['Statut matrimonial'] || 'Célibataire',
          serviceId: service.id
        };

        // Validation de la date de naissance
        if (employeeData.birthDate) {
          const birthDate = new Date(employeeData.birthDate);
          if (isNaN(birthDate.getTime())) {
            results.errors.push(`Ligne ${i + 1}: Date de naissance invalide "${employeeData.birthDate}"`);
            continue;
          }
          employeeData.birthDate = birthDate.toISOString().split('T')[0];
        }

        // Créer l'employé
        await Employee.create(employeeData);
        results.success++;

      } catch (error) {
        results.errors.push(`Ligne ${i + 1}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      message: `Import terminé: ${results.success} employés créés, ${results.duplicates} doublons, ${results.errors.length} erreurs`,
      results
    });

  } catch (error) {
    next(error);
  }
};