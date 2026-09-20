import { useEffect, useMemo, useState } from "react";
import type { Match, MatchResultInput, MatchRules, SetScore } from "@/domain";
import {
  deriveWinnerPairIdFromSets,
  scoreboardSlotCount,
  setWinnerSide,
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

export default function MatchResultModal({
  open,
  onOpenChange,
  match,
  pairANames,
  pairBNames,
  matchRules,
  isSubmitting = false,
  onSubmit,
}: MatchResultModalProps) {
  const maxSlots = scoreboardSlotCount(matchRules);
  const [sets, setSets] = useState<SetScore[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !match) return;
    setSets(emptySets(maxSlots, match.sets));
    setError(null);
  }, [open, match, maxSlots]);

  const filledSets = useMemo(() => {
    const out: SetScore[] = [];
    let winsA = 0;
    let winsB = 0;
    for (const set of sets) {
      if (winsA >= matchRules.setsToWin || winsB >= matchRules.setsToWin) break;
      if (set.gamesA === 0 && set.gamesB === 0) break;
      out.push(set);
      const side = setWinnerSide(set);
      if (side === "A") winsA += 1;
      if (side === "B") winsB += 1;
    }
    return out;
  }, [sets, matchRules]);

  const decidingSlotIndex = useMemo(() => {
    if (!matchRules.superTiebreakEnabled || matchRules.setsToWin < 2) return null;
    return maxSlots - 1;
  }, [matchRules, maxSlots]);

  const canSave = Boolean(match?.pairAId && match?.pairBId && filledSets.length > 0);
  const isEditingExisting = Boolean(
    match &&
      (match.status === "finished" ||
        match.status === "walkover" ||
        match.sets.length > 0),
  );

  const patchSet = (index: number, side: "A" | "B", value: string) => {
    const n = Number(value);
    const games = Number.isFinite(n) ? Math.max(0, Math.min(99, Math.trunc(n))) : 0;
    setSets((prev) =>
      prev.map((set, i) =>
        i === index
          ? side === "A"
            ? { ...set, gamesA: games }
            : { ...set, gamesB: games }
          : set,
      ),
    );
  };

  const handleSave = async () => {
    if (!match?.pairAId || !match.pairBId) return;
    const validation = validateMatchResultSets(filledSets, matchRules);
    if (!validation.ok) {
      setError(validation.message);
      return;
    }
    const winnerPairId = deriveWinnerPairIdFromSets(
      filledSets,
      match.pairAId,
      match.pairBId,
      matchRules,
    );
    if (!winnerPairId) {
      setError("El marcador no define un ganador claro.");
      return;
    }
    setError(null);
    await onSubmit({ sets: filledSets, winnerPairId });
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
            {isEditingExisting ? "Editar resultado" : "Cargar resultado"}
          </DialogTitle>
          <DialogDescription>
            Sets a ganar: {matchRules.setsToWin}
            {matchRules.superTiebreakEnabled
              ? `. La última columna es tie-break (a ${matchRules.superTiebreakPoints}) si van empatados.`
              : "."}{" "}
            Tocá los números para editar el marcador.
          </DialogDescription>
        </DialogHeader>

        <div className="px-4">
          <MatchScoreboard
            pairANames={pairANames}
            pairBNames={pairBNames}
            sets={sets}
            slotCount={maxSlots}
            decidingSlotIndex={decidingSlotIndex}
            editable
            size="md"
            onChange={patchSet}
          />
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter className="px-4 pb-4">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
