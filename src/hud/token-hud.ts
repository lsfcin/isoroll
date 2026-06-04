// TokenHUD repositioning under isometric stage transform.
import { MODULE_ID } from "../flags";
import { isIsoActive, isoHudPosition } from "./hud-utils";

export class TokenHud {
  static activate(): void {
    Hooks.on("renderTokenHUD", TokenHud.onRenderTokenHUD);
  }

  private static onRenderTokenHUD(hud: { object: unknown }, html: JQuery | HTMLElement): void {
    if (!isIsoActive()) return;
    const token = hud.object as Token;
    if (token.document.getFlag(MODULE_ID, "transformToken") === true) return;
    requestAnimationFrame(() => {
      const center = (token.center ?? { x: token.x, y: token.y }) as { x: number; y: number };
      const pos = isoHudPosition(center);
      if (!pos) return;
      const $html = html instanceof jQuery ? html : $(html as unknown as HTMLElement);
      $html.css({ ...pos, transform: "translate(-50%, -50%)" });
    });
  }
}
