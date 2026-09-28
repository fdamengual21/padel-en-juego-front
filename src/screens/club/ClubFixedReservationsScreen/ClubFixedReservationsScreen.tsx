import { useEffect, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Repeat } from "lucide-react";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import { PERMISSION_CLUB_RESERVATIONS_WRITE } from "@/authorization";
import EmptyState from "@/components/EmptyState/EmptyState";
import { PermissionsGuard } from "@/components/guards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import type { CourtFixedReservation } from "@/modules/reservations";
import CancelFixedDayDialog from "./components/CancelFixedDayDialog";
import CancelFixedSeriesDialog from "./components/CancelFixedSeriesDialog";
import CreateFixedReservationDialog from "./components/CreateFixedReservationDialog";
import FixedPlayerCard from "./components/FixedPlayerCard";
import FixedPlayerDetailDialog from "./components/FixedPlayerDetailDialog";
import FixedReservationsPagination from "./components/FixedReservationsPagination";
import RestoreFixedDayDialog from "./components/RestoreFixedDayDialog";

const PAGE_SIZE = 8;

interface CancelDayTarget {
  series: CourtFixedReservation;
  date: string;
}

export default function ClubFixedReservationsScreen() {
  const { clubId } = useMockSession();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailPlayerId, setDetailPlayerId] = useState<string | null>(null);
  const [cancelDay, setCancelDay] = useState<CancelDayTarget | null>(null);
  const [restoreDay, setRestoreDay] = useState<CancelDayTarget | null>(null);
  const [cancelSeries, setCancelSeries] = useState<CourtFixedReservation | null>(null);
  const debouncedSearch = useDebounce(search, 350);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const query = useQuery({
    queryKey: ["court-fixed-reservations", clubId, debouncedSearch, page, PAGE_SIZE],
    queryFn: () =>
      Api.ReservationService().listFixed({
        q: debouncedSearch,
        page,
        pageSize: PAGE_SIZE,
      }),
    enabled: Boolean(clubId),
    placeholderData: keepPreviousData,
  });
  const groups = query.data?.items ?? [];
  const totalPages = query.data?.totalPages ?? 1;
  const totalItems = query.data?.totalItems ?? 0;
  const hasSearch = Boolean(debouncedSearch.trim());
  const detailGroup = groups.find((group) => group.playerId === detailPlayerId) ?? null;

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["court-fixed-reservations", clubId] });
    void queryClient.invalidateQueries({ queryKey: ["court-reservations-calendar"] });
    void queryClient.invalidateQueries({ queryKey: ["court-slots"] });
  };

  return (
    <div className="space-y-5" data-testid="club-fixed-reservations">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Turnos fijos</h2>
          <p className="text-sm text-muted-foreground">
            Horarios que se repiten cada semana. Solo el club los asigna.
          </p>
        </div>
        <PermissionsGuard permission={PERMISSION_CLUB_RESERVATIONS_WRITE}>
          <Button type="button" data-testid="fixed-reservation-create" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Nuevo turno fijo
          </Button>
        </PermissionsGuard>
      </div>

      <div className="w-full sm:w-[28rem]">
        <label htmlFor="fixed-reservations-search" className="sr-only">
          Buscar turnos fijos
        </label>
        <Input
          id="fixed-reservations-search"
          type="search"
          placeholder="Buscar por nombre, apellido o DNI"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-10 px-3"
          data-testid="fixed-reservations-search"
        />
      </div>

      {query.isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4" aria-hidden>
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl border border-border bg-muted/40" />
          ))}
        </div>
      ) : query.isError ? (
        <EmptyState
          tone="error"
          icon={Repeat}
          title="No se pudieron cargar los turnos fijos"
          description="Reintentá en un momento."
        />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title={hasSearch ? "Ningún jugador coincide" : "Todavía no hay turnos fijos"}
          description={
            hasSearch
              ? "Probá con otro nombre, apellido o DNI."
              : "Cuando el club asigne un horario semanal, aparece acá."
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {groups.map((group) => (
            <FixedPlayerCard
              key={group.playerId}
              group={group}
              onOpen={() => setDetailPlayerId(group.playerId)}
            />
          ))}
        </div>
      )}

      <FixedReservationsPagination
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        disabled={query.isFetching}
        onPageChange={setPage}
      />

      <CreateFixedReservationDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={refresh} />
      <FixedPlayerDetailDialog
        group={detailGroup}
        onOpenChange={(open) => {
          if (!open) setDetailPlayerId(null);
        }}
        onCancelDay={(series, date) => setCancelDay({ series, date })}
        onRestoreDay={(series, date) => setRestoreDay({ series, date })}
        onCancelSeries={setCancelSeries}
      />
      <RestoreFixedDayDialog
        series={restoreDay?.series ?? null}
        date={restoreDay?.date ?? null}
        onOpenChange={(open) => {
          if (!open) setRestoreDay(null);
        }}
        onRestored={refresh}
      />
      <CancelFixedDayDialog
        series={cancelDay?.series ?? null}
        date={cancelDay?.date ?? null}
        onOpenChange={(open) => {
          if (!open) setCancelDay(null);
        }}
        onCancelled={refresh}
      />
      <CancelFixedSeriesDialog
        series={cancelSeries}
        onOpenChange={(open) => {
          if (!open) setCancelSeries(null);
        }}
        onCancelled={() => {
          if (detailGroup && cancelSeries && detailGroup.series.length <= 1) setDetailPlayerId(null);
          refresh();
        }}
      />
    </div>
  );
}
