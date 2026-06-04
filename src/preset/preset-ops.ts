// Shared type shims and helpers used across preset-apply, preset-upsert, preset-diff.
import { MODULE_ID } from "../flags";

// Typed shims
export type TextureDoc = { texture?: { src?: string } };
type FlagDoc     = { getFlag(m: string, k: string): unknown; id?: string | null };
type UpdateDoc   = { update(data: object, options?: object): Promise<unknown> };
type TileDocP    = { width?: number; height?: number; updateSource?(data: object): void };
export type SceneDoc = {
  background?: { src?: string; scaleX?: number; offsetX?: number; offsetY?: number };
  grid?: { size?: number };
  update(data: object, options?: object): Promise<unknown>;
  getFlag(m: string, k: string): unknown; id?: string | null;
};

export const asTD  = (d: unknown) => d as unknown as TextureDoc;
export const asUD  = (d: unknown) => d as unknown as UpdateDoc;
export const toScene  = (d: unknown) => d as unknown as SceneDoc;
export const asFD  = (d: unknown) => d as unknown as FlagDoc;
export const asTDp = (d: unknown) => d as unknown as TileDocP;

export const getSrc  = (d: unknown) => asTD(d).texture?.src ?? null;
export const docId   = (d: unknown) => asFD(d).id ?? getSrc(d) ?? "";
export const isPresetEnabled = (d: unknown) => asFD(d).getFlag(MODULE_ID, "presetEnabled") !== false;
export const gridSize = () => (canvas as unknown as { grid?: { size?: number } }).grid?.size ?? 100;

