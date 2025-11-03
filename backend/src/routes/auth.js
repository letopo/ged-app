// backend/src/routes/auth.js
import express from 'express';
import { protect } from '../middleware/auth.js';
import { register, login, getProfile, updateProfile } from '../controllers/authController.js';

const router = express.Router();

// @route   POST /api/auth/register
router.post('/register', register);

// @route   POST /api/auth/login
router.post('/login', login);

// @route   GET /api/auth/profile
router.get('/profile', protect, getProfile);

// @route   PUT /api/auth/profile
router.put('/profile', protect, updateProfile);

export default router;