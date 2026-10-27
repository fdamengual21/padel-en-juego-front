import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleAlert, Plus, Users } from "lucide-react";
import Api from "@/api/Api";
import { PERMISSION_CLUB_CLIENTS_WRITE } from "@/authorization";
import { EmptyState } from "@/components/EmptyState";
import { PermissionsGuard } from "@/components/guards";
import { Button } from "@/components/ui/button";
import type { CategoryLevel } from "@/domain";
import { useDebounce } from "@/hooks/useDebounce";
import { useMockSession } from "@/app/MockSessionProvider";
import ClientFormDialog from "./components/ClientFormDialog";
import ClientDetailModal from "@/screens/club/ClubClientDetailScreen/components/ClientDetailModal";
import ClientSummaryCard from "./components/ClientSummaryCard";
import ClientsFilters from "./components/ClientsFilters";
import ClientsPagination from "./components/ClientsPagination";

const PAGE_SIZE = 12;

export default function ClubClientsScreen() {
  const { clubId } = useMockSession();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryLevels, setCategoryLevels] = useState<CategoryLevel[]>([]);
  const [sexIds, setSexIds] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 350);

  const { data: sexes = [] } = useQuery({
    queryKey: ["sexes"],
    queryFn: () => Api.SexService().list(),
  });

  const sexById = useMemo(
    () => new Map(sexes.map((sex) => [sex.id, sex])),
    [sexes],
  );

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryLevels, sexIds]);

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: [
      "club-clients",
      clubId,
      debouncedSearch,
      categoryLevels.join(","),
      sexIds.join(","),
      page,
      PAGE_SIZE,
    ],
    queryFn: () =>
      Api.ClientService().list({
        q: debouncedSearch,
        categoryLevels,
        sexIds,
        page,
        pageSize: PAGE_SIZE,
      }),
    enabled: Boolean(clubId),
    placeholderData: keepPreviousData,
  });

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;
  const showSkeletons = isLoading || (isFetching && !data);
  const hasFilters =
    Boolean(debouncedSearch.trim()) || categoryLevels.length > 0 || sexIds.length > 0;
  const showEmpty = !showSkeletons && items.length === 0;

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["club-clients", clubId] });
  };

  return (
    <div className="space-y-5" data-testid="club-clients">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Clientes</h2>
          <p className="text-sm text-muted-foreground">
            Personas vinculadas al club, con o sin reservas.
          </p>
        </div>
        <PermissionsGuard permission={PERMISSION_CLUB_CLIENTS_WRITE}>
          <Button
            type="button"
            onClick={() => {
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" />
            Añadir cliente
          </Button>
        </PermissionsGuard>
      </div>

      <ClientsFilters
        search={search}
        onSearchChange={setSearch}
        categoryLevels={categoryLevels}
        onCategoryLevelsChange={setCategoryLevels}
        sexIds={sexIds}
        onSexIdsChange={setSexIds}
        sexes={sexes}
        canClear={hasFilters || Boolean(search.trim())}
        onClear={() => {
          setSearch("");
          setCategoryLevels([]);
          setSexIds([]);
        }}
      />

      {isFetching && data ? (
        <p className="text-xs text-muted-foreground">Actualizando…</p>
      ) : null}

      {showEmpty && isError ? (
        <EmptyState
          icon={CircleAlert}
          tone="error"
          title="No se pudieron cargar los clientes"
          description="Reintentá en un momento."
        />
      ) : showEmpty ? (
        <EmptyState
          icon={Users}
          title={
            hasFilters
              ? "No hay clientes que coincidan con la búsqueda."
              : "Todavía no hay clientes en este club."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {showSkeletons
            ? Array.from({ length: PAGE_SIZE }, (_, i) => (
                <ClientCardSkeleton key={`sk-${i}`} />
              ))
            : items.map((client) => (
                <ClientSummaryCard
                  key={client.id}
                  client={client}
                  sexCode={
                    client.sexId != null ? (sexById.get(client.sexId)?.code ?? null) : null
                  }
                  sexLabel={
                    client.sexId != null ? (sexById.get(client.sexId)?.name ?? null) : null
                  }
                  onOpen={(id) => setDetailId(id)}
                />
              ))}
        </div>
      )}

      <ClientsPagination
        page={data?.page ?? page}
        totalPages={totalPages}
        totalItems={totalItems}
        disabled={isFetching}
        onPageChange={setPage}
      />

      <ClientFormDialog
        open={formOpen}
        clientId={null}
        onOpenChange={setFormOpen}
        onSaved={refresh}
      />
      <ClientDetailModal
        open={Boolean(detailId)}
        clubId={clubId}
        clientId={detailId}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
      />
    </div>
  );
}

function ClientCardSkeleton() {
  return (
    <div
      className="flex h-full items-center gap-3 rounded-xl border border-border bg-card p-4"
      aria-hidden
    >
      <div className="size-12 animate-pulse rounded-full bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
