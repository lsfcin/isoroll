// Render helpers for TokenBackground: shadow, elevation indicator, and label layers.

import { VolumeFlags, elevToCanvas, gridDistance, getElevation, CanvasEnv } from "../core";
import { drawDash, ANCHOR_DASH, ANCHOR_GAP, shadowTexture, shadowAlpha } from "../draw";
import { LAYER_KEYS, IsoGeometry, IsoRenderer } from "../render";
import type { DrawAPI } from "../render";
import { currentProjection } from "../transform";
import { resolveElevLineColor } from "./token-background-color";

export function renderShadow(token: Token): void {
  const d = token.document;
  const shadowEnabled = VolumeFlags.getShadowEnabled(d);
  const elev = getElevation(d);
  if (shadowEnabled && elev >= 0) {
    const footprint = IsoGeometry.footprint(token);
    const tx = footprint.tx;
    const ty = footprint.ty;
    const tw = footprint.tw;
    const th = footprint.th;
    const sr = VolumeFlags.getShadowRadius(d);
    const shadowShape = VolumeFlags.getShadowShape(d);
    const shadowOpacity = VolumeFlags.getShadowOpacity(d);
    const tex = shadowTexture(shadowShape);
    const alpha = shadowAlpha(elev, shadowOpacity);
    IsoRenderer.render({
      key: `token-${token.id}:shadow`, owner: { kind: "token", id: token.id },
      visual: { kind: "sprite", texture: tex,
                anchor: { x: 0.5, y: 0.5 }, scale: { x: tw * sr, y: th * sr },
                alpha },
      space: "WORLD", placement: { anchor: { x: tx + tw / 2, y: ty + th / 2 } },
      layer: LAYER_KEYS.TOKEN_SHADOW, visibility: "sight-tracked",
    });
  }
}

function drawIndicator(g: DrawAPI, token: Token): void {
  const footprint = IsoGeometry.footprint(token);
  const tx = footprint.tx;
  const ty = footprint.ty;
  const tw = footprint.tw;
  const th = footprint.th;
  const elev = getElevation(token.document);
  const gridSize = CanvasEnv.gridSize();
  const gridDist = gridDistance();
  const elevPx = elevToCanvas(elev, gridSize, gridDist);
  const proj = currentProjection();
  const groundX = tx + tw / 2;
  const groundY = ty + th / 2;
  const baseCX = groundX + proj.heightDir.x * elevPx;
  const baseCY = groundY + proj.heightDir.y * elevPx;
  const dx = baseCX - groundX;
  const dy = baseCY - groundY;
  const len = Math.sqrt(dx * dx + dy * dy);
  const gap = 7;
  const startX = len > gap ? groundX + (dx / len) * gap : groundX;
  const startY = len > gap ? groundY + (dy / len) * gap : groundY;
  const lineColor = resolveElevLineColor(token);
  g.lineStyle(1, lineColor, 0.35);
  if (VolumeFlags.getElevLineDashed(token.document)) {
    drawDash(g, startX, startY, baseCX, baseCY, ANCHOR_DASH, ANCHOR_GAP);
  } else {
    g.moveTo(startX, startY);
    g.lineTo(baseCX, baseCY);
  }
}

export function renderIndicator(token: Token): void {
  const d = token.document;
  const elev = getElevation(d);
  const lineEnabled = VolumeFlags.getElevLineEnabled(d);
  if (elev !== 0 && lineEnabled) {
    const footprint = IsoGeometry.footprint(token);
    const tx = footprint.tx;
    const ty = footprint.ty;
    const tw = footprint.tw;
    const th = footprint.th;
    IsoRenderer.render({
      key: `token-${token.id}:indicator`, owner: { kind: "token", id: token.id },
      visual: { kind: "lines", build: (g) => drawIndicator(g, token) },
      space: "WORLD", placement: { anchor: { x: 0, y: 0 } },
      layer: LAYER_KEYS.TOKEN_INDICATORS, visibility: "sight-tracked",
      testPoint: { x: tx + tw / 2, y: ty + th / 2 },
    });
  }
}

export function renderLabel(token: Token, selected: boolean): void {
  const d = token.document;
  const elev = getElevation(d);
  if (elev !== 0) {
    const footprint = IsoGeometry.footprint(token);
    const tx = footprint.tx;
    const ty = footprint.ty;
    const tw = footprint.tw;
    const th = footprint.th;
    const gridSize = CanvasEnv.gridSize();
    const gridDist = gridDistance();
    const elevPx = elevToCanvas(elev, gridSize, gridDist);
    const proj = currentProjection();
    const lx = tx + tw / 2 + proj.heightDir.x * elevPx;
    const ly = ty + th + proj.heightDir.y * elevPx;
    const gridUnits = CanvasEnv.gridUnits();
    const elevRounded = Math.round(elev);
    const content = `${elevRounded} ${gridUnits}`;
    IsoRenderer.render({
      key: `token-${token.id}:label`, owner: { kind: "token", id: token.id },
      visual: { kind: "text", content,
                style: { fontFamily: "Signika, sans-serif", fontSize: 14,
                         fill: 0xffffff, stroke: 0x000000, strokeThickness: 3 },
                alpha: selected ? 1.0 : 0.3 },
      space: "WORLD", placement: { anchor: { x: lx, y: ly } },
      layer: LAYER_KEYS.TOKEN_LABEL, flat: true, visibility: "sight-tracked",
      testPoint: { x: tx + tw / 2, y: ty + th / 2 },
    });
  }
}
