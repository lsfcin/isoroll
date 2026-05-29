import { MODULE_ID } from "../volume/flags";
import { PROJECTION_TYPES } from "./constants";

const TAB = "isoroll";

/**
 * Injects an "Iso" tab (last) into an AppV2 config sheet.
 *
 * Approach derived from lsfcin/isometric-perspective fork:
 *   - Nav: `nav.tabs` (TokenConfig) or `nav.sheet-tabs` (SceneConfig), excluding secondary-tabs
 *   - Content: `<div class="tab" data-tab="...">` inserted after `.tab[data-tab]` last
 *     (lands inside `.sheet-body`, not after the footer)
 *
 * Tab activation is manual because "isoroll" is not registered in AppV2's static TABS,
 * so calling changeTab("isoroll") would fail. stopPropagation on our nav item prevents
 * AppV2's delegated handler from reaching the nav and calling changeTab.
 * Other tabs deactivate ours via a delegated handler on the nav.
 */
function addIsorollTab($html: JQuery, label: string, fieldsetContent: string): void {
  const $nav = $html
    .find("nav.tabs:not(.secondary-tabs), nav.sheet-tabs:not(.secondary-tabs)")
    .first();

  $nav.append(`<a class="item" data-tab="${TAB}"><i class="fas fa-cube"></i> ${label}</a>`);

  const $section = $(`<div class="tab" data-tab="${TAB}"></div>`)
    .append(`<fieldset>${fieldsetContent}</fieldset>`);

  const $lastTab = $html.find(".tab[data-tab]").last();
  if ($lastTab.length) {
    $lastTab.after($section);
  } else {
    ($html.is("form") ? $html : $html.find("form").first()).append($section);
  }

  // Our tab click: activate manually and stop AppV2 from calling changeTab("isoroll").
  $html.on("click", `a[data-tab="${TAB}"]`, (e) => {
    e.stopPropagation();
    $nav.find("a[data-tab]").removeClass("active");
    $html.find(".tab[data-tab]").removeClass("active");
    $(e.currentTarget).addClass("active");
    $html.find(`.tab[data-tab="${TAB}"]`).addClass("active");
  });

  // Other tab clicks: deactivate ours.
  $nav.on("click", `a[data-tab]:not([data-tab="${TAB}"])`, () => {
    $html.find(`.tab[data-tab="${TAB}"]`).removeClass("active");
    $html.find(`a[data-tab="${TAB}"]`).removeClass("active");
  });
}

// Build the <option> list for the projection selector
function projectionOptions(currentKey: string): string {
  const labels: Record<string, string> = {
    dimetric_2_1: game.i18n.localize("ISOROLL.Projection.Dimetric21"),
    true_iso:     game.i18n.localize("ISOROLL.Projection.TrueIso"),
    overhead:     game.i18n.localize("ISOROLL.Projection.Overhead"),
    proj_3_2:     game.i18n.localize("ISOROLL.Projection.Proj32"),
    diablo:       game.i18n.localize("ISOROLL.Projection.Diablo"),
    torment:      game.i18n.localize("ISOROLL.Projection.Torment"),
    hades:        game.i18n.localize("ISOROLL.Projection.Hades"),
    custom:       game.i18n.localize("ISOROLL.Projection.Custom"),
  };
  return Object.keys(PROJECTION_TYPES)
    .map((k) => {
      const sel = k === (currentKey || "dimetric_2_1") ? " selected" : "";
      return `<option value="${k}"${sel}>${labels[k] ?? k}</option>`;
    })
    .join("");
}

