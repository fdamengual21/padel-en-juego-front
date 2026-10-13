import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { GroupStanding } from "@/domain";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ResolveTieModalProps {
  open: boolean;
  zoneName: string;
  /** Parejas empatadas que el reglamento no pudo ordenar. */
  tiedPairIds: string[];
  pairLabels: Record<string, string>;
  standings: GroupStanding[];
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: { order: string[]; note: string }) => Promise<void> | void;
}

const NOTE_SUGGESTIONS = ["Sorteo en mesa de control", "Sorteo con moneda", "Acuerdo entre las parejas"];

/**
 * Orden manual de las parejas empatadas. Solo aparece cuando puntos, directo, sets y games
 * (entre ellas y en toda la zona) quedaron iguales: el reglamento FIP manda sorteo.
 */
export default function ResolveTieModal({
  open,
  zoneName,
  tiedPairIds,
  pairLabels,
  standings,
  isSubmitting = false,
  onOpenChange,
  onSubmit,
}: ResolveTieModalProps) {
  const [order, setOrder] = useState<string[]>([]);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setOrder(tiedPairIds);
    setNote("");
  }, [open, tiedPairIds]);

  const rowById = new Map(standings.map((row) => [row.pairId, row]));
  const firstPosition = Math.min(
    ...tiedPairIds.map((id) => rowById.get(id)?.position ?? Number.MAX_SAFE_INTEGER),
  );
  const canSave = order.length === tiedPairIds.length && note.trim().length >= 3 && !isSubmitting;

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    setOrder((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="resolve-tie-modal">
        <DialogHeader>
          <DialogTitle>Desempatar {zoneName}</DialogTitle>
          <DialogDescription>
            Estas parejas quedaron iguales en puntos, enfrentamiento directo, sets y games. El
            reglamento manda sorteo: ordenalas de mejor a peor y dejá constancia de cómo se decidió.
          </DialogDescription>
        </DialogHeader>

        <ol className="space-y-1.5" aria-label="Orden de las parejas empatadas">
          {order.map((pairId, index) => {
            const row = rowById.get(pairId);
            return (
              <li
                key={pairId}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2"
                data-testid={`tie-order-${pairId}`}
              >
                <span className="w-7 text-sm font-semibold tabular-nums text-muted-foreground">
                  {Number.isFinite(firstPosition) ? firstPosition + index : index + 1}°
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{pairLabels[pairId] ?? "Pareja"}</p>
                  {row ? (
                    <p className="text-xs text-muted-foreground">
                      {row.points} pts · sets {row.setsWon}-{row.setsLost} · games {row.gamesWon}-
                      {row.gamesLost}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col">
                  <button
                    type="button"
                    aria-label="Subir"
                    disabled={index === 0 || isSubmitting}
                    className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Bajar"
                    disabled={index === order.length - 1 || isSubmitting}
                    className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="space-y-1.5">
          <Label htmlFor="tie-note">Cómo se resolvió</Label>
          <Input
            id="tie-note"
            value={note}
            maxLength={300}
            placeholder="Sorteo en mesa de control"
            disabled={isSubmitting}
            onChange={(event) => setNote(event.target.value)}
          />
          <div className="flex flex-wrap gap-1.5">
            {NOTE_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={isSubmitting}
                className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted"
                onClick={() => setNote(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Si después cambia un resultado de la zona, este desempate se borra y hay que volver a
            resolverlo.
          </p>
        </div>

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
            disabled={!canSave}
            data-testid="resolve-tie-submit"
            onClick={() => {
              if (!canSave) return;
              void onSubmit({ order, note: note.trim() });
            }}
          >
            {isSubmitting ? "Guardando…" : "Fijar orden"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
