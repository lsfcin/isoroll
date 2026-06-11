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
  const size = 128, pad = 28;
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const ctx = cv.getContext("2d")!;
  // Canvas shadowBlur gives natural soft rect edges — cached once, zero runtime cost.
  ctx.shadowColor = "black";
  ctx.shadowBlur  = pad;
  ctx.fillStyle   = "black";
  ctx.fillRect(pad, pad, size - pad * 2, size - pad * 2);
  _rectTex = PIXI.Texture.from(cv);
  return _rectTex;
}

export function drawGroundShadow(
  groundX: number, groundY: number, elevation: number,
  radius: number, opacity: number, shape: "circle" | "rect",
): PIXI.DisplayObject | null {
  if (elevation < 0) return null;
  const effectiveAlpha = Math.min(1, opacity * Math.max(0.1, 1 / (1 + elevation * 0.04)));
  const sprite = new PIXI.Sprite(shape === "rect" ? rectTexture() : circleTexture());
  sprite.anchor.set(0.5);
  sprite.position.set(groundX, groundY);
  sprite.width = sprite.height = radius * 2;
  sprite.alpha = effectiveAlpha;
  sprite.eventMode = "none";
  return sprite;
}
