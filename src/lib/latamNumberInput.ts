/**
 * Formato numérico tipo latinoamericano para inputs (mismo enfoque que
 * concecionarias-suite-web): miles con punto en pantalla; valor compacto
 * solo dígitos (y coma decimal si aplica).
 */

export interface FormatLatamDisplayOptions {
  /** No insertar puntos de miles (p. ej. marcador / año). */
  disableThousands?: boolean;
}

export interface ParseLatamDisplayOptions {
  integerOnly?: boolean;
  maxFractionDigits?: number;
  maxIntegerDigits?: number;
}

export function addThousandsDots(integerDigits: string): string {
  if (!integerDigits) return "";
  return integerDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function formatLatamCompactForDisplay(
  compact: string,
  options?: FormatLatamDisplayOptions,
): string {
  const trimmed = (compact ?? "").trim();
  if (!trimmed) return "";

  const commaIdx = trimmed.indexOf(",");
  const intCompact = commaIdx === -1 ? trimmed : trimmed.slice(0, commaIdx);
  const fracCompact = commaIdx === -1 ? undefined : trimmed.slice(commaIdx + 1);
  const intDigits = intCompact.replace(/\D/g, "");

  if (options?.disableThousands) {
    return fracCompact !== undefined
      ? `${intDigits},${fracCompact.replace(/\D/g, "")}`
      : intDigits;
  }

  const intShown = addThousandsDots(intDigits);
  if (fracCompact === undefined) return intShown;
  return `${intShown},${fracCompact.replace(/\D/g, "")}`;
}

export function parseLatamDisplayToCompact(
  display: string,
  options?: ParseLatamDisplayOptions,
): string {
  let s = display.trim();
  if (!s) return "";

  if (options?.integerOnly) {
    const comma = s.indexOf(",");
    const head = comma === -1 ? s : s.slice(0, comma);
    return head
      .replace(/\./g, "")
      .replace(/\D/g, "")
      .slice(0, options.maxIntegerDigits ?? 99);
  }

  const commaIdx = s.indexOf(",");
  if (commaIdx !== -1) {
    let intFinal = s
      .slice(0, commaIdx)
      .replace(/\./g, "")
      .replace(/\D/g, "");
    let fracPart = s.slice(commaIdx + 1).replace(/\D/g, "");
    if (options?.maxIntegerDigits !== undefined) {
      intFinal = intFinal.slice(0, options.maxIntegerDigits);
    }
    if (options?.maxFractionDigits !== undefined) {
      fracPart = fracPart.slice(0, options.maxFractionDigits);
    }
    return `${intFinal},${fracPart}`;
  }

  let intFinal = s.replace(/\./g, "").replace(/\D/g, "");
  if (options?.maxIntegerDigits !== undefined) {
    intFinal = intFinal.slice(0, options.maxIntegerDigits);
  }
  return intFinal;
}

/**
 * Cero / null → vacío para no quedar pegado con un `0` al tipear (cash entries).
 */
export function formatIntegerForForm(value: number | null | undefined): string {
  if (value == null || value === 0) return "";
  return String(value);
}

/** Texto de input → entero ≥ 0 (vacío = 0). */
export function parseIntegerFromForm(
  raw: string,
  options?: { max?: number; maxDigits?: number },
): number {
  const compact = parseLatamDisplayToCompact(raw, {
    integerOnly: true,
    maxIntegerDigits: options?.maxDigits ?? 2,
  });
  if (!compact) return 0;
  const n = Number(compact);
  if (!Number.isFinite(n)) return 0;
  const truncated = Math.max(0, Math.trunc(n));
  return options?.max != null ? Math.min(options.max, truncated) : truncated;
}
