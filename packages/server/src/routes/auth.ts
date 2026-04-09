import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'mugen-cad-jwt-secret-dev-2024';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'mugen-cad-refresh-secret-dev-2024';

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: 'CREDENTIALS_REQUIRED' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      res.status(401).json({ error: 'INVALID_CREDENTIALS' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ error: 'INVALID_CREDENTIALS' });
      return;
    }

    const payload = { userId: user.id, username: user.username, role: user.role };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });

    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, username: user.username, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ error: 'REFRESH_TOKEN_REQUIRED' });
      return;
    }

    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;
    const newPayload = { userId: payload.userId, username: payload.username, role: payload.role };
    const accessToken = jwt.sign(newPayload, JWT_SECRET, { expiresIn: '8h' });

    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: 'INVALID_REFRESH_TOKEN' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, username: true, name: true, role: true, createdAt: true },
    });
    if (!user) {
      res.status(404).json({ error: 'USER_NOT_FOUND' });
      return;
    }
    res.json(user);
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

export default router;
