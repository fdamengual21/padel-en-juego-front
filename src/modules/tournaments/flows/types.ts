import type { QueryKey } from "@tanstack/react-query";
import type { TournamentFormValues } from "../types";

export type TournamentFlowKind = "standalone" | "rankingEvent";

export interface TournamentFormIssue {
  title: string;
  detail?: string;
}

/** Qué se puede tocar en el form de configuración y cómo se valida. */
export interface TournamentFormPolicy {
  /** Se juega en un solo día: el fin sigue al inicio. */
  singleDay: boolean;
  lockCategory: boolean;
  lockMatchPlayType: boolean;
  lockFormat: boolean;
  minPairs: number;
  maxPairsHint: string | null;
  /** Texto en las secciones bloqueadas. */
  lockedHint: string | null;
  validate: (values: TournamentFormValues) => TournamentFormIssue | null;
}

export interface TournamentFlowCopy {
  backLabel: string;
  cancelButton: string;
  cancelTitle: string;
  cancelDescription: string;
  cancelSuccess: string;
  cancelError: string;
  /** Aviso arriba de la configuración. */
  configNotice: string | null;
}

/** Datos del torneo que definen qué estado se le muestra al usuario. */
export interface TournamentStatusInput {
  status: string;
  startDate: string;
  rankingCircuitId?: string | null;
  /** Fecha de ranking: día en que abre la inscripción (T−2). */
  registrationOpensAt?: string | null;
  /** Fecha de ranking: día en que aparece en el catálogo (T−7). */
  visibleFrom?: string | null;
}

/** Estado listo para el badge. `status` define el tono; `label` pisa el texto por defecto. */
export interface TournamentStatusView {
  status: string;
  label?: string;
  /** Texto secundario, p. ej. cuándo abre la inscripción. */
  hint: string | null;
}

export interface TournamentFlow {
  kind: TournamentFlowKind;
  backTo: string;
  copy: TournamentFlowCopy;
  form: TournamentFormPolicy;
  /** Avisos propios del flujo antes de guardar. Vacío = no pide confirmación por esto. */
  saveWarnings: (next: TournamentFormValues, saved: TournamentFormValues) => string[];
  /** Queries a refrescar después de guardar o cancelar. */
  relatedQueries: QueryKey[];
}
