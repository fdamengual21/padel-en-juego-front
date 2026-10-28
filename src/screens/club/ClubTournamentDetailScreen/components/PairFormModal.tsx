import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type {
  IdentityMatch,
  PairSidePreference,
  Player,
  TournamentCircuitType,
  TournamentRegistration,
} from "@/domain";
import { isCategoryLevel } from "@/domain";
import Api from "@/api/Api";
import DuplicateIdentityDialog from "@/components/auth/DuplicateIdentityDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatTournamentDayEs } from "@/lib/dates";
import { toastError } from "@/lib/toast";
import PlayerPickerField, {
  emptyPlayerSlot,
  isManualDraftValid,
  isPlayerSlotReady,
  type ManualPlayerDraft,
  type PlayerSlotValue,
} from "./PlayerPickerField";

export interface PairFormSubmitValues {
  player1Id: string;
  player2Id: string | null;
  sidePreference: PairSidePreference | null;
  rankingPointsPlayer1: number | null;
  rankingPointsPlayer2: number | null;
  availability?: Array<{
    date: string;
    startTime: string;
    endTime: string;
  }>;
}

interface PairFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  /** Club actual (para detectar clientes/usuarios duplicados). */
  clubId: string;
  pair?: { player1Id: string; player2Id: string | null } | null;
  registration?: TournamentRegistration | null;
  circuitType?: TournamentCircuitType;
  /** Si true, pide la franja de cada día del torneo (no Quality). */
  requireAvailability?: boolean;
  tournamentStartDate?: string;
  tournamentEndDate?: string | null;
  dailyStartTime?: string | null;
  dailyEndTime?: string | null;
  categoryId: string;
  /** Jugadores que ya ocupan un lugar en la categoría. */
  enrolledPlayerIds?: string[];
  isSaving?: boolean;
  onOpenChange: (open: boolean) => void;
  onCreatePlayer: (draft: ManualPlayerDraft) => Promise<Player>;
  onSubmit: (values: PairFormSubmitValues) => Promise<void> | void;
}

interface AvailabilityDraft {
  date: string;
  startTime: string;
  endTime: string;
}

