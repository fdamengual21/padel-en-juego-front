import { useEffect, useMemo, useState } from "react";
import type { Match } from "@/domain";
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

interface MatchPairingModalProps {
  open: boolean;
  match: Match | null;
  roundLabel: string;
  /** Partidos de la misma ronda, para avisar intercambios. */
  roundMatches: Match[];
  /** Parejas aceptadas dentro del cuadro y sin retiro: las únicas que se pueden cruzar. */
  candidateIds: string[];
  pairLabels: Record<string, string>;
  isSubmitting?: boolean;
  /** Si la siguiente ronda ya se jugó, el modal queda en solo lectura. */
  lockedReason?: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: {
    pairAId: string | null;
    pairBId: string | null;
    note: string | null;
  }) => Promise<void> | void;
  /** Abre el modal para elegir quién clasifica o dejarlo pendiente. Si falta, no se muestra. */
  onQualify?: () => void;
}

/**
 * Cruce manual de un partido de eliminación sin jugar. El selector solo ofrece parejas aceptadas que
 * están dentro del cuadro; si una ya ocupa otro cruce de la ronda, la API las intercambia.
 */
export default function MatchPairingModal({
  open,
  match,
  roundLabel,
  roundMatches,
  candidateIds,
  pairLabels,
  isSubmitting = false,
  lockedReason = null,
  onOpenChange,
  onSubmit,
  onQualify,
}: MatchPairingModalProps) {
  const [pairAId, setPairAId] = useState("");
  const [pairBId, setPairBId] = useState("");
  const [note, setNote] = useState("");
  const locked = Boolean(lockedReason);
  const readOnly = locked || isSubmitting;

  useEffect(() => {
    if (!open || !match) return;
    setPairAId(match.pairAId ?? "");
    setPairBId(match.pairBId ?? "");
    setNote(match.pairingNote ?? "");
  }, [open, match]);

  const options = useMemo(
    () =>
      candidateIds
        .map((id) => ({ id, label: pairLabels[id] ?? "Pareja" }))
        .sort((left, right) => left.label.localeCompare(right.label, "es")),
    [candidateIds, pairLabels],
  );

  const seatOf = (pairId: string): Match | null =>
    roundMatches.find(
      (item) => item.id !== match?.id && (item.pairAId === pairId || item.pairBId === pairId),
    ) ?? null;

  const swaps = [pairAId, pairBId]
    .filter((id) => id && id !== match?.pairAId && id !== match?.pairBId)
    .map((id) => ({ id, other: seatOf(id) }))
    .filter((item): item is { id: string; other: Match } => item.other != null);

  const allowBye = match?.phase !== "GROUP";
  const sameChoice = pairAId !== "" && pairAId === pairBId;
  const unchanged = pairAId === (match?.pairAId ?? "") && pairBId === (match?.pairBId ?? "");
  const canSave =
    (allowBye ? Boolean(pairAId || pairBId) : Boolean(pairAId && pairBId)) &&
    !sameChoice &&
    !unchanged &&
    !isSubmitting &&
    !locked;
  const canQualify =
    Boolean(onQualify) &&
    Boolean(match?.pairAId || match?.pairBId) &&
    match != null &&
    match.status !== "finished" &&
    match.status !== "inProgress" &&
    match.status !== "cancelled" &&
    !isSubmitting &&
    !locked;

  const renderSelect = (id: string, value: string, onChange: (next: string) => void, label: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        disabled={readOnly}
        className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{allowBye ? "Sin rival" : "Elegí una pareja"}</option>
        {options.map((option) => {
          const seat = seatOf(option.id);
          return (
            <option key={option.id} value={option.id}>
              {option.label}
              {seat ? ` · hoy en otro cruce de ${roundLabel.toLowerCase()}` : ""}
            </option>
          );
        })}
      </select>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="match-pairing-modal">
        <DialogHeader>
          <DialogTitle>Modificar cruce · {roundLabel}</DialogTitle>
          <DialogDescription>
            Solo se pueden cruzar parejas aceptadas que estén dentro del cuadro y sigan en
            competencia. Un lado vacío queda como sin rival.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {lockedReason ? (
            <p
              className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
              data-testid="pairing-locked-reason"
            >
              {lockedReason}
            </p>
          ) : null}
          {renderSelect("pairing-a", pairAId, setPairAId, "Lado A")}
          {renderSelect("pairing-b", pairBId, setPairBId, "Lado B")}
          {sameChoice ? (
            <p className="text-sm text-destructive">Elegí dos parejas distintas.</p>
          ) : null}
          {swaps.length ? (
            <p
              className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900"
              data-testid="pairing-swap-notice"
            >
              {swaps
                .map(
                  (swap) =>
                    `${pairLabels[swap.id] ?? "La pareja"} ya está en otro cruce de esta ronda: se intercambia con la que sale de este partido.`,
                )
                .join(" ")}
            </p>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="pairing-note">Motivo (opcional)</Label>
            <Input
              id="pairing-note"
              value={note}
              maxLength={300}
              placeholder="Pedido de las parejas, error de carga…"
              disabled={readOnly}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            El cruce queda marcado como manual y el motor deja de recalcularlo con las tablas de zona.
            Si queda una pareja sin rival, pasa sola como Clasificó.
          </p>
        </div>

        <DialogFooter className="sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {onQualify ? (
              <Button
                type="button"
                variant="outline"
                disabled={!canQualify}
                data-testid="match-pairing-qualify"
                onClick={() => {
                  if (!canQualify) return;
                  onQualify();
                }}
              >
                Clasificar
              </Button>
            ) : null}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
              data-testid="match-pairing-submit"
              onClick={() => {
                if (!canSave) return;
                void onSubmit({
                  pairAId: pairAId || null,
                  pairBId: pairBId || null,
                  note: note.trim() || null,
                });
              }}
            >
              {isSubmitting ? "Guardando…" : "Guardar cruce"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
