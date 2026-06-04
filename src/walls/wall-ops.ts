// Backward-compat barrel: re-exports from wall-crud, wall-sync, wall-door, and wall-core.
export * from "./wall-crud";
export * from "./wall-sync";
export * from "./wall-door";
export { getLinkedWallIds, setLinkedWallIds, pruneLinkedWalls, canvasToAnchor } from "./wall-core";
export { getDoorBehavior, setDoorBehavior, hasLinkedDoor } from "./wall-core";
