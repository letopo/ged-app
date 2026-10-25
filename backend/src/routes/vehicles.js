// backend/src/routes/vehicles.js — Parc véhicules (ambulances RO SAU d'abord)
import express from 'express';
import { protect } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import {
  getMyFleetAccess, listVehicles, vehicleOptions, createVehicle, updateVehicle, setVehicleStatus,
  listTemplates, updateTemplate, getVehicleState, uploadCheckPhoto, submitCheck,
  listMissions, getCheck, getCheckPdf, cancelMission, getFleetSettings, updateFleetSettings,
  myPendingChecks, missionByDocument,
} from '../controllers/vehicleController.js';
import {
  uploadVehicleAttachment, getVehicleDetails, createDeadline, updateDeadline, deleteDeadline, completeDeadline,
  createFuelLog, deleteFuelLog, createMaintenance, updateMaintenance, deleteMaintenance, fleetOverview,
} from '../controllers/vehicleFleetController.js';

const router = express.Router();
router.use(protect);

router.get('/me', getMyFleetAccess);
router.get('/settings', getFleetSettings);
router.put('/settings', updateFleetSettings);
router.get('/options', vehicleOptions);
router.get('/my-pending', myPendingChecks);
router.get('/by-document/:documentId', missionByDocument);
router.get('/templates', listTemplates);
router.put('/templates/:id', updateTemplate);
router.get('/missions', listMissions);
router.get('/overview', fleetOverview);
router.post('/attachments', upload.single('file'), uploadVehicleAttachment);
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
// Étape 3 : fiche, échéances, carburant, entretien
router.get('/:id/details', getVehicleDetails);
router.post('/:id/deadlines', createDeadline);
router.put('/:id/deadlines/:did', updateDeadline);
router.delete('/:id/deadlines/:did', deleteDeadline);
router.post('/:id/deadlines/:did/done', completeDeadline);
router.post('/:id/fuel', createFuelLog);
router.delete('/:id/fuel/:fid', deleteFuelLog);
router.post('/:id/maintenances', createMaintenance);
router.put('/:id/maintenances/:mid', updateMaintenance);
router.delete('/:id/maintenances/:mid', deleteMaintenance);

export default router;
