import express from 'express';
import { body } from 'express-validator';
import { register, login, getProfile, updateProfile } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

const registerValidation = [
  body('username').trim().notEmpty().isLength({ min: 3 }),  // ← AJOUTÉ
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().notEmpty().isLength({ min: 2 }),
  body('lastName').trim().notEmpty().isLength({ min: 2 })
];

const loginValidation = [
  body('username').notEmpty(),  // ← CHANGÉ de 'email' à 'username'
  body('password').notEmpty()
];

router.post('/register', registerValidation, asyncHandler(register));
router.post('/login', loginValidation, asyncHandler(login));
router.get('/profile', authenticateToken, asyncHandler(getProfile));
router.put('/profile', authenticateToken, asyncHandler(updateProfile));

export default router;