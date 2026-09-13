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
import { cn } from "@/lib/utils";
import CourtAgendaGrid from "./components/CourtAgendaGrid";
import CourtAgendaToolbar, {
  type CourtAgendaToolbarMode,
} from "./components/CourtAgendaToolbar";
import CourtConfigDialog from "./components/CourtConfigDialog";
import CourtReservationModal from "./components/CourtReservationModal";
import CourtSummaryCard from "./components/CourtSummaryCard";
import CourtsOverviewCard from "./components/CourtsOverviewCard";
import CreateCourtDialog from "./components/CreateCourtDialog";
import { Plus } from "lucide-react";

dayjs.locale("es");

type CourtsHeaderView = "overview" | "detail";

interface ReservationModalState {
  mode: "view" | "edit" | "create";
  event: CourtAgendaEvent | null;
  reservation: CourtReservation | null;
  client: Client | null;
  presetStartsAt: string | null;
  courtId: string | null;
}

export default function ClubCourtsScreen() {
  const { clubId } = useMockSession();
  const queryClient = useQueryClient();
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [headerView, setHeaderView] = useState<CourtsHeaderView>("overview");
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
    enabled: Boolean(activeCourtId) && headerView === "detail",
    queryFn: () =>
      Api.TournamentOpsService().getCourtAgendaBoard(clubId, activeCourtId!, {
        from: range.from,
        to: range.to,
        summaryDate,
      }),
  });

  const overviewQuery = useQuery({
    queryKey: ["courts-day-overview", clubId, summaryDate],
    queryFn: () =>
      Api.TournamentOpsService().listCourtsDayOverview(clubId, summaryDate),
    enabled: headerView === "overview" && Boolean(clubId),
  });

  const multiBoardQuery = useQuery({
    queryKey: ["courts-agenda-board", clubId, range.from, range.to],
    queryFn: () =>
      Api.TournamentOpsService().getCourtsAgendaBoard(clubId, {
        from: range.from,
        to: range.to,
      }),
    enabled: headerView === "overview" && Boolean(clubId),
  });

  const board = boardQuery.data;
  const multiBoard = multiBoardQuery.data;
  const court =
    courts.find((c) => c.id === activeCourtId) ??
    board?.court ??
    null;
  const modalCourtId =
    reservationModal?.courtId ??
    reservationModal?.event?.courtId ??
    activeCourtId;
  const modalCourt =
    courts.find((c) => c.id === modalCourtId) ??
    multiBoard?.courts.find((c) => c.id === modalCourtId) ??
    court;

  const gridEvents = useMemo(
    () => (board?.events ?? []).map(mapCourtAgendaEventToGridItem),
    [board?.events],
  );

  const overviewGridEvents = useMemo(() => {
    const courtNames = new Map(
      (multiBoard?.courts ?? courts).map((c) => [c.id, c.name] as const),
    );
    return (multiBoard?.events ?? []).map((event) =>
      mapCourtAgendaEventToGridItem(event, {
        courtName: courtNames.get(event.courtId) ?? null,
      }),
    );
  }, [multiBoard?.events, multiBoard?.courts, courts]);

  const openHours = useMemo(() => {
    if (headerView === "overview" && multiBoard) {
      return {
        openHour: Number(multiBoard.openTime.slice(0, 2)),
        closeHour: Number(multiBoard.closeTime.slice(0, 2)),
      };
    }
    if (!board) return { openHour: undefined, closeHour: undefined };
    return {
      openHour: Number(board.club.openTime.slice(0, 2)),
      closeHour: Number(board.club.closeTime.slice(0, 2)),
    };
  }, [headerView, multiBoard, board]);

  const eventsById = useMemo(() => {
    const map = new Map<string, CourtAgendaEvent>();
    const source =
      headerView === "overview"
        ? (multiBoard?.events ?? [])
        : (board?.events ?? []);
    for (const event of source) {
      map.set(event.id, event);
    }
    return map;
  }, [headerView, multiBoard?.events, board?.events]);

  const invalidateBoard = () => {
    void queryClient.invalidateQueries({ queryKey: ["court-agenda-board"] });
    void queryClient.invalidateQueries({ queryKey: ["courts-agenda-board"] });
    void queryClient.invalidateQueries({ queryKey: ["courts-day-overview"] });
    void queryClient.invalidateQueries({ queryKey: ["courts", clubId] });
  };

  const openCreate = (targetCourtId: string, day: Dayjs, hour: number) => {
    setSelectedCourtId(targetCourtId);
    const startsAt = day
      .hour(hour)
      .minute(0)
      .second(0)
      .millisecond(0)
      .toISOString();
    setReservationModal({
      mode: "create",
      event: null,
      reservation: null,
      client: null,
      presetStartsAt: startsAt,
      courtId: targetCourtId,
    });
  };

  const openEvent = async (eventId: string, courtIdHint?: string) => {
    const event = eventsById.get(eventId);
    if (!event) return;
    const courtId = courtIdHint ?? event.courtId;
    setSelectedCourtId(courtId);

    if (event.kind === "tournament_match") {
      setReservationModal({
        mode: "view",
        event,
        reservation: null,
        client: null,
        presetStartsAt: null,
        courtId,
      });
      return;
    }
    if (!event.reservationId) return;

    const reservations = await Api.TournamentOpsService().listCourtReservations(
      clubId,
      {
        courtId,
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
      courtId,
    });
  };

  const suggestedCourtName = `Cancha ${courts.length + 1}`;
  const overviewItems = overviewQuery.data?.items ?? [];

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
          <div
            className="inline-flex rounded-lg border border-border p-0.5"
            data-testid="courts-header-view-toggle"
          >
            {(
              [
                { value: "overview", label: "Todas" },
                { value: "detail", label: "Detalle" },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm",
                  headerView === option.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setHeaderView(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          {headerView === "detail" ? (
            <>
              <label
                className="text-base text-muted-foreground"
                htmlFor="court-select"
              >
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
            </>
          ) : null}

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

      {courts.length === 0 && !courtsQuery.isLoading ? (
        <div className="space-y-3 rounded-xl border border-dashed border-border p-6">
          <p className="text-base text-muted-foreground">
            No hay canchas en este club.
          </p>
          <Button type="button" onClick={() => setCreateCourtOpen(true)}>
            <Plus className="size-4" />
            Agregar cancha
          </Button>
        </div>
      ) : headerView === "overview" ? (
        overviewQuery.isLoading ? (
          <p className="text-base text-muted-foreground">Cargando canchas…</p>
        ) : (
          <CourtsOverviewCard
            items={overviewItems}
            selectedCourtId={activeCourtId}
            onSelectCourt={setSelectedCourtId}
            onSelectSlot={(courtId, startsAt) => {
              setSelectedCourtId(courtId);
              setReservationModal({
                mode: "create",
                event: null,
                reservation: null,
                client: null,
                presetStartsAt: startsAt,
                courtId,
              });
            }}
            onOpenDetail={(courtId) => {
              setSelectedCourtId(courtId);
              setHeaderView("detail");
            }}
          />
        )
      ) : court && board ? (
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
              courtId: court.id,
            })
          }
        />
      ) : boardQuery.isLoading || courtsQuery.isLoading ? (
        <p className="text-base text-muted-foreground">Cargando canchas…</p>
      ) : null}

      {courts.length > 0 ? (
        <>
          <CourtAgendaToolbar
            mode={mode}
            date={cursorDate}
            onModeChange={setMode}
            onDateChange={setCursorDate}
            onAddReservation={() => {
              if (!activeCourtId) return;
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
                courtId: activeCourtId,
              });
            }}
          />

          {headerView === "overview" ? (
            <CourtAgendaGrid
              viewMode={mode}
              selectedDate={cursorDate}
              events={overviewGridEvents}
              loading={multiBoardQuery.isLoading}
              openHour={openHours.openHour}
              closeHour={openHours.closeHour}
              onSelectEvent={(eventId) => {
                void openEvent(eventId);
              }}
              onEmptySlotClick={(day, hour) => {
                if (!activeCourtId) return;
                openCreate(activeCourtId, day, hour);
              }}
            />
          ) : court ? (
            <CourtAgendaGrid
              viewMode={mode}
              selectedDate={cursorDate}
              events={gridEvents}
              loading={boardQuery.isLoading}
              openHour={openHours.openHour}
              closeHour={openHours.closeHour}
              onSelectEvent={(eventId) => {
                void openEvent(eventId, court.id);
              }}
              onEmptySlotClick={(day, hour) => openCreate(court.id, day, hour)}
            />
          ) : null}
        </>
      ) : null}

      <CreateCourtDialog
        open={createCourtOpen}
        clubId={clubId}
        suggestedName={suggestedCourtName}
        onOpenChange={setCreateCourtOpen}
        onCreated={(courtId) => {
          setSelectedCourtId(courtId);
          setHeaderView("detail");
          invalidateBoard();
        }}
      />

      {court && board && headerView === "detail" ? (
        <CourtConfigDialog
          open={configOpen}
          club={board.club}
          court={court}
          priceRules={board.priceRules}
          onOpenChange={setConfigOpen}
          onSaved={invalidateBoard}
        />
      ) : null}

      {modalCourt && reservationModal ? (
        <CourtReservationModal
          open
          clubId={clubId}
          court={modalCourt}
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
