// iso-renderer-paint.ts — PIXI paint helpers for IsoRenderer.
import type { Color, DrawAPI, ShapeSpec } from './iso-renderer-types';

class PixiDrawAPI implements DrawAPI {
  constructor(private g: PIXI.Graphics) {}
  moveTo(x: number, y: number): void { this.g.moveTo(x, y); }
  lineTo(x: number, y: number): void { this.g.lineTo(x, y); }
  closePath(): void { this.g.closePath(); }
  beginFill(c: Color, a?: number): void { this.g.beginFill(c, a); }
  endFill(): void { this.g.endFill(); }
  lineStyle(w: number, c: Color, a?: number): void { this.g.lineStyle(w, c, a); }
  drawCircle(x: number, y: number, r: number): void { this.g.drawCircle(x, y, r); }
  clear(): void { this.g.clear(); }
}

function _paintLines(c: PIXI.Container, v: ShapeSpec & { kind: "lines" }): void {
  const g = new PIXI.Graphics();
  g.eventMode = "none";
  const api = new PixiDrawAPI(g);
  v.build(api);
  c.addChild(g);
}

function _paintSprite(c: PIXI.Container, v: ShapeSpec & { kind: "sprite" }): void {
  const tex = typeof v.texture === "string" ? PIXI.Texture.from(v.texture) : v.texture as PIXI.Texture;
  const s = new PIXI.Sprite(tex);
  s.eventMode = "none";
  if (v.anchor) {
    s.anchor.set(v.anchor.x, v.anchor.y);
  }
  if (v.scale) {
    s.width = v.scale.x;
    s.height = v.scale.y;
  }
  if (v.alpha !== undefined) {
    s.alpha = v.alpha;
  }
  c.addChild(s);
}

function _paintText(c: PIXI.Container, v: ShapeSpec & { kind: "text" }): void {
  const style = new PIXI.TextStyle({
    fontFamily: v.style.fontFamily,
    fontSize: v.style.fontSize,
    fill: v.style.fill,
    stroke: v.style.stroke,
    strokeThickness: v.style.strokeThickness,
    lineJoin: "round",
  });
  const t = new PIXI.Text(v.content, style);
  t.anchor.set(0.5, 0.5);
  t.eventMode = "none";
  if (v.alpha !== undefined) {
    t.alpha = v.alpha;
  }
  const tx = t.texture as { source?: { autoGenerateMipmaps: boolean }; baseTexture?: { mipmap: number } };
  if (tx?.source) {
    tx.source.autoGenerateMipmaps = false;
  }
  if (tx?.baseTexture) {
    tx.baseTexture.mipmap = 0;
  }
  c.addChild(t);
}

function _paintShape(c: PIXI.Container, v: ShapeSpec & { kind: "circle" | "rect" | "polygon" }): void {
  const g = new PIXI.Graphics();
  g.eventMode = "none";
  if (v.stroke) {
    g.lineStyle(v.stroke.width, v.stroke.color, v.stroke.alpha ?? 1);
  } else {
    g.lineStyle(0);
  }
  if (v.fill !== undefined) {
    g.beginFill(v.fill, v.fillAlpha ?? 1);
  }
  if (v.kind === "circle") {
    g.drawCircle(0, 0, v.radius);
  } else if (v.kind === "rect") {
    g.drawRect(-v.w / 2, -v.h / 2, v.w, v.h);
  } else {
    const pts = v.points.flatMap(p => [p.x, p.y]);
    g.drawPolygon(pts);
  }
  if (v.fill !== undefined) {
    g.endFill();
  }
  c.addChild(g);
}

export function paintSpec(c: PIXI.Container, v: ShapeSpec): void {
  if (v.kind === "lines") {
    _paintLines(c, v);
  } else if (v.kind === "sprite") {
    _paintSprite(c, v);
  } else if (v.kind === "text") {
    _paintText(c, v);
  } else {
    _paintShape(c, v);
  }
}
