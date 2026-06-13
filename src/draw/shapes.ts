// Pure PIXI drawing primitives — no domain knowledge, no constants imported.

// Wraps a child in a PIXI.Container that reverses the isometric world transform,
// so children (text, sprites) appear un-distorted in screen space.
type CounterParams = { reverseRotation: number; counterFactor: number; ratio: number };
export function makeCounterWrapper(proj: CounterParams, x: number, y: number): PIXI.Container {
  const c = new PIXI.Container();
  c.rotation = proj.reverseRotation;
  c.scale.set(proj.counterFactor, proj.ratio * proj.counterFactor);
  c.x = x; c.y = y;
  c.eventMode = "none";
  return c;
}

// Disables mipmap generation on a PIXI texture — prevents GL_INVALID_OPERATION on text textures.
export function suppressMipmap(texture: unknown): void {
  const t = texture as { source?: { autoGenerateMipmaps: boolean }; baseTexture?: { mipmap: number } };
  if (t?.source)      t.source.autoGenerateMipmaps = false;
  if (t?.baseTexture) t.baseTexture.mipmap = 0;
}



export function drawDash(
  g: PIXI.Graphics, x1: number, y1: number, x2: number, y2: number,
  dashLen: number, gapLen: number,
): void {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.5) return;
  const ux = dx / len, uy = dy / len;
  let pos = 0, drawing = true;
  g.moveTo(x1, y1);
  while (pos < len) {
    const seg = Math.min(drawing ? dashLen : gapLen, len - pos);
    pos += seg;
    const ex = x1 + ux * pos, ey = y1 + uy * pos;
    if (drawing) g.lineTo(ex, ey); else g.moveTo(ex, ey);
    drawing = !drawing;
  }
}

export function drawDashedContour(
  g: PIXI.Graphics, pts: { x: number; y: number }[],
  dash: number, gap: number, dashAlt = dash, gapAlt = gap,
): void {
  g.lineStyle(1.5, 0xffffff, 0.85);
  for (let i = 0; i < pts.length; i++) {
    const d = i % 2 === 0 ? dash : dashAlt, gp = i % 2 === 0 ? gap : gapAlt;
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / len, ny = dy / len;
    let t = 0, on = true;
    while (t < len) {
      const s = Math.min(on ? d : gp, len - t);
      if (on) { g.moveTo(a.x + nx * t, a.y + ny * t); g.lineTo(a.x + nx * (t + s), a.y + ny * (t + s)); }
      t += s; on = !on;
    }
  }
}
