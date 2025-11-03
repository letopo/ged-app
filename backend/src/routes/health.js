import express from 'express';

const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'GED Backend'
  });
});

export default router;