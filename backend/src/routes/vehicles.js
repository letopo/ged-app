// backend/src/routes/vehicles.js — Parc véhicules (ambulances RO SAU d'abord)
import express from 'express';
import { protect } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import {
  getMyFleetAccess, listVehicles, vehicleOptions, createVehicle, updateVehicle, setVehicleStatus,
  listTemplates, updateTemplate, getVehicleState, uploadCheckPhoto, submitCheck,
  listMissions, getCheck, getCheckPdf, cancelMission, getFleetSettings, updateFleetSettings,
} from '../controllers/vehicleController.js';

const router = express.Router();
router.use(protect);

router.get('/me', getMyFleetAccess);
router.get('/settings', getFleetSettings);
router.put('/settings', updateFleetSettings);
router.get('/options', vehicleOptions);
router.get('/templates', listTemplates);
router.put('/templates/:id', updateTemplate);
router.get('/missions', listMissions);
router.post('/missions/:id/cancel', cancelMission);
router.post('/check-photos', upload.single('file'), uploadCheckPhoto);
router.get('/checks/:id', getCheck);
router.get('/checks/:id/pdf', getCheckPdf);

router.get('/', listVehicles);
router.post('/', createVehicle);
router.put('/:id', updateVehicle);
router.patch('/:id/status', setVehicleStatus);
router.get('/:id/state', getVehicleState);
router.post('/:id/checks', submitCheck);

export default router;
