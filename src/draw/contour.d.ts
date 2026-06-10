export interface MeshLike {
    x: number;
    y: number;
    rotation: number;
    scale: {
        x: number;
        y: number;
    };
    texture?: {
        width: number;
        height: number;
    };
    anchor?: {
        x: number;
        y: number;
    };
}
export declare function drawMeshContour(g: PIXI.Graphics, mesh: MeshLike): void;
