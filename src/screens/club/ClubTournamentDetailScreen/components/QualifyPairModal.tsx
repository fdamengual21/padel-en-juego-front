import { useEffect, useState } from "react";
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

export interface QualifyPairOption {
  pairId: string;
  names: [string, string];
}

interface QualifyPairModalProps {
  open: boolean;
  roundLabel: string;
  nextRoundLabel: string | null;
  pairs: QualifyPairOption[];
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (pairId: string) => void;
}

export default function QualifyPairModal({
  open,
  roundLabel,
  nextRoundLabel,
  pairs,
  isSubmitting = false,
  onOpenChange,
  onSubmit,
}: QualifyPairModalProps) {
  const [step, setStep] = useState<"select" | "confirm">("select");
  const [selectedPairId, setSelectedPairId] = useState<string | null>(null);
  const selected = pairs.find((pair) => pair.pairId === selectedPairId) ?? null;
  const pairIdsKey = pairs.map((pair) => pair.pairId).join("|");
  const selectedName = selected
    ? [selected.names[0], selected.names[1]].filter(Boolean).join(" / ")
    : "La pareja";

  useEffect(() => {
    if (!open) {
      setStep("select");
      setSelectedPairId(null);
      return;
    }
    const ids = pairIdsKey.split("|").filter(Boolean);
    const only = ids.length === 1 ? (ids[0] ?? null) : null;
    setSelectedPairId(only);
    setStep(only ? "confirm" : "select");
  }, [open, pairIdsKey]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="qualify-pair-modal">
        <DialogHeader>
          <DialogTitle>
            {step === "confirm" ? "Confirmar clasificación" : `Clasificar a · ${roundLabel}`}
          </DialogTitle>
          <DialogDescription>
            {step === "confirm"
              ? "Esta acción cierra solo este partido. La siguiente ronda queda pendiente."
              : "Elegí la pareja que pasa esta ronda sin jugar."}
          </DialogDescription>
        </DialogHeader>

        {pairs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay una pareja en este cruce.</p>
        ) : step === "select" ? (
          <ul className="space-y-2">
            {pairs.map((pair) => {
              const active = pair.pairId === selectedPairId;
              return (
                <li key={pair.pairId}>
                  <button
                    type="button"
                    data-testid={`qualify-pair-select-${pair.pairId}`}
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
        ) : (
          <p className="text-sm" data-testid="qualify-pair-confirm-copy">
            {selectedName} pasa de {roundLabel.toLowerCase()} sin jugar. El partido queda como
            Clasificó.
            {nextRoundLabel
              ? ` Entra a ${nextRoundLabel.toLowerCase()} y ese cruce sigue pendiente.`
              : ""}
          </p>
        )}

        <DialogFooter>
          {step === "confirm" && pairs.length > 1 ? (
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setStep("select")}
            >
              Volver
            </Button>
          ) : null}
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {step === "select" ? (
            <Button
              type="button"
              disabled={!selected || isSubmitting}
              data-testid="qualify-pair-continue"
              onClick={() => {
                if (!selected) return;
                setStep("confirm");
              }}
            >
              Continuar
            </Button>
          ) : (
            <Button
              type="button"
              disabled={!selected || isSubmitting}
              data-testid="qualify-pair-submit"
              onClick={() => {
                if (!selected) return;
                onSubmit(selected.pairId);
              }}
            >
              {isSubmitting ? "Guardando…" : "Clasificar"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
