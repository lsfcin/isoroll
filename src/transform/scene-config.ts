import { MODULE_ID } from "../volume/flags";

/**
 * Injects the "Enable Isoroll" checkbox into the Scene Configuration form.
 * Stored as scene flag: flags.isoroll.enabled (boolean).
 * Foundry's form submission handles persisting the flag automatically.
 *
 * Handles both Foundry v14 AppV2 ("basics") and older tab naming ("basic").
 */
export function registerSceneConfigHook(): void {
  Hooks.on(
    "renderSceneConfig",
    (app: { document: { getFlag: (m: string, k: string) => unknown } }, html: JQuery) => {
      // Debug: log what v14 passes so we can target the right selector.
      const $html = html instanceof jQuery ? html : $(html as unknown as HTMLElement);
      console.log("isoroll | renderSceneConfig fired");
      console.log("isoroll | data-tab elements found:", $html.find("[data-tab]").length);
      console.log(
        "isoroll | tab names:",
        $html
          .find("[data-tab]")
          .map((_: number, el: HTMLElement) => el.getAttribute("data-tab"))
          .get(),
      );
      console.log("isoroll | form elements found:", $html.find("form").length);
      console.log("isoroll | html snippet:", $html[0]?.outerHTML?.substring(0, 300));

      const enabled = app.document.getFlag(MODULE_ID, "enabled") ?? false;
      const label = game.i18n.localize("ISOROLL.SceneConfig.Enable");
      const hint = game.i18n.localize("ISOROLL.SceneConfig.EnableHint");

      const field = `
        <div class="form-group isoroll-enable">
          <label>${label}</label>
          <div class="form-fields">
            <input type="checkbox" name="flags.${MODULE_ID}.enabled" ${enabled ? "checked" : ""}>
          </div>
          <p class="hint">${hint}</p>
        </div>`;

      // Try every known tab selector; fall back to appending to the form.
      const tab =
        $html.find('[data-tab="basics"]').first().length
          ? $html.find('[data-tab="basics"]').first()
          : $html.find('[data-tab="basic"]').first().length
            ? $html.find('[data-tab="basic"]').first()
            : $html.find("section.tab, div.tab").first().length
              ? $html.find("section.tab, div.tab").first()
              : $html.find("form");

      tab.append(field);
      console.log("isoroll | injected into:", tab[0]?.tagName, tab[0]?.getAttribute("data-tab"));
    },
  );
}
