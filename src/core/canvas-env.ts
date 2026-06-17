// Single typed accessor for canvas/game globals.
// All non-boundary files that need canvas state import from here — never canvas.* directly.

export type Dimensions = {
  width: number;
  height: number;
  sceneWidth: number;
  sceneHeight: number;
  sceneX: number;
  sceneY: number;
  size: number;
};

export const CanvasEnv = {
  gridSize(): number { throw new Error("not implemented"); },
  gridDistance(): number { throw new Error("not implemented"); },
  gridUnits(): string { throw new Error("not implemented"); },
  scene(): Scene { throw new Error("not implemented"); },
  sceneFlag<T>(key: string): T | undefined { void key; throw new Error("not implemented"); },
  tokens(): Token[] { throw new Error("not implemented"); },
  tiles(): Tile[] { throw new Error("not implemented"); },
  dimensions(): Dimensions { throw new Error("not implemented"); },
  worldTransform(): PIXI.Matrix { throw new Error("not implemented"); },
  stage(): PIXI.Container { throw new Error("not implemented"); },
  isGM(): boolean { throw new Error("not implemented"); },
  tokenVision(): boolean { throw new Error("not implemented"); },
  fogColors(): { explored: number; unexplored: number } { throw new Error("not implemented"); },
};
