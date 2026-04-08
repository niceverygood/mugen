import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// GET /api/projects
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {};
    if (status) where.status = status;
    // STAFF can only see their own projects
    if (req.user!.role === 'STAFF') where.createdById = req.user!.userId;

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
        include: {
          createdBy: { select: { id: true, name: true } },
          preset: { select: { id: true, name: true, clientName: true } },
          _count: { select: { drawings: true } },
        },
      }),
      prisma.project.count({ where }),
    ]);

    res.json({ projects, total, page: parseInt(page as string), limit: take });
  } catch (err) {
    console.error('Get projects error:', err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// POST /api/projects
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, clientName, floors, roofType, presetId } = req.body;
    const project = await prisma.project.create({
      data: {
        name,
        clientName: clientName || name,
        floors: floors || 2,
        roofType: roofType || 'gabled',
        createdById: req.user!.userId,
        ...(presetId && { presetId }),
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        preset: true,
      },
    });
    res.status(201).json(project);
  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// GET /api/projects/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true } },
        preset: true,
        drawings: {
          orderBy: { createdAt: 'desc' },
          include: { createdBy: { select: { id: true, name: true } } },
        },
      },
    });

    if (!project) {
      res.status(404).json({ error: 'プロジェクトが見つかりません' });
      return;
    }

    // STAFF can only access their own projects
    if (req.user!.role === 'STAFF' && project.createdById !== req.user!.userId) {
      res.status(403).json({ error: '権限がありません' });
      return;
    }

    res.json(project);
  } catch (err) {
    console.error('Get project error:', err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// PUT /api/projects/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'プロジェクトが見つかりません' });
      return;
    }
    if (req.user!.role === 'STAFF' && existing.createdById !== req.user!.userId) {
      res.status(403).json({ error: '権限がありません' });
      return;
    }

    const { name, clientName, status, floors, roofType, presetId } = req.body;
    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(clientName && { clientName }),
        ...(status && { status }),
        ...(floors && { floors }),
        ...(roofType && { roofType }),
        ...(presetId !== undefined && { presetId: presetId || null }),
      },
    });
    res.json(project);
  } catch (err) {
    console.error('Update project error:', err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// DELETE /api/projects/:id (ADMIN only)
router.delete('/:id', requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.project.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete project error:', err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

export default router;
