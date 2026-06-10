/**
 * isoroll coordinate system map — forward and inverse transforms between all spaces.
 *
 * ─── Coordinate Systems ───────────────────────────────────────────────────────
 *
 *   SCREEN   — browser window pixels (clientX / clientY from pointer events).
 *              Origin: top-left of browser window.
 *
 *   VIEWPORT — canvas element pixels.
 *              Origin: top-left of Foundry's <canvas> element.
 *              screen → viewport:  subtract canvasRect.{left,top}
 *              viewport → screen:  add canvasRect.{left,top}
 *              Get rect via: canvas.app.view.getBoundingClientRect()
 *
 *   WORLD    — Foundry world space.  tile.document.{x,y}, grid positions, etc.
 *              All LayerManager overlay layers and tile meshes live here.
 *              viewport = worldTransform × world  (affine 2×3 matrix product)
 *              worldTransform = canvas.app.stage.worldTransform
 *                (includes pan, zoom, iso stage rotation, iso skew)
 *              world = worldTransform⁻¹ × viewport
 *
 *   IMAGE    — per-tile texture coordinates, normalised [0,1]².
 *              (0,0) = texture top-left, (1,1) = texture bottom-right.
 *              world ↔ image via the tile mesh transform (see worldToImage / imageToWorld).
 *
 *   GRID     — grid-unit coordinates.
 *              world = grid × gridSize    (gridSize = canvas.grid.size, canvas pixels)
 *              grid  = world / gridSize
 *
 *   ISO3D    — our conceptual 3D isometric space.
 *              x, y: canvas-pixel footprint position (= WORLD coords at elevation 0)
 *              z:    elevation in grid-distance units (feet, meters, etc.)
 *              world.x = iso.x + heightDir.x × elevToCanvas(z, gridSize, gridDist)
 *              world.y = iso.y + heightDir.y × elevToCanvas(z, gridSize, gridDist)
 *              heightDir = {x:1, y:-1} for all built-in presets.
 *
 * ─── Layer Map ────────────────────────────────────────────────────────────────
 *
 *   canvas.app.stage            Root PIXI container — has iso rotation + skew applied.
 *                               Its worldTransform maps WORLD → VIEWPORT (+ pan/zoom).
 *
 *   canvas.background (Foundry) Scene background image layer; child of stage.
 *   canvas.tiles (Foundry)      Tile placeable layer; child of stage.
 *                               Each tile.mesh has a counter-transform so it appears
 *                               upright despite the stage iso transform.
 *   canvas.tokens (Foundry)     Token layer; child of stage.
 *   canvas.walls (Foundry)      Wall layer; child of stage.
 *   canvas.interface (Foundry)  PIXI selection/ruler layer; child of stage.
 *
 *   LayerManager layers         Direct children of canvas.stage; world space.
 *   (VOLUME_OVERLAY etc.)       Inherit the stage iso transform automatically —
 *                               draw at world coords, renders iso-projected on screen.
 *
 *   #hud  (DOM div)             HTML element overlaying the canvas.
 *                               Positioned with CSS left = wt.tx, top = wt.ty
 *                               so its origin aligns with the stage world-origin.
 *                               Foundry HUD elements use world-pixel values directly
 *                               as left/top within this div (no additional transform).
 *
 * ─── Note on tile mesh positioning ───────────────────────────────────────────
 *
 *   tile.mesh.x / .y are in WORLD space (same as tile.document.x/y etc.).
 *   applyTileCounter sets mesh.rotation = reverseRotation (typically 45°) and
 *   scale = (counterFactor, ratio×counterFactor) to undo the stage iso transform,
 *   making the sprite appear upright.  The anchor + mesh.x/y together determine
 *   which texel sits at which world coordinate.
 */
/** 2-D point. */
export type P2 = {
    x: number;
    y: number;
};
/** 3-D point in ISO3D space. */
export type P3 = {
    x: number;
    y: number;
    z: number;
};
/** Affine 2×3 matrix used by PIXI (worldTransform). */
export interface AffineMatrix {
    a: number;
    b: number;
    c: number;
    d: number;
    tx: number;
    ty: number;
}
/** Minimal tile mesh interface for coordinate transforms. */
export interface TileMeshCoord {
    x: number;
    y: number;
    rotation: number;
    scale: {
        x: number;
        y: number;
    };
    anchor?: {
        x: number;
        y: number;
    };
    texture?: {
        width: number;
        height: number;
    };
}
