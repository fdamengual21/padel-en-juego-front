import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

export interface UseUrlListStateOptions<TState> {
  /** Lee el estado completo del listado desde la URL actual. */
  parse: (searchParams: URLSearchParams) => TState;
  /** Escribe el estado en una copia de `prev` (puede borrar claves propias del listado). */
  merge: (prev: URLSearchParams, state: TState) => URLSearchParams;
}

/**
 * Sincroniza un listado con el query string: lectura vía `parse` en cada cambio de URL;
 * escritura con `replace: true` para no saturar el historial al filtrar.
 *
 * `applyStatePatch` usa el updater funcional de `setSearchParams` para que dos
 * patches en el mismo tick (p. ej. provincia + limpiar localidad) se compongan.
 */
export function useUrlListState<TState>({
  parse,
  merge,
}: UseUrlListStateOptions<TState>) {
  const [searchParams, setSearchParams] = useSearchParams();

  const state = useMemo(() => parse(searchParams), [parse, searchParams]);

  const replaceState = useCallback(
    (next: TState, options?: { freshBase?: boolean }) => {
      setSearchParams(
        (prev) => {
          const base = options?.freshBase
            ? new URLSearchParams()
            : new URLSearchParams(prev);
          return merge(base, next);
        },
        { replace: true },
      );
    },
    [merge, setSearchParams],
  );

  const applyStatePatch = useCallback(
    (patch: Partial<TState> | ((previous: TState) => TState)) => {
      setSearchParams(
        (prev) => {
          const current = parse(prev);
          const next =
            typeof patch === "function"
              ? patch(current)
              : ({ ...current, ...patch } as TState);
          return merge(new URLSearchParams(prev), next);
        },
        { replace: true },
      );
    },
    [merge, parse, setSearchParams],
  );

  /** Restaura defaults en el formulario vía URL; borra todas las claves del listado en el query. */
  const resetUrlState = useCallback(
    (defaultState: TState) => {
      replaceState(defaultState, { freshBase: true });
    },
    [replaceState],
  );

  return {
    state,
    searchParams,
    replaceState,
    applyStatePatch,
    resetUrlState,
  };
}
