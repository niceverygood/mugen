import type { DXFData, DXFEntity, Bounds } from './types.js';

interface CodePair {
  c: number;
  v: string;
}

/**
 * Parse DXF text content into structured entity data.
 * Ported from mugen_v2.jsx parseDXF function.
 */
export function parseDXF(text: string): DXFData {
  const raw = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const codes: CodePair[] = [];

  for (let i = 0; i + 1 < raw.length; i += 2) {
    const c = parseInt(raw[i].trim());
    if (!isNaN(c)) codes.push({ c, v: raw[i + 1].trim() });
  }

  const entities: DXFEntity[] = [];
  const layerSet = new Set<string>();
  const rn = (v: string) => parseFloat(v) || 0;

  let idx = 0;
  // Find ENTITIES section
  while (idx < codes.length && !(codes[idx].c === 2 && codes[idx].v === 'ENTITIES')) idx++;
  idx++;

  let poly: any = null;

  while (idx < codes.length) {
    if (codes[idx].c !== 0) { idx++; continue; }
    const type = codes[idx].v;
    if (type === 'ENDSEC' || type === 'EOF') break;
    idx++;

    if (type === 'SEQEND') {
      if (poly) { entities.push(poly); poly = null; }
      continue;
    }

    const e: any = { type, layer: '0' };
    const verts: Array<{ x: number; y: number }> = [];
    let vx: number = 0;
    let hasVx = false;

    while (idx < codes.length && codes[idx].c !== 0) {
      const { c, v } = codes[idx++];
      switch (c) {
        case 8:  e.layer = v; layerSet.add(v); break;
        case 62: e.color = parseInt(v); break;
        case 10:
          if (type === 'LINE') e.x1 = rn(v);
          else if (type === 'LWPOLYLINE') { vx = rn(v); hasVx = true; }
          else e.x = rn(v);
          break;
        case 20:
          if (type === 'LINE') e.y1 = rn(v);
          else if (type === 'LWPOLYLINE' && hasVx) { verts.push({ x: vx, y: rn(v) }); hasVx = false; }
          else e.y = rn(v);
          break;
        case 11: e.x2 = rn(v); break;
        case 21: e.y2 = rn(v); break;
        case 40: if (e.r === undefined) e.r = rn(v); break;
        case 50: e.sa = rn(v); break;
        case 51: e.ea = rn(v); break;
        case 1:  e.text = v; break;
        case 3:  e.text = (e.text || '') + v; break;
        case 70: e.flags = parseInt(v); break;
      }
    }

    if (verts.length) e.vertices = verts;

    if (type === 'POLYLINE') {
      poly = { ...e, vertices: [] };
    } else if (type === 'VERTEX' && poly) {
      if (e.x !== undefined) poly.vertices.push({ x: e.x, y: e.y });
    } else {
      entities.push(e as DXFEntity);
    }
  }

  if (poly) entities.push(poly);

  return { entities, layers: [...layerSet] };
}

/**
 * Calculate bounding box of DXF entities with padding.
 * Ported from mugen_v2.jsx getBounds function.
 */
export function getBounds(entities: DXFEntity[]): Bounds {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;

  const ex = (x: number, y: number) => {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  };

  entities.forEach((e: any) => {
    switch (e.type) {
      case 'LINE':
        ex(e.x1, e.y1);
        ex(e.x2, e.y2);
        break;
      case 'CIRCLE':
      case 'ARC':
        if (e.r) {
          ex(e.x - e.r, e.y - e.r);
          ex(e.x + e.r, e.y + e.r);
        }
        break;
      case 'LWPOLYLINE':
      case 'POLYLINE':
        e.vertices?.forEach((v: { x: number; y: number }) => ex(v.x, v.y));
        break;
      default:
        if (e.x !== undefined) ex(e.x, e.y);
        break;
    }
  });

  if (!isFinite(x0)) return { x0: 0, y0: 0, x1: 10000, y1: 10000 };

  const pad = Math.max((x1 - x0) * 0.06, (y1 - y0) * 0.06, 500);
  return { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad };
}
