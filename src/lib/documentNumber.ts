/** DNI argentino: 7 u 8 dígitos, sin unique en base. */

export function normalizeDocumentNumber(value: string | null | undefined): string {
  return String(value ?? "").replace(/\D/g, "");
}

export function isValidArgentineDni(value: string | null | undefined): boolean {
  const digits = normalizeDocumentNumber(value);
  return digits.length === 7 || digits.length === 8;
}
