import { useEffect, useState } from "react";
import type { PairSidePreference, Player, TournamentPair } from "@core-api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
}

interface PairFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  pair?: TournamentPair | null;
  playersById: Record<string, Player>;
  isSaving?: boolean;
  onOpenChange: (open: boolean) => void;
  onCreatePlayer: (draft: ManualPlayerDraft) => Promise<Player>;
  onSubmit: (values: PairFormSubmitValues) => Promise<void> | void;
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

export default function PairFormModal({
  open,
  mode,
  pair,
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
  const [error, setError] = useState<string | null>(null);

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
      return;
    }
    setSlot1(emptyPlayerSlot());
    setSlot2(emptyPlayerSlot());
    setSidePreference("any");
  }, [open, mode, pair, playersById]);

  const slot1Ready = isPlayerSlotReady(slot1);
  const slot2Ready = isPlayerSlotReady(slot2);
  const slot2Empty =
    slot2.mode === "search"
      ? !slot2.player
      : !slot2.draft.firstName.trim() && !slot2.draft.lastName.trim();
  const isSolo = slot1Ready && slot2Empty;
  const canSubmit = slot1Ready && (slot2Empty || slot2Ready) && !isSaving;

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
