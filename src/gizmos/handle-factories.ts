// Handle utilities — rotate-blocker factory only.
import { canvasZoom } from "../core";

// Locates Foundry's rotation handle on the tile, builds an invisible event-absorbing circle on top.
// Returns null when the handle isn't found (e.g. tile not yet selected).
export function createRotateBlocker(tile: Tile, layer: PIXI.Container): PIXI.Graphics | null {
  type H = {
    children?: H[];
    getGlobalPosition?: () => { x: number; y: number };
    getBounds?: () => { x: number; y: number; width: number; height: number };
  };
  const handle = (tile as unknown as { controls?: H }).controls?.children?.[1]?.children?.[0] as H | undefined;
  if (!handle?.getGlobalPosition) return null;
  const gp  = handle.getGlobalPosition();
  const lp  = layer.toLocal(gp);
  const tw  = tile.document.width ?? 0;
  const bounds = handle.getBounds?.();
  const zoom   = canvasZoom();
  const r      = bounds ? Math.max(bounds.width, bounds.height) * 0.5 * 1.03 / zoom : 20;
  const g = new PIXI.Graphics();
  g.lineStyle(0);
  g.beginFill(0x000000, 0.001);
  g.drawCircle(0, 0, r);
  g.endFill();
  g.x = lp.x + tw / 2;
  g.y = lp.y;
  g.eventMode = "static";
  g.cursor    = "default";
  return g;
}
