export const GEOGRAPHY_PROVINCES_ENTRY_KEY = "provinces";

export function municipalitiesEntryKey(provinceId: number): string {
  return `municipalities:${provinceId}`;
}
