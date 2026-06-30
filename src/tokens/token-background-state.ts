// Background state key builders: cache keys for geo and shadow layers.

import { VolumeFlags, getElevation } from "../core";

export type BgState = { geoKey: string; shadowKey: string };

function buildGeoKey(token: Token, elev: number, selected: number): string {
  const d = token.document;
  const x = d.x ?? 0;
  const y = d.y ?? 0;
  const h = VolumeFlags.getTokenHeight(d);
  const lineEnabled = +VolumeFlags.getElevLineEnabled(d);
  const lineDashed = +VolumeFlags.getElevLineDashed(d);
  const lineColor = VolumeFlags.getElevLineColor(d);
  return `${x},${y},${elev},${h},${lineEnabled},${lineDashed},${lineColor},${selected}`;
}

function buildShadowKey(d: TokenDocument): string {
  const enabled = +VolumeFlags.getShadowEnabled(d);
  const shape = VolumeFlags.getShadowShape(d);
  const radius = VolumeFlags.getShadowRadius(d);
  const opacity = VolumeFlags.getShadowOpacity(d);
  return `${enabled},${shape},${radius},${opacity}`;
}

export function getState(token: Token): BgState {
  const d = token.document;
  const elev = getElevation(d);
  const tokenObj = token as unknown as { controlled?: boolean };
  const selected = +(tokenObj.controlled ?? false);
  const geoKey = buildGeoKey(token, elev, selected);
  const shadowKey = buildShadowKey(d);
  return { geoKey, shadowKey };
}
