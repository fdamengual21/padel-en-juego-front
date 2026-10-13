import { useEffect, useMemo, useState } from "react";
import type { Match, MatchResultInput, MatchRules, SetScore } from "@/domain";
import {
  decidingScoreSlotIndex,
  deriveWinnerPairIdFromSets,
  enteredMatchSets,
  isScoreSlotPlayable,
  matchWinnerSide,
  scoreboardSlotCount,
  validateMatchResultSets,
} from "@/domain";
import MatchScoreboard from "./MatchScoreboard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MatchResultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: Match | null;
  pairANames: [string, string];
  pairBNames: [string, string];
  matchRules: MatchRules;
  isSubmitting?: boolean;
  /** Marcador visible, sin editar ni guardar. */
  readOnly?: boolean;
  onSubmit: (input: MatchResultInput) => Promise<void> | void;
}

function emptySets(count: number, existing: SetScore[]): SetScore[] {
  return Array.from({ length: count }, (_, i) => ({
    gamesA: existing[i]?.gamesA ?? 0,
    gamesB: existing[i]?.gamesB ?? 0,
    tiebreakA: existing[i]?.tiebreakA,
    tiebreakB: existing[i]?.tiebreakB,
  }));
}

function clearUnplayable(sets: SetScore[], rules: MatchRules): SetScore[] {
  return sets.map((set, index) =>
    isScoreSlotPlayable(sets, index, rules)
      ? set
      : { gamesA: 0, gamesB: 0 },
  );
}

export default function MatchResultModal({
  open,
  onOpenChange,
  match,
  pairANames,
  pairBNames,
  matchRules,
  isSubmitting = false,
  readOnly = false,
  onSubmit,
}: MatchResultModalProps) {
  const maxSlots = scoreboardSlotCount(matchRules);
  const [sets, setSets] = useState<SetScore[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !match) return;
    const filled = emptySets(maxSlots, match.sets);
    setSets(readOnly ? filled : clearUnplayable(filled, matchRules));
    setError(null);
  }, [open, match, maxSlots, matchRules, readOnly]);

  const enteredSets = useMemo(() => enteredMatchSets(sets), [sets]);

  const decidingSlotIndex = useMemo(
    () => decidingScoreSlotIndex(sets, matchRules),
    [sets, matchRules],
  );

  const canSave = Boolean(match?.pairAId && match?.pairBId && enteredSets.length > 0);
  const isEditingExisting = Boolean(
    match &&
      (match.status === "finished" ||
        match.status === "walkover" ||
        match.sets.length > 0),
  );

  const patchSet = (index: number, side: "A" | "B", value: string) => {
    const n = Number(value);
    const games = Number.isFinite(n) ? Math.max(0, Math.min(99, Math.trunc(n))) : 0;
    if (!isScoreSlotPlayable(sets, index, matchRules)) return;
    setSets((prev) => {
      const next = prev.map((set, i) =>
        i === index
          ? side === "A"
            ? { ...set, gamesA: games }
            : { ...set, gamesB: games }
          : set,
      );
      return clearUnplayable(next, matchRules);
    });
  };

  const handleSave = async () => {
    if (!match?.pairAId || !match.pairBId) return;
    const validation = validateMatchResultSets(enteredSets, matchRules);
    if (!validation.ok) {
      setError(validation.message);
      return;
    }
    const winnerPairId = deriveWinnerPairIdFromSets(
      enteredSets,
      match.pairAId,
      match.pairBId,
      matchRules,
    );
    if (!winnerPairId) {
      setError("El marcador no define un ganador claro.");
      return;
    }
    setError(null);
    await onSubmit({ sets: enteredSets, winnerPairId });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md gap-3 p-0 overflow-hidden"
        data-testid="match-result-modal"
      >
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>
            {readOnly
              ? "Resultado"
              : isEditingExisting
                ? "Editar resultado"
                : "Cargar resultado"}
          </DialogTitle>
          <DialogDescription>
            Sets a ganar: {matchRules.setsToWin}
            {matchRules.superTiebreakEnabled
              ? `. La última columna es tie-break (a ${matchRules.superTiebreakPoints}) si van empatados.`
              : "."}
            {readOnly ? "" : " Tocá los números para editar el marcador."}
          </DialogDescription>
        </DialogHeader>

        <div className="px-4">
          <MatchScoreboard
            pairANames={pairANames}
            pairBNames={pairBNames}
            sets={sets}
            slotCount={maxSlots}
            decidingSlotIndex={decidingSlotIndex}
            editable={!readOnly}
            winnerSide={readOnly && match ? matchWinnerSide(match) : null}
            isSlotPlayable={(index) => isScoreSlotPlayable(sets, index, matchRules)}
            size="md"
            onChange={readOnly ? undefined : patchSet}
          />
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter className="px-4 pb-4">
          {readOnly ? (
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                data-testid="match-result-save"
                disabled={!canSave || isSubmitting}
                onClick={() => void handleSave()}
              >
                {isSubmitting ? "Guardando…" : "Guardar resultado"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
