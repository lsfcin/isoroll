// Scene manifest shapes for programmatic import — mirrors isoroll-content's scene_manifest.py output.
import type { WallDef } from "../walls";

export type ManifestFacing = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW" | "TOP";

export interface ManifestTile {
  piece: string;
  asset: string;
  facing: ManifestFacing;
  u: number;
  v: number;
  boundHeight: number;
  imageOffset: [number, number];
  pxPerVoxel: number;
  // v2 (dsl-v2-ts-twin, T7, PIN-4): tile elevation from level/z0 (Python "z": box.z0). OPTIONAL —
  // v1 manifests never set this; back-compat tiles keep baseElevation 0.
  z?: number;
  // Baked-sprite geometry (isoroll-content scene_manifest.py, 2026-07-31). `sizePx` sets the tile's
  // world size so one voxel reads as one grid unit; `originPx` is where the piece's world (0,0,0)
  // sits inside the sprite — the input per-piece alignment calibration solves against. OPTIONAL:
  // manifests baked before this date carry neither, and fall back to a gridSize square.
  sizePx?: [number, number];
  originPx?: [number, number];
  // Semantic tile identity beyond the piece name: material and, for oriented group pieces (roof,
  // stair), which compass side it faces. Resolution to a file already happened in `asset`.
  mat?: string;
  side?: string;
}

// Scene-grid-normalized wall endpoints (ax/ay/bx/by ∈ [0,1] over the full cols×rows layout) —
// see 3-arch.md Deferred #1. Superset of the module's per-tile WallDef fields (topOffset,
// bottomOffset, config) which pass through unchanged.
export type ManifestWall = Pick<WallDef, "topOffset" | "bottomOffset" | "config"> & {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  // v2 (dsl-v2-ts-twin, T7, PIN-4): wall-run axis (Python "dir": box.axis, "u"|"v") — distinct
  // from config.dir (numeric door-swing side). OPTIONAL — v1 manifests never set this.
  dir?: "u" | "v";
};

export interface SceneManifest {
  scene: string;
  view: string;
  pxPerVoxel: number;
  tiles: ManifestTile[];
  walls: ManifestWall[];
}

export interface ImportOptions {
  sceneId?: string;
  assetBase?: string;
}

export interface ImportResult {
  tileIds: string[];
  wallIds: string[];
}
