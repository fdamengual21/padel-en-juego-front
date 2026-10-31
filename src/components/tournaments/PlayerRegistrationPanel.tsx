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
import type {
  PairSidePreference,
  RegisteredPlayerSearchItem,
  TournamentStatus,
} from "@/domain";
import { formatTournamentDayEs } from "@/lib/dates";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/router/routes";
import RegisteredPlayerPicker from "./RegisteredPlayerPicker";

interface PlayerRegistrationPanelProps {
  tournament: {
    id: string;
    name: string;
    status: TournamentStatus;
    startDate: string;
    endDate: string | null;
    dailyStartTime: string;
    dailyEndTime: string;
  };
  categories: Array<{ id: string; name: string }>;
  categoryId: string;
  /** Lo calcula la API pública: no hay lugar para otra pareja. */
  quotaFull: boolean;
  /** Quality no pide disponibilidad. */
  omitAvailability?: boolean;
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

function sideFromPair(value: string | null | undefined): PairSidePreference {
  if (value === "drive" || value === "reves" || value === "any") return value;
  return "any";
}

function registrationNotice(
  status: string,
  partnerName: string | null,
): { message: string; type: MessageAlertType } {
  if (status === "PENDING") {
    return {
      type: "warning",
      message: "Pendiente de aceptación",
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
function tournamentHasStarted(status: TournamentStatus): boolean {
  return status === "inProgress" || status === "finished";
}

export default function PlayerRegistrationPanel({
  tournament,
  categories,
  categoryId,
  quotaFull,
  omitAvailability = false,
  onCategoryChange,
}: PlayerRegistrationPanelProps) {
  const { isAuthenticated, player } = useMockSession();
  const qc = useQueryClient();
  const quality = omitAvailability;
  const days = useMemo(
    () => (quality ? [] : daysBetween(tournament.startDate, tournament.endDate)),
    [quality, tournament.startDate, tournament.endDate],
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [pairMode, setPairMode] = useState<"solo" | "partner">("solo");
  const [partner, setPartner] = useState<RegisteredPlayerSearchItem | null>(null);
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

  const withPartner = pairMode === "partner";
  const payload = () => ({
    tournamentCategoryId: categoryId,
    player1Id: player?.id ?? "",
    player2Id: withPartner ? partner?.id ?? null : null,
    sidePreference: withPartner ? null : side,
    availability: quality
      ? []
      : days.map((day) => ({
          date: day,
          startTime: ranges[day]?.start || tournament.dailyStartTime || "10:00",
          endTime: ranges[day]?.end || tournament.dailyEndTime || "22:00",
        })),
  });

  const invalidateMine = async () => {
    await qc.invalidateQueries({ queryKey: ["my-registration", categoryId] });
    await qc.invalidateQueries({ queryKey: ["categories", tournament.id] });
    await qc.invalidateQueries({ queryKey: ["participants-board", categoryId] });
    await qc.invalidateQueries({ queryKey: ["public-participants-board", categoryId] });
    await qc.invalidateQueries({ queryKey: ["public-tournament-view", tournament.id] });
    await qc.invalidateQueries({ queryKey: ["player-home"] });
    await qc.invalidateQueries({ queryKey: ["player-history"] });
    await qc.invalidateQueries({ queryKey: ["player-played"] });
  };

  const register = useMutation({
    mutationFn: () => Api.TournamentOpsService().registerPairByPlayer(payload()),
    onSuccess: async () => {
      toastSuccess(
        "Inscripción enviada",
        "Queda pendiente hasta que el club la acepte.",
      );
      setOpen(false);
      await invalidateMine();
    },
    onError: (err: Error) => toastError("No se pudo inscribir", err.message),
  });

  const update = useMutation({
    mutationFn: () => Api.TournamentOpsService().updateMyRegistration(payload()),
    onSuccess: async () => {
      toastSuccess(
        "Inscripción actualizada",
        "Queda pendiente hasta que el club la acepte.",
      );
      setConfirmSave(false);
      setOpen(false);
      await invalidateMine();
    },
    onError: (err: Error) => toastError("No se pudo guardar", err.message),
  });

  const cancel = useMutation({
    mutationFn: () => Api.TournamentOpsService().cancelMyRegistration(categoryId),
    onSuccess: async () => {
      toastSuccess("Inscripción cancelada");
      setConfirmCancel(false);
      await invalidateMine();
    },
    onError: (err: Error) => toastError("No se pudo cancelar", err.message),
  });

  const category = categories.find((item) => item.id === categoryId) ?? categories[0];
  const current = mine.data?.registration;
  const holdsSpot =
    current != null &&
    current.status !== "REJECTED" &&
    current.status !== "CANCELLED";
  const started = tournamentHasStarted(tournament.status);
  const closed = tournament.status !== "registrationOpen";
  const canRegister = Boolean(categoryId) && !holdsSpot && !started && !closed && !quotaFull;
  const canCancel =
    holdsSpot &&
    current != null &&
    (current.status === "PENDING" ||
      current.status === "ACCEPTED" ||
      current.status === "WAITLIST") &&
    !started &&
    !closed;
  const canEdit = canCancel;

  const resetDialog = () => {
    setEditing(false);
    setConfirmSave(false);
    setPairMode("solo");
    setPartner(null);
    setSide(sideFromPlayer(player?.sidePreference));
  };

  const openCreate = () => {
    resetDialog();
    setOpen(true);
  };

  const openEdit = () => {
    const mineData = mine.data;
    const nextPartner = mineData?.partner ?? null;
    setEditing(true);
    setConfirmSave(false);
    if (nextPartner) {
      setPairMode("partner");
      setPartner(nextPartner);
    } else {
      setPairMode("solo");
      setPartner(null);
      setSide(sideFromPair(mineData?.pair?.sidePreference));
    }
    const start = tournament.dailyStartTime || "10:00";
    const end = tournament.dailyEndTime || "22:00";
    const byDate = new Map(
      (mineData?.availability ?? []).map((item) => [item.date, item]),
    );
    setRanges(
      Object.fromEntries(
        days.map((day) => {
          const row = byDate.get(day);
          return [day, { start: row?.startTime || start, end: row?.endTime || end }];
        }),
      ),
    );
    setOpen(true);
  };

  let blockedNotice: { message: string; type: MessageAlertType } | null = null;
  if (holdsSpot && current) {
    blockedNotice = registrationNotice(current.status, mine.data?.partnerName ?? null);
  } else if (started) {
    blockedNotice = {
      type: "info",
      message: tournament.status === "finished" ? "El torneo ya finalizó." : "El torneo ya comenzó.",
    };
  } else if (tournament.status === "cancelled") {
    blockedNotice = { type: "info", message: "El torneo está cancelado." };
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
              <TooltipContent>
                El cupo está completo: ya están las parejas aceptadas y los 2
                suplentes.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Button
            type="button"
            className="shrink-0"
            data-testid="tournament-subscribe-cta"
            onClick={openCreate}
          >
            Inscribirme
          </Button>
        )
      ) : blockedNotice ? (
        <div className="flex flex-wrap items-center gap-2">
          <MessageAlert
            className="w-fit whitespace-nowrap"
            data-testid="tournament-subscribe-cta"
            message={blockedNotice.message}
            type={blockedNotice.type}
          />
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
          {canEdit ? (
            <Button
              type="button"
              size="sm"
              onClick={() => openEdit()}
            >
              Editar
            </Button>
          ) : null}
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

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) resetDialog();
        }}
      >
        <DialogContent className="max-w-md" data-testid="player-registration-dialog">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar inscripción" : "Inscripción"}</DialogTitle>
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
                if (withPartner && !partner) return;
                if (editing) {
                  setConfirmSave(true);
                  return;
                }
                register.mutate();
              }}
            >
              {categories.length > 1 && !editing ? (
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
              ) : null}
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Cómo te anotás">
                <button
                  type="button"
                  role="radio"
                  aria-checked={!withPartner}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    !withPartner
                      ? "border-primary bg-primary/10 font-medium"
                      : "border-border hover:bg-muted/50",
                  )}
                  onClick={() => {
                    setPairMode("solo");
                    setPartner(null);
                  }}
                >
                  {editing ? "Sin compañero" : "Me anoto solo"}
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={withPartner}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    withPartner
                      ? "border-primary bg-primary/10 font-medium"
                      : "border-border hover:bg-muted/50",
                  )}
                  onClick={() => setPairMode("partner")}
                >
                  Con un compañero
                </button>
              </div>
              {withPartner ? (
                <RegisteredPlayerPicker value={partner} onChange={setPartner} />
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    El club tiene que asignarte un compañero para aceptar la inscripción.
                  </p>
                  <div className="space-y-1">
                    <Label htmlFor="player-side">Lado</Label>
                    <select
                      id="player-side"
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={side}
                      onChange={(event) =>
                        setSide(event.target.value as PairSidePreference)
                      }
                    >
                      <option value="drive">Drive</option>
                      <option value="reves">Revés</option>
                      <option value="any">Cualquiera</option>
                    </select>
                  </div>
                </>
              )}
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
              <Button
                type="submit"
                disabled={
                  register.isPending ||
                  update.isPending ||
                  !categoryId ||
                  (!editing && quotaFull) ||
                  (withPartner && !partner)
                }
              >
                {editing ? "Guardar" : "Inscribirme"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <WarningDialog
        open={confirmSave}
        onOpenChange={setConfirmSave}
        title="Guardar inscripción"
        description="Si guardás, el club tiene que volver a aceptar esta inscripción."
        confirmLabel="Guardar"
        cancelLabel="Volver"
        isConfirming={update.isPending}
        onConfirm={() => update.mutate()}
      />
    </>
  );
}
