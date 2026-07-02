// e2e helpers — Foundry connection, GM login, fixture scenes, slice-dump oracles (VERIFY.md I2).
import { chromium } from "playwright";

export const BASE_URL = process.env.ISOROLL_URL ?? "http://localhost:30000";

export async function connect() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await loginGM(page);
  return { browser, page };
}

async function waitReady(page) {
  await page.waitForFunction(() => globalThis.game?.ready === true, null, { timeout: 60000 });
  // No active scene (e.g. after fixture cleanup) is a valid ready state — specs
  // activate their own fixture scenes.
  await page.waitForFunction(
    () => {
      const active = globalThis.game.scenes?.active;
      const ready = globalThis.canvas?.ready === true;
      return ready || !active;
    },
    null,
    { timeout: 60000 },
  );
}

async function loginGM(page) {
  await page.goto(`${BASE_URL}/join`, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/game")) {
    return waitReady(page);
  }
  await page.waitForSelector('select[name="userid"]', { timeout: 15000 });
  const uid = await page.evaluate(() => {
    const sel = document.querySelector('select[name="userid"]');
    let fallback = "";
    for (const o of sel.options) {
      if (!o.value) {
        continue;
      }
      if (!fallback) {
        fallback = o.value;
      }
      if (/gamemaster|gm/i.test(o.textContent)) {
        return o.value;
      }
    }
    return fallback;
  });
  // Set value via JS: Foundry marks already-connected users disabled client-side,
  // but the server accepts a re-join (kicks the other session — dev world only).
  await page.evaluate((value) => {
    const sel = document.querySelector('select[name="userid"]');
    sel.value = value;
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  }, uid);
  await page.click('button[name="join"], button[type="submit"]');
  await page.waitForURL("**/game*", { timeout: 30000 });
  await waitReady(page);
}

// Create (replacing any prior copy) and activate a fixture scene. Names must start "fx-".
export async function loadFixture(page, fx) {
  await page.evaluate(async (f) => {
    const existing = game.scenes.filter((s) => s.name === f.name);
    for (const s of existing) {
      await s.delete();
    }
    const scene = await Scene.create({
      name: f.name,
      width: f.width ?? 4000,
      height: f.height ?? 3000,
      grid: { size: f.gridSize ?? 100, type: 1 },
      padding: 0,
      tokenVision: false,
      fog: { exploration: false },
      backgroundColor: "#101010",
      flags: { isoroll: { enabled: true } },
    });
    await scene.activate();
  }, fx);
  await page.waitForFunction(
    (name) => globalThis.canvas?.ready === true && globalThis.canvas?.scene?.name === name,
    fx.name,
    { timeout: 60000 },
  );
  await page.waitForTimeout(1200);
}

export async function deleteFixtureScenes(page) {
  await page.evaluate(async () => {
    const keeper = game.scenes.find((s) => !s.name.startsWith("fx-"));
    if (keeper && game.scenes.active?.name?.startsWith("fx-")) {
      await keeper.activate();
    }
    const fixtures = game.scenes.filter((s) => s.name.startsWith("fx-"));
    for (const s of fixtures) {
      await s.delete();
    }
  });
}

// tiles: array of Foundry Tile creation data. v14: doc x/y is the tile CENTER.
export async function createTiles(page, tiles) {
  return page.evaluate(async (defs) => {
    const docs = await canvas.scene.createEmbeddedDocuments("Tile", defs);
    return docs.map((d) => d.id);
  }, tiles);
}

export async function waitSlices(page, minCount) {
  await page.waitForFunction(
    (n) => {
      const d = globalThis.isoroll?.dumpZOrderJSON?.();
      return Array.isArray(d) && d.length >= n;
    },
    minCount,
    { timeout: 30000 },
  );
}

export function dump(page) {
  return page.evaluate(() => globalThis.isoroll.dumpZOrderJSON());
}

// ── Oracles (pure JSON logic — no vision) ────────────────────────────────────

export function crossTileTies(d) {
  const ties = [];
  for (let i = 0; i < d.length; i++) {
    for (let j = i + 1; j < d.length; j++) {
      if (d[i].tileId !== d[j].tileId && d[i].zIndex === d[j].zIndex) {
        ties.push([d[i], d[j]]);
      }
    }
  }
  return ties;
}

function overlaps(a, b) {
  const pad = 2; // ignore touching edges
  const xOverlap = a.x + pad < b.x + b.w && b.x + pad < a.x + a.w;
  const yOverlap = a.y + pad < b.y + b.h && b.y + pad < a.y + a.h;
  return xOverlap && yOverlap;
}

// Screen-overlapping slices of different tiles at different depths must be
// zIndex-ordered by depth (elev-0 fixtures: depth = row - col).
export function zOrderViolations(d) {
  const violations = [];
  for (let i = 0; i < d.length; i++) {
    for (let j = i + 1; j < d.length; j++) {
      const a = d[i];
      const b = d[j];
      if (a.tileId === b.tileId || a.depth === b.depth) {
        continue;
      }
      if (!overlaps(a.bounds, b.bounds)) {
        continue;
      }
      if (a.depth < b.depth !== a.zIndex < b.zIndex) {
        violations.push([a, b]);
      }
    }
  }
  return violations;
}

// Stable identity view of a dump for before/after comparisons.
export function normalize(d) {
  const rows = d.map((s) => ({ tileId: s.tileId, slice: s.slice, col: s.col, row: s.row, depth: s.depth, zIndex: s.zIndex }));
  rows.sort((a, b) => a.tileId.localeCompare(b.tileId) || a.slice - b.slice);
  return rows;
}
