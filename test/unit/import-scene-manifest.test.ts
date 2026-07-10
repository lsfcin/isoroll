// T1 unit test — import-scene-manifest: validate-before-write atomicity guard (C3).
// Seam per 3-arch.md: malformed manifest ⇒ validateManifest returns ≥1 error AND
// importSceneManifest throws with ZERO createEmbeddedDocuments calls (mock scene, assert 0 writes).
import { describe, expect, it, vi, beforeEach } from "vitest";
import { importSceneManifest } from "../../src/import/import-scene-manifest";
import type { SceneManifest } from "../../src/import/manifest-types";

function mockScene() {
  const createEmbeddedDocuments = vi.fn();
  (globalThis as unknown as { canvas: { scene: unknown } }).canvas.scene = {
    createEmbeddedDocuments,
    updateEmbeddedDocuments: vi.fn(),
    deleteEmbeddedDocuments: vi.fn(),
  };
  return createEmbeddedDocuments;
}

beforeEach(() => {
  delete (globalThis as unknown as { canvas: { scene?: unknown } }).canvas.scene;
});

describe("importSceneManifest — atomic validate-before-write guard", () => {
  it("rejects a malformed manifest and performs zero createEmbeddedDocuments calls", async () => {
    const createEmbeddedDocuments = mockScene();
    // wall.bx=5 is out of [0,1] — malformed per manifest-validate rules.
    const malformed: SceneManifest = {
      scene: "bad",
      view: "NW",
      pxPerVoxel: 96,
      tiles: [
        {
          piece: "floor",
          asset: "floor.png",
          facing: "NW",
          u: 0,
          v: 0,
          boundHeight: 0,
          imageOffset: [0, 0],
          pxPerVoxel: 96,
        },
      ],
      walls: [{ ax: 0, ay: 0, bx: 5, by: 0, topOffset: 3, bottomOffset: 0, config: {} }],
    };
    await expect(importSceneManifest(malformed)).rejects.toThrow();
    expect(createEmbeddedDocuments).not.toHaveBeenCalled();
  });
});
