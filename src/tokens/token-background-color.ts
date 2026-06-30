// Elevation line color helpers: resolve user color and elev-line color for a token.

import { VolumeFlags } from "../core";

type UserLike = { isGM?: boolean; color?: { css?: string } | string };

export function resolveUserColor(u: UserLike): number | null {
  const raw = u.color;
  const c = typeof raw === "string" ? raw : (raw as { css?: string } | undefined)?.css;
  let result: number | null = null;
  if (c) {
    const stripped = c.replace("#", "");
    result = parseInt(stripped, 16);
  }
  return result;
}

export function resolveElevLineColor(token: Token): number {
  let result: number;
  if (VolumeFlags.getElevLineColor(token.document) !== "player") {
    result = 0x000000;
  } else {
    const actorDoc = (token.document as unknown as { actor?: { ownership?: Record<string, number> } }).actor;
    const own = actorDoc?.ownership ?? {};
    let gm: number | null = null;
    let nonGmColor: number | null = null;
    for (const [uid, lvl] of Object.entries(own)) {
      if (lvl < 3) {
        continue;
      }
      const users = game.users as unknown as { get(id: string): UserLike | undefined };
      const u = users.get(uid);
      const h = u ? resolveUserColor(u) : null;
      if (h === null) {
        continue;
      }
      if (!u!.isGM) {
        nonGmColor = h;
        break;
      }
      gm = h;
    }
    if (nonGmColor !== null) {
      result = nonGmColor;
    } else {
      const gameUser = game.user as unknown as UserLike;
      const gameUserColor = resolveUserColor(gameUser);
      result = gm ?? gameUserColor ?? 0x000000;
    }
  }
  return result;
}
