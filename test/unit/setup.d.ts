declare class StubRectangle {
    x: number;
    y: number;
    width: number;
    height: number;
    constructor(x?: number, y?: number, width?: number, height?: number);
}
declare class StubPoint {
    x: number;
    y: number;
    constructor(x?: number, y?: number);
    set(x: number, y?: number): void;
}
declare class StubSprite {
    texture?: unknown | undefined;
    position: StubPoint;
    scale: StubPoint;
    anchor: StubPoint;
    rotation: number;
    zIndex: number;
    visible: boolean;
    alpha: number;
    eventMode: string;
    constructor(texture?: unknown | undefined);
}
declare class StubContainer {
    children: unknown[];
    addChild(c: unknown): unknown;
}
