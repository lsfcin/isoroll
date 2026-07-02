export type P2 = {
    x: number;
    y: number;
};
export type P3 = {
    x: number;
    y: number;
    z: number;
};
export type Color = number;
export type LayerKey = string;
export type CSSCursor = string;
export type VisibilityMode = "always-visible" | "sight-tracked";
export type Stroke = {
    color: Color;
    width: number;
    alpha?: number;
};
export type TextStyleSpec = {
    fontSize?: number;
    fill?: Color;
    fontFamily?: string;
    stroke?: Color;
    strokeThickness?: number;
};
export type TextureRef = string | PIXI.Texture;
export type CoordSystem = "WORLD" | "ISO3D" | "GRID" | "IMAGE" | "SCREEN" | "VIEWPORT";
export interface DrawAPI {
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    closePath(): void;
    beginFill(color: Color, alpha?: number): void;
    endFill(): void;
    lineStyle(width: number, color: Color, alpha?: number): void;
    drawCircle(x: number, y: number, radius: number): void;
    clear(): void;
}
export type ShapeSpec = {
    kind: "rect";
    w: number;
    h: number;
    fill?: Color;
    fillAlpha?: number;
    stroke?: Stroke;
} | {
    kind: "circle";
    radius: number;
    fill?: Color;
    fillAlpha?: number;
    stroke?: Stroke;
} | {
    kind: "polygon";
    points: P2[];
    fill?: Color;
    fillAlpha?: number;
    stroke?: Stroke;
} | {
    kind: "lines";
    build: (g: DrawAPI) => void;
} | {
    kind: "text";
    content: string;
    style: TextStyleSpec;
    alpha?: number;
} | {
    kind: "sprite";
    texture: TextureRef;
    anchor?: P2;
    scale?: P2;
    alpha?: number;
};
export interface Interaction {
    cursor?: CSSCursor;
    onPointerDown?: (e: PIXI.FederatedPointerEvent) => void;
    onPointerMove?: (e: PIXI.FederatedPointerEvent) => void;
    onPointerUp?: (e: PIXI.FederatedPointerEvent) => void;
    onPointerOver?: (e: PIXI.FederatedPointerEvent) => void;
    onPointerOut?: (e: PIXI.FederatedPointerEvent) => void;
}
export interface Placement {
    anchor: P2 | P3;
}
export interface RenderSpec {
    owner: {
        kind: "tile" | "token" | "background";
        id: string;
    };
    visual: ShapeSpec;
    interaction?: Interaction;
    space: CoordSystem;
    placement: Placement;
    layer?: LayerKey;
    z?: number | "top";
    visibility?: VisibilityMode;
    testPoint?: P2;
    flat?: boolean;
    hitArea?: P2[];
    key: string;
}
export interface RenderHandle {
    readonly key: string;
    show(): void;
    hide(): void;
    update(partial: Partial<RenderSpec>): void;
    remove(): void;
}
