import { MODULE_ID } from "../volume/flags";

type WaypointContext = { position: { x: number; y: number } };
type RulerProto = { _getWaypointLabelContext?: (...a: unknown[]) => WaypointContext | undefined };

// --- debug helpers ---
let debugLayer: PIXI.Graphics | null = null;

function getDebugLayer(): PIXI.Graphics {
  if (debugLayer && debugLayer.parent) return debugLayer;
  const g = new PIXI.Graphics();
  (canvas.stage as unknown as PIXI.Container).addChild(g);
  debugLayer = g;
  return g;
}

function drawDebugRect(canvasX: number, canvasY: number): void {
  const g = getDebugLayer();
  g.lineStyle(3, 0x9900ff, 1);
  g.beginFill(0x9900ff, 0.4);
  g.drawRect(canvasX - 12, canvasY - 12, 24, 24);
  g.endFill();
}

export function clearDebugLayer(): void {
  debugLayer?.clear();
}
// --- end debug ---

function patchRulerProto(name: string, proto: RulerProto | undefined): void {
  if (!proto?._getWaypointLabelContext) {
    console.warn(`isoroll | ruler-patch: ${name} prototype not found or missing _getWaypointLabelContext`);
    return;
  }
  console.log(`isoroll | ruler-patch: patching ${name}`);
  const orig = proto._getWaypointLabelContext;
  proto._getWaypointLabelContext = function(...args: unknown[]) {
    const ctx = orig.apply(this, args);
    if (!ctx) return ctx;
    if (!canvas.scene?.getFlag(MODULE_ID, "enabled")) return ctx;
    const { x, y } = ctx.position;
    const m = canvas.app!.stage.worldTransform;
    const zoom = (canvas.stage as unknown as { scale?: { x: number } })?.scale?.x ?? 1;
    const nx = (m.a * x + m.c * y) / zoom;
    const ny = (m.b * x + m.d * y) / zoom;
    console.log(`isoroll | ${name} label pos: canvas(${x.toFixed(1)}, ${y.toFixed(1)}) → css(${nx.toFixed(1)}, ${ny.toFixed(1)})`);
    // Purple rect drawn at original canvas coords — appears at the PIXI ruler endpoint.
    // If label aligns with rect, correction is working.
    drawDebugRect(x, y);
    ctx.position = { x: nx, y: ny };
    return ctx;
  };
}

// Ruler and TokenRuler both set context.position in canvas px, used as CSS left/top
// in #hud #measurement — same displacement as TokenHUD without stage rotation.
export function registerRulerPatch(): void {
  const g = globalThis as unknown as { Ruler?: { prototype: RulerProto }; TokenRuler?: { prototype: RulerProto } };
  console.log("isoroll | ruler-patch: registering. Ruler=", !!g.Ruler, "TokenRuler=", !!g.TokenRuler);
  patchRulerProto("Ruler", g.Ruler?.prototype);
  patchRulerProto("TokenRuler", g.TokenRuler?.prototype);
}
