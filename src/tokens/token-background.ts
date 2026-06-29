// Always-visible token indicators: ground shadow (sight-tracked), elevation line, elevation label.

import { getElevation, isTransformedToken, isPreviewClone, suppressTooltip, CanvasEnv } from "../core";
import { LAYER_KEYS, IsoRenderer } from "../render";
import { BgState, getState } from "./token-background-state";
import { renderShadow, renderIndicator, renderLabel } from "./token-background-render";

export class TokenBackground {
  static readonly handlesPreview = true;

  static configOpen: Set<string>    = new Set();
  private static lastState: Map<string, BgState> = new Map();

  // ---- TokenRenderer interface ----

  static create(token: Token): void {
    if (!isTransformedToken(token)) {
      const tokenObj = token as unknown as { controlled?: boolean };
      TokenBackground.show(token, tokenObj.controlled ?? false);
    }
  }

  static sync(_token: Token): void { /* no per-frame sync needed */ }

  static onDestroy(id: string): void { TokenBackground.hide(id); }

  static rebuild(token: Token): void {
    if (TokenBackground.lastState.has(token.id)) {
      const state = getState(token);
      const last  = TokenBackground.lastState.get(token.id);
      if (!last || last.geoKey !== state.geoKey || last.shadowKey !== state.shadowKey) {
        TokenBackground.lastState.set(token.id, state);
        if (last && last.geoKey === state.geoKey) {
          renderShadow(token);
        } else {
          const isClone = isPreviewClone(token);
          const tokenObj = token as unknown as { controlled?: boolean };
          const rawControlled = tokenObj.controlled ?? false;
          const controlled = isClone ? false : rawControlled;
          const configOpen = TokenBackground.configOpen.has(token.id);
          TokenBackground.show(token, controlled || configOpen);
        }
      }
    }
  }

  static onControl(token: Token, controlled: boolean): void {
    IsoRenderer.clear(`token-${token.id}:indicator`);
    IsoRenderer.clear(`token-${token.id}:label`);
    renderIndicator(token);
    renderLabel(token, controlled);
  }

  // ---- Lifecycle ----

  static setConfigOpen(token: Token, open: boolean): void {
    if (open) {
      TokenBackground.configOpen.add(token.id);
    } else {
      TokenBackground.configOpen.delete(token.id);
    }
    const tokenObj = token as unknown as { controlled?: boolean };
    const tokenControlled = tokenObj.controlled ?? false;
    TokenBackground.show(token, open || tokenControlled);
  }

  static show(token: Token, selected = false): void {
    TokenBackground.hide(token.id);
    const state = getState(token);
    TokenBackground.lastState.set(token.id, state);
    renderShadow(token);
    renderIndicator(token);
    renderLabel(token, selected);
    suppressTooltip(token);
  }

  static hide(tokenId: string): void {
    IsoRenderer.clear(`token-${tokenId}:shadow`);
    IsoRenderer.clear(`token-${tokenId}:indicator`);
    IsoRenderer.clear(`token-${tokenId}:label`);
    TokenBackground.lastState.delete(tokenId);
    const token = CanvasEnv.getToken(tokenId);
    if (token) {
      const tt = (token as unknown as { tooltip?: { visible: boolean } }).tooltip;
      if (tt) {
        tt.visible = getElevation(token.document) !== 0;
      }
    }
  }

  static clearAll(): void {
    IsoRenderer.clearLayer(LAYER_KEYS.TOKEN_SHADOW);
    IsoRenderer.clearLayer(LAYER_KEYS.TOKEN_INDICATORS);
    IsoRenderer.clearLayer(LAYER_KEYS.TOKEN_LABEL);
    TokenBackground.lastState.clear();
  }
}
