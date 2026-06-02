export { registerRulerPatch } from "./ruler-patch";
import { MODULE_ID } from "../volume/flags";
import { CanvasTransform } from "./canvas-transform";
import { PROJECTION_TYPES } from "./constants";

const TAB = "isoroll";

// AppV2 partial re-renders wipe nav <a> items but preserve injected tab content <div>s.
// Guard on content div (persists); always re-inject nav item (wiped); bind events once.
// All click handlers delegated from $html so they survive nav DOM replacement.
function addIsorollTab(
  $html: JQuery,
  label: string,
  fieldsetContent: string,
  onFirstInject?: ($html: JQuery) => void,
): void {
  const $nav = $html
    .find("nav.tabs:not(.secondary-tabs), nav.sheet-tabs:not(.secondary-tabs)")
    .first();

  const tabContentExists = $html.find(`.tab[data-tab="${TAB}"]`).length > 0;

  if (!$nav.find(`a[data-tab="${TAB}"]`).length) {
    $nav.append(`<a class="item" data-tab="${TAB}"><i class="fas fa-cube"></i> ${label}</a>`);
  }

  if (tabContentExists) return;

  const $section = $(`<div class="tab" data-tab="${TAB}"></div>`)
    .append(`<fieldset>${fieldsetContent}</fieldset>`);
  const $lastTab = $html.find(".tab[data-tab]").last();
  if ($lastTab.length) $lastTab.after($section);
  else ($html.is("form") ? $html : $html.find("form").first()).append($section);

  $html.on("click", `a[data-tab="${TAB}"]`, (e) => {
    e.stopPropagation();
    $html.find("nav.tabs:not(.secondary-tabs), nav.sheet-tabs:not(.secondary-tabs)")
      .first().find("a[data-tab]").removeClass("active");
    $html.find(".tab[data-tab]").removeClass("active");
    $(e.currentTarget).addClass("active");
    $html.find(`.tab[data-tab="${TAB}"]`).addClass("active");
  });

  // stopPropagation on isoroll click leaves AppV2 tabGroups stale — re-activate target explicitly.
  $html.on("click", `nav a[data-tab]:not([data-tab="${TAB}"])`, (e) => {
    $html.find(`.tab[data-tab="${TAB}"], a[data-tab="${TAB}"]`).removeClass("active");
    const clickedTab = (e.currentTarget as HTMLElement).dataset.tab;
    if (clickedTab) $html.find(`.tab[data-tab="${clickedTab}"]`).addClass("active");
  });

  onFirstInject?.($html);
}

