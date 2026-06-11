// AppV2 tab injection and flag checkbox builder shared across TileConfig, TokenConfig, SceneConfig.

const TAB = "isoroll";

// AppV2 partial re-renders wipe nav <a> items but preserve injected tab content <div>s.
// Guard on content div (persists); always re-inject nav item (wiped); bind events once.
// All click handlers delegated from $html so they survive nav DOM replacement.
import { MODULE_ID } from "../core";
export function addIsorollTab(
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
    .append(fieldsetContent);
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

export function flagNumber(flagKey: string, ns: string, value: number, min: number, max: number, step: number): string {
  const k  = flagKey.charAt(0).toUpperCase() + flagKey.slice(1);
  const id = `isoroll-${flagKey}`;
  return (
    `<div class="form-group">` +
    `<label for="${id}">${game.i18n.localize(`ISOROLL.${ns}.${k}`)}</label>` +
    `<div class="form-fields"><input type="number" id="${id}" name="flags.${MODULE_ID}.${flagKey}" min="${min}" max="${max}" step="${step}" value="${value}"></div>` +
    `<p class="hint">${game.i18n.localize(`ISOROLL.${ns}.${k}Hint`)}</p>` +
    `</div>`
  );
}

export function flagSelect(flagKey: string, ns: string, value: string, options: Array<{ value: string; label: string }>): string {
  const k    = flagKey.charAt(0).toUpperCase() + flagKey.slice(1);
  const id   = `isoroll-${flagKey}`;
  const opts = options.map(o => `<option value="${o.value}"${value === o.value ? " selected" : ""}>${o.label}</option>`).join("");
  return (
    `<div class="form-group">` +
    `<label for="${id}">${game.i18n.localize(`ISOROLL.${ns}.${k}`)}</label>` +
    `<div class="form-fields"><select id="${id}" name="flags.${MODULE_ID}.${flagKey}">${opts}</select></div>` +
    `<p class="hint">${game.i18n.localize(`ISOROLL.${ns}.${k}Hint`)}</p>` +
    `</div>`
  );
}

export function flagCheckbox(flagKey: string, ns: string, checked: boolean, labelAttrs = ""): string {
  const k  = flagKey.charAt(0).toUpperCase() + flagKey.slice(1);
  const id = `isoroll-${flagKey}`;
  return (
    `<div class="form-group">` +
    `<label for="${id}"${labelAttrs ? ` ${labelAttrs}` : ""}>${game.i18n.localize(`ISOROLL.${ns}.${k}`)}</label>` +
    `<div class="form-fields"><input type="checkbox" id="${id}" name="flags.${MODULE_ID}.${flagKey}" ${checked ? "checked" : ""}></div>` +
    `<p class="hint">${game.i18n.localize(`ISOROLL.${ns}.${k}Hint`)}</p>` +
    `</div>`
  );
}
