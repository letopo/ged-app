// backend/src/routes/employees.js

import express from 'express';
import { protect } from '../middleware/auth.js'; // ✅ C'est "protect" pas "authenticate"
import { 
  getEmployees, 
  getAllEmployees,
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

// ✅ Route pour obtenir TOUS les employés (pour les plannings) - DOIT être AVANT /:id
router.get('/all', protect, getAllEmployees);

// Routes existantes
router.get('/', protect, getEmployees);
router.get('/:id', protect, getEmployeeById);
router.post('/', protect, createEmployee);
router.put('/:id', protect, updateEmployee);
router.delete('/:id', protect, deleteEmployee);
router.get('/service/:serviceId', protect, getEmployeesByService);
router.get('/services/with-employees', protect, getServicesWithEmployees);
router.get('/export/csv', protect, exportEmployeesToCSV);
router.post('/import/csv', protect, importEmployeesFromCSV);

export default router;