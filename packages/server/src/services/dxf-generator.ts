import type {
  DXFEntity, DXFData, Bounds, Preset, GenSettings,
  HAxis, VAxis, Axes, Extents, GeneratedLayers,
} from '@mugen/shared';
import { getBounds } from '@mugen/shared';

// ---- Helper: get building extents from axes ----
function extents(hAxes: HAxis[], vAxes: VAxis[]): Extents {
  return {
    xMin: Math.min(...vAxes.map(a => a.x)),
    xMax: Math.max(...vAxes.map(a => a.x)),
    yMin: Math.min(...hAxes.map(a => a.y)),
    yMax: Math.max(...hAxes.map(a => a.y)),
  };
}

// ---- Step 1: Extract major structural axes from DXF entities ----
export function extractAxes(entities: DXFEntity[]): Axes {
  const hC: HAxis[] = [];
  const vC: VAxis[] = [];

  const processLine = (x1: number, y1: number, x2: number, y2: number) => {
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (len < 800) return;
    const dx = Math.abs(x2 - x1), dy = Math.abs(y2 - y1);
    if (dy / len < 0.15) hC.push({ y: (y1 + y2) / 2, x0: Math.min(x1, x2), x1: Math.max(x1, x2), len });
    else if (dx / len < 0.15) vC.push({ x: (x1 + x2) / 2, y0: Math.min(y1, y2), y1: Math.max(y1, y2), len });
  };

  entities.forEach((e: any) => {
    if (e.type === 'LINE') processLine(e.x1, e.y1, e.x2, e.y2);
    else if ((e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') && e.vertices) {
      for (let i = 0; i < e.vertices.length - 1; i++) {
        processLine(e.vertices[i].x, e.vertices[i].y, e.vertices[i + 1].x, e.vertices[i + 1].y);
      }
    }
  });

  const dedup = <T extends { len: number }>(arr: T[], key: keyof T, merge = 200): T[] => {
    if (!arr.length) return [];
    const s = [...arr].sort((a, b) => (a[key] as number) - (b[key] as number));
    const r = [s[0]];
    s.slice(1).forEach(l => {
      const p = r[r.length - 1];
      if (Math.abs((l[key] as number) - (p[key] as number)) > merge) r.push(l);
      else if (l.len > p.len) r[r.length - 1] = l;
    });
    return r;
  };

  return { hAxes: dedup(hC, 'y'), vAxes: dedup(vC, 'x') };
}

// ---- Fallback: synthesize axes from bounding box ----
export function syntheticAxes(bounds: Bounds, floors = 2): Axes {
  const { x0, y0, x1, y1 } = bounds;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const W = (x1 - x0) * 0.78, H = (y1 - y0) * 0.78;

  const hAxes: HAxis[] = [
    { y: cy - H / 2, x0: cx - W / 2, x1: cx + W / 2, len: W },
    ...(floors >= 2 ? [{ y: cy, x0: cx - W / 2, x1: cx + W / 2, len: W }] : []),
    { y: cy + H / 2, x0: cx - W / 2, x1: cx + W / 2, len: W },
  ];

  const vAxes: VAxis[] = [
    { x: cx - W / 2, y0: cy - H / 2, y1: cy + H / 2, len: H },
    { x: cx - W / 6, y0: cy - H / 2, y1: cy + H / 2, len: H },
    { x: cx + W / 6, y0: cy - H / 2, y1: cy + H / 2, len: H },
    { x: cx + W / 2, y0: cy - H / 2, y1: cy + H / 2, len: H },
  ];

  return { hAxes, vAxes };
}

// ---- 기초 (Foundation) ----
function gen基礎(hAxes: HAxis[], vAxes: VAxis[]): DXFEntity[] {
  const { xMin, xMax, yMin, yMax } = extents(hAxes, vAxes);
  const ov = 450, ft = 180, wt = 400;
  const el: any[] = [];

  // Outer foundation edge
  el.push({ type: 'LWPOLYLINE', layer: '기초_외주', flags: 1, color: 30,
    vertices: [{ x: xMin - ov, y: yMin - ov }, { x: xMax + ov, y: yMin - ov }, { x: xMax + ov, y: yMax + ov }, { x: xMin - ov, y: yMax + ov }] });
  // Inner slab edge
  el.push({ type: 'LWPOLYLINE', layer: '기초_내부', flags: 1, color: 30,
    vertices: [{ x: xMin - ov + wt, y: yMin - ov + wt }, { x: xMax + ov - wt, y: yMin - ov + wt }, { x: xMax + ov - wt, y: yMax + ov - wt }, { x: xMin - ov + wt, y: yMax + ov - wt }] });

  // Foundation beams along each horizontal axis
  hAxes.forEach(a => {
    el.push({ type: 'LINE', layer: '기초_보', color: 30, x1: xMin - ov, y1: a.y, x2: xMax + ov, y2: a.y });
    el.push({ type: 'LINE', layer: '기초_보', color: 30, x1: xMin - ov, y1: a.y - ft, x2: xMax + ov, y2: a.y - ft });
    el.push({ type: 'LINE', layer: '기초_보', color: 30, x1: xMin - ov, y1: a.y + ft, x2: xMax + ov, y2: a.y + ft });
  });

  // Foundation beams along each vertical axis
  vAxes.forEach(a => {
    el.push({ type: 'LINE', layer: '기초_보', color: 30, x1: a.x, y1: yMin - ov, x2: a.x, y2: yMax + ov });
    el.push({ type: 'LINE', layer: '기초_보', color: 30, x1: a.x - ft, y1: yMin - ov, x2: a.x - ft, y2: yMax + ov });
    el.push({ type: 'LINE', layer: '기초_보', color: 30, x1: a.x + ft, y1: yMin - ov, x2: a.x + ft, y2: yMax + ov });
  });

  // Footing squares at intersections
  hAxes.forEach(h => vAxes.forEach(v => {
    const s = 300;
    el.push({ type: 'LWPOLYLINE', layer: '기초_독립기초', flags: 1, color: 10,
      vertices: [{ x: v.x - s, y: h.y - s }, { x: v.x + s, y: h.y - s }, { x: v.x + s, y: h.y + s }, { x: v.x - s, y: h.y + s }] });
    el.push({ type: 'LINE', layer: '기초_독립기초', color: 10, x1: v.x - s, y1: h.y - s, x2: v.x + s, y2: h.y + s });
    el.push({ type: 'LINE', layer: '기초_독립기초', color: 10, x1: v.x + s, y1: h.y - s, x2: v.x - s, y2: h.y + s });
  }));

  return el;
}

// ---- 토대 (Sill Plate) ----
function gen토대(hAxes: HAxis[], vAxes: VAxis[], preset: Preset): DXFEntity[] {
  const { xMin, xMax, yMin, yMax } = extents(hAxes, vAxes);
  const wt = preset.wallType === 'Wood' ? 105 : 75;
  const el: any[] = [];

  const box = (x1: number, y1: number, x2: number, y2: number, layer: string, color: number) => {
    el.push({ type: 'LWPOLYLINE', layer, flags: 1, color, vertices: [{ x: x1, y: y1 }, { x: x2, y: y1 }, { x: x2, y: y2 }, { x: x1, y: y2 }] });
  };

  // Outer perimeter double sill
  box(xMin - wt, yMin - wt, xMax + wt, yMax + wt, '토대_외주', 40);
  box(xMin, yMin, xMax, yMax, '토대_내선', 40);

  // Interior sills
  hAxes.slice(1, -1).forEach(a => {
    el.push({ type: 'LINE', layer: '토대_내부', color: 40, x1: xMin, y1: a.y - wt / 2, x2: xMax, y2: a.y - wt / 2 });
    el.push({ type: 'LINE', layer: '토대_내부', color: 40, x1: xMin, y1: a.y + wt / 2, x2: xMax, y2: a.y + wt / 2 });
  });
  vAxes.slice(1, -1).forEach(a => {
    el.push({ type: 'LINE', layer: '토대_내부', color: 40, x1: a.x - wt / 2, y1: yMin, x2: a.x - wt / 2, y2: yMax });
    el.push({ type: 'LINE', layer: '토대_내부', color: 40, x1: a.x + wt / 2, y1: yMin, x2: a.x + wt / 2, y2: yMax });
  });

  // Anchor bolt marks
  const abSpacing = 1820;
  for (let x = xMin + abSpacing / 2; x < xMax; x += abSpacing) {
    el.push({ type: 'CIRCLE', layer: '토대_앙카볼트', color: 40, x, y: yMin, r: 50 });
    el.push({ type: 'CIRCLE', layer: '토대_앙카볼트', color: 40, x, y: yMax, r: 50 });
  }
  for (let y = yMin + abSpacing / 2; y < yMax; y += abSpacing) {
    el.push({ type: 'CIRCLE', layer: '토대_앙카볼트', color: 40, x: xMin, y, r: 50 });
    el.push({ type: 'CIRCLE', layer: '토대_앙카볼트', color: 40, x: xMax, y, r: 50 });
  }

  return el;
}

// ---- 스터드 (Studs) ----
function gen스터드(hAxes: HAxis[], vAxes: VAxis[], preset: Preset, floor = 1): DXFEntity[] {
  const { xMin, xMax, yMin, yMax } = extents(hAxes, vAxes);
  const sp = preset.stud;
  const wt = preset.wallType === 'Wood' ? 105 : 75;
  const color = floor === 1 ? 3 : 4;
  const layerPfx = `${floor}층_스터드`;
  const el: any[] = [];

  const studLine = (x1: number, y1: number, x2: number, y2: number) =>
    el.push({ type: 'LINE', layer: layerPfx, color, x1, y1, x2, y2 });
  const topBot = (x1: number, y1: number, x2: number, y2: number) =>
    el.push({ type: 'LINE', layer: `${floor}층_상하판`, color, x1, y1, x2, y2 });

  // Horizontal walls
  hAxes.forEach(a => {
    topBot(xMin, a.y - wt / 2, xMax, a.y - wt / 2);
    topBot(xMin, a.y + wt / 2, xMax, a.y + wt / 2);
    studLine(xMin, a.y - wt / 2, xMin, a.y + wt / 2);
    studLine(xMax, a.y - wt / 2, xMax, a.y + wt / 2);
    for (let x = xMin + sp; x < xMax; x += sp) {
      studLine(x, a.y - wt / 2, x, a.y + wt / 2);
    }
    // Diagonal brace every ~3640mm
    const brSpan = sp * 8;
    for (let x = xMin; x < xMax - brSpan / 2; x += brSpan) {
      el.push({ type: 'LINE', layer: `${floor}층_가새`, color: 6, x1: x, y1: a.y - wt / 2, x2: x + brSpan, y2: a.y + wt / 2 });
      el.push({ type: 'LINE', layer: `${floor}층_가새`, color: 6, x1: x + brSpan, y1: a.y - wt / 2, x2: x, y2: a.y + wt / 2 });
    }
  });

  // Vertical walls
  vAxes.forEach(a => {
    topBot(a.x - wt / 2, yMin, a.x - wt / 2, yMax);
    topBot(a.x + wt / 2, yMin, a.x + wt / 2, yMax);
    studLine(a.x - wt / 2, yMin, a.x + wt / 2, yMin);
    studLine(a.x - wt / 2, yMax, a.x + wt / 2, yMax);
    for (let y = yMin + sp; y < yMax; y += sp) {
      studLine(a.x - wt / 2, y, a.x + wt / 2, y);
    }
    const brSpan = sp * 8;
    for (let y = yMin; y < yMax - brSpan / 2; y += brSpan) {
      el.push({ type: 'LINE', layer: `${floor}층_가새`, color: 6, x1: a.x - wt / 2, y1: y, x2: a.x + wt / 2, y2: y + brSpan });
    }
  });

  // Opening markers
  hAxes.forEach(a => {
    const openW = 900, openGap = sp * 4;
    for (let x = xMin + openGap; x < xMax - openW; x += openGap) {
      el.push({ type: 'LINE', layer: `${floor}층_개구부`, color: 2, x1: x, y1: a.y - wt / 2, x2: x + openW, y2: a.y - wt / 2 });
      el.push({ type: 'LINE', layer: `${floor}층_개구부`, color: 2, x1: x, y1: a.y + wt / 2, x2: x + openW, y2: a.y + wt / 2 });
      studLine(x - wt / 2, a.y - wt / 2, x - wt / 2, a.y + wt / 2);
      studLine(x + openW + wt / 2, a.y - wt / 2, x + openW + wt / 2, a.y + wt / 2);
    }
  });

  return el;
}

// ---- 2층 바닥 (2F Floor Joists) ----
function gen2층바닥(hAxes: HAxis[], vAxes: VAxis[], preset: Preset): DXFEntity[] {
  const { xMin, xMax, yMin, yMax } = extents(hAxes, vAxes);
  const sp = preset.stud;
  const W = xMax - xMin, H = yMax - yMin;
  const el: any[] = [];

  // Rim joists
  ([[xMin, yMin, xMax, yMin], [xMax, yMin, xMax, yMax], [xMax, yMax, xMin, yMax], [xMin, yMax, xMin, yMin]] as number[][])
    .forEach(([x1, y1, x2, y2]) => {
      el.push({ type: 'LINE', layer: '2층_바닥_주변보', color: 5, x1, y1, x2, y2 });
    });

  // Span in shorter direction
  if (W >= H) {
    for (let y = yMin + sp; y < yMax; y += sp)
      el.push({ type: 'LINE', layer: '2층_바닥_장선', color: 5, x1: xMin, y1: y, x2: xMax, y2: y });
  } else {
    for (let x = xMin + sp; x < xMax; x += sp)
      el.push({ type: 'LINE', layer: '2층_바닥_장선', color: 5, x1: x, y1: yMin, x2: x, y2: yMax });
  }

  // Double joists at load points
  hAxes.slice(1, -1).forEach(a => {
    el.push({ type: 'LINE', layer: '2층_바닥_이중장선', color: 4, x1: xMin, y1: a.y - 30, x2: xMax, y2: a.y - 30 });
    el.push({ type: 'LINE', layer: '2층_바닥_이중장선', color: 4, x1: xMin, y1: a.y + 30, x2: xMax, y2: a.y + 30 });
  });

  // Mid-span blocking
  const blk = 1820;
  for (let x = xMin + blk; x < xMax; x += blk) {
    el.push({ type: 'LINE', layer: '2층_바닥_가로막이', color: 8, x1: x, y1: yMin, x2: x, y2: yMax });
  }

  return el;
}

// ---- 천정 (Ceiling) ----
function gen천정(hAxes: HAxis[], vAxes: VAxis[], preset: Preset): DXFEntity[] {
  const { xMin, xMax, yMin, yMax } = extents(hAxes, vAxes);
  const sp = preset.stud;
  const W = xMax - xMin, H = yMax - yMin;
  const el: any[] = [];

  ([[xMin, yMin, xMax, yMin], [xMax, yMin, xMax, yMax], [xMax, yMax, xMin, yMax], [xMin, yMax, xMin, yMin]] as number[][])
    .forEach(([x1, y1, x2, y2]) => {
      el.push({ type: 'LINE', layer: '천정_주변', color: 6, x1, y1, x2, y2 });
    });

  // Ceiling joists (opposite direction to floor joists)
  if (W < H) {
    for (let y = yMin + sp; y < yMax; y += sp)
      el.push({ type: 'LINE', layer: '천정_장선', color: 6, x1: xMin, y1: y, x2: xMax, y2: y });
  } else {
    for (let x = xMin + sp; x < xMax; x += sp)
      el.push({ type: 'LINE', layer: '천정_장선', color: 6, x1: x, y1: yMin, x2: x, y2: yMax });
  }

  // Attic access hatch
  const hx = (xMin + xMax) / 2, hy = (yMin + yMax) / 2, hs = 600;
  el.push({ type: 'LWPOLYLINE', layer: '천정_점검구', flags: 1, color: 2,
    vertices: [{ x: hx - hs, y: hy - hs }, { x: hx + hs, y: hy - hs }, { x: hx + hs, y: hy + hs }, { x: hx - hs, y: hy + hs }] });
  el.push({ type: 'LINE', layer: '천정_점검구', color: 2, x1: hx - hs, y1: hy - hs, x2: hx + hs, y2: hy + hs });
  el.push({ type: 'LINE', layer: '천정_점검구', color: 2, x1: hx + hs, y1: hy - hs, x2: hx - hs, y2: hy + hs });

  return el;
}

// ---- 1층 지붕 (Fascia / Eave at 1F level) ----
function gen1층지붕(hAxes: HAxis[], vAxes: VAxis[], preset: Preset): DXFEntity[] {
  const { xMin, xMax, yMin, yMax } = extents(hAxes, vAxes);
  const ov = preset.wallType === 'Wood' ? 600 : 500;
  const el: any[] = [];

  el.push({ type: 'LWPOLYLINE', layer: '1층_지붕_처마선', flags: 1, color: 9,
    vertices: [{ x: xMin - ov, y: yMin - ov }, { x: xMax + ov, y: yMin - ov }, { x: xMax + ov, y: yMax + ov }, { x: xMin - ov, y: yMax + ov }] });
  el.push({ type: 'LWPOLYLINE', layer: '1층_지붕_외벽', flags: 1, color: 9,
    vertices: [{ x: xMin, y: yMin }, { x: xMax, y: yMin }, { x: xMax, y: yMax }, { x: xMin, y: yMax }] });
  el.push({ type: 'LINE', layer: '1층_지붕_처마', color: 9, x1: xMin - ov, y1: yMin - ov, x2: xMin, y2: yMin });
  el.push({ type: 'LINE', layer: '1층_지붕_처마', color: 9, x1: xMax + ov, y1: yMin - ov, x2: xMax, y2: yMin });

  return el;
}

// ---- 지붕 (Roof Framing) ----
function gen지붕(hAxes: HAxis[], vAxes: VAxis[], preset: Preset, roofType: string): DXFEntity[] {
  const { xMin, xMax, yMin, yMax } = extents(hAxes, vAxes);
  const sp = preset.stud, ov = 600;
  const el: any[] = [];
  const ridgeX = (xMin + xMax) / 2;

  // Eave perimeter
  el.push({ type: 'LWPOLYLINE', layer: '지붕_처마선', flags: 1, color: 2,
    vertices: [{ x: xMin - ov, y: yMin - ov }, { x: xMax + ov, y: yMin - ov }, { x: xMax + ov, y: yMax + ov }, { x: xMin - ov, y: yMax + ov }] });

  if (roofType === 'gabled') {
    // Ridge
    el.push({ type: 'LINE', layer: '지붕_용마루', color: 1, x1: ridgeX, y1: yMin - ov, x2: ridgeX, y2: yMax + ov });
    // Rafters
    for (let y = yMin - ov + sp; y < yMax + ov; y += sp) {
      el.push({ type: 'LINE', layer: '지붕_서까래', color: 2, x1: ridgeX, y1: y, x2: xMin - ov, y2: y });
      el.push({ type: 'LINE', layer: '지붕_서까래', color: 2, x1: ridgeX, y1: y, x2: xMax + ov, y2: y });
    }
    // Collar ties
    const ctSpacing = sp * 2;
    for (let y = yMin + ctSpacing; y < yMax; y += ctSpacing) {
      el.push({ type: 'LINE', layer: '지붕_칼라타이', color: 8, x1: ridgeX - 500, y1: y, x2: ridgeX + 500, y2: y });
    }
  } else {
    // Hip roof
    const ridgeLen = (yMax - yMin) * 0.6;
    const ridgeY0 = (yMin + yMax) / 2 - ridgeLen / 2;
    const ridgeY1 = (yMin + yMax) / 2 + ridgeLen / 2;
    el.push({ type: 'LINE', layer: '지붕_용마루', color: 1, x1: ridgeX, y1: ridgeY0, x2: ridgeX, y2: ridgeY1 });

    // Hip rafters
    ([[xMin - ov, yMin - ov], [xMax + ov, yMin - ov], [xMax + ov, yMax + ov], [xMin - ov, yMax + ov]] as number[][])
      .forEach(([cx, cy], i) => {
        const ry = i < 2 ? ridgeY0 : ridgeY1;
        el.push({ type: 'LINE', layer: '지붕_귀서까래', color: 1, x1: cx, y1: cy, x2: ridgeX, y2: ry });
      });

    // Common rafters
    for (let y = ridgeY0 + sp; y < ridgeY1; y += sp) {
      el.push({ type: 'LINE', layer: '지붕_서까래', color: 2, x1: ridgeX, y1: y, x2: xMin - ov, y2: y });
      el.push({ type: 'LINE', layer: '지붕_서까래', color: 2, x1: ridgeX, y1: y, x2: xMax + ov, y2: y });
    }

    // End rafters (fan pattern)
    [ridgeY0, ridgeY1].forEach((ry, side) => {
      const eyBase = side === 0 ? yMin - ov : yMax + ov;
      for (let x = xMin - ov + sp; x < xMax + ov; x += sp) {
        el.push({ type: 'LINE', layer: '지붕_서까래', color: 2, x1: ridgeX, y1: ry, x2: x, y2: eyBase });
      }
    });
  }

  return el;
}

// ---- 지붕벽 (Parapet / Attic Wall) ----
function gen지붕벽(hAxes: HAxis[], vAxes: VAxis[], preset: Preset): DXFEntity[] {
  const { xMin, xMax, yMin, yMax } = extents(hAxes, vAxes);
  const sp = preset.stud, wt = preset.wallType === 'Wood' ? 105 : 75;
  const el: any[] = [];

  // Horizontal parapet walls
  [yMin, yMax].forEach(y => {
    el.push({ type: 'LINE', layer: '지붕벽_상하판', color: 3, x1: xMin, y1: y - wt / 2, x2: xMax, y2: y - wt / 2 });
    el.push({ type: 'LINE', layer: '지붕벽_상하판', color: 3, x1: xMin, y1: y + wt / 2, x2: xMax, y2: y + wt / 2 });
    for (let x = xMin; x <= xMax; x += sp)
      el.push({ type: 'LINE', layer: '지붕벽_스터드', color: 3, x1: x, y1: y - wt / 2, x2: x, y2: y + wt / 2 });
  });

  // Vertical parapet walls
  [xMin, xMax].forEach(x => {
    el.push({ type: 'LINE', layer: '지붕벽_상하판', color: 3, x1: x - wt / 2, y1: yMin, x2: x - wt / 2, y2: yMax });
    el.push({ type: 'LINE', layer: '지붕벽_상하판', color: 3, x1: x + wt / 2, y1: yMin, x2: x + wt / 2, y2: yMax });
    for (let y = yMin; y <= yMax; y += sp)
      el.push({ type: 'LINE', layer: '지붕벽_스터드', color: 3, x1: x - wt / 2, y1: y, x2: x + wt / 2, y2: y });
  });

  return el;
}

// ============================================================
// MASTER AUTO-GENERATE FUNCTION
// ============================================================
export function autoGenerate(dxfData: DXFData, preset: Preset, settings: GenSettings): GeneratedLayers {
  let { hAxes, vAxes } = extractAxes(dxfData.entities);

  // If we can't find enough axes, synthesize from bounds
  if (hAxes.length < 2 || vAxes.length < 2) {
    const bounds = getBounds(dxfData.entities);
    ({ hAxes, vAxes } = syntheticAxes(bounds, settings.floors));
  }

  const layers: GeneratedLayers = {};
  layers['기초'] = gen基礎(hAxes, vAxes);
  layers['토대'] = gen토대(hAxes, vAxes, preset);
  layers['1층_스터드'] = gen스터드(hAxes, vAxes, preset, 1);

  if (settings.floors >= 2) {
    layers['2층_바닥'] = gen2층바닥(hAxes, vAxes, preset);
    layers['2층_스터드'] = gen스터드(hAxes, vAxes, preset, 2);
  }

  layers['1층_지붕'] = gen1층지붕(hAxes, vAxes, preset);
  layers['천정'] = gen천정(hAxes, vAxes, preset);
  layers['지붕벽'] = gen지붕벽(hAxes, vAxes, preset);
  layers['지붕'] = gen지붕(hAxes, vAxes, preset, settings.roofType);

  return layers;
}
