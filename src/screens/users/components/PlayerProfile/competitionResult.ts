import { Activity, Award, Medal, Trophy, type LucideIcon } from "lucide-react";
import type { PublicPlayerTournamentResult } from "@/domain";

export type CompetitionTone = "gold" | "silver" | "bronze" | "neutral" | "live";

export interface CompetitionResultView {
  label: string;
  icon: LucideIcon;
  tone: CompetitionTone;
}

/** Chip al lado del título. */
export const toneChipClass: Record<CompetitionTone, string> = {
  gold: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  silver: "border-slate-500/25 bg-slate-500/10 text-slate-600 dark:text-slate-300",
  bronze: "border-orange-700/25 bg-orange-700/10 text-orange-800 dark:text-orange-400",
  neutral: "border-border bg-muted text-muted-foreground",
  live: "border-success/30 bg-success-muted text-success-foreground",
};

/** Cuadro del ícono cuando no hay foto. */
export const toneThumbClass: Record<CompetitionTone, string> = {
  gold: "border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400",
  silver: "border-slate-500/25 bg-slate-500/10 text-slate-600 dark:text-slate-300",
  bronze: "border-orange-700/25 bg-orange-700/10 text-orange-800 dark:text-orange-400",
  neutral: "border-border bg-muted text-muted-foreground",
  live: "border-success/30 bg-success-muted text-success-foreground",
};

const tournamentResults: Record<PublicPlayerTournamentResult, CompetitionResultView> = {
  champion: { label: "Campeón", icon: Trophy, tone: "gold" },
  finalist: { label: "Subcampeón", icon: Medal, tone: "silver" },
  semi: { label: "Semifinalista", icon: Medal, tone: "bronze" },
  quarter: { label: "Cuartofinalista", icon: Award, tone: "neutral" },
  r16: { label: "Octavos de final", icon: Award, tone: "neutral" },
  r32: { label: "16avos de final", icon: Award, tone: "neutral" },
  group: { label: "Fase de zonas", icon: Award, tone: "neutral" },
  playing: { label: "En juego", icon: Activity, tone: "live" },
};

export function tournamentResultView(result: PublicPlayerTournamentResult): CompetitionResultView {
  return tournamentResults[result];
}

export function circuitResultView(place: number | null): CompetitionResultView {
  if (place === 1) return { label: "Campeón del circuito", icon: Trophy, tone: "gold" };
  if (place === 2) return { label: "Subcampeón del circuito", icon: Medal, tone: "silver" };
  if (place === 3) return { label: "3° del circuito", icon: Medal, tone: "bronze" };
  if (place !== null) return { label: `${place}° del circuito`, icon: Award, tone: "neutral" };
  return { label: "Sin puesto", icon: Award, tone: "neutral" };
}
