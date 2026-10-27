import type { PairSidePreference } from "@/domain";
import type { PublicParticipantsBoard } from "../types/publicParticipantsBoard";
import type { PublicParticipantsBoardDto } from "../types/publicParticipantsBoardDto";

const SIDES = new Set(["drive", "reves", "any"]);

/** DTO del tab Participantes público → entidad de UI. */
export function toPublicParticipantsBoard(
  dto: PublicParticipantsBoardDto,
): PublicParticipantsBoard {
  return {
    generatedAt: dto.generatedAt,
    tournamentStarted: Boolean(dto.tournamentStarted),
    notice: dto.notice ?? null,
    rows: (dto.rows ?? []).map((row) => ({
      pairId: row.pairId,
      player1Id: row.player1Id,
      player2Id: row.player2Id ?? null,
      playerNames: [row.playerNames?.[0] ?? "Jugador", row.playerNames?.[1] ?? ""],
      playerAvatars: [row.playerAvatars?.[0] ?? null, row.playerAvatars?.[1] ?? null],
      incomplete: Boolean(row.incomplete),
      sidePreference: asSide(row.sidePreference),
      registeredAt: row.registeredAt ?? null,
      disqualified: Boolean(row.disqualified),
    })),
  };
}

function asSide(value: string | null | undefined): PairSidePreference | null {
  return value && SIDES.has(value) ? (value as PairSidePreference) : null;
}
