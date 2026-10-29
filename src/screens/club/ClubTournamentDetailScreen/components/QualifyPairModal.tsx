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

const NONE = "none";

interface QualifyPairModalProps {
  open: boolean;
  roundLabel: string;
  nextRoundLabel: string | null;
  pairs: QualifyPairOption[];
  isSubmitting?: boolean;
  lockedReason?: string | null;
  alreadyClassified?: boolean;
  initialPairId?: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (pairId: string | null) => void;
}

export default function QualifyPairModal({
  open,
  roundLabel,
  nextRoundLabel,
  pairs,
  isSubmitting = false,
  lockedReason = null,
  alreadyClassified = false,
  initialPairId = null,
  onOpenChange,
  onSubmit,
}: QualifyPairModalProps) {
  const [step, setStep] = useState<"select" | "confirm">("select");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const noneSelected = selectedId === NONE;
  const selected = noneSelected ? null : (pairs.find((pair) => pair.pairId === selectedId) ?? null);
  const pairIdsKey = pairs.map((pair) => pair.pairId).join("|");
  const selectedName = selected
    ? [selected.names[0], selected.names[1]].filter(Boolean).join(" / ")
    : "Nadie";
  const locked = Boolean(lockedReason);
  const canContinue = selectedId != null && !isSubmitting && !locked;

  useEffect(() => {
    if (!open) {
      setStep("select");
      setSelectedId(null);
      return;
    }
    const ids = pairIdsKey.split("|").filter(Boolean);
    if (alreadyClassified) {
      setSelectedId(initialPairId && ids.includes(initialPairId) ? initialPairId : NONE);
    } else {
      setSelectedId(ids.length === 1 ? (ids[0] ?? null) : null);
    }
    setStep("select");
  }, [open, pairIdsKey, initialPairId, alreadyClassified]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="qualify-pair-modal">
        <DialogHeader>
          <DialogTitle>
            {step === "confirm" ? "Confirmar clasificación" : `Clasificar · ${roundLabel}`}
          </DialogTitle>
          <DialogDescription>
            {lockedReason
              ? lockedReason
              : step === "confirm"
                ? noneSelected
                  ? "Nadie pasa este cruce. El partido vuelve a pendiente."
                  : "Esta acción cierra solo este partido. La siguiente ronda queda pendiente."
                : "Elegí quién pasa este cruce sin jugar, o a nadie si querés dejarlo pendiente."}
          </DialogDescription>
        </DialogHeader>

        {pairs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay una pareja en este cruce.</p>
        ) : step === "select" ? (
          <ul
            className="space-y-2"
            role="radiogroup"
            aria-label="Pareja a clasificar"
          >
            {pairs.map((pair) => {
              const active = pair.pairId === selectedId;
              const inputId = `qualify-pair-${pair.pairId}`;
              return (
                <li key={pair.pairId}>
                  <label
                    htmlFor={inputId}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 text-sm leading-tight",
                      active
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background hover:bg-muted/60",
                      (isSubmitting || locked) && "cursor-default opacity-60",
                    )}
                  >
                    <input
                      id={inputId}
                      type="radio"
                      name="qualify-pair"
                      value={pair.pairId}
                      checked={active}
                      disabled={isSubmitting || locked}
                      data-testid={`qualify-pair-select-${pair.pairId}`}
                      className="mt-1 size-4 shrink-0 accent-primary"
                      onChange={() => setSelectedId(pair.pairId)}
                    />
                    <span className="min-w-0">
                      <p className="truncate font-medium capitalize">{pair.names[0]}</p>
                      {pair.names[1] ? (
                        <p className="truncate capitalize text-muted-foreground">{pair.names[1]}</p>
                      ) : null}
                    </span>
                  </label>
                </li>
              );
            })}
            <li>
              <label
                htmlFor="qualify-pair-none"
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 text-sm leading-tight",
                  noneSelected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background hover:bg-muted/60",
                  (isSubmitting || locked) && "cursor-default opacity-60",
                )}
              >
                <input
                  id="qualify-pair-none"
                  type="radio"
                  name="qualify-pair"
                  value={NONE}
                  checked={noneSelected}
                  disabled={isSubmitting || locked}
                  data-testid="qualify-pair-select-none"
                  className="mt-1 size-4 shrink-0 accent-primary"
                  onChange={() => setSelectedId(NONE)}
                />
                <span className="min-w-0">
                  <p className="font-medium">Nadie</p>
                  <p className="text-muted-foreground">El cruce queda pendiente, sin Clasificó.</p>
                </span>
              </label>
            </li>
          </ul>
        ) : (
          <p className="text-sm" data-testid="qualify-pair-confirm-copy">
            {noneSelected
              ? "Nadie pasa de esta ronda. Se saca la marca Clasificó y el cruce vuelve a pendiente."
              : `${selectedName} pasa de ${roundLabel.toLowerCase()} sin jugar. El partido queda como Clasificó.${
                  nextRoundLabel
                    ? ` Entra a ${nextRoundLabel.toLowerCase()} y ese cruce sigue pendiente.`
                    : ""
                }`}
          </p>
        )}

        <DialogFooter>
          {step === "confirm" ? (
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
              disabled={!canContinue}
              data-testid="qualify-pair-continue"
              onClick={() => {
                if (!canContinue) return;
                setStep("confirm");
              }}
            >
              Continuar
            </Button>
          ) : (
            <Button
              type="button"
              disabled={!canContinue}
              data-testid="qualify-pair-submit"
              onClick={() => {
                if (!canContinue) return;
                onSubmit(noneSelected ? null : selected!.pairId);
              }}
            >
              {isSubmitting ? "Guardando…" : noneSelected ? "Dejar pendiente" : "Clasificar"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
