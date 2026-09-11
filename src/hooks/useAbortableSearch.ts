import { useEffect, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";

/**
 * Búsqueda con debounce + AbortController: al cambiar el texto se cancela
 * la petición anterior (mismo patrón mental que los search de concesionarias).
 */
export function useAbortableSearch<T>({
  query,
  minLength = 2,
  delayMs = 300,
  enabled = true,
  searchFn,
}: {
  query: string;
  minLength?: number;
  delayMs?: number;
  enabled?: boolean;
  searchFn: (query: string, signal: AbortSignal) => Promise<T[]>;
}) {
  const debouncedQuery = useDebounce(query, delayMs);
  const [results, setResults] = useState<T[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setResults([]);
      setIsSearching(false);
      setError(null);
      return;
    }

    const trimmed = debouncedQuery.trim();
    if (trimmed.length < minLength) {
      setResults([]);
      setIsSearching(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setIsSearching(true);
    setError(null);

    void searchFn(trimmed, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setResults(data);
        setIsSearching(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const name = err instanceof Error ? err.name : "";
        if (name === "AbortError") return;
        setResults([]);
        setIsSearching(false);
        setError(err instanceof Error ? err.message : "No se pudo buscar");
      });

    return () => {
      controller.abort();
    };
  }, [debouncedQuery, enabled, minLength, searchFn]);

  return {
    results,
    isSearching,
    error,
    debouncedQuery,
    canSearch: enabled && debouncedQuery.trim().length >= minLength,
  };
}
