import { useEffect, useState } from "react";
import type { Match, MatchStatus } from "@core-api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type EditableMatchStatus = Extract<MatchStatus, "scheduled" | "inProgress">;

interface MatchStatusModalProps {
  open: boolean;
  match: Match | null;
  pairALabel: string;
  pairBLabel: string;
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (status: EditableMatchStatus) => Promise<void> | void;
}

const STATUS_OPTIONS: {
  value: EditableMatchStatus;
  label: string;
  hint: string;
}[] = [
  {
    value: "scheduled",
    label: "Programado",
    hint: "Pendiente de jugar o aún no marcado en cancha.",
  },
  {
    value: "inProgress",
    label: "En vivo",
    hint: "El partido ya comenzó.",
  },
];

export default function MatchStatusModal({
  open,
  match,
  pairALabel,
  pairBLabel,
  isSubmitting = false,
  onOpenChange,
  onSubmit,
}: MatchStatusModalProps) {
  const [selected, setSelected] = useState<EditableMatchStatus>("scheduled");

  useEffect(() => {
    if (!open || !match) return;
    setSelected(match.status === "inProgress" ? "inProgress" : "scheduled");
  }, [open, match]);

  const canSave =
    Boolean(match?.pairAId && match?.pairBId) &&
    match != null &&
    match.status !== "finished" &&
    match.status !== "walkover" &&
    match.status !== "cancelled" &&
    !isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-sm"
        data-testid="match-status-modal"
      >
        <DialogHeader>
          <DialogTitle>Estado del partido</DialogTitle>
          <DialogDescription>
            {match ? `${pairALabel} vs ${pairBLabel}` : "Elegí el estado."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2" role="radiogroup" aria-label="Estado">
          {STATUS_OPTIONS.map((option) => {
            const active = selected === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={isSubmitting || !canSave}
                data-testid={`match-status-option-${option.value}`}
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
                  active
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-muted/50",
                  (isSubmitting || !canSave) && "opacity-60",
                )}
                onClick={() => setSelected(option.value)}
              >
                <span className="text-sm font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">
                  {option.hint}
                </span>
              </button>
            );
          })}
        </div>

        {!canSave && match ? (
          <p className="text-sm text-muted-foreground">
            Este partido ya está cerrado y no se puede cambiar el estado aquí.
          </p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!canSave || selected === match?.status}
            onClick={() => {
              if (!canSave) return;
              void (async () => {
                await onSubmit(selected);
                onOpenChange(false);
              })();
            }}
          >
            {isSubmitting ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
