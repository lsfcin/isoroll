// T6 — public facade for the assembler. Re-exports pure plan + parse + massing, no Foundry/PIXI surface.
export * from "./types";
export { kind, parseText, rotateCw, validate } from "./layout-parse";
// load() (Node-only, "node:fs") intentionally NOT re-exported here: this barrel is reached by
// browser bundles (module.ts -> spike-floor -> "../assemble"), and any static re-export of a
// node:fs-importing module breaks Vite's browser build at bind time regardless of usage.
// Import load() directly from "./load" if a Node-only consumer (CLI, script) ever needs it.
export { massing } from "./massing";
export { pieceFor, planScene } from "./assemble";
