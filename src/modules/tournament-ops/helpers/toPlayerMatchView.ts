import { DEFAULT_MATCH_RULES, type MatchRules, type PlayerMatchView } from "@/domain";
import { toMatchRules } from "./toMatchRules";

/** DTO de partido del jugador → vista de UI. */
export function toPlayerMatchView(raw: unknown): PlayerMatchView | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const match = row.match;
  if (!match || typeof match !== "object") return null;
  const id = "id" in match && typeof match.id === "string" ? match.id : "";
  if (!id) return null;
  const pairALabel = asText(row.pairALabel);
  const pairBLabel = asText(row.pairBLabel);
  return {
    match: match as PlayerMatchView["match"],
    phaseLabel: asText(row.phaseLabel),
    pairALabel,
    pairBLabel,
    pairANames: asPairNames(row.pairANames, pairALabel),
    pairAAvatars: asPairAvatars(row.pairAAvatars),
    pairBNames: asPairNames(row.pairBNames, pairBLabel),
    pairBAvatars: asPairAvatars(row.pairBAvatars),
    courtLabel: asText(row.courtLabel) || null,
    matchRules: asMatchRules(row.matchRules),
  };
}

function asPairNames(raw: unknown, fallbackLabel: string): [string, string] {
  if (Array.isArray(raw)) {
    const first = asText(raw[0]);
    const second = asText(raw[1]);
    if (first || second) return [first || "Por definir", second];
  }
  const parts = fallbackLabel.split(/\s*\/\s*/).map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) return [parts[0], parts[1]];
  if (parts.length === 1) return [parts[0], ""];
  return ["Por definir", ""];
}

function asPairAvatars(raw: unknown): [string | null, string | null] {
  if (!Array.isArray(raw)) return [null, null];
  return [asUrl(raw[0]), asUrl(raw[1])];
}

function asMatchRules(raw: unknown): MatchRules {
  if (!raw || typeof raw !== "object") return DEFAULT_MATCH_RULES;
  return toMatchRules(raw as MatchRules);
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asUrl(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
