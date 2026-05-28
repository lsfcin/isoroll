import { MODULE_ID } from "../volume/flags";

/**
 * Injects an "Isometric" fieldset into the Scene Config Basics tab,
 * before the first existing fieldset (Presentation block).
 *
 * Flags persisted automatically by Foundry form submission:
 *   flags.isoroll.enabled                   (boolean)
 *   flags.isoroll.counterTransformBackground (boolean)
 *
 * v14 AppV2: html IS the <form>. Target section[data-tab], not nav <a>.
 */
export function registerSceneConfigHook(): void {
  Hooks.on(
    "renderSceneConfig",
    (app: { document: { getFlag: (m: string, k: string) => unknown } }, html: JQuery) => {
      const $html = html instanceof jQuery ? html : $(html as unknown as HTMLElement);
      const enabled = app.document.getFlag(MODULE_ID, "enabled") ?? false;
      const counterBg = app.document.getFlag(MODULE_ID, "counterTransformBackground") ?? false;

      const heading = game.i18n.localize("ISOROLL.SceneConfig.Heading");
      const enableLabel = game.i18n.localize("ISOROLL.SceneConfig.Enable");
      const enableHint = game.i18n.localize("ISOROLL.SceneConfig.EnableHint");
      const bgLabel = game.i18n.localize("ISOROLL.SceneConfig.CounterBackground");
      const bgHint = game.i18n.localize("ISOROLL.SceneConfig.CounterBackgroundHint");

      const block = `
        <fieldset>
          <legend>${heading}</legend>
          <div class="form-group">
            <label>${enableLabel}</label>
            <div class="form-fields">
              <input type="checkbox" name="flags.${MODULE_ID}.enabled" ${enabled ? "checked" : ""}>
            </div>
            <p class="hint">${enableHint}</p>
          </div>
          <div class="form-group">
            <label>${bgLabel}</label>
            <div class="form-fields">
              <input type="checkbox" name="flags.${MODULE_ID}.counterTransformBackground" ${counterBg ? "checked" : ""}>
            </div>
            <p class="hint">${bgHint}</p>
          </div>
        </fieldset>`;

      // Target content sections only (not nav <a> elements which also carry data-tab).
      const basics =
        $html.find('section[data-tab="basics"]').first().length
          ? $html.find('section[data-tab="basics"]').first()
          : $html.find('div[data-tab="basics"]').first().length
            ? $html.find('div[data-tab="basics"]').first()
            : $html.find('section.tab, div.tab').first().length
              ? $html.find('section.tab, div.tab').first()
              : null;

      const target = basics ?? $html;
      const firstFieldset = target.find("fieldset").first();
      if (firstFieldset.length) {
        firstFieldset.before(block);
      } else {
        target.prepend(block);
      }
    },
  );
}
