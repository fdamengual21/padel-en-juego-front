import { useEffect, useState } from "react";

/**
 * Copia el valor con retraso (como en concesionarias-suite-web).
 * Sirve para disparar búsquedas sin pegarle a la API en cada tecla.
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebounced(value);
    }, delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
