// T6 — public facade for the assembler. Re-exports pure plan + parse + massing, no Foundry/PIXI surface.
export * from "./types";
export { kind, load, parseText, rotateCw, validate } from "./layout-parse";
export { massing } from "./massing";
export { pieceFor, planScene } from "./assemble";
