import { useEffect, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Api from "@/api/Api";
import { PERMISSION_CLUB_CLIENTS_WRITE } from "@/authorization";
import { PermissionsGuard } from "@/components/guards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORY_LEVELS, formatCategoryLevel } from "@/domain";
import { useDebounce } from "@/hooks/useDebounce";
import { useMockSession } from "@/app/MockSessionProvider";
import ClientFormDialog from "./components/ClientFormDialog";
import ClientDetailModal from "@/screens/club/ClubClientDetailScreen/components/ClientDetailModal";
import ClientSummaryCard from "./components/ClientSummaryCard";
import ClientsPagination from "./components/ClientsPagination";

const PAGE_SIZE = 12;

export default function ClubClientsScreen() {
  const { clubId } = useMockSession();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryLevel, setCategoryLevel] = useState<number | "">("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 350);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryLevel]);

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ["club-clients", clubId, debouncedSearch, categoryLevel, page, PAGE_SIZE],
    queryFn: () =>
      Api.ClientService().list({
        q: debouncedSearch,
        categoryLevel: categoryLevel === "" ? null : categoryLevel,
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
  const hasFilters = Boolean(debouncedSearch.trim()) || categoryLevel !== "";

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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="w-full sm:w-[28rem]">
          <label htmlFor="clients-search" className="sr-only">
            Buscar clientes
          </label>
          <Input
            id="clients-search"
            type="search"
            placeholder="Buscar por nombre, teléfono o DNI"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 px-3"
            data-testid="clients-search"
          />
        </div>
        <label className="sr-only" htmlFor="clients-category">
          Categoría
        </label>
        <select
          id="clients-category"
          className="h-10 w-full shrink-0 rounded-lg border border-input bg-transparent px-3 text-sm sm:w-52"
          value={categoryLevel}
          onChange={(e) =>
            setCategoryLevel(e.target.value === "" ? "" : Number(e.target.value))
          }
          data-testid="clients-category"
        >
          <option value="">Todas las categorías</option>
          {CATEGORY_LEVELS.map((level) => (
            <option key={level} value={level}>
              {formatCategoryLevel(level)}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="outline"
          className="h-10 shrink-0"
          disabled={!search.trim() && categoryLevel === ""}
          onClick={() => {
            setSearch("");
            setCategoryLevel("");
          }}
          data-testid="clients-clear-filters"
        >
          Limpiar filtros
        </Button>
      </div>

      {isFetching && data ? (
        <p className="text-xs text-muted-foreground">Actualizando…</p>
      ) : null}

      {isError ? (
        <p className="text-sm text-muted-foreground">
          No se pudieron cargar los clientes.
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {showSkeletons
          ? Array.from({ length: PAGE_SIZE }, (_, i) => (
              <ClientCardSkeleton key={`sk-${i}`} />
            ))
          : items.map((client) => (
              <ClientSummaryCard
                key={client.id}
                client={client}
                onOpen={(id) => setDetailId(id)}
              />
            ))}
      </div>

      {!showSkeletons && items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {hasFilters
            ? "No hay clientes que coincidan con la búsqueda."
            : "Todavía no hay clientes en este club."}
        </p>
      ) : null}

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
