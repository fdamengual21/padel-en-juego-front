import type { PaginatedResult, TournamentCard, TournamentStatus } from "@/domain";

const STATUSES = new Set<string>([
  "draft",
  "registrationOpen",
  "inProgress",
  "finished",
  "cancelled",
]);

const CHIPS = new Set(["PENDING", "ACCEPTED", "WAITLIST"]);

export function asTournamentCard(raw: unknown): TournamentCard | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = asText(row.id);
  const name = asText(row.name);
  const startDate = asText(row.startDate);
  if (!id || !name || !startDate) return null;
  const status = asText(row.status);
  return {
    id,
    name,
    status: (STATUSES.has(status) ? status : "finished") as TournamentStatus,
    startDate,
    endDate: asText(row.endDate) || startDate,
    clubName: asText(row.clubName) || null,
    clubAvatarUrl: asText(row.clubAvatarUrl) || null,
    clubCoverUrl: asText(row.clubCoverUrl) || null,
    myRegistrationStatus: asChip(row.myRegistrationStatus),
    pairId: asText(row.pairId) || null,
    categories: asCategories(row.categories),
  };
}

export function normalizeTournamentCardPage(
  raw: Record<string, unknown> | null | undefined,
  fallback: { page?: number; pageSize?: number } = {},
): PaginatedResult<TournamentCard> {
  const source = raw ?? {};
  const items = Array.isArray(source.items)
    ? source.items.map(asTournamentCard).filter((item): item is TournamentCard => item !== null)
    : [];
  return {
    items,
    page: asPageNumber(source.page, fallback.page ?? 1),
    pageSize: asPageNumber(source.pageSize, fallback.pageSize ?? 12),
    totalItems: asPageNumber(source.totalItems, 0),
    totalPages: asPageNumber(source.totalPages, 0),
  };
}

function asCategories(value: unknown): TournamentCard["categories"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const id = asText(row.id);
    const name = asText(row.name);
    return id && name ? [{ id, name }] : [];
  });
}

function asChip(value: unknown): TournamentCard["myRegistrationStatus"] {
  return typeof value === "string" && CHIPS.has(value)
    ? (value as TournamentCard["myRegistrationStatus"])
    : null;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asPageNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
