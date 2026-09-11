import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Court, Match, ScheduleConflict } from "@core-api";
import {
  listAvailableCourtsAt,
  pairLabelForMatch,
} from "@core-api";
import WarningDialog from "@/components/ui/warning-dialog";
import { Label } from "@/components/ui/label";
import { formatScheduleShortEs } from "@/lib/dates";

export type ScheduleConflictConfirmResult =
  | { ok: false }
  | { ok: true; courtId: string | null; force: boolean };

export interface ScheduleConflictConfirmRequest {
  conflicts: ScheduleConflict[];
  matchId: string;
  scheduledAt: string | null;
  proposedCourtId: string | null;
  courts: Court[];
  matches: Match[];
  pairLabels: Record<string, string>;
}

interface PendingConflictConfirm extends ScheduleConflictConfirmRequest {
  resolve: (result: ScheduleConflictConfirmResult) => void;
}

/**
 * Promesa + modal para resolver conflictos de agenda.
 * - Con canchas libres: elegir otra y "Guardar" (sin forzar).
 * - Sin canchas libres: "Guardar de todos modos" (fuerza y libera la cancha a otros).
 */
export function useScheduleConflictConfirm(pairLabels: Record<string, string>) {
  const [pending, setPending] = useState<PendingConflictConfirm | null>(null);
  const pendingRef = useRef<PendingConflictConfirm | null>(null);

  const settle = useCallback((result: ScheduleConflictConfirmResult) => {
    const current = pendingRef.current;
    if (!current) return;
    pendingRef.current = null;
    setPending(null);
    document.body.style.removeProperty("pointer-events");
    current.resolve(result);
  }, []);

  const confirmConflicts = useCallback(
    (request: ScheduleConflictConfirmRequest) => {
      if (request.conflicts.length === 0) {
        return Promise.resolve({
          ok: true as const,
          courtId: request.proposedCourtId,
          force: false,
        });
      }
      return new Promise<ScheduleConflictConfirmResult>((resolve) => {
        const next = {
          ...request,
          pairLabels: { ...pairLabels, ...request.pairLabels },
          resolve,
        };
        pendingRef.current = next;
        setPending(next);
      });
    },
    [pairLabels],
  );

  const dialog = pending ? (
    <ScheduleConflictResolveDialog
      open
      request={pending}
      onCancel={() => settle({ ok: false })}
      onResolve={(result) => settle(result)}
    />
  ) : null;

  return { confirmConflicts, dialog };
}

function ScheduleConflictResolveDialog({
  open,
  request,
  onCancel,
  onResolve,
}: {
  open: boolean;
  request: ScheduleConflictConfirmRequest;
  onCancel: () => void;
  onResolve: (result: ScheduleConflictConfirmResult) => void;
}) {
  const availableCourts = useMemo(
    () =>
      listAvailableCourtsAt({
        matchId: request.matchId,
        scheduledAt: request.scheduledAt,
        matches: request.matches,
        courts: request.courts,
      }).filter((c) => c.id !== request.proposedCourtId),
    [request],
  );

  const hasAlternatives = availableCourts.length > 0;
  const [selectedCourtId, setSelectedCourtId] = useState(
    availableCourts[0]?.id ?? "",
  );

  useEffect(() => {
    setSelectedCourtId(availableCourts[0]?.id ?? "");
  }, [availableCourts]);

  const courtConflict = request.conflicts.find((c) => c.type === "court");
  const capacityConflict = request.conflicts.find((c) => c.type === "capacity");
  const hora = formatScheduleShortEs(request.scheduledAt);

  const proposedCourtName =
    request.courts.find((c) => c.id === request.proposedCourtId)?.name ??
    "seleccionada";

  const occupants = courtConflict?.conflictingMatches ?? [];
  const occupantLabels = occupants
    .map((m) => pairLabelForMatch(m, request.pairLabels))
    .join("; ");

  let description: string;
  if (courtConflict && occupantLabels) {
    description = `La cancha seleccionada (${proposedCourtName}) se encuentra ocupada el ${hora} por ${occupantLabels}.`;
    if (!hasAlternatives) {
      description += " Y no hay canchas disponibles.";
    }
  } else if (capacityConflict || !hasAlternatives) {
    description = `No hay canchas disponibles el ${hora}.`;
  } else {
    description =
      request.conflicts.map((c) => c.summary).filter(Boolean).join(" ") ||
      "Hay un conflicto de horario o cancha.";
  }

  return (
    <WarningDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
      title="Advertencia de disponibilidad"
      description={description}
      confirmLabel={hasAlternatives ? "Guardar" : "Guardar de todos modos"}
      cancelLabel="Cancelar"
      confirmVariant={hasAlternatives ? "default" : "destructive"}
      confirmDisabled={hasAlternatives && !selectedCourtId}
      onConfirm={() => {
        if (hasAlternatives) {
          if (!selectedCourtId) return;
          onResolve({
            ok: true,
            courtId: selectedCourtId,
            force: false,
          });
          return;
        }
        onResolve({
          ok: true,
          courtId: request.proposedCourtId,
          force: true,
        });
      }}
    >
      {hasAlternatives ? (
        <div className="space-y-2">
          <Label htmlFor="conflict-available-court">Cancha disponible</Label>
          <select
            id="conflict-available-court"
            className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
            value={selectedCourtId}
            onChange={(e) => setSelectedCourtId(e.target.value)}
          >
            {availableCourts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Elegí otra cancha libre a esa hora para guardar sin desplazar a otros
            equipos.
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Si guardás de todos modos, se asignará esta cancha y se quitará a los
          equipos que ya la tenían en ese horario.
        </p>
      )}
    </WarningDialog>
  );
}
