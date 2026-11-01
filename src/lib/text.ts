/** "JUAN pérez" → "Juan Pérez". Respeta separadores como guiones y apóstrofes. */
export function toTitleCase(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("es-AR")
    .replace(/(^|[\s\-'])(\p{L})/gu, (_match, separator: string, letter: string) =>
      `${separator}${letter.toLocaleUpperCase("es-AR")}`,
    );
}
