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
  getTile(id: string): Tile | undefined {
    return (canvas.tiles as unknown as { get(id: string): Tile | undefined })?.get(id);
  },
  getToken(id: string): Token | undefined {
    return (canvas.tokens as unknown as { get(id: string): Token | undefined })?.get(id);
  },
  appView(): HTMLCanvasElement {
    return canvas.app!.view as unknown as HTMLCanvasElement;
  },
  appTicker(): { add(fn: unknown, ctx?: unknown, priority?: number): void; remove(fn: unknown): void } {
    return canvas.app!.ticker as unknown as { add(fn: unknown, ctx?: unknown, priority?: number): void; remove(fn: unknown): void };
  },
  primaryLayer(): { children: PIXI.DisplayObject[] } | null {
    return (canvas as unknown as { primary?: { children: PIXI.DisplayObject[] } }).primary ?? null;
  },
  setSceneFlag(key: string, value: unknown): Promise<unknown> | undefined {
    return canvas.scene?.setFlag(MODULE_ID, key, value);
  },
  pushTilesHistory(entry: { type: string; data: unknown[]; options: object }): void {
    (canvas.tiles as unknown as { history: typeof entry[] })?.history?.push(entry);
  },
  pushTokensHistory(entry: { type: string; data: unknown[]; options: object }): void {
    (canvas.tokens as unknown as { history: typeof entry[] })?.history?.push(entry);
  },
};
