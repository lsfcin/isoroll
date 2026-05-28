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

      // Prefer the Basics tab (Foundry v14 AppV2 naming).
      // Fall back to "basic" (older versions), then any section.tab, then the form body.
      const tab =
        html.find('[data-tab="basics"]').first() ||
        html.find('[data-tab="basic"]').first() ||
        html.find("section.tab").first() ||
        html.find("form").first();

      if (tab.length) {
        // Append at end of first fieldset inside the tab, or directly to tab.
        const fieldset = tab.find("fieldset, .form-group").first();
        if (fieldset.length) {
          fieldset.parent().append(field);
        } else {
          tab.append(field);
        }
      } else {
        // Absolute fallback: append anywhere visible in the form.
        html.find("form").append(field);
      }
    },
  );
}
