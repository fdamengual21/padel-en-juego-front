import type { PlayerMatchView } from "@/domain";
import type { PlayerReservation } from "@/modules/reservations";

export type PlayerPlayedItem =
  | { kind: "match"; match: PlayerMatchView }
  | { kind: "reservation"; reservation: PlayerReservation };
