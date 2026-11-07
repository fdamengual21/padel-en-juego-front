import { useEffect } from "react";

export interface UseDebouncedFilterUrlCommitOptions {
  /** Valor debounced del campo de texto. */
  debouncedValue: string;
  /** Valor actual del input (sin debounce). */
  inputValue: string;
  /** Valor ya persistido en la URL (trimmed). */
  urlValue: string;
  /** Se incrementa al limpiar filtros; reinicia el input local. */
  filterResetKey?: number;
  /** Escribe en la URL cuando el debounce está alineado con el input. */
  onCommit: (trimmed: string) => void;
}

/**
 * Commitea un filtro de texto debounced a la URL solo cuando:
 * - el debounce alcanzó al valor actual del input (no hay tecleo pendiente), y
 * - el valor difiere del query string.
 */
export function useDebouncedFilterUrlCommit({
  debouncedValue,
  inputValue,
  urlValue,
  filterResetKey = 0,
  onCommit,
}: UseDebouncedFilterUrlCommitOptions): void {
  useEffect(() => {
    const inputTrimmed = inputValue.trim();
    if (debouncedValue !== inputTrimmed) {
      return;
    }
    if (debouncedValue === urlValue.trim()) {
      return;
    }
    onCommit(debouncedValue);
  }, [debouncedValue, filterResetKey, inputValue, onCommit, urlValue]);
}
