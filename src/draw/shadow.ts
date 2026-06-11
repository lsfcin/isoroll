// Ground shadow — cached radial gradient texture, elevation-based scaling.
import { BLACK } from "./constants";

let _shadowTex: PIXI.Texture | null = null;
function shadowTexture(): PIXI.Texture {
  if (_shadowTex) return _shadowTex;
  const size = 128, half = size / 2;
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const ctx = cv.getContext("2d")!;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0, "rgba(0,0,0,1)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  _shadowTex = PIXI.Texture.from(cv);
  return _shadowTex;
}

export function drawGroundShadow(
  groundX: number, groundY: number, elevation: number,
  radius: number, opacity: number, shape: "circle" | "rect",
): PIXI.DisplayObject | null {
  if (elevation < 0) return null;
  const elevScale      = Math.min(2.5, 0.5 + Math.sqrt(Math.max(0, elevation)) * 0.17);
  const effectiveR     = radius;
  const effectiveAlpha = Math.min(1, opacity * Math.max(0.1, 1 / (1 + elevation * 0.04)));
  if (shape === "circle") {
    const sprite = new PIXI.Sprite(shadowTexture());
    sprite.anchor.set(0.5);
    sprite.position.set(groundX, groundY);
    sprite.width = sprite.height = effectiveR * 2;
    sprite.alpha = effectiveAlpha;
    sprite.eventMode = "none";
    return sprite;
  }
  const g = new PIXI.Graphics();
  g.lineStyle(0);
  g.beginFill(BLACK, effectiveAlpha);
  g.drawRect(groundX - effectiveR, groundY - effectiveR, effectiveR * 2, effectiveR * 2);
  g.endFill();
  g.eventMode = "none";
  return g;
}
