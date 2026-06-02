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
  return (globalThis as unknown as { FilePicker: FP }).FilePicker;
}

export function deriveKey(src: string): string {
  return src.split("?")[0].split("#")[0].toLowerCase();
}

function keyToParts(key: string): { dir: string; filename: string } {
  const slash = key.lastIndexOf("/");
  if (slash === -1) return { dir: "", filename: key + ".json" };
  return { dir: key.slice(0, slash), filename: key.slice(slash + 1) + ".json" };
}

async function ensureKeyDir(key: string): Promise<void> {
  if (!baseDirEnsured) {
    try { await fp().createDirectory("data", "isoroll", {}); } catch { /* exists */ }
    try { await fp().createDirectory("data", BASE_DIR, {}); } catch { /* exists */ }
    baseDirEnsured = true;
  }
  const segments = key.split("/").slice(0, -1);
  let path = BASE_DIR;
  for (const seg of segments) {
    path = `${path}/${seg}`;
    if (!ensuredDirs.has(path)) {
      try { await fp().createDirectory("data", path, {}); } catch { /* exists */ }
      ensuredDirs.add(path);
    }
  }
}

async function uploadFile(uploadDir: string, filename: string, json: string): Promise<void> {
  await fp().upload(
    "data", uploadDir,
    new File([json], filename, { type: "application/json" }),
    {}, { notify: false },
  );
}

async function writeIndex(): Promise<void> {
  const obj: Record<string, IsorollPreset> = {};
  for (const [k, v] of presetCache) obj[k] = v;
  try {
    await uploadFile(BASE_DIR, "_index.json", JSON.stringify(obj));
  } catch (e) {
    console.warn("isoroll | preset index write failed", e);
  }
}

export function getCachedPreset(key: string): IsorollPreset | undefined {
  return presetCache.get(key);
}

export async function preloadCache(): Promise<void> {
  try {
    const res = await fetch(INDEX_URL);
    if (!res.ok) return;
    const index = await res.json() as Record<string, IsorollPreset>;
    for (const [k, v] of Object.entries(index)) presetCache.set(k, v);
  } catch { /* first run — no index yet */ }
}

export async function readPreset(key: string): Promise<IsorollPreset | null> {
  const cached = presetCache.get(key);
  if (cached) return cached;
  try {
    const { dir, filename } = keyToParts(key);
    const url = dir ? `/${BASE_DIR}/${dir}/${filename}` : `/${BASE_DIR}/${filename}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json() as IsorollPreset;
    presetCache.set(key, data);
    return data;
  } catch {
    return null;
  }
}

export async function writePreset(preset: IsorollPreset): Promise<void> {
  try {
    const { dir, filename } = keyToParts(preset.imageKey);
    await ensureKeyDir(preset.imageKey);
    const uploadDir = dir ? `${BASE_DIR}/${dir}` : BASE_DIR;
    await uploadFile(uploadDir, filename, JSON.stringify(preset, null, 2));
    presetCache.set(preset.imageKey, preset);
    await writeIndex();
  } catch (e) {
    console.warn("isoroll | preset write failed", e);
  }
}