function cbGroup(flagKey: string, ns: string, checked: boolean): string {
  const k = flagKey.charAt(0).toUpperCase() + flagKey.slice(1);
  const id = `isoroll-${flagKey}`;
  return `<div class="form-group"><label for="${id}">${game.i18n.localize(`ISOROLL.${ns}.${k}`)}</label><div class="form-fields"><input type="checkbox" id="${id}" name="flags.${MODULE_ID}.${flagKey}" ${checked ? "checked" : ""}></div><p class="hint">${game.i18n.localize(`ISOROLL.${ns}.${k}Hint`)}</p></div>`;
}

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
  Hooks.on("renderSceneConfig",
    (app: { document: { getFlag: (m: string, k: string) => unknown } }, html: JQuery) => {
      const $html = html instanceof jQuery ? html : $(html as unknown as HTMLElement);
      const doc = app.document;
      // Sanitize with strict checks: prior bad saves may store arrays as "false,false,false" etc.
      const enabled     = doc.getFlag(MODULE_ID, "enabled")            === true;
      const transformBg = doc.getFlag(MODULE_ID, "transformBackground") === true;
      const rawProj  = doc.getFlag(MODULE_ID, "projection");
      const rawRot   = doc.getFlag(MODULE_ID, "customRotation");
      const rawSkX   = doc.getFlag(MODULE_ID, "customSkewX");
      const rawSkY   = doc.getFlag(MODULE_ID, "customSkewY");
      const rawRatio = doc.getFlag(MODULE_ID, "customRatio");
      const projection = (typeof rawProj  === "string" ? rawProj  : undefined) ?? "dimetric_2_1";
      const cRot   = (typeof rawRot   === "number" ? rawRot   : undefined) ?? -45;
      const cSkX   = (typeof rawSkX   === "number" ? rawSkX   : undefined) ?? 18.435;
      const cSkY   = (typeof rawSkY   === "number" ? rawSkY   : undefined) ?? 18.435;
      const cRatio = (typeof rawRatio === "number" ? rawRatio : undefined) ?? 2.0;
      const customVisible = projection === "custom" ? "" : 'style="display:none"';

      addIsorollTab($html, game.i18n.localize("ISOROLL.TabLabel"), `
          <legend>${game.i18n.localize("ISOROLL.SceneConfig.Heading")}</legend>
          <div class="form-group">
            <label for="isoroll-enabled">${game.i18n.localize("ISOROLL.SceneConfig.Enable")}</label>
            <div class="form-fields">
              <input type="checkbox" id="isoroll-enabled" name="flags.${MODULE_ID}.enabled" ${enabled ? "checked" : ""}>
            </div>
            <p class="hint">${game.i18n.localize("ISOROLL.SceneConfig.EnableHint")}</p>
          </div>
          <div class="form-group">
            <label for="isoroll-transformBackground">${game.i18n.localize("ISOROLL.SceneConfig.TransformBackground")}</label>
            <div class="form-fields">
              <input type="checkbox" id="isoroll-transformBackground" name="flags.${MODULE_ID}.transformBackground" ${transformBg ? "checked" : ""}>
            </div>
            <p class="hint">${game.i18n.localize("ISOROLL.SceneConfig.TransformBackgroundHint")}</p>
          </div>
          <div class="form-group">
            <label for="isoroll-projection">${game.i18n.localize("ISOROLL.SceneConfig.Projection")}</label>
            <div class="form-fields">
              <select id="isoroll-projection" name="flags.${MODULE_ID}.projection" class="isoroll-projection-select">
                ${projectionOptions(projection)}
              </select>
            </div>
            <p class="hint">${game.i18n.localize("ISOROLL.SceneConfig.ProjectionHint")}</p>
          </div>
          <div class="isoroll-custom-fields" ${customVisible}>
            <div class="form-group">
              <label for="isoroll-customRotation">${game.i18n.localize("ISOROLL.SceneConfig.CustomRotation")}</label>
              <div class="form-fields">
                <input type="number" id="isoroll-customRotation" step="0.001" name="flags.${MODULE_ID}.customRotation" value="${cRot}">
              </div>
            </div>
            <div class="form-group">
              <label for="isoroll-customSkewX">${game.i18n.localize("ISOROLL.SceneConfig.CustomSkewX")}</label>
              <div class="form-fields">
                <input type="number" id="isoroll-customSkewX" step="0.001" name="flags.${MODULE_ID}.customSkewX" value="${cSkX}">
              </div>
            </div>
            <div class="form-group">
              <label for="isoroll-customSkewY">${game.i18n.localize("ISOROLL.SceneConfig.CustomSkewY")}</label>
              <div class="form-fields">
                <input type="number" id="isoroll-customSkewY" step="0.001" name="flags.${MODULE_ID}.customSkewY" value="${cSkY}">
              </div>
            </div>
            <div class="form-group">
              <label for="isoroll-customRatio">${game.i18n.localize("ISOROLL.SceneConfig.CustomRatio")}</label>
              <div class="form-fields">
                <input type="number" id="isoroll-customRatio" step="0.001" min="0.1" name="flags.${MODULE_ID}.customRatio" value="${cRatio}">
              </div>
            </div>
          </div>`,
        ($h) => {
          $h.on("change", `input[name="flags.${MODULE_ID}.enabled"]`, (event) => {
            if (!(event.target as HTMLInputElement).checked)
              $h.find(`input[name="flags.${MODULE_ID}.transformBackground"]`).prop("checked", false);
          });
          $h.on("change", ".isoroll-projection-select", (event) => {
            $h.find(".isoroll-custom-fields").toggle((event.target as HTMLSelectElement).value === "custom");
          });
          const sync = () => {
            CanvasTransform.previewOverride = {
              enabled: $h.find(`input[name="flags.${MODULE_ID}.enabled"]`).is(':checked'),
              transformBg: $h.find(`input[name="flags.${MODULE_ID}.transformBackground"]`).is(':checked'),
            };
            CanvasTransform.applyCurrentState(); CanvasTransform.refresh();
          };
          $h.on("change", `input[name="flags.${MODULE_ID}.enabled"], input[name="flags.${MODULE_ID}.transformBackground"]`, sync);
        },
      );
    },
  );
}

export function registerTokenConfigHook(): void {
  Hooks.on("renderTokenConfig",
    (app: { document: { getFlag: (m: string, k: string) => unknown } }, html: JQuery) => {
      const $html = html instanceof jQuery ? html : $(html as unknown as HTMLElement);
      const d = app.document;
      addIsorollTab($html, game.i18n.localize("ISOROLL.TabLabel"),
        `<legend>${game.i18n.localize("ISOROLL.TokenConfig.Heading")}</legend>` +
        cbGroup("transformToken",        "TokenConfig", d.getFlag(MODULE_ID, "transformToken")         === true) +
        cbGroup("showImageManipulation", "TokenConfig", d.getFlag(MODULE_ID, "showImageManipulation")  !== false) +
        cbGroup("showVolumeManipulation","TokenConfig", d.getFlag(MODULE_ID, "showVolumeManipulation") !== false) +
        cbGroup("presetEnabled",         "TokenConfig", d.getFlag(MODULE_ID, "presetEnabled")          !== false));
    },
  );
}

export function registerTileConfigHook(): void {
  Hooks.on("renderTileConfig", (app: { document: { getFlag: (m: string, k: string) => unknown } }, html: JQuery) => {
    const $html = html instanceof jQuery ? html : $(html as unknown as HTMLElement);
    const d = app.document;
    addIsorollTab($html, game.i18n.localize("ISOROLL.TabLabel"),
      `<legend>${game.i18n.localize("ISOROLL.TileConfig.Heading")}</legend>` +
      cbGroup("foregroundTile",        "TileConfig", d.getFlag(MODULE_ID, "foregroundTile")         !== false) +
      cbGroup("transformTile",         "TileConfig", d.getFlag(MODULE_ID, "transformTile")          === true) +
      cbGroup("showImageManipulation", "TileConfig", d.getFlag(MODULE_ID, "showImageManipulation")  !== false) +
      cbGroup("showVolumeManipulation","TileConfig", d.getFlag(MODULE_ID, "showVolumeManipulation") !== false) +
      cbGroup("presetEnabled",         "TileConfig", d.getFlag(MODULE_ID, "presetEnabled")          !== false));
  });
}
