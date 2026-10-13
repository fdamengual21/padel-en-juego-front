import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import RequirePlayerAuth from "@/components/auth/RequirePlayerAuth";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import MessageAlert, { type MessageAlertType } from "@/components/ui/message-alert";
import WarningDialog from "@/components/ui/warning-dialog";
import type { PairSidePreference, Tournament, TournamentCategory } from "@/domain";
import { formatTournamentDayEs } from "@/lib/dates";
import { toastError, toastSuccess } from "@/lib/toast";
import { ROUTES } from "@/router/routes";

interface PlayerRegistrationPanelProps {
  tournament: Tournament;
  categories: TournamentCategory[];
  categoryId: string;
  /** Parejas aceptadas en la categoría seleccionada. */
  /** Lugares ocupados del cupo (parejas completas + solos de a dos), igual que la API. */
  acceptedPairs: number;
  onCategoryChange: (categoryId: string) => void;
}

function daysBetween(start: string, end: string | null): string[] {
  const days: string[] = [];
  const cursor = new Date(`${start.slice(0, 10)}T12:00:00`);
  const last = new Date(`${(end || start).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(last.getTime())) return [start];
  while (cursor <= last) {
    const month = String(cursor.getMonth() + 1).padStart(2, "0");
    const day = String(cursor.getDate()).padStart(2, "0");
    days.push(`${cursor.getFullYear()}-${month}-${day}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function sideFromPlayer(value: string | null | undefined): PairSidePreference {
  if (value === "left") return "reves";
  if (value === "right") return "drive";
  return "any";
}

function registrationNotice(
  status: string,
  partnerName: string | null,
): { message: string; type: MessageAlertType } {
  if (status === "PENDING") {
    return {
      type: "warning",
      message: "Tu inscripción quedó pendiente hasta que el club la acepte.",
    };
  }
  if (status === "ACCEPTED" && partnerName) {
    return { type: "success", message: `Estás inscripto con ${partnerName}.` };
  }
  if (status === "ACCEPTED") {
    return {
      type: "info",
      message: "Estás inscripto. El club todavía no te asignó pareja.",
    };
  }
  if (status === "DISQUALIFIED") {
    return { type: "red", message: "El club te desclasificó de esta categoría." };
  }
  if (status === "WAITLIST") {
    return { type: "warning", message: "Estás en lista de espera." };
  }
  return {
    type: "info",
    message: "El club no aceptó esta inscripción. Podés volver a anotarte.",
  };
}

/** El club dio comienzo al torneo (o ya terminó). La fecha sola no lo inicia. */
function tournamentHasStarted(tournament: Tournament): boolean {
  return tournament.status === "inProgress" || tournament.status === "finished";
}

export default function PlayerRegistrationPanel({
  tournament,
  categories,
  categoryId,
  acceptedPairs,
  onCategoryChange,
}: PlayerRegistrationPanelProps) {
  const { isAuthenticated, player } = useMockSession();
  const qc = useQueryClient();
  const quality = tournament.format === "QUALITY";
  const days = useMemo(
    () => (quality ? [] : daysBetween(tournament.startDate, tournament.endDate)),
    [quality, tournament.startDate, tournament.endDate],
  );
  const [open, setOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [side, setSide] = useState<PairSidePreference>(sideFromPlayer(player?.sidePreference));
  const [ranges, setRanges] = useState<Record<string, { start: string; end: string }>>({});

  useEffect(() => {
    setSide(sideFromPlayer(player?.sidePreference));
  }, [player?.sidePreference, categoryId]);

  useEffect(() => {
    const start = tournament.dailyStartTime || "10:00";
    const end = tournament.dailyEndTime || "22:00";
    setRanges(Object.fromEntries(days.map((day) => [day, { start, end }])));
  }, [days, tournament.dailyStartTime, tournament.dailyEndTime, tournament.id]);

  const mine = useQuery({
    queryKey: ["my-registration", categoryId],
    queryFn: () => Api.TournamentOpsService().getMyRegistration(categoryId),
    enabled: isAuthenticated && Boolean(categoryId),
  });

  const register = useMutation({
    mutationFn: () =>
      Api.TournamentOpsService().registerPairByPlayer({
        tournamentCategoryId: categoryId,
        player1Id: player?.id ?? "",
        sidePreference: side,
        availability: quality
          ? []
          : days.map((day) => ({
              date: day,
              startTime: ranges[day]?.start || tournament.dailyStartTime || "10:00",
              endTime: ranges[day]?.end || tournament.dailyEndTime || "22:00",
            })),
      }),
    onSuccess: async () => {
      toastSuccess(
        "Inscripción enviada",
        "Queda pendiente hasta que el club la acepte.",
      );
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ["my-registration", categoryId] });
      await qc.invalidateQueries({ queryKey: ["categories", tournament.id] });
      await qc.invalidateQueries({ queryKey: ["player-home"] });
      await qc.invalidateQueries({ queryKey: ["player-history"] });
    },
    onError: (err: Error) => toastError("No se pudo inscribir", err.message),
  });

  const cancel = useMutation({
    mutationFn: () => Api.TournamentOpsService().cancelMyRegistration(categoryId),
    onSuccess: async () => {
      toastSuccess("Inscripción cancelada");
      setConfirmCancel(false);
      await qc.invalidateQueries({ queryKey: ["my-registration", categoryId] });
      await qc.invalidateQueries({ queryKey: ["categories", tournament.id] });
      await qc.invalidateQueries({ queryKey: ["participants-board", categoryId] });
      await qc.invalidateQueries({ queryKey: ["player-home"] });
      await qc.invalidateQueries({ queryKey: ["player-history"] });
    },
    onError: (err: Error) => toastError("No se pudo cancelar", err.message),
  });

  const category = categories.find((item) => item.id === categoryId) ?? categories[0];
  const current = mine.data?.registration;
  const holdsSpot =
    current != null &&
    current.status !== "REJECTED" &&
    current.status !== "CANCELLED";
  const started = tournamentHasStarted(tournament);
  const closed = tournament.status !== "registrationOpen";
  const quotaFull = category != null && acceptedPairs >= category.maxPairs;
  const canRegister = Boolean(categoryId) && !holdsSpot && !started && !closed && !quotaFull;
  const canCancel =
    holdsSpot &&
    current != null &&
    (current.status === "PENDING" ||
      current.status === "ACCEPTED" ||
      current.status === "WAITLIST") &&
    !started &&
    !closed;

  let blockedNotice: { message: string; type: MessageAlertType } | null = null;
  if (holdsSpot && current) {
    blockedNotice = registrationNotice(current.status, mine.data?.partnerName ?? null);
  } else if (started) {
    blockedNotice = {
      type: "info",
      message: tournament.status === "finished" ? "El torneo ya finalizó." : "El torneo ya comenzó.",
    };
  } else if (closed) {
    blockedNotice = { type: "info", message: "Inscripciones cerradas" };
  }

  const waitingForMine = isAuthenticated && mine.isLoading && blockedNotice == null;

  return (
    <>
      {waitingForMine ? (
        <p className="text-sm text-muted-foreground">Cargando tu inscripción…</p>
      ) : canRegister || (quotaFull && !holdsSpot && !started && !closed) ? (
        quotaFull ? (
          <TooltipProvider delay={200}>
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>
                <Button
                  type="button"
                  className="shrink-0"
                  data-testid="tournament-subscribe-cta"
                  disabled
                >
                  Inscribirme
                </Button>
              </TooltipTrigger>
              <TooltipContent>El cupo de parejas aceptadas está completo.</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Button
            type="button"
            className="shrink-0"
            data-testid="tournament-subscribe-cta"
            onClick={() => setOpen(true)}
          >
            Inscribirme
          </Button>
        )
      ) : blockedNotice ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {canCancel ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setConfirmCancel(true)}
            >
              Cancelar inscripción
            </Button>
          ) : null}
          <MessageAlert
            className="max-w-sm"
            data-testid="tournament-subscribe-cta"
            message={blockedNotice.message}
            type={blockedNotice.type}
          />
        </div>
      ) : null}

      <WarningDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Cancelar inscripción"
        description="Dejás de estar anotado en esta categoría."
        confirmLabel="Cancelar inscripción"
        cancelLabel="Volver"
        confirmVariant="destructive"
        isConfirming={cancel.isPending}
        onConfirm={() => cancel.mutate()}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" data-testid="player-registration-dialog">
          <DialogHeader>
            <DialogTitle>Inscripción</DialogTitle>
            <DialogDescription>
              {category?.name
                ? `${tournament.name} · ${category.name}`
                : tournament.name}
            </DialogDescription>
          </DialogHeader>
          {!isAuthenticated ? (
            <RequirePlayerAuth
              nextPath={ROUTES.player.tournamentDetail(tournament.id)}
              actionLabel="Inscribirte"
              className="border-0 bg-transparent p-0"
            />
          ) : (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                register.mutate();
              }}
            >
              {categories.length > 1 ? (
                <div className="space-y-1">
                  <Label htmlFor="player-category">Categoría</Label>
                  <select
                    id="player-category"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={categoryId}
                    onChange={(event) => onCategoryChange(event.target.value)}
                  >
                    {categories.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              {current && !holdsSpot ? (
                <p className="text-sm text-muted-foreground">
                  El club no aceptó esta inscripción. Podés volver a anotarte.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Te anotás solo. Si hay otro jugador con un lado que combine, el club los junta al aceptar.
                </p>
              )}
              <div className="space-y-1">
                <Label htmlFor="player-side">Lado</Label>
                <select
                  id="player-side"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={side}
                  onChange={(event) => setSide(event.target.value as PairSidePreference)}
                >
                  <option value="drive">Drive</option>
                  <option value="reves">Revés</option>
                  <option value="any">Cualquiera</option>
                </select>
              </div>
              {days.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Disponibilidad por día</p>
                  {days.map((day) => (
                    <div key={day} className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
                      <span className="text-sm">{formatTournamentDayEs(day)}</span>
                      <input
                        aria-label={`Desde ${day}`}
                        type="time"
                        className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                        value={ranges[day]?.start ?? ""}
                        onChange={(event) =>
                          setRanges((currentRanges) => ({
                            ...currentRanges,
                            [day]: {
                              start: event.target.value,
                              end: currentRanges[day]?.end ?? tournament.dailyEndTime,
                            },
                          }))
                        }
                      />
                      <input
                        aria-label={`Hasta ${day}`}
                        type="time"
                        className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                        value={ranges[day]?.end ?? ""}
                        onChange={(event) =>
                          setRanges((currentRanges) => ({
                            ...currentRanges,
                            [day]: {
                              start: currentRanges[day]?.start ?? tournament.dailyStartTime,
                              end: event.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              ) : null}
              <Button type="submit" disabled={register.isPending || !categoryId || quotaFull}>
                Inscribirme
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
