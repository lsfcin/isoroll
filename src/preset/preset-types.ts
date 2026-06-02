export interface TilePreset {
  type: "tile";
  imageKey: string;
  gridWidth: number;   // tile footprint in grid units
  gridHeight: number;  // tile footprint in grid units
  boundHeight: number;
  imageScale: number;
  imageYScale: number;
  imageOffset: { x: number; y: number };
  tileFlipped: boolean;
  foregroundTile: boolean;
  updatedAt: number;
}

export interface TokenPreset {
  type: "token";
  imageKey: string;
  boundHeight: number;
  imageScale: number;
  imageYScale: number;
  imageOffset: { x: number; y: number };
  tileFlipped: boolean;
  updatedAt: number;
}

export interface BackgroundPreset {
  type: "background";
  imageKey: string;
  scaleX: number;
  offsetX: number;
  offsetY: number;
  gridSize: number;
  backgroundYScale: number;
  updatedAt: number;
}

export type IsorollPreset = TilePreset | TokenPreset | BackgroundPreset;
