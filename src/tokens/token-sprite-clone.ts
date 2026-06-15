// Always-visible sprite clone positioned to the right of each token.
// Uses sync-every-frame pattern (mirrors IsoSpriteLayer) so scale/position are always correct.
// DIAGNOSTIC: prototype for fog-free IsoSpriteLayer clone system — remove when Phase 4 is complete.

import { MODULE_ID, VolumeFlags, isTransformedToken } from "../core";
import { tokenFootprint } from "../draw";
import { LayerManager, LAYER_KEYS, destroyMapped } from "../render";

type MeshT = {
  x: number; y: number;
  anchor?: { x: number; y: number };
  scale?: { x: number; y: number };
  rotation?: number;
  skew?: { x: number; y: number };
  texture?: { width: number; height: number };
};

function getMesh(token: Token): MeshT | undefined {
  const m = (token as unknown as { mesh?: MeshT }).mesh;
  return m?.texture ? m : undefined;
}

export class TokenSpriteClone {
  private static clones: Map<string, PIXI.Sprite> = new Map();

  static activate(): void {
    Hooks.on("canvasReady",  TokenSpriteClone._onCanvasReady);
    Hooks.on("updateScene",  TokenSpriteClone._onUpdateScene);
    Hooks.on("drawToken",    TokenSpriteClone._onDrawToken);
    Hooks.on("refreshToken", TokenSpriteClone._onRefreshToken);
    Hooks.on("destroyToken", (t: Token) => TokenSpriteClone.hide(t.id));
  }

  private static _onCanvasReady(): void {
    TokenSpriteClone.clearAll();
    if (!VolumeFlags.isSceneEnabled()) return;
    for (const token of (canvas.tokens?.placeables ?? []) as Token[]) {
      if (!isTransformedToken(token)) TokenSpriteClone.create(token);
    }
  }

  private static _onUpdateScene(scene: Scene): void {
    if (scene.id !== canvas.scene?.id) return;
    TokenSpriteClone.clearAll();
  }

  private static _onDrawToken(token: Token): void {
    if (!VolumeFlags.isSceneEnabled() || isTransformedToken(token)) return;
    if (!TokenSpriteClone.clones.has(token.id)) TokenSpriteClone.create(token);
  }

  // No flags skip, no state key — sync every call exactly like IsoSpriteLayer.
  private static _onRefreshToken(token: Token): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    if (isTransformedToken(token)) { TokenSpriteClone.hide(token.id); return; }
    const sprite = TokenSpriteClone.clones.get(token.id);
    if (!sprite) return;
    TokenSpriteClone.sync(sprite, token);
  }

  private static create(token: Token): void {
    const tex    = PIXI.Texture.from(`modules/${MODULE_ID}/assets/chars/rogue/rogue_idle_SE.png`);
    const sprite = new PIXI.Sprite(tex);
    sprite.eventMode = "none";
    // Initial position — may be wrong if mesh not yet initialized; corrected by next refreshToken.
    TokenSpriteClone.sync(sprite, token);
    LayerManager.ensureLayer(LAYER_KEYS.TOKEN_SPRITE_CLONE).addChild(sprite);
    TokenSpriteClone.clones.set(token.id, sprite);
    LayerManager.bringToTop(LAYER_KEYS.TOKEN_SPRITE_CLONE);
  }

  private static sync(sprite: PIXI.Sprite, token: Token): void {
    const mesh = getMesh(token);
    if (!mesh) return;
    const { tw } = tokenFootprint(token);
    // Position: right side — same canvas-space as IsoSpriteLayer uses mesh.x/y directly.
    sprite.position.set(mesh.x + tw, mesh.y);
    if (mesh.anchor) sprite.anchor.set(mesh.anchor.x, mesh.anchor.y);
    if (mesh.skew)   sprite.skew.set(mesh.skew.x, mesh.skew.y);
    if (mesh.scale)  sprite.scale.set(mesh.scale.x, mesh.scale.y);
    sprite.rotation = mesh.rotation ?? 0;
  }

  static hide(tokenId: string): void {
    const s = TokenSpriteClone.clones.get(tokenId);
    if (!s) return;
    s.parent?.removeChild(s);
    s.destroy();
    TokenSpriteClone.clones.delete(tokenId);
  }

  static clearAll(): void {
    for (const id of Array.from(TokenSpriteClone.clones.keys())) TokenSpriteClone.hide(id);
    LayerManager.clearLayer(LAYER_KEYS.TOKEN_SPRITE_CLONE);
  }
}
