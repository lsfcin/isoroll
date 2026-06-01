import { getProjection } from "./constants";
import { MODULE_ID, VolumeFlags } from "../volume/flags";

type MeshLike = {
  x: number;
  y: number;
  rotation: number;
  skew?: { x: number; y: number; set(x: number, y: number): void };
  scale: { x: number; y: number; set(x: number, y: number): void };
  anchor?: { x: number; y: number; set(x: number, y: number): void };
  texture?: { width: number; height: number };
};

const EPS = 1e-6;

export class ObjectTransform {
  private static readonly tokenBase = new WeakMap<object, { x: number; y: number }>();
  private static pendingGridRescale: { sceneId: string; ratio: number } | null = null;

  private static applyTileCounter(
    mesh: MeshLike,
    docRotationDeg: number,
    docW: number,
    docH: number,
    docBoundH: number,
    imgScale: number,
  ): void {
    const proj = getProjection(canvas.scene);
    const { reverseRotation, ratio, counterFactor } = proj;
    const targetRot = (docRotationDeg * Math.PI) / 180 + reverseRotation;
    if (Math.abs(mesh.rotation - targetRot) > EPS) mesh.rotation = targetRot;
    if (mesh.skew && (mesh.skew.x !== 0 || mesh.skew.y !== 0)) mesh.skew.set(0, 0);
    const texW = mesh.texture?.width || 1;
    const texH = mesh.texture?.height || 1;
    const uniform = Math.max(docW, docH, docBoundH) / Math.max(texW, texH) * imgScale;
    const sx = uniform * counterFactor, sy = uniform * ratio * counterFactor;
    // Use abs on scale.x so a flipped tile (scale.x < 0) still passes as "correct magnitude".
    if (Math.abs(Math.abs(mesh.scale.x) - sx) > EPS || Math.abs(mesh.scale.y - sy) > EPS) {
      mesh.scale.set(sx, sy);
    }
  }

  static activate(): void {
    Hooks.on("refreshToken",      ObjectTransform.onRefreshToken);
    Hooks.on("refreshTile",       ObjectTransform.onRefreshTile);
    Hooks.on("renderTokenHUD",    ObjectTransform.onRenderTokenHUD);
    Hooks.on("renderTileHUD",     ObjectTransform.onRenderTileHUD);
    Hooks.on("preUpdateScene",    ObjectTransform.onPreUpdateScene);
    Hooks.on("updateScene",       ObjectTransform.onUpdateSceneGridRescale);
  }

  private static isSceneEnabled(): boolean {
    return canvas.scene?.getFlag(MODULE_ID, "enabled") === true;
  }

  private static onRefreshToken(token: Token, flags?: Record<string, boolean>): void {
    if (!ObjectTransform.isSceneEnabled()) return;
    if (token.document.getFlag(MODULE_ID, "transformToken") === true) return;
    const mesh = token.mesh as unknown as MeshLike | null | undefined;
    if (!mesh) return;
    const gs     = canvas.grid?.size ?? 100;
    const proj   = getProjection(canvas.scene);
    const { reverseRotation, ratio, counterFactor, heightDir: { x: hdx, y: hdy } } = proj;
    const docW   = (token.document.width  ?? 1) * gs;
    const docH   = (token.document.height ?? 1) * gs;
    const imgScl = VolumeFlags.getImageScale(token.document);

    // Re-apply counter-transform — _refreshMesh() resets scale/anchor on animation frames.
    // Guards avoid setting PIXI dirty when the value is already correct, breaking any
    // feedback loop where setting a property re-triggers refreshToken.
    if (Math.abs(mesh.rotation - reverseRotation) > EPS) mesh.rotation = reverseRotation;
    if (mesh.skew && (mesh.skew.x !== 0 || mesh.skew.y !== 0)) mesh.skew.set(0, 0);
    if (mesh.anchor && (Math.abs(mesh.anchor.x - 0.5) > EPS || Math.abs(mesh.anchor.y - 0.5) > EPS)) {
      mesh.anchor.set(0.5, 0.5);
    }
    const texW = mesh.texture?.width || 1, texH = mesh.texture?.height || 1;
    const uniform = Math.max(docW, docH) / Math.max(texW, texH) * imgScl;
    const targetSX = uniform * counterFactor, targetSY = uniform * ratio * counterFactor;
    if (Math.abs(mesh.scale.x - targetSX) > EPS || Math.abs(mesh.scale.y - targetSY) > EPS) {
      mesh.scale.set(targetSX, targetSY);
    }

    // Capture natural base when _refreshPosition() ran (Foundry reset mesh.x to center).
    // Do NOT capture on refreshMesh-only frames — mesh.x already has our offset at that point.
    // On elevation/flag changes (no refreshPosition), reuse cached base with updated E.
    if (!flags || flags["refreshPosition"]) {
      ObjectTransform.tokenBase.set(token, { x: mesh.x, y: mesh.y });
    }
    const base   = ObjectTransform.tokenBase.get(token) ?? { x: mesh.x, y: mesh.y };
    const gd     = (canvas.scene as unknown as { grid?: { distance?: number } })?.grid?.distance ?? 1;
    const elev   = (token.document as unknown as { elevation?: number }).elevation ?? 0;
    const E      = elev * gs / gd;
    const imgOff = VolumeFlags.getImageOffset(token.document);
    mesh.x = base.x + hdx * E + imgOff.x * gs;
    mesh.y = base.y + hdy * E + imgOff.y * gs;
  }

