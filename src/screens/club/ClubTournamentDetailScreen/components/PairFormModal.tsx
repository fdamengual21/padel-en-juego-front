import { useEffect, useState } from "react";
import type {
  PairSidePreference,
  Player,
  TournamentCircuitType,
  TournamentPair,
  TournamentRegistration,
} from "@core-api";
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
import PlayerPickerField, {
  emptyPlayerSlot,
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
  pair?: TournamentPair | null;
  registration?: TournamentRegistration | null;
  circuitType?: TournamentCircuitType;
  /** Si true, pide día + franja (torneos no Quality). */
  requireAvailability?: boolean;
  tournamentStartDate?: string;
  tournamentEndDate?: string | null;
  playersById: Record<string, Player>;
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

function emptyAvailability(date: string): AvailabilityDraft {
  return { date, startTime: "10:00", endTime: "22:00" };
}

const SIDE_OPTIONS: { value: PairSidePreference; label: string }[] = [
  { value: "drive", label: "Drive" },
  { value: "reves", label: "Revés" },
  { value: "any", label: "Cualquiera" },
];

async function resolveSlotPlayerId(
  slot: PlayerSlotValue,
  createPlayer: (draft: ManualPlayerDraft) => Promise<Player>,
): Promise<string | null> {
  if (slot.mode === "search") return slot.player?.id ?? null;
  if (!slot.draft.firstName.trim() || !slot.draft.lastName.trim()) return null;
  const player = await createPlayer(slot.draft);
  return player.id;
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
  pair,
  registration,
  circuitType = "NONE",
  requireAvailability = false,
  tournamentStartDate,
  tournamentEndDate,
  playersById,
  isSaving = false,
  onOpenChange,
  onCreatePlayer,
  onSubmit,
}: PairFormModalProps) {
  const [slot1, setSlot1] = useState<PlayerSlotValue>(emptyPlayerSlot);
  const [slot2, setSlot2] = useState<PlayerSlotValue>(emptyPlayerSlot);
  const [sidePreference, setSidePreference] =
    useState<PairSidePreference>("any");
  const [points1, setPoints1] = useState("");
  const [points2, setPoints2] = useState("");
  const [availability, setAvailability] = useState<AvailabilityDraft[]>([]);
  const [error, setError] = useState<string | null>(null);

  const showRankingSnapshot = circuitType !== "NONE";
  const defaultDate = tournamentStartDate ?? "";

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (mode === "edit" && pair) {
      setSlot1({
        mode: "search",
        player: playersById[pair.player1Id] ?? null,
      });
      setSlot2({
        mode: "search",
        player: pair.player2Id ? (playersById[pair.player2Id] ?? null) : null,
      });
      setSidePreference(pair.sidePreference ?? "any");
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
    setSidePreference("any");
    setPoints1("");
    setPoints2("");
    setAvailability(
      requireAvailability && defaultDate
        ? [emptyAvailability(defaultDate)]
        : [],
    );
  }, [
    open,
    mode,
    pair,
    registration,
    playersById,
    requireAvailability,
    defaultDate,
  ]);

  const slot1Ready = isPlayerSlotReady(slot1);
  const slot2Ready = isPlayerSlotReady(slot2);
  const slot2Empty =
    slot2.mode === "search"
      ? !slot2.player
      : !slot2.draft.firstName.trim() && !slot2.draft.lastName.trim();
  const isSolo = slot1Ready && slot2Empty;
  const availabilityOk =
    !requireAvailability ||
    mode === "edit" ||
    availability.some((a) => a.date && a.startTime && a.endTime);
  const canSubmit =
    slot1Ready && (slot2Empty || slot2Ready) && availabilityOk && !isSaving;

  const exclude1 =
    slot2.mode === "search" && slot2.player ? [slot2.player.id] : [];
  const exclude2 =
    slot1.mode === "search" && slot1.player ? [slot1.player.id] : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="pair-form-modal">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Editar pareja" : "Agregar pareja"}
          </DialogTitle>
          <DialogDescription>
            Podés cargar uno o dos jugadores. Si se anota solo, elegí preferencia
            de lado (Drive / Revés / Cualquiera).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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

          {isSolo ? (
            <div className="space-y-2">
              <Label>Preferencia de lado</Label>
              <div className="flex flex-wrap gap-2">
                {SIDE_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    type="button"
                    size="sm"
                    variant={sidePreference === opt.value ? "default" : "outline"}
                    onClick={() => setSidePreference(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

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
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">Disponibilidad</p>
                  <p className="text-xs text-muted-foreground">
                    Días y franjas en los que pueden jugar.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setAvailability((prev) => [
                      ...prev,
                      emptyAvailability(defaultDate || prev[0]?.date || ""),
                    ])
                  }
                >
                  Agregar día
                </Button>
              </div>
              {availability.length === 0 ? (
                <p className="text-sm text-destructive">
                  Agregá al menos un día y horario.
                </p>
              ) : (
                <ul className="space-y-2">
                  {availability.map((slot, index) => (
                    <li
                      key={`av-${index}`}
                      className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]"
                    >
                      <Input
                        type="date"
                        value={slot.date}
                        min={tournamentStartDate}
                        max={tournamentEndDate ?? undefined}
                        onChange={(e) =>
                          setAvailability((prev) =>
                            prev.map((item, i) =>
                              i === index
                                ? { ...item, date: e.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                      <Input
                        type="time"
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
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() =>
                          setAvailability((prev) =>
                            prev.filter((_, i) => i !== index),
                          )
                        }
                      >
                        Quitar
                      </Button>
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
                  const player1Id = await resolveSlotPlayerId(slot1, onCreatePlayer);
                  if (!player1Id) {
                    setError("Completá el jugador 1");
                    return;
                  }
                  const player2Id = slot2Empty
                    ? null
                    : await resolveSlotPlayerId(slot2, onCreatePlayer);
                  if (!slot2Empty && !player2Id) {
                    setError("Completá el jugador 2 o cancelá la carga manual");
                    return;
                  }
                  await onSubmit({
                    player1Id,
                    player2Id,
                    sidePreference: player2Id ? null : sidePreference,
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
                  setError(
                    err instanceof Error ? err.message : "No se pudo guardar",
                  );
                }
              })();
            }}
          >
            {isSaving ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
