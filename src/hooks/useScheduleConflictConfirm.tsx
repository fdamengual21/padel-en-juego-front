import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Court, CourtReservation, Match, ScheduleConflict } from "@core-api";
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
  reservations?: CourtReservation[];
  matchDurationMinutes?: number;
  pairLabels: Record<string, string>;
}

interface PendingConflictConfirm extends ScheduleConflictConfirmRequest {
  resolve: (result: ScheduleConflictConfirmResult) => void;
}

/**
 * Promesa + modal para resolver conflictos de agenda.
 * Incluye avisos por reservas de cancha.
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
        reservations: request.reservations,
        matchDurationMinutes: request.matchDurationMinutes,
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
  const reservationConflict = request.conflicts.find(
    (c) => c.type === "reservation",
  );
  const capacityConflict = request.conflicts.find((c) => c.type === "capacity");
  const pairConflicts = request.conflicts.filter((c) => c.type === "pair");
  const hora = formatScheduleShortEs(request.scheduledAt);

  if (pairConflicts.length > 0) {
    const description = pairConflicts
      .map((c) => c.summary)
      .filter(Boolean)
      .join(" ");
    return (
      <WarningDialog
        open={open}
        onOpenChange={(next) => {
          if (!next) onCancel();
        }}
        title="No se puede guardar"
        description={
          description ||
          `Una de las parejas ya tiene otro partido el ${hora}.`
        }
        confirmLabel="Entendido"
        cancelLabel="Volver"
        onConfirm={onCancel}
      >
        <p className="text-xs text-muted-foreground">
          Un equipo no puede jugar dos partidos el mismo día a la misma hora,
          aunque sea en canchas distintas.
        </p>
      </WarningDialog>
    );
  }

  const proposedCourtName =
    request.courts.find((c) => c.id === request.proposedCourtId)?.name ??
    "seleccionada";

  const occupants = courtConflict?.conflictingMatches ?? [];
  const occupantLabels = occupants
    .map((m) => pairLabelForMatch(m, request.pairLabels))
    .join("; ");

  const reservationLabels = (reservationConflict?.conflictingReservations ?? [])
    .map((r) => r.clientLabel ?? "reserva")
    .join("; ");

  let description: string;
  if (reservationConflict) {
    description = `Hay una reserva de cancha en ${proposedCourtName} el ${hora}${
      reservationLabels ? ` (${reservationLabels})` : ""
    }.`;
    if (!hasAlternatives) {
      description += " Y no hay canchas libres a esa hora.";
    }
  } else if (courtConflict && occupantLabels) {
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

  const forceHint = reservationConflict
    ? "Si guardás de todos modos, el partido quedará en ese horario aunque haya una reserva (la reserva no se cancela)."
    : "Si guardás de todos modos, se asignará esta cancha y se quitará a los equipos que ya la tenían en ese horario.";

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
            equipos ni pisar reservas.
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{forceHint}</p>
      )}
    </WarningDialog>
  );
}
