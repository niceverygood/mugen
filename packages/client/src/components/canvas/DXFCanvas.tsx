import { useRef, useEffect, useMemo } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { useTransform } from './useTransform';
import { useDrawingTools } from './useDrawingTools';
import { useT } from '../../store/langStore';
import { aciToHex, GEN_LAYER_CFG, LAYER_ORDER, PALETTE } from '@mugen/shared';
import type { Transform } from './useTransform';

export default function DXFCanvas() {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    dxfData, fileName, visibleLayers, activeLayer, zoom, pan, tool,
    manualElements, manualErrors, generatedLayers, genVisible,
    selectedGenLayer, setZoom, setPan,
  } = useEditorStore();

  const layerColors = useMemo(() => {
    if (!dxfData) return {};
    return Object.fromEntries(dxfData.layers.map((l, i) => [l, PALETTE[i % PALETTE.length]]));
  }, [dxfData]);

  const generatedEntities = useMemo(
    () => Object.values(generatedLayers).flat(),
    [generatedLayers],
  );

  const { getTransform, canvasToWorld, transformRef } = useTransform(
    canvasRef, containerRef,
    dxfData?.entities || [],
    generatedEntities,
    zoom, pan,
  );

  const {
    worldPos, drawing, isPanning, setDrawing,
    handleMouseDown, handleMouseMove, handleMouseUp, handleWheel, handleRightClick,
  } = useDrawingTools(canvasRef, canvasToWorld);

  // Key events
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawing(null);
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        useEditorStore.getState().undoManual();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setDrawing]);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      // Force re-render
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        const { width, height } = container.getBoundingClientRect();
        canvas.width = Math.floor(width);
        canvas.height = Math.floor(height);
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // RENDER
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const { width, height } = container.getBoundingClientRect();
    if (!width || !height) return;
    canvas.width = Math.floor(width);
    canvas.height = Math.floor(height);

    const ctx = canvas.getContext('2d')!;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);

    if (!dxfData || !dxfData.entities.length) {
      // Grid
      ctx.strokeStyle = '#21262d';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.fillStyle = '#30363d';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(t('canvas.upload_prompt'), W / 2, H / 2 - 14);
      ctx.textAlign = 'left';
      return;
    }

    const t = getTransform();
    if (!t) return;

    const { scale, ox, oy, bounds } = t;
    const tx = (wx: number) => (wx - bounds.x0) * scale + ox;
    const ty = (wy: number) => -(wy - bounds.y0) * scale + oy;

    const drawEntity = (ctx: CanvasRenderingContext2D, e: any, color: string, lw: number, alpha = 1) => {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = lw;
      ctx.beginPath();
      try {
        switch (e.type) {
          case 'LINE':
            ctx.moveTo(tx(e.x1), ty(e.y1));
            ctx.lineTo(tx(e.x2), ty(e.y2));
            ctx.stroke();
            break;
          case 'CIRCLE':
            if (e.r > 0) { ctx.arc(tx(e.x), ty(e.y), e.r * scale, 0, Math.PI * 2); ctx.stroke(); }
            break;
          case 'ARC':
            if (e.r > 0) {
              const sa = -e.sa * Math.PI / 180, ea = -e.ea * Math.PI / 180;
              ctx.arc(tx(e.x), ty(e.y), e.r * scale, sa, ea, sa > ea);
              ctx.stroke();
            }
            break;
          case 'LWPOLYLINE':
          case 'POLYLINE':
            if (!e.vertices || e.vertices.length < 2) break;
            ctx.moveTo(tx(e.vertices[0].x), ty(e.vertices[0].y));
            for (let i = 1; i < e.vertices.length; i++)
              ctx.lineTo(tx(e.vertices[i].x), ty(e.vertices[i].y));
            if (e.flags & 1) ctx.closePath();
            ctx.stroke();
            break;
          case 'TEXT':
          case 'MTEXT':
            if (e.text && e.x !== undefined) {
              ctx.font = `${Math.max(7, 9)}px monospace`;
              ctx.globalAlpha = alpha * 0.5;
              ctx.fillText(e.text.replace(/\\[^;]+;/g, '').slice(0, 24), tx(e.x || 0), ty(e.y || 0));
            }
            break;
        }
      } catch { /* skip invalid entities */ }
      ctx.globalAlpha = 1;
    };

    // Draw original DXF
    const hasSome = Object.keys(generatedLayers).length > 0;
    dxfData.entities.forEach(e => {
      if (!visibleLayers.has(e.layer)) return;
      const dim = activeLayer !== null && activeLayer !== e.layer;
      const baseAlpha = hasSome ? 0.22 : 0.82;
      const eAny = e as any;
      const color = eAny.color
        ? (aciToHex(eAny.color) || layerColors[e.layer] || '#4a9eff')
        : (layerColors[e.layer] || '#4a9eff');
      drawEntity(ctx, e, color, dim ? 0.5 : 0.7, dim ? 0.08 : baseAlpha);
    });

    // Draw generated layers
    LAYER_ORDER.forEach(layerName => {
      if (!generatedLayers[layerName]) return;
      if (!genVisible[layerName]) return;
      const cfg = GEN_LAYER_CFG[layerName];
      const isSelected = selectedGenLayer === layerName;
      const dimmed = selectedGenLayer !== null && !isSelected;
      const alpha = dimmed ? 0.12 : 0.88;
      const lw = isSelected ? 1.5 : 0.9;
      generatedLayers[layerName].forEach(e => drawEntity(ctx, e, cfg.color, lw, alpha));
    });

    // Draw manual elements
    manualElements.forEach(el => {
      const isErr = manualErrors.some(e => e.id === el.id && e.level === 'error');
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = isErr ? '#f85149' : '#3fb950';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(tx(el.x1), ty(el.y1));
      ctx.lineTo(tx(el.x2), ty(el.y2));
      ctx.stroke();
    });

    // Drawing preview
    if (drawing) {
      ctx.strokeStyle = '#2f81f7';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.moveTo(tx(drawing.x1), ty(drawing.y1));
      ctx.lineTo(tx(worldPos.x), ty(worldPos.y));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
  }, [dxfData, zoom, pan, visibleLayers, activeLayer, layerColors, manualElements,
    drawing, worldPos, manualErrors, generatedLayers, genVisible, selectedGenLayer, getTransform, t]);

  const hasGen = Object.keys(generatedLayers).length > 0;

  return (
    <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
      onWheel={handleWheel} onContextMenu={handleRightClick}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', cursor: tool === 'pan' ? (isPanning ? 'grabbing' : 'grab') : 'crosshair' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* Zoom controls */}
      <div style={{ position: 'absolute', bottom: 44, right: 12, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {[
          ['+', () => setZoom(z => Math.min(40, z * 1.3))],
          ['\u2212', () => setZoom(z => Math.max(0.05, z * 0.77))],
          ['\u2299', () => { setZoom(() => 1); setPan({ x: 0, y: 0 }); }],
        ].map(([l, fn]) => (
          <button key={l as string} onClick={fn as () => void}
            style={{ width: 28, height: 28, background: '#161b22', border: '1px solid #21262d', color: '#8b949e', borderRadius: 5, cursor: 'pointer', fontSize: 14 }}>
            {l as string}
          </button>
        ))}
      </div>

      {/* Coords */}
      <div style={{ position: 'absolute', bottom: 8, left: 8, display: 'flex', gap: 8 }}>
        <div style={{ background: 'rgba(22,27,34,0.93)', padding: '3px 10px', borderRadius: 4, fontSize: 10, color: '#8b949e', border: '1px solid #21262d' }}>
          X: {worldPos.x.toLocaleString()} \u00b7 Y: {worldPos.y.toLocaleString()} mm
        </div>
        <div style={{ background: 'rgba(22,27,34,0.93)', padding: '3px 10px', borderRadius: 4, fontSize: 10, color: '#8b949e', border: '1px solid #21262d' }}>
          {Math.round(zoom * 100)}%
        </div>
        {fileName && (
          <div style={{ background: 'rgba(22,27,34,0.93)', padding: '3px 10px', borderRadius: 4, fontSize: 10, color: '#58a6ff', border: '1px solid #21262d' }}>
            {fileName}
          </div>
        )}
      </div>

      {/* Hints */}
      {!dxfData && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#30363d' }}>{t('canvas.gen_hint').split('\n').map((line, i) => <span key={i}>{line}{i === 0 && <br />}</span>)}</div>
        </div>
      )}
      {dxfData && !hasGen && (
        <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', background: '#1f4878', padding: '5px 16px', borderRadius: 20, fontSize: 11, color: '#79c0ff', border: '1px solid #2f81f7' }}>
          {t('canvas.preset_hint')}
        </div>
      )}
      {selectedGenLayer && (
        <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', background: '#21262d', padding: '5px 16px', borderRadius: 20, fontSize: 11, color: '#c9d1d9', border: '1px solid #30363d' }}>
          {t('canvas.highlight')}: {GEN_LAYER_CFG[selectedGenLayer]?.label}
        </div>
      )}
    </div>
  );
}