function tournamentDays(start: string, end: string | null | undefined): string[] {
  const days: string[] = [];
  const cursor = new Date(`${start}T12:00:00`);
  const last = new Date(`${end || start}T12:00:00`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(last.getTime())) return start ? [start] : [];
  while (cursor <= last) {
    const month = String(cursor.getMonth() + 1).padStart(2, "0");
    const day = String(cursor.getDate()).padStart(2, "0");
    days.push(`${cursor.getFullYear()}-${month}-${day}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function emptyAvailability(date: string, startTime: string, endTime: string): AvailabilityDraft {
  return { date, startTime, endTime };
}

/** Mapea la preferencia del jugador a la de pareja (inscripción solo). */
function pairSideFromPlayerPrimary(
  primary: Player["sidePreferencePrimary"] | null | undefined,
): PairSidePreference {
  return primary === "drive" || primary === "reves" ? primary : "any";
}

function pairSideFromPlayer(
  player: Pick<Player, "sidePreference" | "sidePreferencePrimary"> | null | undefined,
): PairSidePreference {
  switch (player?.sidePreference) {
    case "left":
      return "reves";
    case "right":
      return "drive";
    case "both":
      return "any";
    default:
      return pairSideFromPlayerPrimary(player?.sidePreferencePrimary);
  }
}

function sidePreferenceFromSlot(slot: PlayerSlotValue): PairSidePreference {
  if (slot.mode === "search") {
    return pairSideFromPlayer(slot.player);
  }
  return pairSideFromPlayerPrimary(slot.draft.sidePreferencePrimary);
}

async function resolveSlotPlayerId(
  slot: PlayerSlotValue,
  createPlayer: (draft: ManualPlayerDraft) => Promise<Player>,
): Promise<string | null> {
  if (slot.mode === "search") return slot.player?.id ?? null;
  if (!isManualDraftValid(slot.draft)) return null;
  const player = await createPlayer(slot.draft);
  return player.id;
}

async function playerIdFromIdentityMatch(
  match: IdentityMatch,
  draft: ManualPlayerDraft,
  createPlayer: (draft: ManualPlayerDraft) => Promise<Player>,
): Promise<string> {
  if (match.playerId) return match.playerId;
  const player = await createPlayer({
    ...draft,
    firstName: match.firstName || draft.firstName,
    lastName: match.lastName || draft.lastName,
    email: match.email ?? draft.email,
    phone: match.phone ?? draft.phone,
  });
  return player.id;
}

function playerFromNames(
  id: string,
  displayName: string,
  phone: string | null,
  email: string | null,
  categoryLevel: number | null,
  sidePreference: Player["sidePreference"],
): Player {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  return {
    id,
    userId: null,
    displayName,
    firstName: parts[0] ?? displayName,
    lastName: parts.slice(1).join(" "),
    phone,
    email,
    age: null,
    categoryLevel: isCategoryLevel(categoryLevel) ? categoryLevel : 6,
    categoryHistory: [],
    sidePreferencePrimary: null,
    sidePreferenceSecondary: null,
    sidePreference: sidePreference ?? null,
    avatarUrl: null,
    coverUrl: null,
    createdAt: "",
  };
}

function playerFromMatch(match: IdentityMatch, playerId: string): Player {
  return playerFromNames(
    playerId,
    match.displayName || `${match.firstName} ${match.lastName}`.trim(),
    match.phone,
    match.email,
    match.categoryLevel,
    null,
  );
}

function parsePointsInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (Number.isNaN(n)) return null;
  return Math.max(0, Math.round(n));
}

export default function PairFormModal({
  open,
  mode,
  clubId,
  pair,
  registration,
  circuitType = "NONE",
  requireAvailability = false,
  tournamentStartDate,
  tournamentEndDate,
  dailyStartTime,
  dailyEndTime,
  categoryId,
  enrolledPlayerIds = [],
  isSaving = false,
  onOpenChange,
  onCreatePlayer,
  onSubmit,
}: PairFormModalProps) {
  const [slot1, setSlot1] = useState<PlayerSlotValue>(emptyPlayerSlot);
  const [slot2, setSlot2] = useState<PlayerSlotValue>(emptyPlayerSlot);
  const [points1, setPoints1] = useState("");
  const [points2, setPoints2] = useState("");
  const [availability, setAvailability] = useState<AvailabilityDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dupOpen, setDupOpen] = useState(false);
  const [dupMatches, setDupMatches] = useState<IdentityMatch[]>([]);
  const [dupSlot, setDupSlot] = useState<1 | 2>(1);
  const [skipDupForSlot, setSkipDupForSlot] = useState<{
    1?: boolean;
    2?: boolean;
  }>({});

  const showRankingSnapshot = circuitType !== "NONE";
  const dayStart = dailyStartTime || "10:00";
  const dayEnd = dailyEndTime || "22:00";
  const days = tournamentStartDate
    ? tournamentDays(tournamentStartDate, tournamentEndDate)
    : [];
  const editPlayerIds = pair
    ? [pair.player1Id, pair.player2Id].filter((id): id is string => Boolean(id))
    : [];
  const editPlayers = useQuery({
    queryKey: ["participant-players", categoryId, editPlayerIds.join(",")],
    queryFn: () => Api.TournamentOpsService().getParticipantPlayers(categoryId, editPlayerIds),
    enabled: open && mode === "edit" && editPlayerIds.length > 0,
  });

  useEffect(() => {
    if (!open) return;
    setError(null);
    setDupOpen(false);
    setDupMatches([]);
    setSkipDupForSlot({});
    if (mode === "edit" && pair) {
      if (editPlayers.isLoading) return;
      if (editPlayers.isError) {
        setError(
          editPlayers.error instanceof Error
            ? editPlayers.error.message
            : "No se pudieron cargar los jugadores de la pareja",
        );
        return;
      }
      const byId = new Map(
        (editPlayers.data ?? []).map((detail) => [
          detail.id,
          playerFromNames(
            detail.id,
            detail.displayName,
            detail.phone,
            null,
            detail.categoryLevel,
            detail.sidePreference,
          ),
        ]),
      );
      setSlot1({
        mode: "search",
        player: byId.get(pair.player1Id) ?? null,
      });
      setSlot2({
        mode: "search",
        player: pair.player2Id ? (byId.get(pair.player2Id) ?? null) : null,
      });
      setPoints1(
        registration?.rankingPointsPlayer1 != null
          ? String(registration.rankingPointsPlayer1)
          : "",
      );
      setPoints2(
        registration?.rankingPointsPlayer2 != null
          ? String(registration.rankingPointsPlayer2)
          : "",
      );
      setAvailability([]);
      return;
    }
    setSlot1(emptyPlayerSlot());
    setSlot2(emptyPlayerSlot());
    setPoints1("");
    setPoints2("");
    setAvailability(
      requireAvailability
        ? days.map((date) => emptyAvailability(date, dayStart, dayEnd))
        : [],
    );
  }, [
    open,
    mode,
    pair,
    registration,
    editPlayers.data,
    editPlayers.isLoading,
    editPlayers.isError,
    editPlayers.error,
    requireAvailability,
    tournamentStartDate,
    tournamentEndDate,
    dayStart,
    dayEnd,
  ]);

  const slot1Ready = isPlayerSlotReady(slot1);
  const slot2Ready = isPlayerSlotReady(slot2);
  const slot2Empty =
    slot2.mode === "search"
      ? !slot2.player
      : !slot2.draft.firstName.trim() &&
        !slot2.draft.lastName.trim() &&
        !slot2.draft.email.trim();
  const availabilityOk =
    !requireAvailability ||
    mode === "edit" ||
    (availability.length > 0 &&
      availability.every(
        (slot) => slot.date && slot.startTime && slot.endTime && slot.startTime < slot.endTime,
      ));
  const canSubmit =
    slot1Ready &&
    (slot2Empty || slot2Ready) &&
    availabilityOk &&
    !isSaving &&
    !(mode === "edit" && editPlayers.isLoading);

  const blockedPlayerIds = useMemo(() => {
    const currentPairIds = new Set<string>();
    if (mode === "edit" && pair) {
      currentPairIds.add(pair.player1Id);
      if (pair.player2Id) currentPairIds.add(pair.player2Id);
    }
    return enrolledPlayerIds.filter((id) => !currentPairIds.has(id));
  }, [enrolledPlayerIds, mode, pair]);

  const slot1PlayerId = slot1.mode === "search" ? slot1.player?.id : undefined;
  const slot2PlayerId = slot2.mode === "search" ? slot2.player?.id : undefined;
  const exclude1 = slot2PlayerId
    ? [...blockedPlayerIds, slot2PlayerId]
    : blockedPlayerIds;
  const exclude2 = slot1PlayerId
    ? [...blockedPlayerIds, slot1PlayerId]
    : blockedPlayerIds;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="pair-form-modal">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Editar pareja" : "Agregar pareja"}
          </DialogTitle>
          <DialogDescription>
            Podés cargar uno o dos jugadores. La preferencia de lado se carga al
            dar de alta un jugador manualmente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {mode === "edit" && editPlayers.isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando jugadores…</p>
          ) : null}
          <PlayerPickerField
            label="Jugador 1"
            value={slot1}
            excludeIds={exclude1}
            onChange={setSlot1}
          />
          <PlayerPickerField
            label="Jugador 2 (opcional)"
            value={slot2}
            excludeIds={exclude2}
            onChange={setSlot2}
          />

          {showRankingSnapshot ? (
            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
              <div>
                <p className="text-sm font-medium">
                  Puntos de ranking al momento ({circuitType})
                </p>
                <p className="text-xs text-muted-foreground">
                  Snapshot informado (no es el ranking oficial del circuito).
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ranking-points-1">Jugador 1</Label>
                  <Input
                    id="ranking-points-1"
                    type="number"
                    min={0}
                    placeholder="Ej. 420"
                    value={points1}
                    onChange={(e) => setPoints1(e.target.value)}
                  />
                </div>
                {!slot2Empty ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="ranking-points-2">Jugador 2</Label>
                    <Input
                      id="ranking-points-2"
                      type="number"
                      min={0}
                      placeholder="Ej. 385"
                      value={points2}
                      onChange={(e) => setPoints2(e.target.value)}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {requireAvailability && mode === "create" ? (
            <div className="space-y-3 rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Disponibilidad</p>
                <p className="text-xs text-muted-foreground">
                  Una franja por cada día del torneo. Solo se ajusta el horario.
                </p>
              </div>
              {availability.length === 0 ? (
                <p className="text-sm text-destructive">
                  Este torneo no tiene días cargados.
                </p>
              ) : (
                <ul className="space-y-2">
                  {availability.map((slot, index) => (
                    <li
                      key={slot.date}
                      className="grid grid-cols-[1fr_auto_auto] items-center gap-2"
                    >
                      <span className="text-sm">{formatTournamentDayEs(slot.date)}</span>
                      <Input
                        type="time"
                        aria-label={`Desde ${slot.date}`}
                        value={slot.startTime}
                        onChange={(e) =>
                          setAvailability((prev) =>
                            prev.map((item, i) =>
                              i === index
                                ? { ...item, startTime: e.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                      <Input
                        type="time"
                        aria-label={`Hasta ${slot.date}`}
                        value={slot.endTime}
                        onChange={(e) =>
                          setAvailability((prev) =>
                            prev.map((item, i) =>
                              i === index
                                ? { ...item, endTime: e.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!canSubmit}
            onClick={() => {
              void (async () => {
                setError(null);
                try {
                  const maybeCheck = async (
                    slot: PlayerSlotValue,
                    slotIndex: 1 | 2,
                  ): Promise<"blocked" | "ok"> => {
                    if (slot.mode !== "manual") return "ok";
                    if (skipDupForSlot[slotIndex]) return "ok";
                    const draft = slot.draft;
                    if (!draft.email.trim() && !draft.phone.trim()) return "ok";
                    const { matches } =
                      await Api.TournamentOpsService().findIdentityMatches({
                        clubId,
                        email: draft.email || null,
                        phone: draft.phone || null,
                      });
                    if (matches.length === 0) return "ok";
                    setDupSlot(slotIndex);
                    setDupMatches(matches);
                    setDupOpen(true);
                    return "blocked";
                  };

                  if ((await maybeCheck(slot1, 1)) === "blocked") return;
                  if (!slot2Empty && (await maybeCheck(slot2, 2)) === "blocked") {
                    return;
                  }

                  const player1Id = await resolveSlotPlayerId(
                    slot1,
                    onCreatePlayer,
                  );
                  if (!player1Id) {
                    setError("Completá el jugador 1 (nombre y apellido)");
                    return;
                  }
                  const player2Id = slot2Empty
                    ? null
                    : await resolveSlotPlayerId(slot2, onCreatePlayer);
                  if (!slot2Empty && !player2Id) {
                    setError(
                      "Completá el jugador 2 (nombre y apellido) o dejalo vacío",
                    );
                    return;
                  }
                  await onSubmit({
                    player1Id,
                    player2Id,
                    sidePreference: player2Id
                      ? null
                      : sidePreferenceFromSlot(slot1),
                    rankingPointsPlayer1: showRankingSnapshot
                      ? parsePointsInput(points1)
                      : null,
                    rankingPointsPlayer2:
                      showRankingSnapshot && player2Id
                        ? parsePointsInput(points2)
                        : null,
                    availability:
                      requireAvailability && mode === "create"
                        ? availability.filter(
                            (a) => a.date && a.startTime && a.endTime,
                          )
                        : undefined,
                  });
                  onOpenChange(false);
                } catch (err) {
                  const message =
                    err instanceof Error ? err.message : "No se pudo guardar";
                  setError(message);
                  toastError("No se pudo guardar", message);
                }
              })();
            }}
          >
            {isSaving ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <DuplicateIdentityDialog
      open={dupOpen}
      matches={dupMatches}
      onOpenChange={setDupOpen}
      onUseMatch={(match) => {
        void (async () => {
          try {
            const slot = dupSlot === 1 ? slot1 : slot2;
            if (slot.mode !== "manual") return;
            const playerId = await playerIdFromIdentityMatch(
              match,
              slot.draft,
              onCreatePlayer,
            );
            const player = playerFromMatch(match, playerId);
            if (dupSlot === 1) setSlot1({ mode: "search", player });
            else setSlot2({ mode: "search", player });
            setDupOpen(false);
            setSkipDupForSlot((prev) => ({ ...prev, [dupSlot]: true }));
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "No se pudo usar el existente",
            );
          }
        })();
      }}
      onCreateNew={() => {
        setSkipDupForSlot((prev) => ({ ...prev, [dupSlot]: true }));
        setDupOpen(false);
      }}
    />
    </>
  );
}
