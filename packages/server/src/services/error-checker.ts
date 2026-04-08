import type { DXFEntity, Preset, StructuralError } from '@mugen/shared';

/**
 * Check generated/manual elements for structural errors.
 * Ported from mugen_v2.jsx checkErrors function.
 */
export function checkErrors(elements: DXFEntity[], preset?: Preset): StructuralError[] {
  const errs: StructuralError[] = [];

  const maxSpan = preset?.wallType === 'Wood' ? 5460
    : preset?.wallType === 'LGS' ? 4550
    : 8000;

  elements.forEach((el: any) => {
    if (el.type === 'WALL') {
      const len = Math.hypot((el.x2 || 0) - (el.x1 || 0), (el.y2 || 0) - (el.y1 || 0));
      if (len > maxSpan) {
        errs.push({ id: el.id, msg: `スパン超過: ${Math.round(len)}mm`, level: 'error' });
      }
      if (len < 100) {
        errs.push({ id: el.id, msg: `長さ不足: ${Math.round(len)}mm`, level: 'warn' });
      }
    }
  });

  return errs;
}
