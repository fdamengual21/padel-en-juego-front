import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import ClientSummaryCard from "./components/ClientSummaryCard";
import ClientsPagination from "./components/ClientsPagination";

const PAGE_SIZE = 8;

export default function ClubClientsScreen() {
  const { clubId } = useMockSession();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 350);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ["club-clients", clubId, debouncedSearch, page, PAGE_SIZE],
    queryFn: () =>
      Api.TournamentOpsService().listClubClients(clubId, {
        q: debouncedSearch,
        page,
        pageSize: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;
  const showSkeletons = isLoading || (isFetching && !data);

  return (
    <div className="space-y-5" data-testid="club-clients">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Clientes</h2>
          <p className="text-sm text-muted-foreground">
            Personas que reservaron cancha o jugaron un torneo en el club.
          </p>
        </div>
        <div className="w-full sm:max-w-xs">
          <label htmlFor="clients-search" className="sr-only">
            Buscar clientes
          </label>
          <Input
            id="clients-search"
            type="search"
            placeholder="Buscar por nombre, teléfono…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="clients-search"
          />
        </div>
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
          : items.map((summary) => (
              <ClientSummaryCard key={summary.client.id} summary={summary} />
            ))}
      </div>

      {!showSkeletons && items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {debouncedSearch.trim()
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
    </div>
  );
}

function ClientCardSkeleton() {
  return (
    <div
      className="flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-4"
      aria-hidden
    >
      <div className="flex items-center gap-3">
        <div className="size-16 animate-pulse rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="mt-auto grid grid-cols-2 gap-2 border-t border-border pt-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-1">
            <div className="h-2.5 w-12 animate-pulse rounded bg-muted" />
            <div className="h-4 w-8 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
