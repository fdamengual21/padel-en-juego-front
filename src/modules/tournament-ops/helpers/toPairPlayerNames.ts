/** Nombres por pareja: el JSON trae string[]; la UI usa tupla de dos. */
export function toPairPlayerNames(
  raw: Record<string, string[]> | null | undefined,
): Record<string, [string, string]> {
  const names: Record<string, [string, string]> = {};
  for (const [id, value] of Object.entries(raw ?? {})) {
    names[id] = [value?.[0] ?? "Jugador", value?.[1] ?? ""];
  }
  return names;
}
