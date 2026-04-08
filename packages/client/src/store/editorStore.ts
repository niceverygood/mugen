import { create } from 'zustand';
import type { DXFData, DXFEntity, GeneratedLayers, ManualWall, StructuralError } from '@mugen/shared';

interface EditorState {
  // DXF data
  dxfData: DXFData | null;
  fileName: string;

  // Layers
  visibleLayers: Set<string>;
  activeLayer: string | null;

  // View
  zoom: number;
  pan: { x: number; y: number };
  tool: 'pan' | 'wall';

  // Manual drawing
  manualElements: ManualWall[];
  manualErrors: StructuralError[];

  // Generation
  generatedLayers: GeneratedLayers;
  genVisible: Record<string, boolean>;
  isGenerating: boolean;
  genDone: boolean;
  selectedGenLayer: string | null;

  // Settings
  genSettings: { floors: number; roofType: string };
  activePresetId: number | null;

  // Actions
  setDxfData: (data: DXFData, fileName: string) => void;
  setVisibleLayers: (layers: Set<string>) => void;
  toggleLayer: (layer: string) => void;
  setActiveLayer: (layer: string | null) => void;
  setZoom: (fn: (z: number) => number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setTool: (tool: 'pan' | 'wall') => void;
  addManualElement: (el: ManualWall) => void;
  undoManual: () => void;
  setGeneratedLayers: (layers: GeneratedLayers) => void;
  setGenVisible: (vis: Record<string, boolean>) => void;
  toggleGenLayer: (layer: string) => void;
  setIsGenerating: (v: boolean) => void;
  setGenDone: (v: boolean) => void;
  setSelectedGenLayer: (layer: string | null) => void;
  setGenSettings: (settings: { floors: number; roofType: string }) => void;
  setActivePresetId: (id: number | null) => void;
  reset: () => void;
}

const initialState = {
  dxfData: null,
  fileName: '',
  visibleLayers: new Set<string>(),
  activeLayer: null,
  zoom: 1,
  pan: { x: 0, y: 0 },
  tool: 'pan' as const,
  manualElements: [] as ManualWall[],
  manualErrors: [] as StructuralError[],
  generatedLayers: {} as GeneratedLayers,
  genVisible: {} as Record<string, boolean>,
  isGenerating: false,
  genDone: false,
  selectedGenLayer: null,
  genSettings: { floors: 2, roofType: 'gabled' },
  activePresetId: null,
};

export const useEditorStore = create<EditorState>((set) => ({
  ...initialState,

  setDxfData: (data, fileName) => set({
    dxfData: data,
    fileName,
    visibleLayers: new Set(data.layers),
    zoom: 1,
    pan: { x: 0, y: 0 },
    manualElements: [],
    generatedLayers: {},
    genDone: false,
    genVisible: {},
  }),

  setVisibleLayers: (layers) => set({ visibleLayers: layers }),
  toggleLayer: (layer) => set((s) => {
    const next = new Set(s.visibleLayers);
    next.has(layer) ? next.delete(layer) : next.add(layer);
    return { visibleLayers: next };
  }),
  setActiveLayer: (layer) => set({ activeLayer: layer }),
  setZoom: (fn) => set((s) => ({ zoom: Math.max(0.05, Math.min(40, fn(s.zoom))) })),
  setPan: (pan) => set({ pan }),
  setTool: (tool) => set({ tool }),

  addManualElement: (el) => set((s) => ({
    manualElements: [...s.manualElements, el],
  })),
  undoManual: () => set((s) => ({
    manualElements: s.manualElements.slice(0, -1),
  })),

  setGeneratedLayers: (layers) => set({ generatedLayers: layers }),
  setGenVisible: (vis) => set({ genVisible: vis }),
  toggleGenLayer: (layer) => set((s) => ({
    genVisible: { ...s.genVisible, [layer]: !s.genVisible[layer] },
  })),
  setIsGenerating: (v) => set({ isGenerating: v }),
  setGenDone: (v) => set({ genDone: v }),
  setSelectedGenLayer: (layer) => set((s) => ({
    selectedGenLayer: s.selectedGenLayer === layer ? null : layer,
  })),
  setGenSettings: (settings) => set({ genSettings: settings }),
  setActivePresetId: (id) => set({ activePresetId: id }),
  reset: () => set(initialState),
}));
