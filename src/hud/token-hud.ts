// TokenHUD repositioning is handled by patchTokenHUDProto in ruler-patch.ts,
// using the same _updatePosition pattern as TileHUD.
export class TokenHud {
  static activate(): void { /* positioning registered via registerRulerPatch */ }
}
