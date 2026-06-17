// Single typed accessor for canvas/game globals.
// All non-boundary files that need canvas state import from here — never canvas.* directly.

import { MODULE_ID } from './flags';

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
  gridSize(): number {
    return canvas.grid?.size ?? 100;
  },
  gridDistance(): number {
    return (canvas.scene as unknown as { grid?: { distance?: number } })?.grid?.distance ?? 1;
  },
  gridUnits(): string {
    return (canvas.grid as unknown as { units?: string })?.units ?? "ft";
  },
  scene(): Scene | null {
    return canvas.scene as unknown as Scene | null;
  },
  sceneFlag<T>(key: string): T | undefined {
    return canvas.scene?.getFlag(MODULE_ID, key) as T | undefined;
  },
  tokens(): Token[] {
    return (canvas.tokens?.placeables ?? []) as Token[];
  },
  tiles(): Tile[] {
    return (canvas.tiles?.placeables ?? []) as Tile[];
  },
  dimensions(): Dimensions {
    return canvas.dimensions as unknown as Dimensions;
  },
  worldTransform(): PIXI.Matrix {
    return canvas.app!.stage.worldTransform as unknown as PIXI.Matrix;
  },
  stage(): PIXI.Container {
    return canvas.app!.stage as unknown as PIXI.Container;
  },
  isGM(): boolean {
    return !!(game.user as unknown as { isGM?: boolean })?.isGM;
  },
  tokenVision(): boolean {
    return (canvas.scene as unknown as { tokenVision?: boolean })?.tokenVision ?? false;
  },
  fogColors(): { explored: number; unexplored: number } {
    const c = canvas.colors as unknown as { fogExplored?: number; fogUnexplored?: number };
    return { explored: c?.fogExplored ?? 0x000000, unexplored: c?.fogUnexplored ?? 0x000000 };
  },
};
