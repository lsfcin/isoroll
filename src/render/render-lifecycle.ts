// Named lifecycle entry points for all rendering decisions.
// render-gate.ts routes Foundry hooks here. All show/hide/update/clear happens inside these functions.
// No rendering logic lives outside this file (except RenderHandle.show/hide driven by selection events).

export function onCanvasReady(): void { throw new Error("not implemented"); }
export function onCanvasTeardown(): void { throw new Error("not implemented"); }
export function onSceneChange(_scene: Scene, _changes: object): void { throw new Error("not implemented"); }

export function onTileRefresh(_tile: Tile): void { throw new Error("not implemented"); }
export function onTileFlagsChange(_tile: Tile): void { throw new Error("not implemented"); }
export function onTileSelect(_tile: Tile): void { throw new Error("not implemented"); }
export function onTileDeselect(_tile: Tile): void { throw new Error("not implemented"); }
export function onTileMove(_tile: Tile): void { throw new Error("not implemented"); }

export function onTokenRefresh(_token: Token): void { throw new Error("not implemented"); }
export function onTokenFlagsChange(_token: Token): void { throw new Error("not implemented"); }
export function onTokenSelect(_token: Token): void { throw new Error("not implemented"); }
export function onTokenDeselect(_token: Token): void { throw new Error("not implemented"); }
export function onTokenMove(_token: Token): void { throw new Error("not implemented"); }

export function onSightRefresh(): void { throw new Error("not implemented"); }
export function onGridConfigOpen(_app: Application): void { throw new Error("not implemented"); }
export function onGridConfigPreview(_params: object): void { throw new Error("not implemented"); }
