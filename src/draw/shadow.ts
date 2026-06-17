// Ground shadow — cached radial gradient textures, elevation-scaled opacity.

let _circleTex: PIXI.Texture | null = null;
function circleTexture(): PIXI.Texture {
  if (_circleTex) return _circleTex;
  const size = 128, half = size / 2;
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const ctx = cv.getContext("2d")!;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0, "rgba(0,0,0,1)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  _circleTex = PIXI.Texture.from(cv);
  return _circleTex;
}

let _rectTex: PIXI.Texture | null = null;
function rectTexture(): PIXI.Texture {
  if (_rectTex) return _rectTex;
  const size = 128;
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const ctx = cv.getContext("2d")!;
  // Two perpendicular linear gradients, multiplied via destination-in.
  // Result: rectangular shape with gradient fade on all four edges.
  const h = ctx.createLinearGradient(0, 0, size, 0);
  h.addColorStop(0, "rgba(0,0,0,0)"); h.addColorStop(0.25, "rgba(0,0,0,1)");
  h.addColorStop(0.75, "rgba(0,0,0,1)"); h.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = h; ctx.fillRect(0, 0, size, size);
  const v = ctx.createLinearGradient(0, 0, 0, size);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(0.25, "rgba(0,0,0,1)");
  v.addColorStop(0.75, "rgba(0,0,0,1)"); v.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalCompositeOperation = "destination-in"; ctx.fillStyle = v; ctx.fillRect(0, 0, size, size);
  _rectTex = PIXI.Texture.from(cv);
  return _rectTex;
}

export function shadowTexture(shape: "circle" | "rect"): PIXI.Texture {
  return shape === "rect" ? rectTexture() : circleTexture();
}

export function shadowAlpha(elevation: number, opacity: number): number {
  return Math.min(1, opacity * Math.max(0.1, 1 / (1 + elevation * 0.04)));
}

export function drawGroundShadow(
  groundX: number, groundY: number, elevation: number,
  radiusX: number, radiusY: number, opacity: number, shape: "circle" | "rect",
): PIXI.DisplayObject | null {
  if (elevation < 0) return null;
  const effectiveAlpha = Math.min(1, opacity * Math.max(0.1, 1 / (1 + elevation * 0.04)));
  const sprite = new PIXI.Sprite(shape === "rect" ? rectTexture() : circleTexture());
  sprite.anchor.set(0.5);
  sprite.position.set(groundX, groundY);
  sprite.width  = radiusX * 2;
  sprite.height = radiusY * 2;
  sprite.alpha = effectiveAlpha;
  sprite.eventMode = "none";
  return sprite;
}
