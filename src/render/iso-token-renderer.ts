// iso-token-renderer.ts — IsoTokenRenderer: depth-sorted token clone sprites for the iso layer.
import { MODULE_ID, VolumeFlags, CanvasEnv } from "../core";
import { LayerManager, LAYER_KEYS } from "./layer-manager";
import { PlaceableDoc, docAlpha, applyDocState, applyTokenFog, getViewers } from "./fog-helpers";
import type { TokenRenderer } from "./token-renderer";
import { depthZIndex, TOKEN_BAND } from "./iso-tile-depth";

export type Mesh = PIXI.DisplayObject & {
  texture?: PIXI.Texture;
  anchor?: PIXI.ObservablePoint;
  skew?: PIXI.ObservablePoint;
  scale?: PIXI.ObservablePoint;
  alpha?: number;
  rotation?: number;
};
type Center = { x: number; y: number };

export function getMesh(obj: unknown): Mesh | undefined {
  let result: Mesh | undefined;
  if (obj) {
    const m = (obj as { mesh?: Mesh }).mesh;
    result = m?.texture ? m : undefined;
  }
  return result;
}

export function cloneSprite(mesh: Mesh): PIXI.Sprite | null {
  let result: PIXI.Sprite | null = null;
  if (mesh.texture) {
    const s = new PIXI.Sprite(mesh.texture);
    s.eventMode = "passive";
    syncSprite(s, mesh);
    result = s;
  }
  return result;
}

export function syncSprite(sprite: PIXI.Sprite, mesh: Mesh): void {
  sprite.texture = mesh.texture ?? PIXI.Texture.EMPTY;
  const spritePos = sprite.position;
  spritePos.set(mesh.x, mesh.y);
  if (mesh.anchor) {
    sprite.anchor.set(mesh.anchor.x, mesh.anchor.y);
  }
  if (mesh.skew) {
    sprite.skew.set(mesh.skew.x, mesh.skew.y);
  }
  if (mesh.scale) {
    sprite.scale.set(mesh.scale.x, mesh.scale.y);
  }
  sprite.rotation = mesh.rotation ?? 0;
}

function tokenCenter(t: Token): Center {
  return (t as unknown as { center?: Center }).center ?? { x: t.x, y: t.y };
}

export const tokenClones = new Map<string, PIXI.Sprite>();
function needsTokenClone(t: Token): boolean {
  return t.document.getFlag(MODULE_ID, "transformToken") !== true;
}
const getToken = (id: string) => CanvasEnv.getToken(id);

function _updateTokenZIndex(token: Token): void {
  const clone = tokenClones.get(token.id);
  if (!clone) {
    return;
  }
  const gs   = CanvasEnv.gridSize();
  const elev = (token.document.elevation ?? 0) / gs;
  // Depth = row - col (y/gs - x/gs): NE-camera viewpoint where SW face is closest.
  // Replace with view-dependent formula when implementing the 8+1 multiview strategy.
  // TOKEN_BAND places token strictly between adjacent tile slice depths — eliminates insertion-order ties.
  clone.zIndex = depthZIndex(token.y / gs, token.x / gs, elev, TOKEN_BAND);
}

function _createClone(mesh: Mesh | undefined, doc: PlaceableDoc, id: string): void {
  const old = tokenClones.get(id);
  if (old) {
    old.parent?.removeChild(old);
    old.destroy();
    tokenClones.delete(id);
  }
  if (mesh?.texture) {
    const clone = cloneSprite(mesh);
    if (clone) {
      applyDocState(clone, doc);
      mesh.alpha = 0;
      const layer = LayerManager.ensureLayer(LAYER_KEYS.ISO_SPRITES);
      layer.addChild(clone);
      tokenClones.set(id, clone);
    }
  }
}

function _removeClone(id: string, mesh?: Mesh, doc?: PlaceableDoc): void {
  const clone = tokenClones.get(id);
  if (!clone) {
    return;
  }
  clone.parent?.removeChild(clone);
  clone.destroy();
  tokenClones.delete(id);
  if (mesh && doc) {
    mesh.alpha = docAlpha(doc);
  }
}

export const IsoTokenRenderer: TokenRenderer = {
  handlesPreview: true,
  create(token: Token): void {
    if (!needsTokenClone(token)) {
      return;
    }
    const doc = token.document as unknown as PlaceableDoc;
    const mesh = getMesh(token);
    _createClone(mesh, doc, token.id);
    _updateTokenZIndex(token);
  },
  sync(token: Token): void {
    const clone = tokenClones.get(token.id);
    const mesh  = clone ? getMesh(token) : undefined;
    if (clone && mesh) {
      syncSprite(clone, mesh);
      mesh.alpha = 0;
      _updateTokenZIndex(token);
      const doc = token.document as unknown as PlaceableDoc;
      clone.alpha = docAlpha(doc);
      if (doc.hidden) {
        clone.visible = false;
      }
      // visible preserved — fog state owned by onSightRefresh
    }
  },
  rebuild(token: Token): void {
    if (!needsTokenClone(token)) {
      IsoTokenRenderer.hide(token.id);
    } else if (!tokenClones.has(token.id)) {
      IsoTokenRenderer.create(token);
    }
  },
  onControl(_token: Token, _controlled: boolean): void { /* ISO has no selection behavior */ },
  onDestroy(id: string): void { IsoTokenRenderer.hide(id); },
  onSightRefresh(): void {
    if (!VolumeFlags.isSceneEnabled()) {
      return;
    }
    const viewers = getViewers();
    const viewerList = viewers.map(v => v.id);
    const viewerIds = new Set(viewerList);
    for (const t of CanvasEnv.tokens()) {
      const clone = tokenClones.get(t.id);
      if (!clone) {
        continue;
      }
      const doc = t.document as unknown as PlaceableDoc;
      // Viewer tokens always see themselves — never hide the token the player controls.
      if (viewerIds.has(t.id)) {
        applyDocState(clone, doc);
        continue;
      }
      const center = tokenCenter(t);
      applyTokenFog(clone, doc, center, viewers);
    }
  },
  hide(id: string): void {
    const token = getToken(id);
    const mesh = getMesh(token);
    const doc = token?.document as unknown as PlaceableDoc | undefined;
    _removeClone(id, mesh, doc);
  },
  clearAll(): void {
    for (const [, c] of tokenClones) {
      c.parent?.removeChild(c);
      c.destroy();
    }
    tokenClones.clear();
  },
};
