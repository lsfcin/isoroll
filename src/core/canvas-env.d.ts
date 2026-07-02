export type Dimensions = {
    width: number;
    height: number;
    sceneWidth: number;
    sceneHeight: number;
    sceneX: number;
    sceneY: number;
    size: number;
};
export declare const CanvasEnv: {
    gridSize(): number;
    gridDistance(): number;
    gridUnits(): string;
    scene(): Scene | null;
    sceneFlag<T>(key: string): T | undefined;
    tokens(): Token[];
    tiles(): Tile[];
    dimensions(): Dimensions;
    worldTransform(): PIXI.Matrix;
    stage(): PIXI.Container;
    isGM(): boolean;
    tokenVision(): boolean;
    fogColors(): {
        explored: number;
        unexplored: number;
    };
    getTile(id: string): Tile | undefined;
    getToken(id: string): Token | undefined;
    appView(): HTMLCanvasElement;
    appTicker(): {
        add(fn: unknown, ctx?: unknown, priority?: number): void;
        remove(fn: unknown): void;
    };
    primaryLayer(): {
        children: PIXI.DisplayObject[];
    } | null;
    setSceneFlag(key: string, value: unknown): Promise<unknown> | undefined;
    pushTilesHistory(entry: {
        type: string;
        data: unknown[];
        options: object;
    }): void;
    pushTokensHistory(entry: {
        type: string;
        data: unknown[];
        options: object;
    }): void;
    setGridRescaling(v: boolean): void;
    isGridRescaling(): boolean;
};
