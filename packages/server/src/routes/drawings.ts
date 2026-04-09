import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { parseDXF } from '@mugen/shared';

const router = Router({ mergeParams: true });
router.use(authMiddleware);

// POST /api/projects/:id/drawings/upload
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'DXF_FILE_REQUIRED' });
      return;
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      res.status(404).json({ error: 'PROJECT_NOT_FOUND' });
      return;
    }

    const drawing = await prisma.drawing.create({
      data: {
        projectId,
        type: 'ARCHITECTURAL',
        fileName: file.originalname,
        filePath: file.path,
        createdById: req.user!.userId,
      },
    });

    res.status(201).json(drawing);
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'UPLOAD_FAILED' });
  }
});

// GET /api/projects/:id/drawings/:drawId — parsed DXF data as JSON
router.get('/:drawId', async (req: Request, res: Response) => {
  try {
    const drawId = parseInt(req.params.drawId);
    const drawing = await prisma.drawing.findUnique({ where: { id: drawId } });

    if (!drawing) {
      res.status(404).json({ error: 'DRAWING_NOT_FOUND' });
      return;
    }

    const filePath = drawing.filePath;
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'FILE_NOT_FOUND' });
      return;
    }

    // Try UTF-8 first, then Shift-JIS
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
      // Basic check if it parsed correctly
      if (content.includes('\ufffd')) throw new Error('encoding');
    } catch {
      // Fallback: read as buffer and try iconv
      try {
        const iconv = await import('iconv-lite');
        const buf = fs.readFileSync(filePath);
        content = iconv.default.decode(buf, 'Shift_JIS');
      } catch {
        content = fs.readFileSync(filePath, 'utf-8');
      }
    }

    const dxfData = parseDXF(content);

    res.json({
      drawing,
      dxfData,
    });
  } catch (err) {
    console.error('Get drawing error:', err);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// GET /api/projects/:id/drawings/:drawId/download
router.get('/:drawId/download', async (req: Request, res: Response) => {
  try {
    const drawId = parseInt(req.params.drawId);
    const drawing = await prisma.drawing.findUnique({ where: { id: drawId } });

    if (!drawing) {
      res.status(404).json({ error: 'DRAWING_NOT_FOUND' });
      return;
    }

    if (!fs.existsSync(drawing.filePath)) {
      res.status(404).json({ error: 'FILE_NOT_FOUND' });
      return;
    }

    res.download(drawing.filePath, drawing.fileName);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'DOWNLOAD_FAILED' });
  }
});

export default router;
