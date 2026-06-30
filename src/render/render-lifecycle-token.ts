// Token-specific lifecycle handlers: draw, refresh, flags, select/deselect, destroy.
import type { TokenRenderer } from './token-renderer';
import { evaluateAll as occluderEvaluateAll } from '../occluder';
import type { PlaceableState } from './render-lifecycle-state';

export function drawToken(
  token: Token,
  state: PlaceableState,
  tokenRenderers: TokenRenderer[],
): void {
  if (state !== "disabled" && state !== "transformed" && state !== "pending") {
    if (state === "preview") {
      const previewRenderers = tokenRenderers.filter(r => r.handlesPreview);
      previewRenderers.forEach(r => r.create(token));
    } else {
      tokenRenderers.forEach(r => r.create(token));
      occluderEvaluateAll();
    }
  }
}

export function refreshToken(
  token: Token,
  state: PlaceableState,
  tokenRenderers: TokenRenderer[],
  flags?: Record<string, boolean>,
): void {
  if (state === "disabled" || state === "transformed") {
    tokenRenderers.forEach(r => r.hide(token.id));
  } else if (state === "preview") {
    const preview = tokenRenderers.filter(r => r.handlesPreview);
    preview.forEach(r => r.sync(token));
    if (!(flags?.["refreshMesh"] && !flags?.["refreshPosition"])) {
      preview.forEach(r => r.rebuild(token));
    }
  } else if (state !== "pending") {
    tokenRenderers.forEach(r => r.sync(token));
    if (!(flags?.["refreshMesh"] && !flags?.["refreshPosition"])) {
      tokenRenderers.forEach(r => r.rebuild(token));
      occluderEvaluateAll();
    }
  }
}

export function flagsChangeToken(
  token: Token,
  state: PlaceableState,
  tokenRenderers: TokenRenderer[],
): void {
  // "pending" (cloned token) safe to rebuild on flag changes — renderers use doc coords, not mesh
  if (state !== "disabled" && state !== "transformed" && state !== "preview") {
    tokenRenderers.forEach(r => r.rebuild(token));
  }
}

export function selectToken(
  token: Token,
  state: PlaceableState,
  tokenRenderers: TokenRenderer[],
  onSightRefresh: () => void,
): void {
  if (state === "transformed") {
    tokenRenderers.forEach(r => r.hide(token.id));
  } else if (state !== "disabled" && state !== "preview" && state !== "pending") {
    tokenRenderers.forEach(r => r.onControl(token, true));
    onSightRefresh();
  }
}

export function deselectToken(
  token: Token,
  state: PlaceableState,
  tokenRenderers: TokenRenderer[],
  onSightRefresh: () => void,
): void {
  if (state === "transformed") {
    tokenRenderers.forEach(r => r.hide(token.id));
  } else if (state !== "disabled" && state !== "preview" && state !== "pending") {
    tokenRenderers.forEach(r => r.onControl(token, false));
    onSightRefresh();
  }
}

export function destroyToken(
  id: string,
  tokenRenderers: TokenRenderer[],
): void {
  tokenRenderers.forEach(r => r.onDestroy?.(id));
  occluderEvaluateAll();
}
