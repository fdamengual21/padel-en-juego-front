import type { PairSidePreference } from "@/domain";

/** Tab Participantes público: operativas + rechazo/descalificación; sin canceladas. */
export interface PublicParticipantsBoard {
  generatedAt: string;
  rows: PublicParticipantRow[];
  tournamentStarted: boolean;
  notice: string | null;
}

export type PublicParticipantStatus =
  | "PENDING"
  | "ACCEPTED"
  | "WAITLIST"
  | "REJECTED"
  | "DISQUALIFIED";

export interface PublicParticipantRow {
  pairId: string;
  player1Id: string;
  player2Id: string | null;
  playerNames: [string, string];
  playerAvatars: [string | null, string | null];
  incomplete: boolean;
  sidePreference: PairSidePreference | null;
  registeredAt: string | null;
  /** Estado de inscripción. Null si el listado viejo no lo manda. */
  status: PublicParticipantStatus | null;
  /** Motivo del club; solo llega si la fila es del jugador logueado. */
  statusNote: string | null;
  disqualified: boolean;
}
