import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { CalendarClock, Pencil } from "lucide-react";
import type {
  Client,
  Court,
  CourtAgendaEvent,
  CourtReservation,
  IdentityMatch,
} from "@/domain";
import Api from "@/api/Api";
import DuplicateIdentityDialog from "@/components/auth/DuplicateIdentityDialog";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import ClientPickerField, {
  emptyClientSlot,
  isClientSlotReady,
  type ClientSlotValue,
  type ManualClientDraft,
} from "./ClientPickerField";

type ModalMode = "view" | "edit" | "create";

interface CourtReservationModalProps {
  open: boolean;
  clubId: string;
  /** Lista de canchas del club (selector en crear/editar). */
  courts: Court[];
  /**
   * Cancha inicial. En create puede ser null (usuario debe elegir).
   * En view/edit debe venir definida.
   */
  initialCourtId: string | null;
  mode: ModalMode;
  presetStartsAt?: string | null;
  event?: CourtAgendaEvent | null;
  reservation?: CourtReservation | null;
  client?: Client | null;
  isSaving?: boolean;
  /** False si solo hay reservations.read: consulta, sin editar/guardar/cancelar. */
  canMutate?: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const statusLabels: Record<string, string> = {
  booked: "Reservada",
  completed: "Completada",
  cancelled: "Cancelada",
};

function formatMoney(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Snap to closest free turn when the calendar hour is not on the slot grid. */
function nearestAvailableSlot(
  slots: readonly { startsAt: string }[],
  targetIso: string,
): string | null {
  const target = dayjs(targetIso).valueOf();
  if (!Number.isFinite(target) || slots.length === 0) return null;
  let best: string | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const slot of slots) {
    const dist = Math.abs(dayjs(slot.startsAt).valueOf() - target);
    if (dist < bestDist) {
      bestDist = dist;
      best = slot.startsAt;
    }
  }
  return best;
}

/** Dígitos para wa.me; null si no hay un teléfono usable. */
function whatsappDigits(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 8 ? digits : null;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

async function createClientFromDraft(
  clubId: string,
  draft: ManualClientDraft,
  link?: { playerId?: string | null; userId?: string | null },
): Promise<Client> {
  return Api.TournamentOpsService().createClient({
    clubId,
    firstName: draft.firstName,
    lastName: draft.lastName,
    phone: draft.phone || null,
    email: draft.email || null,
    playerId: link?.playerId ?? null,
    userId: link?.userId ?? null,
  });
}

async function resolveClientIdFromMatch(
  clubId: string,
  draft: ManualClientDraft,
  match: IdentityMatch,
): Promise<string> {
  if (match.clientId) return match.clientId;
  if (match.playerId) {
    const created = await createClientFromDraft(clubId, draft, {
      playerId: match.playerId,
      userId: match.userId,
    });
    return created.id;
  }
  if (match.userId) {
    const created = await createClientFromDraft(
      clubId,
      {
        ...draft,
        firstName: match.firstName || draft.firstName,
        lastName: match.lastName || draft.lastName,
        email: match.email ?? draft.email,
        phone: match.phone ?? draft.phone,
      },
      { userId: match.userId, playerId: match.playerId },
    );
    return created.id;
  }
  const created = await createClientFromDraft(clubId, draft);
  return created.id;
}

async function resolveClientId(
  clubId: string,
  slot: ClientSlotValue,
): Promise<string> {
  if (slot.mode === "search") {
    if (!slot.client) throw new Error("Elegí un cliente");
    return slot.client.id;
  }
  const created = await createClientFromDraft(clubId, slot.draft);
  return created.id;
}

function toDateIso(value: string | null | undefined): string {
  const d = dayjs(value ?? undefined);
  return d.isValid() ? d.format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD");
}

export default function CourtReservationModal({
  open,
  clubId,
  courts,
  initialCourtId,
  mode: initialMode,
  presetStartsAt,
  event,
  reservation,
  client,
  isSaving = false,
  canMutate = true,
  onOpenChange,
  onSaved,
}: CourtReservationModalProps) {
  const [mode, setMode] = useState<ModalMode>(initialMode);
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(
    initialCourtId,
  );
  const [clientSlot, setClientSlot] = useState<ClientSlotValue>(() =>
    emptyClientSlot(),
  );
  const [dupOpen, setDupOpen] = useState(false);
  const [dupMatches, setDupMatches] = useState<IdentityMatch[]>([]);
  const [allowCreateNew, setAllowCreateNew] = useState(false);
  const [dateIso, setDateIso] = useState(() => toDateIso(presetStartsAt));
  const [selectedStartsAt, setSelectedStartsAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<{
    price: number;
    label: string | null;
    endsAt: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const court =
    courts.find((c) => c.id === selectedCourtId) ??
    courts.find((c) => c.id === initialCourtId) ??
    null;

  const isTournament = event?.kind === "tournament_match";
  const readOnly = isTournament || mode === "view" || !canMutate;
  const courtSelectable = mode === "create";
  const ignoreReservationId =
    mode === "edit" && reservation ? reservation.id : undefined;

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setError(null);
    setBusy(false);
    setDupOpen(false);
    setDupMatches([]);
    setAllowCreateNew(false);
    setSelectedCourtId(initialCourtId);

    if (initialMode === "create") {
      const start = presetStartsAt ?? undefined;
      setClientSlot(emptyClientSlot());
      setDateIso(toDateIso(start));
      setSelectedStartsAt(start ? dayjs(start).toISOString() : null);
      return;
    }

    const startIso = reservation?.startsAt ?? event?.startAt ?? presetStartsAt;
    setDateIso(toDateIso(startIso));
    setSelectedStartsAt(startIso ? dayjs(startIso).toISOString() : null);
    setClientSlot(client ? { mode: "search", client } : emptyClientSlot());
  }, [
    open,
    initialMode,
    initialCourtId,
    presetStartsAt,
    reservation,
    event,
    client,
  ]);

  const { data: availableSlots = [], isFetching: loadingSlots } = useQuery({
    queryKey: [
      "court-available-slots",
      selectedCourtId,
      dateIso,
      ignoreReservationId ?? null,
    ],
    queryFn: () =>
      Api.TournamentOpsService().listAvailableCourtSlots(
        selectedCourtId!,
        dateIso,
        { ignoreReservationId },
      ),
    enabled: open && !readOnly && Boolean(selectedCourtId) && Boolean(dateIso),
  });

  useEffect(() => {
    if (!open || readOnly || loadingSlots || !selectedCourtId) return;
    if (!selectedStartsAt) {
      if (availableSlots.length > 0 && presetStartsAt) {
        const nearest = nearestAvailableSlot(availableSlots, presetStartsAt);
        if (nearest) setSelectedStartsAt(nearest);
      }
      return;
    }
    const stillAvailable = availableSlots.some(
      (slot) =>
        dayjs(slot.startsAt).valueOf() === dayjs(selectedStartsAt).valueOf(),
    );
    if (!stillAvailable) {
      const nearest = nearestAvailableSlot(availableSlots, selectedStartsAt);
      setSelectedStartsAt(nearest);
    }
  }, [
    open,
    readOnly,
    loadingSlots,
    availableSlots,
    selectedStartsAt,
    presetStartsAt,
    selectedCourtId,
  ]);

  useEffect(() => {
    if (!open || !selectedStartsAt || !selectedCourtId || isTournament) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    void Api.TournamentOpsService()
      .quoteCourtSlot(selectedCourtId, selectedStartsAt)
      .then((result) => {
        if (!cancelled) setQuote(result);
      })
      .catch(() => {
        if (!cancelled) setQuote(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, selectedStartsAt, selectedCourtId, isTournament]);

  const title =
    mode === "create"
      ? "Nueva reserva"
      : mode === "edit"
        ? "Editar reserva"
        : isTournament
          ? "Partido de torneo"
          : "Detalle de reserva";

  const durationMinutes = quote
    ? dayjs(quote.endsAt).diff(dayjs(selectedStartsAt), "minute")
    : reservation
      ? dayjs(reservation.endsAt).diff(dayjs(reservation.startsAt), "minute")
      : event
        ? dayjs(event.endAt).diff(dayjs(event.startAt), "minute")
        : (court?.slotDurationMinutes ?? 90);

  const displayPrice =
    reservation?.price ?? event?.price ?? quote?.price ?? null;
  const displayLabel = event?.priceLabel ?? quote?.label ?? null;
  const clientPhone = client?.phone?.trim() || "";
  const waDigits = whatsappDigits(clientPhone);

  const canSubmit =
    !readOnly &&
    Boolean(selectedCourtId) &&
    isClientSlotReady(clientSlot) &&
    Boolean(selectedStartsAt) &&
    !busy &&
    !isSaving;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  const persistReservation = async (clientId: string) => {
    if (!selectedCourtId) throw new Error("Elegí una cancha");
    if (!selectedStartsAt) throw new Error("Elegí un turno");
    if (mode === "create" || !reservation) {
      await Api.TournamentOpsService().createCourtReservation({
        clubId,
        courtId: selectedCourtId,
        clientId,
        startsAt: selectedStartsAt,
        price: quote?.price ?? null,
      });
      return;
    }
    await Api.TournamentOpsService().updateCourtReservation(reservation.id, {
      clientId,
      startsAt: selectedStartsAt,
      price: quote?.price ?? reservation.price,
    });
  };

  const handleSave = () =>
    run(async () => {
      if (!selectedCourtId) throw new Error("Elegí una cancha");
      if (!selectedStartsAt) throw new Error("Elegí un turno");

      if (clientSlot.mode === "manual" && !allowCreateNew) {
        const draft = clientSlot.draft;
        const hasContact = Boolean(draft.email.trim() || draft.phone.trim());
        if (hasContact) {
          const { matches } =
            await Api.TournamentOpsService().findIdentityMatches({
              clubId,
              email: draft.email || null,
              phone: draft.phone || null,
            });
          if (matches.length > 0) {
            setDupMatches(matches);
            setDupOpen(true);
            return;
          }
        }
      }

      const clientId = await resolveClientId(clubId, clientSlot);
      setAllowCreateNew(false);
      await persistReservation(clientId);
    });

  const handleUseIdentityMatch = (match: IdentityMatch) =>
    void run(async () => {
      if (clientSlot.mode !== "manual") return;
      const clientId = await resolveClientIdFromMatch(
        clubId,
        clientSlot.draft,
        match,
      );
      setDupOpen(false);
      setAllowCreateNew(false);
      await persistReservation(clientId);
    });

  const handleCreateNewDespiteMatch = () => {
    setDupOpen(false);
    setAllowCreateNew(true);
    void run(async () => {
      const clientId = await resolveClientId(clubId, clientSlot);
      setAllowCreateNew(false);
      await persistReservation(clientId);
    });
  };

  const handleCancelReservation = () => {
    if (!reservation) return;
    void run(async () => {
      await Api.TournamentOpsService().cancelCourtReservation(reservation.id);
    });
  };

  const handleComplete = () => {
    if (!reservation) return;
    void run(async () => {
      await Api.TournamentOpsService().updateCourtReservation(reservation.id, {
        status: "completed",
      });
    });
  };

  const handleCourtChange = (nextCourtId: string) => {
    setSelectedCourtId(nextCourtId || null);
    setSelectedStartsAt(null);
    setQuote(null);
    setError(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-lg gap-0 overflow-hidden p-0"
          data-testid="court-reservation-modal"
        >
          <DialogHeader className="gap-2 border-b border-border px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-sidebar">
                <CalendarClock className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>
                  {court
                    ? `Turno de ${court.slotDurationMinutes} min`
                    : "Elegí cancha, cliente y turno"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 px-4 py-4">
            {readOnly ? (
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Cancha</dt>
                  <dd className="font-medium">{court?.name ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Estado</dt>
                  <dd className="font-medium">
                    {statusLabels[reservation?.status ?? event?.status ?? ""] ??
                      event?.status ??
                      "—"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Horario</dt>
                  <dd className="font-medium">
                    {dayjs(reservation?.startsAt ?? event?.startAt).format(
                      "ddd D MMM · HH:mm",
                    )}
                    {" – "}
                    {dayjs(reservation?.endsAt ?? event?.endAt).format("HH:mm")}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Duración</dt>
                  <dd className="font-medium">{durationMinutes} min</dd>
                </div>
                {!isTournament ? (
                  <>
                    <div>
                      <dt className="text-muted-foreground">Cliente</dt>
                      <dd className="font-medium">
                        {client?.displayName ?? event?.title ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Precio</dt>
                      <dd className="font-medium">
                        {formatMoney(displayPrice)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Teléfono</dt>
                      <dd className="flex items-center gap-2 font-medium">
                        <span>{clientPhone || "—"}</span>
                        {waDigits ? (
                          <a
                            href={`https://wa.me/${waDigits}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex size-8 items-center justify-center rounded-md text-[#25D366] transition-colors hover:bg-[#25D366]/15"
                            aria-label="Escribir por WhatsApp"
                            title="WhatsApp"
                          >
                            <WhatsAppIcon className="size-5" />
                          </a>
                        ) : null}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Tarifa</dt>
                      <dd className="font-medium">{displayLabel ?? "Base"}</dd>
                    </div>
                  </>
                ) : (
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">Detalle</dt>
                    <dd className="font-medium">
                      {event?.title}
                      {event?.subtitle ? ` · ${event.subtitle}` : ""}
                    </dd>
                  </div>
                )}
              </dl>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="reservation-court">Cancha</Label>
                  <select
                    id="reservation-court"
                    className="h-8 w-full rounded-lg border border-border bg-background px-2 text-sm"
                    value={selectedCourtId ?? ""}
                    disabled={!courtSelectable}
                    onChange={(e) => handleCourtChange(e.target.value)}
                    data-testid="reservation-court-select"
                  >
                    <option value="">Elegí una cancha</option>
                    {courts.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · {item.slotDurationMinutes} min
                      </option>
                    ))}
                  </select>
                </div>

                <ClientPickerField
                  clubId={clubId}
                  value={clientSlot}
                  onChange={setClientSlot}
                />

                <div className="space-y-1.5">
                  <Label htmlFor="reservation-date">Fecha</Label>
                  <DatePicker
                    id="reservation-date"
                    value={dateIso}
                    onChange={(next) => {
                      if (!next) return;
                      setDateIso(next);
                      setSelectedStartsAt(null);
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Turno</Label>
                  {!selectedCourtId ? (
                    <p className="text-sm text-muted-foreground">
                      Elegí una cancha para ver los turnos.
                    </p>
                  ) : loadingSlots ? (
                    <p className="text-sm text-muted-foreground">
                      Cargando turnos…
                    </p>
                  ) : availableSlots.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No hay turnos libres este día (cerrado u ocupados).
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {availableSlots.map((slot) => {
                        const selected =
                          selectedStartsAt != null &&
                          dayjs(slot.startsAt).valueOf() ===
                            dayjs(selectedStartsAt).valueOf();
                        return (
                          <button
                            key={slot.startsAt}
                            type="button"
                            className={cn(
                              "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                              selected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-card text-sidebar hover:bg-muted",
                            )}
                            onClick={() => setSelectedStartsAt(slot.startsAt)}
                          >
                            {slot.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">
                  <p>
                    Fin estimado:{" "}
                    <span className="font-medium">
                      {quote ? dayjs(quote.endsAt).format("HH:mm") : "—"}
                    </span>
                  </p>
                  <p className="mt-1">
                    Precio:{" "}
                    <span className="font-medium">
                      {formatMoney(quote?.price ?? null)}
                    </span>
                    {quote?.label ? (
                      <span className="text-muted-foreground">
                        {" "}
                        · {quote.label}
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>
            )}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <DialogFooter className="border-t border-border px-4 py-3 sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {canMutate && mode === "view" && reservation && !isTournament ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setMode("edit")}
                >
                  <Pencil className="size-3.5" />
                  Editar
                </Button>
              ) : null}
              {canMutate &&
              reservation &&
              reservation.status === "booked" &&
              mode !== "create" ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy || isSaving}
                    onClick={handleComplete}
                  >
                    Marcar completada
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={busy || isSaving}
                    onClick={handleCancelReservation}
                  >
                    Cancelar reserva
                  </Button>
                </>
              ) : null}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Cerrar
              </Button>
              {!readOnly ? (
                <Button
                  type="button"
                  disabled={!canSubmit}
                  onClick={() => void handleSave()}
                >
                  {busy || isSaving ? "Guardando…" : "Guardar"}
                </Button>
              ) : null}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <DuplicateIdentityDialog
        open={dupOpen}
        matches={dupMatches}
        onOpenChange={setDupOpen}
        onUseMatch={(match) => void handleUseIdentityMatch(match)}
        onCreateNew={handleCreateNewDespiteMatch}
      />
    </>
  );
}
