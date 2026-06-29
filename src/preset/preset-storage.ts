import type { IsorollPreset } from "./preset-types";

const BASE_DIR  = "isoroll/presets";
const INDEX_URL = `/${BASE_DIR}/_index.json`;

let baseDirEnsured = false;
const ensuredDirs  = new Set<string>();
const presetCache  = new Map<string, IsorollPreset>();

type FP = {
  createDirectory(source: string, path: string, options: object): Promise<string>;
  upload(source: string, path: string, file: File, body: object, options: object): Promise<unknown>;
};

function fp(): FP {
  type V14 = { foundry?: { applications?: { apps?: { FilePicker?: { implementation?: FP } } } } };
  const gv14 = globalThis as unknown as V14;
  const foundryApps = gv14.foundry?.applications;
  const foundryAppsApps = foundryApps?.apps;
  const v14impl = foundryAppsApps?.FilePicker?.implementation;
  const glegacy = globalThis as unknown as { FilePicker: FP };
  const result = v14impl ?? glegacy.FilePicker;
  return result;
}

export function deriveKey(src: string): string {
  const withoutQuery = src.split("?")[0];
  const withoutHash = withoutQuery.split("#")[0];
  return withoutHash.toLowerCase();
}

function keyToParts(key: string): { dir: string; filename: string } {
  const slash = key.lastIndexOf("/");
  let result: { dir: string; filename: string };
  if (slash === -1) {
    result = { dir: "", filename: key + ".json" };
  } else {
    const dir = key.slice(0, slash);
    const base = key.slice(slash + 1);
    result = { dir, filename: base + ".json" };
  }
  return result;
}

async function tryMkdir(path: string): Promise<void> {
  const fpInst = fp();
  try {
    await fpInst.createDirectory("data", path, {});
  } catch { /* exists */ }
}

async function ensureKeyDir(key: string): Promise<void> {
  if (!baseDirEnsured) {
    await tryMkdir("isoroll");
    await tryMkdir(BASE_DIR);
    baseDirEnsured = true;
  }
  const allParts = key.split("/");
  const segments = allParts.slice(0, -1);
  let path = BASE_DIR;
  for (const seg of segments) {
    path = `${path}/${seg}`;
    if (!ensuredDirs.has(path)) {
      await tryMkdir(path);
      ensuredDirs.add(path);
    }
  }
}

async function uploadFile(uploadDir: string, filename: string, json: string): Promise<void> {
  const fpInst = fp();
  const jsonFile = new File([json], filename, { type: "application/json" });
  await fpInst.upload(
    "data", uploadDir,
    jsonFile,
    {}, { notify: false },
  );
}

async function writeIndex(): Promise<void> {
  const obj: Record<string, IsorollPreset> = {};
  for (const [k, v] of presetCache) {
    obj[k] = v;
  }
  try {
    const json = JSON.stringify(obj);
    await uploadFile(BASE_DIR, "_index.json", json);
  } catch (e) {
    console.warn("isoroll | preset index write failed", e);
  }
}

export function getCachedPreset(key: string): IsorollPreset | undefined {
  return presetCache.get(key);
}

async function ensureBaseDir(): Promise<void> {
  if (!baseDirEnsured) {
    await tryMkdir("isoroll");
    await tryMkdir(BASE_DIR);
    baseDirEnsured = true;
  }
}

export async function preloadCache(): Promise<void> {
  try {
    const res = await fetch(INDEX_URL);
    if (!res.ok) {
      await ensureBaseDir();
      await writeIndex(); // create empty index so next session is clean
      return;
    }
    const index = await res.json() as Record<string, IsorollPreset>;
    const entries = Object.entries(index);
    for (const [k, v] of entries) {
      presetCache.set(k, v);
    }
    if (presetCache.size) {
      console.log(`isoroll | ${presetCache.size} image preset(s) loaded`);
    }
  } catch (e) { console.warn("[isoroll:preset] preloadCache error:", e); }
}

export async function readPreset(key: string): Promise<IsorollPreset | null> {
  const cached = presetCache.get(key);
  let result: IsorollPreset | null;
  if (cached) {
    result = cached;
  } else {
    try {
      const { dir, filename } = keyToParts(key);
      const url = dir ? `/${BASE_DIR}/${dir}/${filename}` : `/${BASE_DIR}/${filename}`;
      const res = await fetch(url);
      if (!res.ok) {
        result = null;
      } else {
        const data = await res.json() as IsorollPreset;
        presetCache.set(key, data);
        result = data;
      }
    } catch {
      result = null;
    }
  }
  return result;
}

export async function writePreset(preset: IsorollPreset): Promise<void> {
  try {
    const { dir, filename } = keyToParts(preset.imageKey);
    await ensureKeyDir(preset.imageKey);
    const uploadDir = dir ? `${BASE_DIR}/${dir}` : BASE_DIR;
    const json = JSON.stringify(preset, null, 2);
    await uploadFile(uploadDir, filename, json);
    presetCache.set(preset.imageKey, preset);
    await writeIndex();
  } catch (e) {
    console.warn("isoroll | preset write failed", e);
  }
}
