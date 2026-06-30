// Shared state type and classifier helpers for render-lifecycle handlers.
import { VolumeFlags, isTransformedToken, isTransformedTile, isPreviewClone, hasActiveClone } from '../core';

export type PlaceableState = "disabled" | "transformed" | "preview" | "pending" | "normal";

export function classifyToken(t: Token): PlaceableState {
  let result: PlaceableState = "normal";
  if (!VolumeFlags.isSceneEnabled()) {
    result = "disabled";
  } else if (isTransformedToken(t)) {
    result = "transformed";
  } else if (isPreviewClone(t)) {
    result = "preview";
  } else if (hasActiveClone(t)) {
    result = "pending";
  }
  return result;
}

export function classifyTile(t: Tile): PlaceableState {
  let result: PlaceableState = "normal";
  if (!VolumeFlags.isSceneEnabled()) {
    result = "disabled";
  } else if (isTransformedTile(t)) {
    result = "transformed";
  } else if (isPreviewClone(t)) {
    result = "preview";
  } else if (hasActiveClone(t)) {
    result = "pending";
  }
  return result;
}
