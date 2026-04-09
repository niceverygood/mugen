import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// GET /api/presets
router.get('/', async (_req: Request, res: Response) => {
  try {
    const presets = await prisma.preset.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(presets);
  } catch (err) {
    console.error('Get presets error:', err);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// POST /api/presets (ADMIN only)
router.post('/', requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { name, clientName, studSpacing, wallType, maxSpan, notes, settings } = req.body;
    const preset = await prisma.preset.create({
      data: { name, clientName, studSpacing, wallType, maxSpan, notes, settings: JSON.stringify(settings || {}) },
    });
    res.status(201).json(preset);
  } catch (err) {
    console.error('Create preset error:', err);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// PUT /api/presets/:id (ADMIN only)
router.put('/:id', requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name, clientName, studSpacing, wallType, maxSpan, notes, settings } = req.body;
    const preset = await prisma.preset.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(clientName && { clientName }),
        ...(studSpacing && { studSpacing }),
        ...(wallType && { wallType }),
        ...(maxSpan && { maxSpan }),
        ...(notes !== undefined && { notes }),
        ...(settings && { settings: JSON.stringify(settings) }),
      },
    });
    res.json(preset);
  } catch (err) {
    console.error('Update preset error:', err);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// DELETE /api/presets/:id (ADMIN only)
router.delete('/:id', requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.preset.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete preset error:', err);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

export default router;
