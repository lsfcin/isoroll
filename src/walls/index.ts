// Public API for the walls module — linked wall system
export type { WallConfig, WallDef, TileAnchor, DoorBehavior } from './wall-types';
export { WallManager } from './wall-manager';
export { WALL_COLORS, wallColor, WallOverlay } from './wall-overlay';
export { generateBaseWallDefs, createWallsFromDefs, deleteLinkedWalls, linkSelectedWalls, unlinkAllWalls, generateBaseWalls, extractWallDefs, applyWallDefs } from './wall-crud';
export { updateLinkedWallPositions, flipLinkedWallAnchorsX } from './wall-sync';
export { WallHistory } from './wall-history';
export { getLinkedWallIds, setLinkedWallIds, pruneLinkedWalls, getDoorBehavior, setDoorBehavior, hasLinkedDoor, isLinkedDoorOpen } from './wall-flags';
export type { TileDoc, WallDoc, WallsCollection, SceneEmbedded } from './wall-coords';
export { wallsLayer, scene, tileRect, imageRect, anchorToCanvas, defToCanvas, canvasToAnchor } from './wall-coords';
