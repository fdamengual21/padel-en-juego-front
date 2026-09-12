import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs, { type Dayjs } from "dayjs";
import "dayjs/locale/es";
import type { Client, CourtAgendaEvent, CourtReservation } from "@core-api";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import { Button } from "@/components/ui/button";
import {
  mapCourtAgendaEventToGridItem,
  rangeForAgendaView,
  startOfAgendaWeek,
} from "@/modules/schedule";
import CourtAgendaGrid from "./components/CourtAgendaGrid";
import CourtAgendaToolbar, {
  type CourtAgendaToolbarMode,
} from "./components/CourtAgendaToolbar";
import CourtConfigDialog from "./components/CourtConfigDialog";
import CourtReservationModal from "./components/CourtReservationModal";
import CourtSummaryCard from "./components/CourtSummaryCard";
import CreateCourtDialog from "./components/CreateCourtDialog";
import { Plus } from "lucide-react";

dayjs.locale("es");

interface ReservationModalState {
  mode: "view" | "edit" | "create";
  event: CourtAgendaEvent | null;
  reservation: CourtReservation | null;
  client: Client | null;
  presetStartsAt: string | null;
}

export default function ClubCourtsScreen() {
  const { clubId } = useMockSession();
  const queryClient = useQueryClient();
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [mode, setMode] = useState<CourtAgendaToolbarMode>("week");
  const [cursorDate, setCursorDate] = useState<Dayjs>(() => dayjs());
  const [configOpen, setConfigOpen] = useState(false);
  const [createCourtOpen, setCreateCourtOpen] = useState(false);
  const [reservationModal, setReservationModal] =
    useState<ReservationModalState | null>(null);

  const range = useMemo(
    () => rangeForAgendaView(mode, cursorDate),
    [mode, cursorDate],
  );
  const summaryDate = cursorDate.format("YYYY-MM-DD");

  const courtsQuery = useQuery({
    queryKey: ["courts", clubId],
    queryFn: () => Api.TournamentOpsService().listCourts(clubId),
  });

  const courts = courtsQuery.data ?? [];
  const activeCourtId = selectedCourtId ?? courts[0]?.id ?? null;

  const boardQuery = useQuery({
    queryKey: [
      "court-agenda-board",
      clubId,
      activeCourtId,
      range.from,
      range.to,
      summaryDate,
    ],
    enabled: Boolean(activeCourtId),
    queryFn: () =>
      Api.TournamentOpsService().getCourtAgendaBoard(clubId, activeCourtId!, {
        from: range.from,
        to: range.to,
        summaryDate,
      }),
  });

  const board = boardQuery.data;
  const court = board?.court ?? courts.find((c) => c.id === activeCourtId) ?? null;

  const gridEvents = useMemo(
    () => (board?.events ?? []).map(mapCourtAgendaEventToGridItem),
    [board?.events],
  );

  const openHours = useMemo(() => {
    if (!board) return { openHour: undefined, closeHour: undefined };
    const open = board.court.openTime ?? board.club.openTime;
    const close = board.court.closeTime ?? board.club.closeTime;
    return {
      openHour: Number(open.slice(0, 2)),
      closeHour: Number(close.slice(0, 2)),
    };
  }, [board]);

  const eventsById = useMemo(() => {
    const map = new Map<string, CourtAgendaEvent>();
    for (const event of board?.events ?? []) {
      map.set(event.id, event);
    }
    return map;
  }, [board?.events]);

  const invalidateBoard = () => {
    void queryClient.invalidateQueries({ queryKey: ["court-agenda-board"] });
    void queryClient.invalidateQueries({ queryKey: ["courts", clubId] });
  };

  const openCreate = (day: Dayjs, hour: number) => {
    if (!court) return;
    const startsAt = day.hour(hour).minute(0).second(0).millisecond(0).toISOString();
    setReservationModal({
      mode: "create",
      event: null,
      reservation: null,
      client: null,
      presetStartsAt: startsAt,
    });
  };

  const openEvent = async (eventId: string) => {
    if (!court) return;
    const event = eventsById.get(eventId);
    if (!event) return;

    if (event.kind === "tournament_match") {
      setReservationModal({
        mode: "view",
        event,
        reservation: null,
        client: null,
        presetStartsAt: null,
      });
      return;
    }
    if (!event.reservationId) return;

    const reservations = await Api.TournamentOpsService().listCourtReservations(
      clubId,
      {
        courtId: court.id,
        from: startOfAgendaWeek(cursorDate).toISOString(),
        to: startOfAgendaWeek(cursorDate).add(8, "day").toISOString(),
      },
    );
    const reservation =
      reservations.find((item) => item.id === event.reservationId) ?? null;
    let client: Client | null = null;
    if (event.clientId) {
      const detail = await Api.TournamentOpsService().getClubClientDetail(
        clubId,
        event.clientId,
      );
      client = detail?.client ?? null;
    }
    setReservationModal({
      mode: "view",
      event,
      reservation,
      client,
      presetStartsAt: null,
    });
  };

  const suggestedCourtName = `Cancha ${courts.length + 1}`;

  return (
    <div className="space-y-5" data-testid="club-courts">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Canchas</h2>
          <p className="text-base text-muted-foreground">
            Agenda, reservas y configuración por cancha.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-base text-muted-foreground" htmlFor="court-select">
            Cancha
          </label>
          <select
            id="court-select"
            className="h-10 min-w-44 rounded-lg border border-input bg-transparent px-3 text-base"
            value={activeCourtId ?? ""}
            onChange={(e) => setSelectedCourtId(e.target.value)}
            disabled={courts.length === 0}
          >
            {courts.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            onClick={() => setCreateCourtOpen(true)}
          >
            <Plus className="size-4" />
            Agregar cancha
          </Button>
        </div>
      </div>

      {court && board ? (
        <CourtSummaryCard
          club={board.club}
          court={court}
          daySummary={board.daySummary}
          onConfigure={() => setConfigOpen(true)}
          onSelectSlot={(startsAt) =>
            setReservationModal({
              mode: "create",
              event: null,
              reservation: null,
              client: null,
              presetStartsAt: startsAt,
            })
          }
        />
      ) : boardQuery.isLoading || courtsQuery.isLoading ? (
        <p className="text-base text-muted-foreground">Cargando canchas…</p>
      ) : (
        <div className="space-y-3 rounded-xl border border-dashed border-border p-6">
          <p className="text-base text-muted-foreground">
            No hay canchas en este club.
          </p>
          <Button type="button" onClick={() => setCreateCourtOpen(true)}>
            <Plus className="size-4" />
            Agregar cancha
          </Button>
        </div>
      )}

      {court ? (
        <>
          <CourtAgendaToolbar
            mode={mode}
            date={cursorDate}
            onModeChange={setMode}
            onDateChange={setCursorDate}
            onAddReservation={() =>
              setReservationModal({
                mode: "create",
                event: null,
                reservation: null,
                client: null,
                presetStartsAt: cursorDate
                  .hour(12)
                  .minute(0)
                  .second(0)
                  .millisecond(0)
                  .toISOString(),
              })
            }
          />
          <CourtAgendaGrid
            viewMode={mode}
            selectedDate={cursorDate}
            events={gridEvents}
            loading={boardQuery.isLoading}
            openHour={openHours.openHour}
            closeHour={openHours.closeHour}
            onSelectEvent={(eventId) => {
              void openEvent(eventId);
            }}
            onEmptySlotClick={openCreate}
          />
        </>
      ) : null}

      <CreateCourtDialog
        open={createCourtOpen}
        clubId={clubId}
        suggestedName={suggestedCourtName}
        onOpenChange={setCreateCourtOpen}
        onCreated={(courtId) => {
          setSelectedCourtId(courtId);
          invalidateBoard();
        }}
      />

      {court && board ? (
        <CourtConfigDialog
          open={configOpen}
          club={board.club}
          court={court}
          priceRules={board.priceRules}
          onOpenChange={setConfigOpen}
          onSaved={invalidateBoard}
        />
      ) : null}

      {court && reservationModal ? (
        <CourtReservationModal
          open
          clubId={clubId}
          court={court}
          mode={reservationModal.mode}
          presetStartsAt={reservationModal.presetStartsAt}
          event={reservationModal.event}
          reservation={reservationModal.reservation}
          client={reservationModal.client}
          onOpenChange={(open) => {
            if (!open) setReservationModal(null);
          }}
          onSaved={invalidateBoard}
        />
      ) : null}
    </div>
  );
}
