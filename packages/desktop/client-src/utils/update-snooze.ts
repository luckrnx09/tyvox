const STORAGE_KEY = "tyvox.updateSnoozedUntil";
const SNOOZE_DURATION_MS = 5 * 24 * 60 * 60 * 1000;

export function isUpdateSnoozed(now: number = Date.now()): boolean {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return false;
  const until = Number(raw);
  if (Number.isNaN(until)) return false;
  return until > now;
}

export function snoozeUpdates(now: number = Date.now()): void {
  localStorage.setItem(STORAGE_KEY, String(now + SNOOZE_DURATION_MS));
}
