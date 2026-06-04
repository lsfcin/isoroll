// TokenHUD repositioning under isometric stage transform.
import { MODULE_ID } from "../flags";
import { canvasZoom } from "../util";

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
      const wt = canvas.app?.stage?.worldTransform;
      const zoom = canvasZoom();
      if (!wt) return;
      const L = (wt.a * center.x + wt.c * center.y) / zoom;
      const T = (wt.b * center.x + wt.d * center.y) / zoom;
      const $html = html instanceof jQuery ? html : $(html as unknown as HTMLElement);
      $html.css({ left: `${L}px`, top: `${T}px`, transform: "translate(-50%, -50%)" });
    });
  }
}
