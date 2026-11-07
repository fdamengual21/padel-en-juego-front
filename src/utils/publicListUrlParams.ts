import {
  isCategoryGender,
  isCategoryLevel,
  type CategoryGender,
  type CategoryLevel,
} from "@/domain";
import {
  deleteQueryKeys,
  LIST_QUERY_KEYS,
  parsePositiveInt,
} from "@/utils/listQueryParams";

export const PUBLIC_GEO_FILTER_KEYS = {
  q: LIST_QUERY_KEYS.q,
  provinceId: "provinceId",
  municipalityId: "municipalityId",
} as const;

/** Marca en URL: el usuario limpió geo; no re-sembrar desde el perfil al refrescar. */
export const PUBLIC_GEO_CLEARED_KEY = "geo";
export const PUBLIC_GEO_CLEARED_VALUE = "0";

export const PUBLIC_CATEGORY_FILTER_KEYS = {
  levels: "levels",
  genders: "genders",
} as const;

export const PUBLIC_LIST_QUERY_KEYS = {
  ...PUBLIC_GEO_FILTER_KEYS,
  ...PUBLIC_CATEGORY_FILTER_KEYS,
  geo: PUBLIC_GEO_CLEARED_KEY,
  page: LIST_QUERY_KEYS.page,
} as const;

const GEO_FILTER_KEY_LIST = Object.values(PUBLIC_GEO_FILTER_KEYS);
const LIST_KEY_LIST = Object.values(PUBLIC_LIST_QUERY_KEYS);

export interface PublicGeoFiltersUrlState {
  q: string;
  provinceId: number | null;
  municipalityId: number | null;
  /** True si el usuario limpió provincia/localidad a propósito (`geo=0` en la URL). */
  geoCleared: boolean;
}

export interface PublicCategoryFiltersUrlState {
  categoryLevels: CategoryLevel[];
  genders: CategoryGender[];
}

export interface PublicListUrlState
  extends PublicGeoFiltersUrlState,
    PublicCategoryFiltersUrlState {
  page: number;
}

export const DEFAULT_PUBLIC_GEO_FILTERS: PublicGeoFiltersUrlState = {
  q: "",
  provinceId: null,
  municipalityId: null,
  geoCleared: false,
};

export const DEFAULT_PUBLIC_CATEGORY_FILTERS: PublicCategoryFiltersUrlState = {
  categoryLevels: [],
  genders: [],
};

export const DEFAULT_PUBLIC_LIST_URL_STATE: PublicListUrlState = {
  ...DEFAULT_PUBLIC_GEO_FILTERS,
  ...DEFAULT_PUBLIC_CATEGORY_FILTERS,
  page: 1,
};

