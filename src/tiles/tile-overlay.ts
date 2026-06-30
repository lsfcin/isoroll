// Renders a 3D bounding box on selected tiles (VOLUME_OVERLAY) + always-on shadow (TILE_SHADOW).

import { MODULE_ID, VolumeFlags, CanvasEnv } from "../core";
import { drawBox, drawAnchorLine, drawMeshContour, shadowTexture, shadowAlpha } from "../draw";
import { LAYER_KEYS, IsoGeometry, MeshAccessor, IsoRenderer } from "../render";
import type { DrawAPI, RenderHandle } from "../render";
import { DEBUG_COORD, drawCoordDebug } from "../transform";

export class VolumeOverlay {
  private static _handles:    Map<string, RenderHandle> = new Map();
  private static shadowState: Map<string, string>       = new Map();

  // ---- TileRenderer interface ----

  static create(tile: Tile): void {
    if (tile.document.getFlag(MODULE_ID, "transformTile") === true) {
      return;
    }
    VolumeOverlay._renderShadow(tile);
  }

  static sync(_tile: Tile): void { /* shadow is doc-data driven, not mesh-tracked per-frame */ }

  static rebuild(tile: Tile): void {
    const snap = VolumeOverlay.shadowSnap(tile);
    if (VolumeOverlay.shadowState.get(tile.id) !== snap) {
      VolumeOverlay._renderShadow(tile);
    }
    if (VolumeOverlay._handles.has(tile.id)) {
      VolumeOverlay.show(tile);
    }
  }

  static onControl(tile: Tile, controlled: boolean): void {
    if (controlled) {
      VolumeOverlay.show(tile);
    } else {
      VolumeOverlay.removeBox(tile.id);
    }
  }

  static onDestroy(id: string): void { VolumeOverlay.hide(id); }

  // ---- Shadow + box helpers ----

  private static shadowSnap(tile: Tile): string {
    const d = tile.document;
    const elev = (d as unknown as { elevation?: number }).elevation ?? 0;
    const shadowEnabled = +VolumeFlags.getShadowEnabled(d, false);
    const shadowShape = VolumeFlags.getShadowShape(d, "rect");
    const shadowRadius = VolumeFlags.getShadowRadius(d);
    const shadowOpacity = VolumeFlags.getShadowOpacity(d, 0.5);
    return `${d.x},${d.y},${d.width},${d.height},${elev},${shadowEnabled},${shadowShape},${shadowRadius},${shadowOpacity}`;
  }

  private static _renderShadow(tile: Tile): void {
    const snap = VolumeOverlay.shadowSnap(tile);
    VolumeOverlay.shadowState.set(tile.id, snap);
    const d = tile.document;
    const v = IsoGeometry.tileVerts(tile);
    const shadowEnabled = VolumeFlags.getShadowEnabled(d, false);
    if (!shadowEnabled || v.elevation < 0) {
      IsoRenderer.clear(`tile-${tile.id}:shadow`);
      return;
    }
    const shadowRadius = VolumeFlags.getShadowRadius(d);
    const rx = (d.width  ?? 0) / 2 * shadowRadius;
    const ry = (d.height ?? 0) / 2 * shadowRadius;
    const shadowShape = VolumeFlags.getShadowShape(d, "rect");
    const shadowOp = VolumeFlags.getShadowOpacity(d, 0.5);
    const tex = shadowTexture(shadowShape);
    const alpha = shadowAlpha(v.elevation, shadowOp);
    IsoRenderer.render({
      key:   `tile-${tile.id}:shadow`,
      owner: { kind: "tile", id: tile.id },
      visual: {
        kind:    "sprite",
        texture: tex,
        anchor:  { x: 0.5, y: 0.5 },
        scale:   { x: rx * 2, y: ry * 2 },
        alpha,
      },
      space:     "WORLD",
      placement: { anchor: { x: v.ground.x, y: v.ground.y } },
      layer:     LAYER_KEYS.TILE_SHADOW,
    });
  }

  private static removeBox(tileId: string): void {
    const handle = VolumeOverlay._handles.get(tileId);
    handle?.remove();
    VolumeOverlay._handles.delete(tileId);
  }

  static show(tile: Tile): void {
    const handle = IsoRenderer.render({
      key:       `tile-${tile.id}:box`,
      owner:     { kind: "tile", id: tile.id },
      visual:    { kind: "lines", build: (g) => VolumeOverlay._drawInto(g, tile) },
      space:     "WORLD",
      placement: { anchor: { x: 0, y: 0 } },
      layer:     LAYER_KEYS.TILE_OVERLAY,
      z:         "top",
    });
    VolumeOverlay._handles.set(tile.id, handle);
  }

  // Full cleanup — hides both box and shadow (used by gate for disabled/transformed tiles).
  static hide(tileId: string): void {
    VolumeOverlay.removeBox(tileId);
    IsoRenderer.clear(`tile-${tileId}:shadow`);
    VolumeOverlay.shadowState.delete(tileId);
  }

  static clearAll(): void {
    IsoRenderer.clearLayer(LAYER_KEYS.TILE_OVERLAY);
    VolumeOverlay._handles.clear();
    IsoRenderer.clearLayer(LAYER_KEYS.TILE_SHADOW);
    VolumeOverlay.shadowState.clear();
  }

  private static _drawInto(g: DrawAPI, tile: Tile): void {
    const showVol = VolumeFlags.getShowVolumeManipulation(tile.document, true);
    const showImg = VolumeFlags.getShowImageManipulation(tile.document, true);
    const v = IsoGeometry.tileVerts(tile);
    if (showImg) {
      const geom = MeshAccessor.geometryOf(tile);
      const wt = CanvasEnv.worldTransform();
      drawMeshContour(g, geom, wt);
    }
    if (showVol) {
      if (v.elevation > 0) {
        drawAnchorLine(g, v);
      }
      drawBox(g, v);
      if (v.elevation < 0) {
        drawAnchorLine(g, v);
      }
    }
    if (DEBUG_COORD) {
      drawCoordDebug(g as unknown as Parameters<typeof drawCoordDebug>[0], tile, v.baseCenter);
    }
  }
}
