import type { TileMeshCoord } from "./coord-types.js";
import type { TransformContext, P2, P3 } from "./coord-map";
export type DebugMesh = TileMeshCoord & {
    getChildByName(name: string): PIXI.Graphics | null | undefined;
    addChild(child: PIXI.Graphics): void;
};
export type TileWithMesh = {
    mesh?: DebugMesh | null;
    document: {
        elevation?: number;
    };
};
export declare function clearDOM(): void;
export declare function drawDOMText(pt: P2, text: string, color: string): void;
export declare function getOrCreateDebugDOMLayer(): HTMLElement;
export declare function drawDOM(pt: P2, isVert: boolean, color: string): void;
export declare function renderScreen(pt: P2 | P3, isVert: boolean, colorHex: string): void;
export declare function renderViewport(pt: P2 | P3, isVert: boolean, colorHex: string): void;
export declare function renderWorld(g: PIXI.Graphics, pt: P2 | P3, isVert: boolean, colorNum: number): void;
export declare function renderGrid(g: PIXI.Graphics, pt: P2 | P3, isVert: boolean, colorNum: number, ctx: TransformContext): void;
export declare function renderIso3D(g: PIXI.Graphics, pt: P2 | P3, isVert: boolean, colorNum: number, ctx: TransformContext): void;
export declare function renderImage(mesh: DebugMesh, pt: P2 | P3, isVert: boolean, colorNum: number): void;
