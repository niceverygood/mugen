// DXF Entity Types
export interface DXFVertex {
  x: number;
  y: number;
}

export interface DXFBaseEntity {
  type: string;
  layer: string;
  color?: number;
}

export interface DXFLine extends DXFBaseEntity {
  type: 'LINE';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface DXFCircle extends DXFBaseEntity {
  type: 'CIRCLE';
  x: number;
  y: number;
  r: number;
}

export interface DXFArc extends DXFBaseEntity {
  type: 'ARC';
  x: number;
  y: number;
  r: number;
  sa: number; // start angle
  ea: number; // end angle
}

export interface DXFLWPolyline extends DXFBaseEntity {
  type: 'LWPOLYLINE' | 'POLYLINE';
  vertices: DXFVertex[];
  flags?: number;
}

export interface DXFText extends DXFBaseEntity {
  type: 'TEXT' | 'MTEXT';
  x: number;
  y: number;
  text: string;
}

export type DXFEntity = DXFLine | DXFCircle | DXFArc | DXFLWPolyline | DXFText | DXFBaseEntity;

export interface DXFData {
  entities: DXFEntity[];
  layers: string[];
}

export interface Bounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

// Generation Types
export interface Preset {
  id: number;
  name: string;
  stud: number;       // stud spacing in mm (303, 455, 910)
  wallType: string;   // "Wood" | "LGS" | "RC"
  notes?: string;
}

export interface GenSettings {
  floors: number;     // 1 or 2
  roofType: string;   // "gabled" | "hip"
}

export interface HAxis {
  y: number;
  x0: number;
  x1: number;
  len: number;
}

export interface VAxis {
  x: number;
  y0: number;
  y1: number;
  len: number;
}

export interface Axes {
  hAxes: HAxis[];
  vAxes: VAxis[];
}

export interface Extents {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export type GeneratedLayers = Record<string, DXFEntity[]>;

export interface StructuralError {
  id?: number;
  msg: string;
  level: 'error' | 'warn';
}

export interface GenerateLayerConfig {
  color: string;
  label: string;
}

// Manual element for wall drawing
export interface ManualWall {
  type: 'WALL';
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// API Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    username: string;
    name: string;
    role: string;
  };
}

export interface GenerateRequest {
  projectId: number;
  drawingId: number;
  presetId: number;
  settings: GenSettings;
}

export interface GenerateStatus {
  status: 'pending' | 'processing' | 'done' | 'error';
  progress: number;
  layers?: GeneratedLayers;
  error?: string;
}
