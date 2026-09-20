export interface PageQuery {
  /** Página 1-based. */
  page?: number;
  pageSize?: number;
  /** Texto libre de búsqueda. */
  q?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export function normalizePageQuery(
  query?: PageQuery,
  defaults: { page?: number; pageSize?: number } = {},
): Required<Pick<PageQuery, "page" | "pageSize">> & { q: string } {
  const pageSize = Math.max(1, query?.pageSize ?? defaults.pageSize ?? 8);
  const page = Math.max(1, query?.page ?? defaults.page ?? 1);
  return { page, pageSize, q: query?.q?.trim() ?? "" };
}

export function paginateItems<T>(
  items: T[],
  page: number,
  pageSize: number,
): PaginatedResult<T> {
  const safePageSize = Math.max(1, pageSize);
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * safePageSize;
  return {
    items: items.slice(start, start + safePageSize),
    page: safePage,
    pageSize: safePageSize,
    totalItems,
    totalPages,
  };
}
