import { useEffect, useMemo, useState } from "react";
import ParticipantPairLine from "@/components/tournaments/ParticipantPairLine";
import { Badge } from "@/components/ui/badge";
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
import type { CreateRepechageInput, RepechageCandidate, RepechageEntriesInput } from "@/domain";

interface RepechagePairsModalProps {
  open: boolean;
  /** `create`: elige punto de oro o ventaja y parejas opcionales. `edit`: solo parejas. */
  mode: "create" | "edit";
  candidates: RepechageCandidate[];
  isLoading?: boolean;
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: RepechageEntriesInput) => void;
  onCreate: (input: CreateRepechageInput) => void;
}

const EQUALS_OPTIONS = [
  { goldenPoint: true, label: "Punto de oro" },
  { goldenPoint: false, label: "Con ventaja (diferencia de 2)" },
] as const;

export default function RepechagePairsModal({
  open,
  mode,
  candidates,
  isLoading = false,
  isSubmitting = false,
  onOpenChange,
  onSave,
  onCreate,
}: RepechagePairsModalProps) {
  const creating = mode === "create";
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [goldenPoint, setGoldenPoint] = useState(true);

  useEffect(() => {
    if (!open) {
      setChecked(new Set());
      setGoldenPoint(true);
      return;
    }
    setChecked(new Set(candidates.filter((item) => item.alreadyInRepechage).map((item) => item.pairId)));
  }, [open, candidates]);

  const payload = useMemo<RepechageEntriesInput>(() => {
    const addPairIds = candidates
      .filter((item) => item.selectable && checked.has(item.pairId))
      .map((item) => item.pairId);
    const removePairIds = candidates
      .filter((item) => item.alreadyInRepechage && item.removable && !checked.has(item.pairId))
      .map((item) => item.pairId);
    return { addPairIds, removePairIds };
  }, [candidates, checked]);

  const canSave = creating || payload.addPairIds.length > 0 || payload.removePairIds.length > 0;

  const submit = () => {
    if (creating) onCreate({ goldenPoint, pairIds: payload.addPairIds });
    else onSave(payload);
  };

  const toggle = (item: RepechageCandidate) => {
    if (!(item.selectable || item.removable) || isSubmitting) return;
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(item.pairId)) next.delete(item.pairId);
      else next.add(item.pairId);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="repechage-pairs-modal">
        <DialogHeader>
          <DialogTitle>{creating ? "Crear repechaje" : "Parejas del repechaje"}</DialogTitle>
          <DialogDescription>
            {creating
              ? "Se juega en una sola zona, todos contra todos. Las parejas son opcionales: podés sumarlas después."
              : "Elegí parejas eliminadas del cuadro. Podés sacar a las que todavía no jugaron en el repechaje."}
          </DialogDescription>
        </DialogHeader>
        {creating ? (
          <fieldset className="m-0 space-y-2 border-0 p-0" data-testid="repechage-equals-options">
            <legend className="text-sm font-medium">En iguales (40-40)</legend>
            {EQUALS_OPTIONS.map((option) => (
              <label key={option.label} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="repechageEquals"
                  checked={goldenPoint === option.goldenPoint}
                  disabled={isSubmitting}
                  onChange={() => setGoldenPoint(option.goldenPoint)}
                />
                {option.label}
              </label>
            ))}
          </fieldset>
        ) : null}
        {creating ? <p className="text-sm font-medium">Seleccioná las parejas</p> : null}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando parejas…</p>
        ) : candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay parejas aceptadas.</p>
        ) : (
          <TooltipProvider delay={200}>
            <ul className="max-h-80 divide-y divide-border overflow-y-auto rounded-xl border border-border bg-card">
              {candidates.map((item) => {
                const names: [string, string] = [
                  item.playerNames[0] ?? "?",
                  item.playerNames[1] ?? "",
                ];
                const disabled = !(item.selectable || item.removable) || isSubmitting;
                const removeBlockedReason =
                  item.alreadyInRepechage && !item.removable
                    ? "Ya jugó en el repechaje. No se puede sacar. Si no puede seguir, desclasificala desde Participantes."
                    : null;
                const row = (
                  <label
                    className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-70"
                    data-testid={`repechage-candidate-${item.pairId}`}
                  >
                    <input
                      type="checkbox"
                      className="size-4 shrink-0 rounded border border-input accent-primary"
                      checked={checked.has(item.pairId)}
                      disabled={disabled}
                      onChange={() => toggle(item)}
                    />
                    <div className="min-w-0 flex-1">
                      <ParticipantPairLine names={names} avatars={item.playerAvatars} />
                    </div>
                    <Badge variant={item.outcome === "eliminated" ? "destructive" : "secondary"}>
                      {item.label}
                    </Badge>
                  </label>
                );
                return (
                  <li key={item.pairId}>
                    {removeBlockedReason ? (
                      <Tooltip>
                        <TooltipTrigger render={<div className="w-full" />}>
                          {row}
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          {removeBlockedReason}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      row
                    )}
                  </li>
                );
              })}
            </ul>
          </TooltipProvider>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="button"
            data-testid="repechage-pairs-submit"
            disabled={isSubmitting || !canSave}
            onClick={submit}
          >
            {creating
              ? isSubmitting
                ? "Creando…"
                : "Crear repechaje"
              : isSubmitting
                ? "Guardando…"
                : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
