import { useEffect, useState } from "react";
import type { MatchPhase } from "@/domain";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { roundSectionLabel } from "@/lib/tournamentLabels";
import { cn } from "@/lib/utils";

export interface MovePairOption {
  pairId: string;
  names: [string, string];
}

interface MovePairPhaseModalProps {
  open: boolean;
  pairs: MovePairOption[];
  currentPhase: MatchPhase | null;
  phases: MatchPhase[];
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: { pairId: string; phase: MatchPhase }) => void;
}

export default function MovePairPhaseModal({
  open,
  pairs,
  currentPhase,
  phases,
  isSubmitting = false,
  onOpenChange,
  onSubmit,
}: MovePairPhaseModalProps) {
  const [selectedPairId, setSelectedPairId] = useState<string | null>(null);
  const destinations = phases.filter((phase) => phase !== currentPhase);
  const selected = pairs.find((pair) => pair.pairId === selectedPairId) ?? null;
  const pairIdsKey = pairs.map((pair) => pair.pairId).join("|");

  useEffect(() => {
    if (!open) {
      setSelectedPairId(null);
      return;
    }
    const ids = pairIdsKey.split("|").filter(Boolean);
    setSelectedPairId(ids.length === 1 ? (ids[0] ?? null) : null);
  }, [open, pairIdsKey]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="move-pair-phase-modal">
        <DialogHeader>
          <DialogTitle>Mover pareja</DialogTitle>
          <DialogDescription>
            Elegí la pareja y la ronda de eliminación. Se recuentan los versus. No se puede mover a
            zonas.
          </DialogDescription>
        </DialogHeader>
        {pairs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay una pareja en este cruce.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Pareja
              </h3>
              <ul className="space-y-2">
                {pairs.map((pair) => {
                  const active = pair.pairId === selectedPairId;
                  return (
                    <li key={pair.pairId}>
                      <button
                        type="button"
                        data-testid={`move-pair-select-${pair.pairId}`}
                        aria-pressed={active}
                        disabled={isSubmitting}
                        className={cn(
                          "w-full rounded-md border px-3 py-2 text-left text-sm leading-tight",
                          active
                            ? "border-primary bg-primary text-foreground"
                            : "border-border bg-background hover:bg-muted/60",
                        )}
                        onClick={() => setSelectedPairId(pair.pairId)}
                      >
                        <p className="truncate font-medium capitalize">{pair.names[0]}</p>
                        {pair.names[1] ? (
                          <p
                            className={cn(
                              "truncate capitalize",
                              active ? "text-foreground/80" : "text-muted-foreground",
                            )}
                          >
                            {pair.names[1]}
                          </p>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Mover a
              </h3>
              {!selected ? (
                <p className="text-sm text-muted-foreground">Elegí una pareja.</p>
              ) : destinations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay otra ronda de la llave para mover.
                </p>
              ) : (
                <ul className="space-y-2">
                  {destinations.map((phase) => (
                    <li key={phase}>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start"
                        data-testid={`move-pair-to-${phase}`}
                        disabled={isSubmitting}
                        onClick={() => onSubmit({ pairId: selected.pairId, phase })}
                      >
                        {roundSectionLabel(phase)}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
