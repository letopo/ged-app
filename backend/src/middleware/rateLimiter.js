import rateLimit from 'express-rate-limit';

// ── Login : 5 tentatives / 15 min par IP ─────────────────────────────────────
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true, // ne compte que les échecs
  message: {
    success: false,
    error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.',
    retryAfter: 15
  },
  handler: (req, res, next, options) => {
    console.warn(`[RATE LIMIT] Login bloqué — IP: ${req.ip} | ${new Date().toISOString()}`);
    res.status(429).json(options.message);
  }
});

// ── 2FA verify-login : 10 tentatives / 15 min par IP ─────────────────────────
export const twoFALimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: 'Trop de tentatives 2FA. Réessayez dans 15 minutes.',
    retryAfter: 15
  },
  handler: (req, res, next, options) => {
    console.warn(`[RATE LIMIT] 2FA bloqué — IP: ${req.ip} | ${new Date().toISOString()}`);
    res.status(429).json(options.message);
  }
});

// ── API globale : 200 req / min par IP (anti-scraping) ───────────────────────
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Trop de requêtes. Ralentissez.'
  }
});