export function registerSceneConfigHook(): void {
  Hooks.on(
    "renderSceneConfig",
    (app: { document: { getFlag: (m: string, k: string) => unknown } }, html: JQuery) => {
      const $html = html instanceof jQuery ? html : $(html as unknown as HTMLElement);
      const doc = app.document;
      const enabled     = doc.getFlag(MODULE_ID, "enabled")            ?? false;
      const transformBg = doc.getFlag(MODULE_ID, "transformBackground") ?? false;
      const projection  = (doc.getFlag(MODULE_ID, "projection") as string | undefined) ?? "dimetric_2_1";
      const cRot  = (doc.getFlag(MODULE_ID, "customRotation")  as number | undefined) ?? -45;
      const cSkX  = (doc.getFlag(MODULE_ID, "customSkewX")     as number | undefined) ?? 18.435;
      const cSkY  = (doc.getFlag(MODULE_ID, "customSkewY")     as number | undefined) ?? 18.435;
      const cRatio = (doc.getFlag(MODULE_ID, "customRatio")    as number | undefined) ?? 2.0;

      const customVisible = projection === "custom" ? "" : 'style="display:none"';

      addIsorollTab($html, game.i18n.localize("ISOROLL.TabLabel"), `
          <legend>${game.i18n.localize("ISOROLL.SceneConfig.Heading")}</legend>
          <div class="form-group">
            <label>${game.i18n.localize("ISOROLL.SceneConfig.Enable")}</label>
            <div class="form-fields">
              <input type="checkbox" name="flags.${MODULE_ID}.enabled" ${enabled ? "checked" : ""}>
            </div>
            <p class="hint">${game.i18n.localize("ISOROLL.SceneConfig.EnableHint")}</p>
          </div>
          <div class="form-group">
            <label>${game.i18n.localize("ISOROLL.SceneConfig.TransformBackground")}</label>
            <div class="form-fields">
              <input type="checkbox" name="flags.${MODULE_ID}.transformBackground" ${transformBg ? "checked" : ""}>
            </div>
            <p class="hint">${game.i18n.localize("ISOROLL.SceneConfig.TransformBackgroundHint")}</p>
          </div>
          <div class="form-group">
            <label>${game.i18n.localize("ISOROLL.SceneConfig.Projection")}</label>
            <div class="form-fields">
              <select name="flags.${MODULE_ID}.projection" class="isoroll-projection-select">
                ${projectionOptions(projection)}
              </select>
            </div>
            <p class="hint">${game.i18n.localize("ISOROLL.SceneConfig.ProjectionHint")}</p>
          </div>
          <div class="isoroll-custom-fields" ${customVisible}>
            <div class="form-group">
              <label>${game.i18n.localize("ISOROLL.SceneConfig.CustomRotation")}</label>
              <div class="form-fields">
                <input type="number" step="0.001" name="flags.${MODULE_ID}.customRotation" value="${cRot}">
              </div>
            </div>
            <div class="form-group">
              <label>${game.i18n.localize("ISOROLL.SceneConfig.CustomSkewX")}</label>
              <div class="form-fields">
                <input type="number" step="0.001" name="flags.${MODULE_ID}.customSkewX" value="${cSkX}">
              </div>
            </div>
            <div class="form-group">
              <label>${game.i18n.localize("ISOROLL.SceneConfig.CustomSkewY")}</label>
              <div class="form-fields">
                <input type="number" step="0.001" name="flags.${MODULE_ID}.customSkewY" value="${cSkY}">
              </div>
            </div>
            <div class="form-group">
              <label>${game.i18n.localize("ISOROLL.SceneConfig.CustomRatio")}</label>
              <div class="form-fields">
                <input type="number" step="0.001" min="0.1" name="flags.${MODULE_ID}.customRatio" value="${cRatio}">
              </div>
            </div>
          </div>`);

      // Disable transformBackground when enabled is unchecked
      $html.on("change", `input[name="flags.${MODULE_ID}.enabled"]`, (event) => {
        if (!(event.target as HTMLInputElement).checked) {
          $html.find(`input[name="flags.${MODULE_ID}.transformBackground"]`).prop("checked", false);
        }
      });

      // Show/hide custom projection fields
      $html.on("change", ".isoroll-projection-select", (event) => {
        const val = (event.target as HTMLSelectElement).value;
        $html.find(".isoroll-custom-fields").toggle(val === "custom");
      });
    },
  );
}

export function registerTokenConfigHook(): void {
  Hooks.on(
    "renderTokenConfig",
    (app: { document: { getFlag: (m: string, k: string) => unknown } }, html: JQuery) => {
      const $html = html instanceof jQuery ? html : $(html as unknown as HTMLElement);
      const transformToken = app.document.getFlag(MODULE_ID, "transformToken") ?? false;

      addIsorollTab($html, game.i18n.localize("ISOROLL.TabLabel"), `
          <legend>${game.i18n.localize("ISOROLL.TokenConfig.Heading")}</legend>
          <div class="form-group">
            <label>${game.i18n.localize("ISOROLL.TokenConfig.TransformToken")}</label>
            <div class="form-fields">
              <input type="checkbox" name="flags.${MODULE_ID}.transformToken" ${transformToken ? "checked" : ""}>
            </div>
            <p class="hint">${game.i18n.localize("ISOROLL.TokenConfig.TransformTokenHint")}</p>
          </div>`);
    },
  );
}

export function registerTileConfigHook(): void {
  Hooks.on(
    "renderTileConfig",
    (app: { document: { getFlag: (m: string, k: string) => unknown } }, html: JQuery) => {
      const $html = html instanceof jQuery ? html : $(html as unknown as HTMLElement);
      const transformTile = app.document.getFlag(MODULE_ID, "transformTile") ?? false;

      addIsorollTab($html, game.i18n.localize("ISOROLL.TabLabel"), `
          <legend>${game.i18n.localize("ISOROLL.TileConfig.Heading")}</legend>
          <div class="form-group">
            <label>${game.i18n.localize("ISOROLL.TileConfig.TransformTile")}</label>
            <div class="form-fields">
              <input type="checkbox" name="flags.${MODULE_ID}.transformTile" ${transformTile ? "checked" : ""}>
            </div>
            <p class="hint">${game.i18n.localize("ISOROLL.TileConfig.TransformTileHint")}</p>
          </div>`);
    },
  );
}