  // Reposition the TokenHUD to track the token under the isometric stage transform.
  private static onRenderTokenHUD(hud: { object: unknown }, html: JQuery | HTMLElement): void {
    if (!ObjectTransform.isSceneEnabled()) return;
    const token = hud.object as Token;
    if (token.document.getFlag(MODULE_ID, "transformToken") === true) return;
    requestAnimationFrame(() => {
      const center = (token.center ?? { x: token.x, y: token.y }) as { x: number; y: number };
      const m = canvas.app?.stage?.worldTransform;
      const zoom = (canvas.stage as unknown as { scale?: { x: number } })?.scale?.x ?? 1;
      if (!m) return;
      const L = (m.a * center.x + m.c * center.y) / zoom;
      const T = (m.b * center.x + m.d * center.y) / zoom;
      const $html = html instanceof jQuery ? html : $(html as unknown as HTMLElement);
      $html.css({ left: `${L}px`, top: `${T}px`, transform: "translate(-50%, -50%)" });
    });
  }

  private static applyTileHUDPosition(tile: Tile): void {
    const hud = (canvas.hud as unknown as { tile?: { object: unknown; element?: HTMLElement } } | null)?.tile;
    if (!hud || hud.object !== tile) return;
    const el = hud.element;
    if (!el) return;
    const cx = tile.document.x ?? 0, cy = tile.document.y ?? 0;
    const m = canvas.app?.stage?.worldTransform;
    const zoom = (canvas.stage as unknown as { scale?: { x: number } })?.scale?.x ?? 1;
    if (!m) return;
    const L = (m.a * cx + m.c * cy) / zoom;
    const T = (m.b * cx + m.d * cy) / zoom;
    $(el).css({ left: `${L}px`, top: `${T}px`, transform: "translate(-50%, -50%)" });
  }

  private static onRenderTileHUD(hud: { object: unknown }, html: JQuery | HTMLElement): void {
    if (!ObjectTransform.isSceneEnabled()) return;
    const tile = hud.object as Tile;
    if (tile.document.getFlag(MODULE_ID, "transformTile") === true) return;
    requestAnimationFrame(() => ObjectTransform.applyTileHUDPosition(tile));
  }

  private static onPreUpdateScene(
    scene: { id: string; grid: unknown },
    changes: { grid?: { size?: number } },
  ): void {
    if (!changes.grid?.size) return;
    const oldGs = (scene.grid as { size: number }).size;
    const newGs = changes.grid.size;
    if (oldGs <= 0 || oldGs === newGs) return;
    ObjectTransform.pendingGridRescale = { sceneId: (scene as { id: string }).id, ratio: newGs / oldGs };
  }

  private static onUpdateSceneGridRescale(scene: { id: string }): void {
    const pending = ObjectTransform.pendingGridRescale;
    ObjectTransform.pendingGridRescale = null;
    if (!pending || pending.sceneId !== scene.id) return;
    if (scene.id !== canvas.scene?.id) return;
    if (!game.user?.isGM) return;
    const { ratio } = pending;
    const tiles = (canvas.tiles?.placeables as Tile[] | undefined) ?? [];
    const updates = tiles
      .filter(t => VolumeFlags.isForegroundTile(t.document))
      .map(t => ({
        _id: t.id,
        x:      (t.document.x      ?? 0) * ratio,
        y:      (t.document.y      ?? 0) * ratio,
        width:  (t.document.width  ?? 0) * ratio,
        height: (t.document.height ?? 0) * ratio,
      }));
    if (updates.length === 0) return;
    void canvas.scene!.updateEmbeddedDocuments("Tile", updates);
  }

  private static onRefreshTile(tile: Tile, flags?: Record<string, boolean>): void {
    if (!ObjectTransform.isSceneEnabled()) return;
    if (tile.document.getFlag(MODULE_ID, "transformTile") === true) return;
    const mesh = tile.mesh as unknown as MeshLike | null | undefined;
    if (!mesh) return;
    const gs      = canvas.grid?.size ?? 100;
    const gd      = (canvas.scene as unknown as { grid?: { distance?: number } })?.grid?.distance ?? 1;
    const elev    = (tile.document as unknown as { elevation?: number }).elevation ?? 0;
    const boundH  = VolumeFlags.getTileHeight(tile.document) * gs;
    const E       = elev * gs / gd;
    const proj    = getProjection(canvas.scene);
    const { x: hdx, y: hdy } = proj.heightDir;
    const imgScale   = VolumeFlags.getImageScale(tile.document);
    const imgFlipped = VolumeFlags.getTileFlipped(tile.document);
    ObjectTransform.applyTileCounter(
      mesh,
      tile.document.rotation ?? 0,
      tile.document.width ?? 0,
      tile.document.height ?? 0,
      boundH,
      imgScale,
    );
    // applyTileCounter sets scale.x > 0; negate only if still positive after that.
    if (imgFlipped && mesh.scale.x > 0) mesh.scale.x = -mesh.scale.x;
    const imgOff = VolumeFlags.getImageOffset(tile.document);
    mesh.x = (tile.document.x ?? 0) + hdx * E + imgOff.x * gs;
    mesh.y = (tile.document.y ?? 0) + hdy * E + imgOff.y * gs;
    // Foundry calls _updatePosition() on tile changes (e.g. swap) without re-firing renderTileHUD.
    // Re-correct the HUD position each time the tile refreshes.
    requestAnimationFrame(() => ObjectTransform.applyTileHUDPosition(tile));
  }
}
