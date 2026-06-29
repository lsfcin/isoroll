// Tile counter-transform: refreshTile hook, flag-change trigger, grid-rescale scene update handlers.

import { MODULE_ID, VolumeFlags, gridDistance, elevToCanvas } from "../core";
import { CanvasTransform } from "./stage-transform";

import { transformCoord, P2 } from "./coord-map";

export { onPreUpdateScene, onUpdateSceneGridRescale } from "./tile-transform-rescale";

const DEBUG_ANCHOR = false;

export type MutMeshLike = {
  x: number;
  y: number;
  rotation: number;
  skew?: { x: number; y: number; set(x: number, y: number): void };
  scale: { x: number; y: number; set(x: number, y: number): void };
  anchor?: { x: number; y: number; set(x: number, y: number): void };
  texture?: { width: number; height: number };
};

export const EPS = 1e-6;

function applyTileCounter(
  mesh: MutMeshLike,
  docRotationDeg: number,
  docW: number,
  docH: number,
  docBoundH: number,
  imgScale: number,
  imgYScale: number,
  proj = CanvasTransform.effectiveProjection(),
): void {
  const { reverseRotation, ratio, counterFactor } = proj;
  const targetRot = (docRotationDeg * Math.PI) / 180 + reverseRotation;
  if (Math.abs(mesh.rotation - targetRot) > EPS) {
    mesh.rotation = targetRot;
  }
  if (mesh.skew) {
    const skewNonZero = mesh.skew.x !== 0 || mesh.skew.y !== 0;
    if (skewNonZero) {
      mesh.skew.set(0, 0);
    }
  }
  const texW    = mesh.texture?.width  || 1;
  const texH    = mesh.texture?.height || 1;
  const maxDoc  = Math.max(docW, docH, docBoundH);
  const maxTex  = Math.max(texW, texH);
  const uniform = maxDoc / maxTex * imgScale;
  const sx      = uniform * counterFactor;
  const sy      = uniform * ratio * counterFactor * imgYScale;
  const absSx   = Math.abs(mesh.scale.x);
  const diffX   = Math.abs(absSx - sx);
  const diffY   = Math.abs(mesh.scale.y - sy);
  // Use abs on scale.x so a flipped tile (scale.x < 0) still passes as "correct magnitude".
  if (diffX > EPS || diffY > EPS) {
    mesh.scale.set(sx, sy);
  }
}

// setFlag() updates don't set any Tile render flags → refreshTile never fires.
// Detect isoroll flag changes and manually trigger refreshMesh (fires refreshTile without resetting mesh.x/y).
export function onUpdateTileFlags(doc: unknown, changes: Record<string, unknown>): void {
  const flagChanges = (changes as { flags?: Record<string, unknown> }).flags;
  if (flagChanges?.[MODULE_ID]) {
    const tile = (doc as { object?: unknown }).object;
    if (DEBUG_ANCHOR) {
      console.log("[isoroll] onUpdateTileFlags: isoroll flags changed", flagChanges[MODULE_ID], "tile object:", tile ? "found" : "null");
    }
    if (tile) {
      type HasRenderFlags = { renderFlags?: { set(f: Record<string, boolean>): void } };
      const t = tile as HasRenderFlags;
      if (t.renderFlags) {
        t.renderFlags.set({ refreshMesh: true });
      }
    }
  }
}

type HasRefresh = { _refreshRotation(): void; _refreshSize(): void; _refreshPosition(): void };

function applyNativeRefresh(tile: Tile): void {
  const t = tile as unknown as HasRefresh;
  if (t._refreshRotation) {
    t._refreshRotation();
  }
  if (t._refreshSize) {
    t._refreshSize();
  }
  if (t._refreshPosition) {
    t._refreshPosition();
  }
}

function setMeshAnchor(mesh: MutMeshLike, baseCenterWorld: P2): void {
  if (mesh.anchor) {
    mesh.anchor.set(0.5, 0.5);
  }
  const anchorUV = transformCoord(baseCenterWorld, "WORLD", "IMAGE", { mesh }) as P2;
  const clamp    = (v: number) => Math.max(0, Math.min(1, v));
  const anchorX  = clamp(anchorUV.x);
  const anchorY  = clamp(anchorUV.y);
  if (mesh.anchor) {
    mesh.anchor.set(anchorX, anchorY);
  }
}

function applyMeshTransform(tile: Tile, mesh: MutMeshLike): void {
  const gridSize   = canvas.grid?.size ?? 100;
  const gridDist   = gridDistance();
  const tileDoc    = tile.document as unknown as { elevation?: number };
  const elev       = tileDoc.elevation ?? 0;
  const boundH     = VolumeFlags.getEffectiveTileHeight(tile.document) * gridSize;
  const elevPx     = elevToCanvas(elev, gridSize, gridDist);
  const proj       = CanvasTransform.effectiveProjection();
  const heightDir  = proj.heightDir;
  const imgScale   = VolumeFlags.getImageScale(tile.document);
  const imgYScale  = VolumeFlags.getImageYScale(tile.document);
  const imgFlipped = VolumeFlags.getTileFlipped(tile.document);
  applyTileCounter(
    mesh,
    tile.document.rotation ?? 0,
    tile.document.width ?? 0,
    tile.document.height ?? 0,
    boundH, imgScale, imgYScale,
  );
  // applyTileCounter sets scale.x > 0; negate only if still positive after that.
  if (imgFlipped && mesh.scale.x > 0) {
    mesh.scale.x = -mesh.scale.x;
  }

  // We want the geometric center of the texture (0.5, 0.5) to map to the 3D box center.
  const docX            = tile.document.x ?? 0;
  const docY            = tile.document.y ?? 0;
  const baseCenterWorld: P2 = {
    x: docX + heightDir.x * elevPx,
    y: docY + heightDir.y * elevPx,
  };
  mesh.x = baseCenterWorld.x + heightDir.x * (boundH / 2);
  mesh.y = baseCenterWorld.y + heightDir.y * (boundH / 2);
  setMeshAnchor(mesh, baseCenterWorld);

  const imgOffWorld = VolumeFlags.getImageOffset(tile.document);
  mesh.x = baseCenterWorld.x + imgOffWorld.x * gridSize;
  mesh.y = baseCenterWorld.y + imgOffWorld.y * gridSize;
}

export function onRefreshTile(tile: Tile, _flags?: Record<string, boolean>): void {
  if (CanvasTransform.effectiveEnabled()) {
    if (tile.document.getFlag(MODULE_ID, "transformTile") === true) {
      // Reset mesh to native Foundry state: undo any counter-transform (rotation, scale, position
      // offset) that may have been left by a prior transformTile=false refresh.
      applyNativeRefresh(tile);
    } else {
      const mesh = tile.mesh as unknown as MutMeshLike | null | undefined;
      if (mesh) {
        applyMeshTransform(tile, mesh);
      }
    }
  }
}
