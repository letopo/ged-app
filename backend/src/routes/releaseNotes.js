// backend/src/routes/releaseNotes.js — Nouveautés rédigées depuis l'application
import express from 'express';
import { protect, isAdmin } from '../middleware/auth.js';
import { listPublished, listAll, createNote, updateNote, deleteNote } from '../controllers/releaseNoteController.js';

const router = express.Router();

router.get('/',       protect, listPublished);
router.get('/admin',  protect, isAdmin, listAll);
router.post('/',      protect, isAdmin, createNote);
router.put('/:id',    protect, isAdmin, updateNote);
router.delete('/:id', protect, isAdmin, deleteNote);

export default router;
