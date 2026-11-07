import { useCallback, useEffect, useRef, useState } from "react";
import { useUser } from "@/app/UserProvider";
import type { CategoryGender, CategoryLevel } from "@/domain";
import { useDebounce } from "@/hooks/useDebounce";
import { useDebouncedFilterUrlCommit } from "@/hooks/useDebouncedFilterUrlCommit";
import { useUrlListState } from "@/hooks/useUrlListState";
import { useAuthStore } from "@/stores/authStore";
import {
  DEFAULT_PUBLIC_LIST_URL_STATE,
  hasActivePublicListFilters,
  mergePublicListToSearchParams,
  parsePublicListSearchParams,
  publicListUrlShouldSkipProfileGeoSeed,
  type PublicListUrlState,
} from "@/utils/publicListUrlParams";

const SEARCH_DEBOUNCE_MS = 350;

export interface UsePublicGeoListUrlStateOptions {
  /** Si es false, no escribe `page` en la URL (rankings). Default true. */
  includePage?: boolean;
}

export interface PublicGeoListUrlControls {
  state: PublicListUrlState;
  searchInput: string;
  setSearchInput: (value: string) => void;
  ready: boolean;
  hasActiveFilters: boolean;
  canClearFilters: boolean;
  clearFilters: () => void;
  setProvinceId: (provinceId: number | null) => void;
  setMunicipalityId: (municipalityId: number | null) => void;
  setCategoryLevels: (levels: CategoryLevel[]) => void;
  setGenders: (genders: CategoryGender[]) => void;
  setPage: (page: number) => void;
  applyStatePatch: (
    patch: Partial<PublicListUrlState> | ((previous: PublicListUrlState) => PublicListUrlState),
  ) => void;
}

function useSessionIdentityKey(): string {
  const { isResolvingUser } = useUser();
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.user?.id);
  if (isResolvingUser) return "pending";
  if (token?.trim()) return userId ?? "pending";
  return "guest";
}

function mergeFiltersOnly(
  prev: URLSearchParams,
  state: PublicListUrlState,
): URLSearchParams {
  const next = mergePublicListToSearchParams(prev, { ...state, page: 1 });
  next.delete("page");
  return next;
}

/**
 * Filtros públicos (q + geo + categoría/género [+ page]) sincronizados con el query string.
 * Seed de geografía del perfil solo en URL prístina (sin filtros ni `geo=0`).
 */
export function usePublicGeoListUrlState(
  options: UsePublicGeoListUrlStateOptions = {},
): PublicGeoListUrlControls {
  const includePage = options.includePage !== false;
  const identityKey = useSessionIdentityKey();
  const user = useAuthStore((s) => s.user);

  const { state, searchParams, applyStatePatch } = useUrlListState({
    parse: parsePublicListSearchParams,
    merge: includePage ? mergePublicListToSearchParams : mergeFiltersOnly,
  });

  const [searchInput, setSearchInput] = useState(() => state.q);
  const [geoSeeded, setGeoSeeded] = useState(false);
  const geoSeededForIdentityRef = useRef<string | null>(null);
  const debouncedSearch = useDebounce(searchInput.trim(), SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    setSearchInput(state.q);
  }, [state.q]);

  useEffect(() => {
    if (identityKey === "pending") return;
    if (geoSeededForIdentityRef.current === identityKey) {
      if (!geoSeeded) setGeoSeeded(true);
      return;
    }

    geoSeededForIdentityRef.current = identityKey;
    setGeoSeeded(true);

    if (publicListUrlShouldSkipProfileGeoSeed(searchParams)) return;

    const provinceId = user?.provinceId ?? null;
    const municipalityId = user?.municipalityId ?? null;

    applyStatePatch((prev) => {
      if (
        prev.provinceId === provinceId &&
        prev.municipalityId === municipalityId
      ) {
        return prev;
      }
      return {
        ...prev,
        provinceId,
        municipalityId,
        geoCleared: false,
      };
    });
    // Solo al resolver identidad: no re-sembrar si el usuario limpia provincia.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-shot seed
  }, [identityKey]);

  const commitSearch = useCallback(
    (trimmed: string) => {
      applyStatePatch((prev) => ({ ...prev, q: trimmed, page: 1 }));
    },
    [applyStatePatch],
  );

  useDebouncedFilterUrlCommit({
    debouncedValue: debouncedSearch,
    inputValue: searchInput,
    urlValue: state.q,
    onCommit: commitSearch,
  });

  const setProvinceId = useCallback(
    (provinceId: number | null) => {
      applyStatePatch((prev) => ({
        ...prev,
        provinceId,
        municipalityId: null,
        geoCleared: provinceId == null,
        page: 1,
      }));
    },
    [applyStatePatch],
  );

  const setMunicipalityId = useCallback(
    (municipalityId: number | null) => {
      applyStatePatch((prev) => ({
        ...prev,
        municipalityId,
        geoCleared: prev.provinceId == null && municipalityId == null,
        page: 1,
      }));
    },
    [applyStatePatch],
  );

  const setCategoryLevels = useCallback(
    (categoryLevels: CategoryLevel[]) => {
      applyStatePatch((prev) => ({ ...prev, categoryLevels, page: 1 }));
    },
    [applyStatePatch],
  );

  const setGenders = useCallback(
    (genders: CategoryGender[]) => {
      applyStatePatch((prev) => ({ ...prev, genders, page: 1 }));
    },
    [applyStatePatch],
  );

  const setPage = useCallback(
    (page: number) => {
      applyStatePatch((prev) => ({ ...prev, page }));
    },
    [applyStatePatch],
  );

  const clearFilters = useCallback(() => {
    setSearchInput("");
    applyStatePatch({
      ...DEFAULT_PUBLIC_LIST_URL_STATE,
      geoCleared: true,
    });
  }, [applyStatePatch]);

  const hasActiveFilters = hasActivePublicListFilters(state);

  return {
    state,
    searchInput,
    setSearchInput,
    ready: identityKey !== "pending" && geoSeeded,
    hasActiveFilters,
    canClearFilters: hasActiveFilters || Boolean(searchInput.trim()),
    clearFilters,
    setProvinceId,
    setMunicipalityId,
    setCategoryLevels,
    setGenders,
    setPage,
    applyStatePatch,
  };
}
