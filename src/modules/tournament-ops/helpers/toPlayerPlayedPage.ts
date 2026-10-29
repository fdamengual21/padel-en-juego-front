import type { PaginatedResult } from "@/domain";
import type { PlayerReservation } from "@/modules/reservations";
import { normalizeMine } from "@/modules/reservations/repositories/ReservationRepository";
import type { PlayerPlayedItem } from "../types/playerPlayedItem";
import { toPlayerMatchView } from "./toPlayerMatchView";

export function toPlayerPlayedPage(
  raw: Record<string, unknown> | null | undefined,
  fallback: { page?: number; pageSize?: number } = {},
): PaginatedResult<PlayerPlayedItem> {
  const source = raw ?? {};
  const items = Array.isArray(source.items)
    ? source.items
        .map(asPlayedItem)
        .filter((item): item is PlayerPlayedItem => item !== null)
    : [];
  return {
    items,
    page: asPageNumber(source.page, fallback.page ?? 1),
    pageSize: asPageNumber(source.pageSize, fallback.pageSize ?? 10),
    totalItems: asPageNumber(source.totalItems, 0),
    totalPages: asPageNumber(source.totalPages, 0),
  };
}

function asPlayedItem(raw: unknown): PlayerPlayedItem | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (row.kind === "match") {
    const match = toPlayerMatchView(row.match);
    return match ? { kind: "match", match } : null;
  }
  if (row.kind === "reservation") {
    const reservation = asPlayedReservation(row.reservation);
    return reservation ? { kind: "reservation", reservation } : null;
  }
  return null;
}

function asPlayedReservation(raw: unknown): PlayerReservation | null {
  if (!raw || typeof raw !== "object") return null;
  return normalizeMine(raw as Record<string, unknown>);
}

function asPageNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
