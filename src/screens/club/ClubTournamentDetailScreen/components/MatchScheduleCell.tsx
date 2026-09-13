import { useEffect, useState } from "react";
import type { Court, CourtReservation, Match } from "@core-api";
import { findScheduleConflicts } from "@core-api";
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
import {
  useScheduleConflictConfirm,
  type ScheduleConflictConfirmRequest,
  type ScheduleConflictConfirmResult,
} from "@/hooks/useScheduleConflictConfirm";
import { formatScheduleShortEs } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function toScheduleDateValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function toScheduleTimeValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(11, 16);
}

/** Combina fecha (YYYY-MM-DD) y hora (HH:mm). Ambos vacíos → sin horario. */
export function fromScheduleDateAndTime(
  date: string,
  time: string,
): string | null {
  if (!date && !time) return null;
  if (!date || !time) return null;
  return `${date}T${time}:00.000Z`;
}

type SaveSchedulePayload = {
  matchId: string;
  scheduledAt: string | null;
  courtId: string | null;
  force?: boolean;
};

async function saveWithConflictCheck(input: {
  matchId: string;
  scheduledAt: string | null;
  courtId: string | null;
  allMatches: Match[];
  courts: Court[];
  reservations?: CourtReservation[];
  matchDurationMinutes?: number;
  pairLabels: Record<string, string>;
  confirmConflicts: (
    request: ScheduleConflictConfirmRequest,
  ) => Promise<ScheduleConflictConfirmResult>;
  onSave: (payload: SaveSchedulePayload) => Promise<void> | void;
}) {
  const conflicts = findScheduleConflicts({
    matchId: input.matchId,
    scheduledAt: input.scheduledAt,
    courtId: input.courtId,
    matches: input.allMatches,
    courts: input.courts,
    reservations: input.reservations,
    pairLabels: input.pairLabels,
    matchDurationMinutes: input.matchDurationMinutes,
  });

  if (conflicts.length > 0) {
    const result = await input.confirmConflicts({
      conflicts,
      matchId: input.matchId,
      scheduledAt: input.scheduledAt,
      proposedCourtId: input.courtId,
      courts: input.courts,
      matches: input.allMatches,
      reservations: input.reservations,
      matchDurationMinutes: input.matchDurationMinutes,
      pairLabels: input.pairLabels,
    });
    if (!result.ok) return false;
    await input.onSave({
      matchId: input.matchId,
      scheduledAt: input.scheduledAt,
      courtId: result.courtId,
      force: result.force,
    });
    return true;
  }

  await input.onSave({
    matchId: input.matchId,
    scheduledAt: input.scheduledAt,
    courtId: input.courtId,
    force: false,
  });
  return true;
}

interface MatchScheduleTimeModalProps {
  open: boolean;
  match: Match | null;
  courts: Court[];
  pairLabels: Record<string, string>;
  allMatches: Match[];
  reservations?: CourtReservation[];
  matchDurationMinutes?: number;
  isSaving?: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: SaveSchedulePayload) => Promise<void> | void;
}

