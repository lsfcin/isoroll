import { MODULE_ID } from "../volume/flags";

/**
 * Injects the "Enable Isoroll" checkbox into the Scene Configuration form.
 * Stored as scene flag: flags.isoroll.enabled (boolean).
 * Foundry's form submission handles persisting the flag automatically.
 */
export function registerSceneConfigHook(): void {
  Hooks.on(
    "renderSceneConfig",
    (app: { document: { getFlag: (m: string, k: string) => unknown } }, html: JQuery) => {
      const enabled = app.document.getFlag(MODULE_ID, "enabled") ?? false;
      const label = game.i18n.localize("ISOROLL.SceneConfig.Enable");
      const hint = game.i18n.localize("ISOROLL.SceneConfig.EnableHint");

      const field = `
        <div class="form-group">
          <label>${label}</label>
          <div class="form-fields">
            <input type="checkbox" name="flags.${MODULE_ID}.enabled" ${enabled ? "checked" : ""}>
          </div>
          <p class="hint">${hint}</p>
        </div>`;

      // Inject at the top of the Basic tab, after the scene name field.
      const basicTab = html.find('[data-tab="basic"]');
      if (basicTab.length) {
        basicTab.find(".form-group").first().after(field);
      } else {
        // Fallback: inject before the first form-group if tab structure differs.
        html.find(".form-group").first().after(field);
      }
    },
  );
}
