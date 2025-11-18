// backend/src/routes/employees.js - VERSION CORRIGÉE
import express from 'express';
import { protect } from '../middleware/auth.js';
import multer from 'multer';
import {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeesByService,
  getServicesWithEmployees,
  exportEmployeesToCSV,
  importEmployeesFromCSV
} from '../controllers/employeeController.js';

const router = express.Router();

// Configuration Multer pour l'upload de fichiers CSV
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers CSV sont autorisés'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  }
});

// Appliquer la protection à toutes les routes
router.use(protect);

// Routes principales
router.route('/')
  .get(getEmployees)
  .post(createEmployee);

router.route('/:id')
  .get(getEmployeeById)
  .put(updateEmployee)
  .delete(deleteEmployee);

// Routes spécifiques
router.get('/service/:serviceId', getEmployeesByService);
router.get('/services/with-employees', getServicesWithEmployees);

// NOUVELLES ROUTES POUR IMPORT/EXPORT - AJOUTER CES 2 LIGNES
router.get('/export/csv', exportEmployeesToCSV);
router.post('/import/csv', upload.single('csvFile'), importEmployeesFromCSV);

export default router;