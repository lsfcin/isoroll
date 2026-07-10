// Pure structural validator for scene manifests (C3) — mirrors isoroll-content's
// src/cli/wall_schema.py::_validate_walls plus tile-field checks (3-arch.md T1).
import type { SceneManifest, ManifestTile, ManifestWall, ManifestFacing } from "./manifest-types";

const CONFIG_KEYS = new Set(["move", "sense", "sound", "light", "door", "dir"]);
const FACINGS = new Set<ManifestFacing>(["N", "NE", "E", "SE", "S", "SW", "W", "NW", "TOP"]);

function inUnit(n: unknown): boolean {
  return typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1;
}

function validateWall(w: ManifestWall, i: number): string[] {
  const errs: string[] = [];
  for (const coord of ["ax", "ay", "bx", "by"] as const) {
    if (!inUnit((w as Record<string, unknown>)[coord])) {
      errs.push(`wall[${i}].${coord} must be a number in [0,1]`);
    }
  }
  for (const off of ["topOffset", "bottomOffset"] as const) {
    if (typeof (w as Record<string, unknown>)[off] !== "number") {
      errs.push(`wall[${i}].${off} must be a number`);
    }
  }
  const config = (w as Record<string, unknown>).config;
  if (config === null || typeof config !== "object") {
    errs.push(`wall[${i}].config must be an object`);
  } else {
    for (const [key, value] of Object.entries(config as Record<string, unknown>)) {
      if (!CONFIG_KEYS.has(key)) {
        errs.push(`wall[${i}].config has unknown key "${key}"`);
      } else if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > 2) {
        errs.push(`wall[${i}].config.${key} must be an integer in [0,2]`);
      }
    }
  }
  return errs;
}

function validateTile(t: ManifestTile, i: number): string[] {
  const errs: string[] = [];
  for (const field of [
    "piece",
    "asset",
    "facing",
    "u",
    "v",
    "boundHeight",
    "imageOffset",
    "pxPerVoxel",
  ] as const) {
    if ((t as Record<string, unknown>)[field] === undefined) {
      errs.push(`tile[${i}].${field} is required`);
    }
  }
  if (t.facing !== undefined && !FACINGS.has(t.facing)) {
    errs.push(`tile[${i}].facing "${t.facing}" is not a known facing`);
  }
  for (const coord of ["u", "v"] as const) {
    const v = t[coord];
    if (v !== undefined && (!Number.isInteger(v) || v < 0)) {
      errs.push(`tile[${i}].${coord} must be a non-negative integer`);
    }
  }
  if (t.boundHeight !== undefined && (typeof t.boundHeight !== "number" || t.boundHeight < 0)) {
    errs.push(`tile[${i}].boundHeight must be a non-negative number`);
  }
  if (t.imageOffset !== undefined) {
    const isArray = Array.isArray(t.imageOffset);
    const isPair = isArray && t.imageOffset.length === 2;
    const inRange = isPair && t.imageOffset.every(inUnit);
    if (!inRange) {
      errs.push(`tile[${i}].imageOffset must be [x,y] with x,y in [0,1]`);
    }
  }
  return errs;
}

export function validateManifest(m: SceneManifest): string[] {
  const errs: string[] = [];
  (m.walls ?? []).forEach((w, i) => errs.push(...validateWall(w, i)));
  (m.tiles ?? []).forEach((t, i) => errs.push(...validateTile(t, i)));
  return errs;
}
