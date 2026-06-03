export function scheduleWrap(fn: () => Promise<void>, label: string, delay = 0): void {
  setTimeout(() => fn().catch(e => console.warn(`isoroll | ${label} failed`, e)), delay);
}
