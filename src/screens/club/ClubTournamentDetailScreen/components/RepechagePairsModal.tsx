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
import { FIVE_PAIR_ZONE_NOTICE, type RepechageCandidate, type RepechageEntriesInput } from "@/domain";

interface RepechagePairsModalProps {
  open: boolean;
  candidates: RepechageCandidate[];
  isLoading?: boolean;
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: RepechageEntriesInput) => void;
}

export default function RepechagePairsModal({
  open,
  candidates,
  isLoading = false,
  isSubmitting = false,
  onOpenChange,
  onSubmit,
}: RepechagePairsModalProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) {
      setChecked(new Set());
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

  const canSave = payload.addPairIds.length > 0 || payload.removePairIds.length > 0;

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
          <DialogTitle>Parejas del repechaje</DialogTitle>
          <DialogDescription>
            Elegí parejas eliminadas del cuadro. Podés sacar a las que todavía no jugaron en el
            repechaje.
          </DialogDescription>
        </DialogHeader>
        {checked.size === 5 ? (
          <p
            className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950"
            data-testid="five-pair-zone-notice"
          >
            {FIVE_PAIR_ZONE_NOTICE}
          </p>
        ) : null}
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
            onClick={() => onSubmit(payload)}
          >
            {isSubmitting ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
