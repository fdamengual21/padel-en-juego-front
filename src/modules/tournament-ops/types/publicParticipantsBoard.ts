import type { PairSidePreference } from "@/domain";

/** Tab Participantes público: aceptadas visibles, sin backoffice. */
export interface PublicParticipantsBoard {
  generatedAt: string;
  rows: PublicParticipantRow[];
  tournamentStarted: boolean;
  notice: string | null;
}

export interface PublicParticipantRow {
  pairId: string;
  player1Id: string;
  player2Id: string | null;
  playerNames: [string, string];
  playerAvatars: [string | null, string | null];
  incomplete: boolean;
  sidePreference: PairSidePreference | null;
  registeredAt: string | null;
  disqualified: boolean;
}
