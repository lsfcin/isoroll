// TokenHUD repositioning under isometric stage transform.
import { MODULE_ID } from "../flags";

export class HudPatches {
  static activate(): void {
    Hooks.on("renderTokenHUD", HudPatches.onRenderTokenHUD);
  }

  // Reposition the TokenHUD to track the token under the isometric stage transform.
  private static onRenderTokenHUD(hud: { object: unknown }, html: JQuery | HTMLElement): void {
    if (canvas.scene?.getFlag(MODULE_ID, "enabled") !== true) return;
    const token = hud.object as Token;
    if (token.document.getFlag(MODULE_ID, "transformToken") === true) return;
    requestAnimationFrame(() => {
      const center = (token.center ?? { x: token.x, y: token.y }) as { x: number; y: number };
      const m = canvas.app?.stage?.worldTransform;
      const zoom = (canvas.stage as unknown as { scale?: { x: number } })?.scale?.x ?? 1;
      if (!m) return;
      const L = (m.a * center.x + m.c * center.y) / zoom;
      const T = (m.b * center.x + m.d * center.y) / zoom;
      const $html = html instanceof jQuery ? html : $(html as unknown as HTMLElement);
      $html.css({ left: `${L}px`, top: `${T}px`, transform: "translate(-50%, -50%)" });
    });
  }
}
