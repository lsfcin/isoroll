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
}

// Scene-grid-normalized wall endpoints (ax/ay/bx/by ∈ [0,1] over the full cols×rows layout) —
// see 3-arch.md Deferred #1. Superset of the module's per-tile WallDef fields (topOffset,
// bottomOffset, config) which pass through unchanged.
export type ManifestWall = Pick<WallDef, "topOffset" | "bottomOffset" | "config"> & {
  ax: number;
  ay: number;
  bx: number;
  by: number;
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
