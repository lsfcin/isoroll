// Keydown/wheel handler builders for GridConfig arrow-key + scroll background nudging, extracted from bg-html.ts.
import { CanvasTransform } from "../transform";

export interface KeyDeps {
  getHtml: () => HTMLElement | null;
  isTBF: () => boolean;
  scaleVerticalStep: (delta: number) => void;
}

const CTRL_CODES = ["KeyW", "ArrowUp", "KeyS", "ArrowDown"];
const ARROW_CODES = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];

function isCtrlArrowCode(e: KeyboardEvent): boolean {
  const plainMods = !e.shiftKey && !e.altKey;
  return e.ctrlKey && plainMods && CTRL_CODES.includes(e.code);
}

function isBareArrowCode(e: KeyboardEvent): boolean {
  const plainMods = !e.shiftKey && !e.altKey;
  return !e.ctrlKey && plainMods && ARROW_CODES.includes(e.code);
}

function nudgeInput(el: HTMLInputElement, delta: number): void {
  const current = Number(el.value);
  el.value = String(current + delta);
  const evt = new Event("change", { bubbles: true });
  el.dispatchEvent(evt);
}

function applyIsoArrow(xe: HTMLInputElement, ye: HTMLInputElement, code: string): void {
  const dx = (code === "ArrowLeft" || code === "ArrowDown") ? 1 : -1;
  const dy = (code === "ArrowLeft" || code === "ArrowUp") ? 1 : -1;
  nudgeInput(xe, dx);
  nudgeInput(ye, dy);
}

function applyFlatArrow(xe: HTMLInputElement, ye: HTMLInputElement, code: string): void {
  const isHoriz = code === "ArrowLeft" || code === "ArrowRight";
  if (isHoriz) {
    const dx = code === "ArrowLeft" ? 1 : -1;
    nudgeInput(xe, dx);
  } else {
    const dy = code === "ArrowUp" ? 1 : -1;
    nudgeInput(ye, dy);
  }
}

function handleBareArrow(e: KeyboardEvent, deps: KeyDeps): void {
  const html = deps.getHtml();
  const formEl = html?.closest('form');
  const form = (formEl ?? html?.querySelector('form')) as HTMLFormElement | null;
  const xe = form?.elements.namedItem?.('shiftX') as HTMLInputElement | null;
  const ye = form?.elements.namedItem?.('shiftY') as HTMLInputElement | null;
  if (!xe || !ye) {
    return;
  }
  e.preventDefault();
  e.stopPropagation();
  const gctEnabled = CanvasTransform.gctEffectiveEnabled();
  if (gctEnabled) {
    applyIsoArrow(xe, ye, e.code);
  } else {
    applyFlatArrow(xe, ye, e.code);
  }
}

function handleCtrlArrow(e: KeyboardEvent, deps: KeyDeps): void {
  const isTBF = deps.isTBF();
  if (isTBF) {
    e.preventDefault();
    e.stopPropagation();
    const isUp = e.code === "KeyW" || e.code === "ArrowUp";
    deps.scaleVerticalStep(isUp ? 1 : -1);
  }
}

export function buildKeyHandler(deps: KeyDeps): (e: KeyboardEvent) => void {
  return (e: KeyboardEvent) => {
    const isCtrlArrow = isCtrlArrowCode(e);
    const isBareArrow = isBareArrowCode(e);
    if (isCtrlArrow) {
      handleCtrlArrow(e, deps);
    } else if (isBareArrow) {
      handleBareArrow(e, deps);
    }
  };
}

export function buildWheelHandler(scaleVerticalStep: (delta: number) => void): (e: WheelEvent) => void {
  return (e: WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      scaleVerticalStep(e.deltaY < 0 ? 1 : -1);
    }
  };
}
