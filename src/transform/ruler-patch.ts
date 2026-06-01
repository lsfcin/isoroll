import { MODULE_ID } from "../volume/flags";

type WaypointContext = { position: { x: number; y: number } };
type RulerProto = { _getWaypointLabelContext?: (...a: unknown[]) => WaypointContext | undefined };

function patchRulerProto(proto: RulerProto | undefined): void {
  if (!proto?._getWaypointLabelContext) return;
  const orig = proto._getWaypointLabelContext;
  proto._getWaypointLabelContext = function(...args: unknown[]) {
    const ctx = orig.apply(this, args);
    if (!ctx || !canvas.scene?.getFlag(MODULE_ID, "enabled")) return ctx;
    const { x, y } = ctx.position;
    const m = canvas.app!.stage.worldTransform;
    const zoom = (canvas.stage as unknown as { scale?: { x: number } })?.scale?.x ?? 1;
    ctx.position = { x: (m.a * x + m.c * y) / zoom, y: (m.b * x + m.d * y) / zoom };
    return ctx;
  };
}

// Ruler and TokenRuler both set context.position in canvas px, used as CSS left/top
// in #hud #measurement — same displacement as TokenHUD without stage rotation.
// TokenRuler is not a global — it lives at CONFIG.Token.rulerClass.
export function registerRulerPatch(): void {
  const g = globalThis as unknown as { Ruler?: { prototype: RulerProto } };
  type CfgToken = { rulerClass?: { prototype: RulerProto } };
  const tokenRulerCls = (CONFIG as unknown as { Token?: CfgToken })?.Token?.rulerClass;
  patchRulerProto(g.Ruler?.prototype);
  patchRulerProto(tokenRulerCls?.prototype);
}