export function MatchScheduleTimeModal({
  open,
  match,
  courts,
  pairLabels,
  allMatches,
  reservations,
  matchDurationMinutes,
  isSaving = false,
  onOpenChange,
  onSave,
}: MatchScheduleTimeModalProps) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const { confirmConflicts, dialog: conflictDialog } =
    useScheduleConflictConfirm(pairLabels);

  useEffect(() => {
    if (!open || !match) return;
    setDate(toScheduleDateValue(match.scheduledAt));
    setTime(toScheduleTimeValue(match.scheduledAt));
  }, [open, match]);

  const scheduleComplete = Boolean(date) === Boolean(time);
  const canSave = Boolean(match) && scheduleComplete && !isSaving;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          data-testid="match-schedule-time-modal"
          className="max-w-sm"
        >
          <DialogHeader>
            <DialogTitle>Horario del partido</DialogTitle>
            <DialogDescription>
              {match
                ? `${pairLabels[match.pairAId ?? ""] ?? "Pareja A"} vs ${pairLabels[match.pairBId ?? ""] ?? "Pareja B"}`
                : "Definí fecha y hora."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="match-schedule-date">Fecha</Label>
              <Input
                id="match-schedule-date"
                type="date"
                value={date}
                disabled={isSaving || !match}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="match-schedule-time">Hora</Label>
              <Input
                id="match-schedule-time"
                type="time"
                value={time}
                disabled={isSaving || !match}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
          {!scheduleComplete ? (
            <p className="text-xs text-muted-foreground">
              Completá fecha y hora, o dejá ambos vacíos para quitar el horario.
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!canSave}
              onClick={() => {
                if (!match) return;
                void (async () => {
                  const saved = await saveWithConflictCheck({
                    matchId: match.id,
                    scheduledAt: fromScheduleDateAndTime(date, time),
                    courtId: match.courtId,
                    allMatches,
                    courts,
                    reservations,
                    matchDurationMinutes,
                    pairLabels,
                    confirmConflicts,
                    onSave,
                  });
                  if (saved) onOpenChange(false);
                })();
              }}
            >
              {isSaving ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {conflictDialog}
    </>
  );
}

interface MatchCourtSelectProps {
  match: Match;
  courts: Court[];
  pairLabels: Record<string, string>;
  allMatches: Match[];
  reservations?: CourtReservation[];
  matchDurationMinutes?: number;
  disabled?: boolean;
  isSaving?: boolean;
  onSave: (input: SaveSchedulePayload) => Promise<void> | void;
}

/** Solo selector de cancha (la hora se edita desde Horarios). */
export default function MatchCourtSelect({
  match,
  courts,
  pairLabels,
  allMatches,
  reservations,
  matchDurationMinutes,
  disabled = false,
  isSaving = false,
  onSave,
}: MatchCourtSelectProps) {
  const { confirmConflicts, dialog: conflictDialog } =
    useScheduleConflictConfirm(pairLabels);
  /** Fuerza remount del select si se cancela (sin re-render el DOM queda en el valor nuevo). */
  const [selectEpoch, setSelectEpoch] = useState(0);

  return (
    <>
      <div
        className={cn(
          "flex min-w-[7.5rem] flex-col gap-0.5",
          disabled && "opacity-60",
        )}
        data-testid={`match-court-cell-${match.id}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <select
          key={`${match.id}-${match.courtId ?? "none"}-${selectEpoch}`}
          className="h-8 w-full rounded-md border border-border bg-background px-1.5 text-sm"
          disabled={disabled || isSaving}
          value={match.courtId ?? ""}
          onChange={(e) => {
            const courtId = e.target.value || null;
            if (courtId === match.courtId) return;
            void (async () => {
              const saved = await saveWithConflictCheck({
                matchId: match.id,
                scheduledAt: match.scheduledAt,
                courtId,
                allMatches,
                courts,
                reservations,
                matchDurationMinutes,
                pairLabels,
                confirmConflicts,
                onSave,
              });
              if (!saved) setSelectEpoch((n) => n + 1);
            })();
          }}
        >
          <option value="">Sin cancha</option>
          {courts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {match.scheduleManual ? (
          <span className="text-[10px] text-muted-foreground">Manual</span>
        ) : null}
      </div>
      {conflictDialog}
    </>
  );
}

interface MatchHorarioButtonProps {
  scheduledAt: string | null;
  disabled?: boolean;
  onClick: () => void;
}

export function MatchHorarioButton({
  scheduledAt,
  disabled = false,
  onClick,
}: MatchHorarioButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      data-testid="match-horario-button"
      className={cn(
        "rounded-md px-1 py-0.5 text-left text-sm whitespace-nowrap transition-colors",
        disabled
          ? "cursor-not-allowed text-muted-foreground"
          : "text-sidebar underline-offset-2 hover:bg-muted hover:underline",
      )}
      onClick={(e) => {
        e.stopPropagation();
        if (disabled) return;
        onClick();
      }}
    >
      {formatScheduleShortEs(scheduledAt)}
    </button>
  );
}
