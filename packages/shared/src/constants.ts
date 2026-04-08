import type { GenerateLayerConfig } from './types.js';

// ACI (AutoCAD Color Index) map
export const ACI: Record<number, string> = {
  1: '#FF2020', 2: '#FFFF00', 3: '#00D000', 4: '#00CCCC',
  5: '#2020FF', 6: '#CC00CC', 7: '#C8C8C8', 8: '#808080',
  9: '#9E9E9E', 10: '#FF6060',
  30: '#FF8000', 40: '#FFBF00', 130: '#00FFCC', 140: '#0099FF', 200: '#CC00FF',
};

export const aciToHex = (n: number): string | null =>
  n === 7 ? '#BBBBBB' : ACI[n] || null;

// Layer configuration for generated structural layers
export const GEN_LAYER_CFG: Record<string, GenerateLayerConfig> = {
  '기초':       { color: '#d4720a', label: '기초 (Foundation)' },
  '토대':       { color: '#b5860a', label: '토대 (Sill Plate)' },
  '1층_스터드': { color: '#2f81f7', label: '1층 스터드 (1F Stud)' },
  '2층_바닥':   { color: '#8957e5', label: '2층 바닥 (2F Floor)' },
  '2층_스터드': { color: '#1a7f37', label: '2층 스터드 (2F Stud)' },
  '1층_지붕':   { color: '#9e6a03', label: '1층 지붕 (1F Roof)' },
  '천정':       { color: '#bf4b8a', label: '천정 (Ceiling)' },
  '지붕벽':     { color: '#3fb950', label: '지붕벽 (Parapet)' },
  '지붕':       { color: '#e3b341', label: '지붕 (Roof)' },
};

export const LAYER_ORDER = [
  '기초', '토대', '1층_스터드', '2층_바닥', '2층_스터드',
  '1층_지붕', '천정', '지붕벽', '지붕',
] as const;

export const PALETTE = [
  '#2f81f7', '#f78166', '#3fb950', '#e3b341', '#bc8cff',
  '#ff8cc8', '#20d6b5', '#79c0ff', '#ffa657', '#7ee787',
];
