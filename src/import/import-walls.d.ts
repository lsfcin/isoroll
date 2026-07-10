import { type TileDoc, type WallDef } from "../walls";
import type { ManifestWall } from "./manifest-types";
export declare function manifestWallsToDefs(walls: ManifestWall[], frameTile: TileDoc, cols: number, rows: number, gridSize: number): WallDef[];
