import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

const router = Router();

router.post('/nonce', (req, res) => {
  // TODO: generate and return nonce for wallet
  res.json({ nonce: 'TODO' });
});

router.post('/verify', (req, res) => {
  // TODO: verify signature and issue JWT
  res.json({ token: 'TODO' });
});

export default router;
