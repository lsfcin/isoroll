import { MODULE_ID } from "../volume/flags";

/**
 * Injects the "Enable Isoroll" checkbox into the Scene Configuration form.
 * Stored as scene flag: flags.isoroll.enabled (boolean).
 * Foundry's form submission handles persisting the flag automatically.
 *
 * In v14 AppV2, html IS the <form> element. Tab navigation links and content
 * sections both carry data-tab attributes — target section/div elements only.
 */
export function registerSceneConfigHook(): void {
  Hooks.on(
    "renderSceneConfig",
    (app: { document: { getFlag: (m: string, k: string) => unknown } }, html: JQuery) => {
      const $html = html instanceof jQuery ? html : $(html as unknown as HTMLElement);
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

      // Target content sections only (not nav <a> elements which also carry data-tab).
      const basics =
        $html.find('section[data-tab="basics"]').first().length
          ? $html.find('section[data-tab="basics"]').first()
          : $html.find('div[data-tab="basics"]').first().length
            ? $html.find('div[data-tab="basics"]').first()
            : $html.find('section.tab, div.tab').first().length
              ? $html.find('section.tab, div.tab').first()
              : null;

      // html is already the <form> — append directly if no tab panel found.
      (basics ?? $html).append(field);
    },
  );
}