function parseCsv(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseCategoryLevels(raw: string | null): CategoryLevel[] {
  const levels = parseCsv(raw)
    .map((part) => Number.parseInt(part, 10))
    .filter(isCategoryLevel);
  return [...new Set(levels)].sort((a, b) => a - b);
}

function parseCategoryGenders(raw: string | null): CategoryGender[] {
  const genders = parseCsv(raw).filter(isCategoryGender);
  const order: CategoryGender[] = ["male", "female", "mixed"];
  return order.filter((gender) => genders.includes(gender));
}

export function parsePublicGeoFiltersSearchParams(
  params: URLSearchParams,
): PublicGeoFiltersUrlState {
  return {
    q: params.get(PUBLIC_GEO_FILTER_KEYS.q)?.trim() ?? "",
    provinceId: parsePositiveInt(params.get(PUBLIC_GEO_FILTER_KEYS.provinceId)) ?? null,
    municipalityId:
      parsePositiveInt(params.get(PUBLIC_GEO_FILTER_KEYS.municipalityId)) ?? null,
    geoCleared: params.get(PUBLIC_GEO_CLEARED_KEY) === PUBLIC_GEO_CLEARED_VALUE,
  };
}

export function parsePublicListSearchParams(
  params: URLSearchParams,
): PublicListUrlState {
  return {
    ...parsePublicGeoFiltersSearchParams(params),
    categoryLevels: parseCategoryLevels(
      params.get(PUBLIC_CATEGORY_FILTER_KEYS.levels),
    ),
    genders: parseCategoryGenders(params.get(PUBLIC_CATEGORY_FILTER_KEYS.genders)),
    page: parsePositiveInt(params.get(PUBLIC_LIST_QUERY_KEYS.page)) ?? 1,
  };
}

function writeGeoFilters(
  target: URLSearchParams,
  state: PublicGeoFiltersUrlState,
): void {
  if (state.q.trim()) {
    target.set(PUBLIC_GEO_FILTER_KEYS.q, state.q.trim());
  }
  if (state.provinceId != null) {
    target.set(PUBLIC_GEO_FILTER_KEYS.provinceId, String(state.provinceId));
  }
  if (state.municipalityId != null) {
    target.set(
      PUBLIC_GEO_FILTER_KEYS.municipalityId,
      String(state.municipalityId),
    );
  }
  if (
    state.geoCleared &&
    state.provinceId == null &&
    state.municipalityId == null
  ) {
    target.set(PUBLIC_GEO_CLEARED_KEY, PUBLIC_GEO_CLEARED_VALUE);
  }
}

function writeCategoryFilters(
  target: URLSearchParams,
  state: PublicCategoryFiltersUrlState,
): void {
  if (state.categoryLevels.length > 0) {
    target.set(
      PUBLIC_CATEGORY_FILTER_KEYS.levels,
      state.categoryLevels.join(","),
    );
  }
  if (state.genders.length > 0) {
    target.set(PUBLIC_CATEGORY_FILTER_KEYS.genders, state.genders.join(","));
  }
}

export function mergePublicGeoFiltersToSearchParams(
  prev: URLSearchParams,
  state: PublicGeoFiltersUrlState,
): URLSearchParams {
  const next = new URLSearchParams(prev);
  deleteQueryKeys(next, [...GEO_FILTER_KEY_LIST, PUBLIC_GEO_CLEARED_KEY]);
  writeGeoFilters(next, state);
  return next;
}

export function mergePublicListToSearchParams(
  prev: URLSearchParams,
  state: PublicListUrlState,
): URLSearchParams {
  const next = new URLSearchParams(prev);
  deleteQueryKeys(next, LIST_KEY_LIST);
  writeGeoFilters(next, state);
  writeCategoryFilters(next, state);
  if (state.page > 1) {
    next.set(PUBLIC_LIST_QUERY_KEYS.page, String(state.page));
  }
  return next;
}

export function hasActivePublicGeoFilters(
  state: PublicGeoFiltersUrlState,
): boolean {
  return Boolean(state.q.trim()) || state.provinceId != null || state.municipalityId != null;
}

export function hasActivePublicListFilters(state: PublicListUrlState): boolean {
  return (
    hasActivePublicGeoFilters(state) ||
    state.categoryLevels.length > 0 ||
    state.genders.length > 0
  );
}

/** True si la URL trae provincia o localidad explícitas (aunque el valor sea inválido y se ignore). */
export function publicListUrlHasExplicitGeo(params: URLSearchParams): boolean {
  return (
    params.has(PUBLIC_GEO_FILTER_KEYS.provinceId) ||
    params.has(PUBLIC_GEO_FILTER_KEYS.municipalityId)
  );
}

/**
 * No sembrar geo del perfil: ya hay provincia/localidad, el usuario limpió (`geo=0`),
 * o la URL ya tiene otros filtros (búsqueda, categorías, página).
 */
export function publicListUrlShouldSkipProfileGeoSeed(
  params: URLSearchParams,
): boolean {
  if (publicListUrlHasExplicitGeo(params)) return true;
  if (params.get(PUBLIC_GEO_CLEARED_KEY) === PUBLIC_GEO_CLEARED_VALUE) return true;
  return (
    params.has(PUBLIC_GEO_FILTER_KEYS.q) ||
    params.has(PUBLIC_CATEGORY_FILTER_KEYS.levels) ||
    params.has(PUBLIC_CATEGORY_FILTER_KEYS.genders) ||
    params.has(PUBLIC_LIST_QUERY_KEYS.page)
  );
}
