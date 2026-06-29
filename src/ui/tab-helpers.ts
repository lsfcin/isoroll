// AppV2 tab injection and flag checkbox builder shared across TileConfig, TokenConfig, SceneConfig.

const TAB = "isoroll";

// AppV2 partial re-renders wipe nav <a> items but preserve injected tab content <div>s.
// Guard on content div (persists); always re-inject nav item (wiped); bind events once.
// All click handlers delegated from $html so they survive nav DOM replacement.
import { MODULE_ID } from "../core";

const NAV_SELECTOR = "nav.tabs:not(.secondary-tabs), nav.sheet-tabs:not(.secondary-tabs)";

function findNav($html: JQuery): JQuery {
  const $all = $html.find(NAV_SELECTOR);
  return $all.first();
}

function findForm($html: JQuery): JQuery {
  let result: JQuery;
  if ($html.is("form")) {
    result = $html;
  } else {
    const $forms = $html.find("form");
    result = $forms.first();
  }
  return result;
}

function injectSection($html: JQuery, $section: JQuery): void {
  const $allTabs = $html.find(".tab[data-tab]");
  const $lastTab = $allTabs.last();
  if ($lastTab.length) {
    $lastTab.after($section);
    return;
  }
  const $form = findForm($html);
  $form.append($section);
}

function bindTabClicks($html: JQuery): void {
  $html.on("click", `a[data-tab="${TAB}"]`, (e) => {
    e.stopPropagation();
    const $nav2  = findNav($html);
    const $navAs = $nav2.find("a[data-tab]");
    $navAs.removeClass("active");
    const $tabs = $html.find(".tab[data-tab]");
    $tabs.removeClass("active");
    const $current = $(e.currentTarget);
    $current.addClass("active");
    const $isoTab = $html.find(`.tab[data-tab="${TAB}"]`);
    $isoTab.addClass("active");
  });
  // stopPropagation on isoroll click leaves AppV2 tabGroups stale — re-activate target explicitly.
  $html.on("click", `nav a[data-tab]:not([data-tab="${TAB}"])`, (e) => {
    const $isoEls = $html.find(`.tab[data-tab="${TAB}"], a[data-tab="${TAB}"]`);
    $isoEls.removeClass("active");
    const clickedTab = (e.currentTarget as HTMLElement).dataset.tab;
    if (clickedTab) {
      const $clicked = $html.find(`.tab[data-tab="${clickedTab}"]`);
      $clicked.addClass("active");
    }
  });
}

export function addIsorollTab(
  $html: JQuery,
  label: string,
  fieldsetContent: string,
  onFirstInject?: ($html: JQuery) => void,
): void {
  const $nav = findNav($html);
  const $existing = $html.find(`.tab[data-tab="${TAB}"]`);
  const tabContentExists = $existing.length > 0;

  const $navTabA = $nav.find(`a[data-tab="${TAB}"]`);
  if (!$navTabA.length) {
    $nav.append(`<a class="item" data-tab="${TAB}"><i class="fas fa-cube"></i> ${label}</a>`);
  }

  if (tabContentExists) {
    return;
  }

  const $section = $(`<div class="tab" data-tab="${TAB}"></div>`);
  $section.append(fieldsetContent);
  injectSection($html, $section);
  bindTabClicks($html);
  onFirstInject?.($html);
}

function capitalize(s: string): string {
  const ch    = s.charAt(0);
  const upper = ch.toUpperCase();
  const rest  = s.slice(1);
  return upper + rest;
}

export function flagNumber(flagKey: string, ns: string, value: number, min: number, max: number, step: number): string {
  const k         = capitalize(flagKey);
  const id        = `isoroll-${flagKey}`;
  const labelText = game.i18n.localize(`ISOROLL.${ns}.${k}`);
  const hintText  = game.i18n.localize(`ISOROLL.${ns}.${k}Hint`);
  return (
    `<div class="form-group">` +
    `<label for="${id}">${labelText}</label>` +
    `<div class="form-fields"><input type="number" id="${id}" name="flags.${MODULE_ID}.${flagKey}" min="${min}" max="${max}" step="${step}" value="${value}"></div>` +
    `<p class="hint">${hintText}</p>` +
    `</div>`
  );
}

export function flagSelect(flagKey: string, ns: string, value: string, options: Array<{ value: string; label: string }>): string {
  const k         = capitalize(flagKey);
  const id        = `isoroll-${flagKey}`;
  const labelText = game.i18n.localize(`ISOROLL.${ns}.${k}`);
  const hintText  = game.i18n.localize(`ISOROLL.${ns}.${k}Hint`);
  const optParts  = options.map(o => `<option value="${o.value}"${value === o.value ? " selected" : ""}>${o.label}</option>`);
  const opts      = optParts.join("");
  return (
    `<div class="form-group">` +
    `<label for="${id}">${labelText}</label>` +
    `<div class="form-fields"><select id="${id}" name="flags.${MODULE_ID}.${flagKey}">${opts}</select></div>` +
    `<p class="hint">${hintText}</p>` +
    `</div>`
  );
}

export function flagCheckbox(flagKey: string, ns: string, checked: boolean, labelAttrs = ""): string {
  const k         = capitalize(flagKey);
  const id        = `isoroll-${flagKey}`;
  const labelText = game.i18n.localize(`ISOROLL.${ns}.${k}`);
  const hintText  = game.i18n.localize(`ISOROLL.${ns}.${k}Hint`);
  return (
    `<div class="form-group">` +
    `<label for="${id}"${labelAttrs ? ` ${labelAttrs}` : ""}>${labelText}</label>` +
    `<div class="form-fields"><input type="checkbox" id="${id}" name="flags.${MODULE_ID}.${flagKey}" ${checked ? "checked" : ""}></div>` +
    `<p class="hint">${hintText}</p>` +
    `</div>`
  );
}
