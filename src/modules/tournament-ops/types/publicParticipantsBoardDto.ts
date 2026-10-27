/** JSON de GET .../boards/participants público. */
export interface PublicParticipantsBoardDto {
  generatedAt: string;
  rows: PublicParticipantRowDto[];
  tournamentStarted: boolean;
  notice: string | null;
}

export interface PublicParticipantRowDto {
  pairId: string;
  player1Id: string;
  player2Id: string | null;
  playerNames: string[];
  playerAvatars: Array<string | null>;
  incomplete: boolean;
  sidePreference: string | null;
  registeredAt: string | null;
  disqualified: boolean;
}
