/** Claves comunes de paginación y búsqueda en listados. */
export const LIST_QUERY_KEYS = {
  page: "page",
  pageSize: "pageSize",
  q: "q",
} as const;

/**
 * Entero ≥ 1. Valores inválidos o vacíos devuelven `undefined`.
 */
export function parsePositiveInt(raw: string | null): number | undefined {
  if (raw === null || raw === "") return undefined;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return undefined;
  return n;
}

/** Borra las claves indicadas del query (p. ej. antes de reescribir un listado). */
export function deleteQueryKeys(
  target: URLSearchParams,
  keys: readonly string[],
): void {
  for (const key of keys) {
    target.delete(key);
  }
}
