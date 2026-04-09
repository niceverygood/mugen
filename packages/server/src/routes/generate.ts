import { Router, Request, Response } from 'express';
import fs from 'fs';
import { prisma } from '../prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { parseDXF } from '@mugen/shared';
import type { Preset, GeneratedLayers } from '@mugen/shared';
import { autoGenerate } from '../services/dxf-generator.js';
import { exportDXF } from '../services/dxf-exporter.js';

const router = Router();
router.use(authMiddleware);

// In-memory job store (production: use Redis or DB)
interface GenerateJob {
  id: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  progress: number;
  layers?: GeneratedLayers;
  dxfString?: string;
  error?: string;
  projectId: number;
  drawingId: number;
}

const jobs = new Map<string, GenerateJob>();

// POST /api/generate
router.post('/', async (req: Request, res: Response) => {
  try {
    const { projectId, drawingId, presetId, settings } = req.body;

    // Validate inputs
    const drawing = await prisma.drawing.findUnique({ where: { id: drawingId } });
    if (!drawing) {
      res.status(404).json({ error: 'DRAWING_NOT_FOUND' });
      return;
    }

    const presetData = await prisma.preset.findUnique({ where: { id: presetId } });
    if (!presetData) {
      res.status(404).json({ error: 'PRESET_NOT_FOUND' });
      return;
    }

    // Create job
    const jobId = `gen_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const job: GenerateJob = {
      id: jobId,
      status: 'pending',
      progress: 0,
      projectId,
      drawingId,
    };
    jobs.set(jobId, job);

    // Process async
    processGeneration(job, drawing.filePath, presetData, settings).catch(err => {
      console.error('Generation error:', err);
      job.status = 'error';
      job.error = err.message;
    });

    res.json({ jobId });
  } catch (err) {
    console.error('Generate error:', err);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

async function processGeneration(
  job: GenerateJob,
  filePath: string,
  presetData: any,
  settings: { floors: number; roofType: string },
) {
  job.status = 'processing';
  job.progress = 10;

  // Read and parse DXF
  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch {
    const iconv = await import('iconv-lite');
    const buf = fs.readFileSync(filePath);
    content = iconv.default.decode(buf, 'Shift_JIS');
  }

  job.progress = 30;
  const dxfData = parseDXF(content);
  job.progress = 50;

  // Convert DB preset to engine preset
  const preset: Preset = {
    id: presetData.id,
    name: presetData.name,
    stud: presetData.studSpacing,
    wallType: presetData.wallType,
    notes: presetData.notes,
  };

  // Run auto-generation
  const layers = autoGenerate(dxfData, preset, {
    floors: settings.floors || 2,
    roofType: settings.roofType || 'gabled',
  });

  job.progress = 90;

  // Export to DXF string
  const dxfString = exportDXF(layers);

  job.layers = layers;
  job.dxfString = dxfString;
  job.progress = 100;
  job.status = 'done';

  // Save generated drawing to DB
  try {
    const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
    const outPath = `${UPLOAD_DIR}/structural_${job.id}.dxf`;
    fs.writeFileSync(outPath, dxfString, 'utf-8');

    await prisma.drawing.create({
      data: {
        projectId: job.projectId,
        type: 'STRUCTURAL',
        fileName: `structural_${job.id}.dxf`,
        filePath: outPath,
        generatedAt: new Date(),
        createdById: 1, // system
        parentId: job.drawingId,
      },
    });
  } catch (err) {
    console.error('Save generated drawing error:', err);
  }
}

// GET /api/generate/:jobId/status
router.get('/:jobId/status', (req: Request, res: Response) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    res.status(404).json({ error: 'JOB_NOT_FOUND' });
    return;
  }

  res.json({
    status: job.status,
    progress: job.progress,
    layers: job.status === 'done' ? job.layers : undefined,
    error: job.error,
  });
});

// GET /api/generate/:jobId/download
router.get('/:jobId/download', (req: Request, res: Response) => {
  const job = jobs.get(req.params.jobId);
  if (!job || job.status !== 'done' || !job.dxfString) {
    res.status(404).json({ error: 'GENERATION_RESULT_NOT_FOUND' });
    return;
  }

  res.setHeader('Content-Type', 'application/dxf');
  res.setHeader('Content-Disposition', `attachment; filename="structural_${job.id}.dxf"`);
  res.send(job.dxfString);
});

export default router;
