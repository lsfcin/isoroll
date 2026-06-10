export declare const HANDLE_SIZE = 9;
export declare const HALF: number;
export declare function makeHandle(color: number, cursor?: string): PIXI.Graphics;
export declare function makeCircleHandle(color: number, cursor?: string): PIXI.Container;
export declare function makeSquareCounterHandle(color: number, cursor?: string): PIXI.Container;
export declare function makeMoveHandle(color: number): PIXI.Graphics;
export declare function makeSwapHandle(): PIXI.Container;
export declare function makeFaceHandle(color: number, uHX: number, uHY: number, vHX: number, vHY: number): PIXI.Graphics;
