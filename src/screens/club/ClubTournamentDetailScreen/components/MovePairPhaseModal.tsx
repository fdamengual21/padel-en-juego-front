import { useEffect, useState } from "react";
import { zoneMoveSizeBlockedReason, type MatchPhase } from "@/domain";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { roundSectionLabel } from "@/lib/tournamentLabels";
import { cn } from "@/lib/utils";

export interface MovePairOption {
  pairId: string;
  names: [string, string];
}

export interface MovePairGroupOption {
  id: string;
  name: string;
  pairCount: number;
}

interface MovePairPhaseModalProps {
  open: boolean;
  pairs: MovePairOption[];
  currentPhase: MatchPhase | null;
  phases: MatchPhase[];
  groups?: MovePairGroupOption[];
  currentGroupId?: string | null;
  pairGroupIds?: Record<string, string>;
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: { pairId: string; phase?: MatchPhase; groupId?: string }) => void;
}

export default function MovePairPhaseModal({
  open,
  pairs,
  currentPhase,
  phases,
  groups = [],
  currentGroupId = null,
  pairGroupIds = {},
  isSubmitting = false,
  onOpenChange,
  onSubmit,
}: MovePairPhaseModalProps) {
  const [selectedPairId, setSelectedPairId] = useState<string | null>(null);
  const selected = pairs.find((pair) => pair.pairId === selectedPairId) ?? null;
  const originGroupId = selected
    ? (pairGroupIds[selected.pairId] ?? currentGroupId)
    : currentGroupId;
  const originActive = originGroupId
    ? (groups.find((group) => group.id === originGroupId)?.pairCount ?? null)
    : null;
  const phaseDestinations = phases.filter((phase) => phase !== currentPhase);
  const groupDestinations = groups.filter((group) => group.id !== originGroupId);
  const hasDestinations = phaseDestinations.length > 0 || groupDestinations.length > 0;
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
            Elegí la pareja y el destino: otra ronda de la llave o otra zona. Se recuentan los
            versus. No se puede mover si esa zona o esa pareja ya jugó, si el destino tiene 4 o si
            el origen quedaría con 2.
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
              ) : !hasDestinations ? (
                <p className="text-sm text-muted-foreground">
                  No hay otra ronda o zona para mover.
                </p>
              ) : (
                <ul className="space-y-2">
                  {phaseDestinations.map((phase) => (
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
                  {groupDestinations.map((group) => {
                    const blocked = zoneMoveSizeBlockedReason(originActive, group.pairCount);
                    return (
                      <li key={group.id} className="space-y-1">
                        <TooltipProvider delay={200}>
                          <Tooltip>
                            <TooltipTrigger render={<span className="flex w-full" />}>
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full justify-start"
                                data-testid={`move-pair-to-group-${group.id}`}
                                disabled={isSubmitting || Boolean(blocked)}
                                onClick={() => {
                                  if (blocked) return;
                                  onSubmit({ pairId: selected.pairId, groupId: group.id });
                                }}
                              >
                                {group.name}
                              </Button>
                            </TooltipTrigger>
                            {blocked ? (
                              <TooltipContent className="max-w-xs">{blocked}</TooltipContent>
                            ) : null}
                          </Tooltip>
                        </TooltipProvider>
                        {blocked ? (
                          <p className="px-0.5 text-xs text-muted-foreground">{blocked}</p>
                        ) : null}
                      </li>
                    );
                  })}
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
