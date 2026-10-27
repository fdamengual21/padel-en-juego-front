import { useState } from "react";
import type { Match, MatchPhase } from "@/domain";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import WarningDialog from "@/components/ui/warning-dialog";
import { roundSectionLabel } from "@/lib/tournamentLabels";

interface KnockoutPhasesModalProps {
  open: boolean;
  addable: MatchPhase[];
  removable: MatchPhase[];
  elimMatches: Match[];
  addingPhase: string | null;
  removingPhase: string | null;
  blockedReason?: string | null;
  onOpenChange: (open: boolean) => void;
  onAdd: (phase: MatchPhase) => void;
  onRemove: (phase: MatchPhase) => void;
}

function phaseHasPairs(matches: Match[], phase: MatchPhase): boolean {
  return matches.some(
    (match) => match.phase === phase && (Boolean(match.pairAId) || Boolean(match.pairBId)),
  );
}

function nextPhaseLabel(phase: MatchPhase): string {
  if (phase === "R32") return roundSectionLabel("R16");
  if (phase === "R16") return roundSectionLabel("QF");
  return "la siguiente ronda";
}

function ActionButton({
  disabled,
  blockedReason,
  testId,
  busyLabel,
  label,
  variant,
  onClick,
}: {
  disabled: boolean;
  blockedReason: string | null;
  testId: string;
  busyLabel: string;
  label: string;
  variant?: "outline";
  onClick: () => void;
}) {
  const button = (
    <Button
      type="button"
      size="sm"
      variant={variant}
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
    >
      {busyLabel || label}
    </Button>
  );
  if (!blockedReason) return button;
  return (
    <TooltipProvider delay={200}>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>{button}</TooltipTrigger>
        <TooltipContent className="max-w-xs">{blockedReason}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function KnockoutPhasesModal({
  open,
  addable,
  removable,
  elimMatches,
  addingPhase,
  removingPhase,
  blockedReason = null,
  onOpenChange,
  onAdd,
  onRemove,
}: KnockoutPhasesModalProps) {
  const [pendingRemove, setPendingRemove] = useState<MatchPhase | null>(null);
  const busy = addingPhase != null || removingPhase != null;
  const empty = addable.length === 0 && removable.length === 0;
  const addBlockedReason = blockedReason
    ? "No se puede agregar una ronda: ya hay partidos jugados en la llave."
    : null;

  const confirmRemove = (phase: MatchPhase) => {
    if (phaseHasPairs(elimMatches, phase)) {
      setPendingRemove(phase);
      return;
    }
    onRemove(phase);
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) setPendingRemove(null);
          onOpenChange(next);
        }}
      >
        <DialogContent className="max-w-md" data-testid="knockout-phases-modal">
          <DialogHeader>
            <DialogTitle>Fases del cuadro</DialogTitle>
            <DialogDescription>
              Agregá o quitá octavos y dieciseisavos. Las rondas que arma el cupo no se pueden
              borrar. Una ronda extra vacía se puede quitar aunque el resto de la llave ya se haya
              jugado.
            </DialogDescription>
          </DialogHeader>
          {empty ? (
            <p className="text-sm text-muted-foreground">
              Con este cupo no hay rondas extra para agregar o quitar.
            </p>
          ) : (
            <ul className="space-y-2">
              {addable.map((phase) => (
                <li
                  key={`add-${phase}`}
                  className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                >
                  <span className="text-sm font-medium">{roundSectionLabel(phase)}</span>
                  <ActionButton
                    disabled={busy || Boolean(addBlockedReason)}
                    blockedReason={addBlockedReason}
                    testId={`add-knockout-phase-${phase}`}
                    busyLabel={addingPhase === phase ? "Agregando…" : ""}
                    label="Agregar"
                    onClick={() => onAdd(phase)}
                  />
                </li>
              ))}
              {removable.map((phase) => {
                const occupied = phaseHasPairs(elimMatches, phase);
                const removeBlockedReason =
                  occupied && blockedReason
                    ? "No se puede quitar una ronda con parejas: ya hay partidos jugados en la llave."
                    : null;
                return (
                  <li
                    key={`remove-${phase}`}
                    className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                  >
                    <span className="text-sm font-medium">{roundSectionLabel(phase)}</span>
                    <ActionButton
                      disabled={busy || Boolean(removeBlockedReason)}
                      blockedReason={removeBlockedReason}
                      testId={`remove-knockout-phase-${phase}`}
                      busyLabel={removingPhase === phase ? "Quitando…" : ""}
                      label="Quitar"
                      variant="outline"
                      onClick={() => confirmRemove(phase)}
                    />
                  </li>
                );
              })}
            </ul>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <WarningDialog
        open={pendingRemove != null}
        onOpenChange={(next) => {
          if (!next) setPendingRemove(null);
        }}
        title="Quitar ronda con parejas"
        description={
          pendingRemove
            ? `Las parejas de ${roundSectionLabel(pendingRemove)} pasan a ${nextPhaseLabel(pendingRemove)} y se recuentan los versus.`
            : undefined
        }
        confirmLabel="Quitar ronda"
        confirmVariant="destructive"
        isConfirming={pendingRemove != null && removingPhase === pendingRemove}
        onConfirm={() => {
          if (!pendingRemove) return;
          onRemove(pendingRemove);
          setPendingRemove(null);
        }}
      />
    </>
  );
}
