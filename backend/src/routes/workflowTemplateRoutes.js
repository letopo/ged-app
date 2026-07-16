// backend/src/routes/workflowTemplateRoutes.js
import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  seed,
} from '../controllers/workflowTemplateController.js';

const router = express.Router();

router.use(protect);

router.get('/', getTemplates);
router.post('/seed', seed);
router.post('/', createTemplate);
router.put('/:id', updateTemplate);
router.delete('/:id', deleteTemplate);

export default router;
