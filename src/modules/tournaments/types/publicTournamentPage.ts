import type {
  MatchRules,
  RulesetPreset,
  TournamentCircuitType,
  TournamentFormat,
  TournamentStatus,
} from "@/domain";

/** Entidad de UI de la pantalla pública de un torneo. */
export interface PublicTournamentPage {
  tournament: {
    id: string;
    clubId: string;
    clubName: string | null;
    name: string;
    description: string | null;
    startDate: string;
    endDate: string;
    dailyStartTime: string;
    dailyEndTime: string;
    status: TournamentStatus;
    format: TournamentFormat;
    registrationFee: number;
  };
  categories: PublicTournamentCategoryRef[];
  category: PublicTournamentCategoryRef;
  matchRules: MatchRules;
  preset: RulesetPreset | null;
  tournamentStarted: boolean;
  summary: {
    pairCount: number;
    zones: number;
    qualify: number;
    liveCount: number;
    finishedCount: number;
  };
  quotaFull: boolean;
  canRegister: boolean;
}

export interface PublicTournamentCategoryRef {
  id: string;
  name: string;
  circuitType: TournamentCircuitType;
}
