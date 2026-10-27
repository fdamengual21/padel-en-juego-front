import type { MatchRules } from "@/domain";

const FALLBACK: MatchRules = {
  setFormat: "best_of_3",
  setsToWin: 2,
  gamesPerSet: 6,
  advantageType: "goldenPoint",
  goldenPoint: true,
  tiebreakEnabled: true,
  tiebreakPoints: 7,
  tiebreakWinByTwo: true,
  superTiebreakEnabled: true,
  superTiebreakPoints: 10,
  superTiebreakWinByTwo: true,
};

/** Reglamento de partido del board público. */
export function toMatchRules(raw: MatchRules | null | undefined): MatchRules {
  return raw ?? FALLBACK;
}
