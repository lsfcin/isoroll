import { MODULE_ID } from "../volume/flags";
import { PROJECTION_TYPES } from "./constants";

const TAB = "isoroll";

// Manual tab activation: "isoroll" isn't in AppV2's static TABS, so changeTab() would throw.
// stopPropagation prevents AppV2's delegated handler; we handle active-class ourselves.
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
  // Also re-activate the target section explicitly: our stopPropagation on the isoroll click
  // leaves AppV2's tabGroups[group] stale, so changeTab() may return early and leave the
  // native tab content hidden (it was removed when we activated isoroll).
  $nav.on("click", `a[data-tab]:not([data-tab="${TAB}"])`, (e) => {
    $html.find(`.tab[data-tab="${TAB}"], a[data-tab="${TAB}"]`).removeClass("active");
    const clickedTab = (e.currentTarget as HTMLElement).dataset.tab;
    if (clickedTab) $html.find(`.tab[data-tab="${clickedTab}"]`).addClass("active");
  });
}

// Renders one checkbox form-group. flagKey is camelCase; i18n key = PascalCase of flagKey.
function cbGroup(flagKey: string, ns: string, checked: boolean): string {
  const k = flagKey.charAt(0).toUpperCase() + flagKey.slice(1);
  return `<div class="form-group"><label>${game.i18n.localize(`ISOROLL.${ns}.${k}`)}</label><div class="form-fields"><input type="checkbox" name="flags.${MODULE_ID}.${flagKey}" ${checked ? "checked" : ""}></div><p class="hint">${game.i18n.localize(`ISOROLL.${ns}.${k}Hint`)}</p></div>`;
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
      const transformToken  = app.document.getFlag(MODULE_ID, "transformToken")          ?? false;
      const showImgManip    = app.document.getFlag(MODULE_ID, "showImageManipulation")   ?? true;
      const showVolManip    = app.document.getFlag(MODULE_ID, "showVolumeManipulation")  ?? true;

      addIsorollTab($html, game.i18n.localize("ISOROLL.TabLabel"),
        `<legend>${game.i18n.localize("ISOROLL.TokenConfig.Heading")}</legend>` +
        cbGroup("transformToken",         "TokenConfig", transformToken as boolean) +
        cbGroup("showImageManipulation",  "TokenConfig", showImgManip  as boolean) +
        cbGroup("showVolumeManipulation", "TokenConfig", showVolManip  as boolean));
    },
  );
}

export function registerTileConfigHook(): void {
  Hooks.on(
    "renderTileConfig",
    (app: { document: { getFlag: (m: string, k: string) => unknown } }, html: JQuery) => {
      const $html = html instanceof jQuery ? html : $(html as unknown as HTMLElement);
      const transformTile = app.document.getFlag(MODULE_ID, "transformTile")           ?? false;
      const showImgManip  = app.document.getFlag(MODULE_ID, "showImageManipulation")   ?? true;
      const showVolManip  = app.document.getFlag(MODULE_ID, "showVolumeManipulation")  ?? true;

      addIsorollTab($html, game.i18n.localize("ISOROLL.TabLabel"),
        `<legend>${game.i18n.localize("ISOROLL.TileConfig.Heading")}</legend>` +
        cbGroup("transformTile",          "TileConfig", transformTile as boolean) +
        cbGroup("showImageManipulation",  "TileConfig", showImgManip  as boolean) +
        cbGroup("showVolumeManipulation", "TileConfig", showVolManip  as boolean));
    },
  );
}
