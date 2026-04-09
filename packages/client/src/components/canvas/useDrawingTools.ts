import { useState, useCallback, useRef, useEffect } from 'react';
import type { ManualWall } from '@mugen/shared';
import { useEditorStore } from '../../store/editorStore';

export function useDrawingTools(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  canvasToWorld: (cx: number, cy: number) => { x: number; y: number },
) {
  const [worldPos, setWorldPos] = useState({ x: 0, y: 0 });
  const [drawing, setDrawing] = useState<{ x1: number; y1: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panRef = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);

  const { tool, pan, setPan, addManualElement, setZoom } = useEditorStore();

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const wp = canvasToWorld(e.clientX - rect.left, e.clientY - rect.top);

    if (tool === 'pan') {
      setIsPanning(true);
      panRef.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
    } else if (tool === 'wall') {
      if (!drawing) {
        setDrawing({ x1: wp.x, y1: wp.y });
      } else {
        const el: ManualWall = {
          type: 'WALL',
          id: Date.now(),
          x1: drawing.x1,
          y1: drawing.y1,
          x2: wp.x,
          y2: wp.y,
        };
        addManualElement(el);
        setDrawing(null);
      }
    }
  }, [tool, drawing, pan, canvasToWorld, addManualElement, canvasRef]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setWorldPos(canvasToWorld(e.clientX - rect.left, e.clientY - rect.top));

    if (isPanning && panRef.current) {
      setPan({
        x: panRef.current.px + e.clientX - panRef.current.mx,
        y: panRef.current.py + e.clientY - panRef.current.my,
      });
    }
  }, [isPanning, canvasToWorld, setPan, canvasRef]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    panRef.current = null;
  }, []);

  // Use native event listener for wheel to avoid passive event listener issue
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      useEditorStore.getState().setZoom(z => z * (e.deltaY > 0 ? 0.88 : 1.13));
    };

    parent.addEventListener('wheel', onWheel, { passive: false });
    return () => parent.removeEventListener('wheel', onWheel);
  }, [canvasRef]);

  const handleRightClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDrawing(null);
  }, []);

  return {
    worldPos,
    drawing,
    isPanning,
    setDrawing,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleRightClick,
  };
}
