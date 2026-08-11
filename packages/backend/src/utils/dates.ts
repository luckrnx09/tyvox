export const MS_PER_DAY = 86_400_000;

export function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / MS_PER_DAY));
}
